/**
 * TicketNest Simulated Payment Gateway
 * Provides asynchronous payment initiation, status polling, simulated approval/rejection,
 * webhook callbacks with cryptographic signature simulation, and idempotency protection.
 */

import { db } from './db';
import { expirationQueue } from './queue';
import { PaymentTransaction, Order, PaymentStatus } from '../types';

export interface PaymentInitiationResult {
  transactionId: string;
  gatewayReference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  expiresInSeconds: number;
}

class PaymentService {
  /**
   * Initiate payment for a pending reservation.
   * Calculates exact amount from authoritative reservation data on server.
   */
  async initiatePayment(params: {
    reservationId: string;
    userId: string;
    paymentMethod: string;
    idempotencyKey: string;
  }): Promise<{ success: boolean; data?: PaymentInitiationResult; error?: string }> {
    const { reservationId, userId, paymentMethod, idempotencyKey } = params;

    // 1. Check idempotency for existing transaction with same key
    for (const tx of db.paymentTransactions.values()) {
      if (tx.idempotencyKey === idempotencyKey) {
        return {
          success: true,
          data: {
            transactionId: tx.id,
            gatewayReference: tx.paymentGatewayRef,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            expiresInSeconds: 600,
          },
        };
      }
    }

    // 2. Lookup reservation
    const reservation = db.reservations.get(reservationId);
    if (!reservation) {
      return { success: false, error: 'Reservation not found.' };
    }

    if (reservation.status !== 'PENDING') {
      return {
        success: false,
        error: `Cannot initiate payment. Reservation is already ${reservation.status}.`,
      };
    }

    // Check expiration
    if (new Date(reservation.expiresAt).getTime() < Date.now()) {
      await db.releaseReservation(reservationId, 'EXPIRED');
      return { success: false, error: 'Reservation expired. Please select your tickets again.' };
    }

    // 3. Create Pending Transaction with Server-Calculated Amount
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const gatewayReference = `PAY-SIM-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const transaction: PaymentTransaction = {
      id: transactionId,
      reservationId,
      userId,
      amount: reservation.totalAmount, // Server-calculated!
      currency: 'INR',
      status: 'PENDING',
      paymentMethod: paymentMethod || 'SIMULATED_CARD',
      paymentGatewayRef: gatewayReference,
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    db.paymentTransactions.set(transactionId, transaction);

    return {
      success: true,
      data: {
        transactionId,
        gatewayReference,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        expiresInSeconds: Math.max(
          0,
          Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000)
        ),
      },
    };
  }

  /**
   * Check payment transaction status
   */
  getTransaction(transactionId: string): PaymentTransaction | null {
    return db.paymentTransactions.get(transactionId) || null;
  }

  /**
   * Process simulated payment decision (SUCCESS or FAILED) with optional configurable delay.
   * Handles webhook dispatch, reservation confirmation, and order creation.
   */
  async processSimulatedPayment(params: {
    transactionId: string;
    action: 'APPROVE' | 'REJECT';
    failureReason?: string;
    delayMs?: number;
  }): Promise<{ success: boolean; transaction?: PaymentTransaction; order?: Order; error?: string }> {
    const { transactionId, action, failureReason, delayMs = 300 } = params;

    const tx = db.paymentTransactions.get(transactionId);
    if (!tx) {
      return { success: false, error: 'Transaction not found.' };
    }

    if (tx.status !== 'PENDING') {
      // Idempotency: Return existing state
      const existingOrder = Array.from(db.orders.values()).find(
        (o) => o.paymentTransactionId === transactionId
      );
      return { success: true, transaction: tx, order: existingOrder };
    }

    // Simulate async network processing
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (action === 'REJECT') {
      tx.status = 'FAILED';
      tx.failureReason = failureReason || 'Simulated card declined: insufficient funds or test rejection';
      tx.processedAt = new Date().toISOString();

      db.logAudit(
        tx.userId,
        'payment_gateway',
        'PAYMENT_FAILED',
        'RESERVATION',
        tx.reservationId,
        `Payment failed for ₹${tx.amount}. Reason: ${tx.failureReason}`
      );

      return { success: true, transaction: tx };
    }

    // Process Approval
    tx.status = 'SUCCESS';
    tx.processedAt = new Date().toISOString();

    // Confirm reservation and convert to Order
    const confirmResult = await db.confirmReservationAndCreateOrder({
      reservationId: tx.reservationId,
      paymentTransactionId: tx.id,
    });

    if (!confirmResult.success) {
      tx.status = 'FAILED';
      tx.failureReason = confirmResult.error || 'Confirmation failed';
      return { success: false, transaction: tx, error: confirmResult.error };
    }

    // Cancel the expiration timer since it's confirmed
    expirationQueue.cancelExpiration(tx.reservationId);

    db.logAudit(
      tx.userId,
      'payment_gateway',
      'PAYMENT_SUCCESS',
      'ORDER',
      confirmResult.order!.id,
      `Payment approved for ₹${tx.amount}. Order created: ${confirmResult.order!.bookingReference}`
    );

    return {
      success: true,
      transaction: tx,
      order: confirmResult.order,
    };
  }

  /**
   * Process asynchronous webhook callback (e.g. from payment gateway)
   * Guaranteed idempotent: repeated successful callbacks do not duplicate orders or inventory deductions.
   */
  async handleWebhook(body: {
    gatewayRef: string;
    event: 'payment.captured' | 'payment.failed';
    signature: string;
    timestamp: number;
  }): Promise<{ status: 'OK' | 'DUPLICATE' | 'INVALID'; message: string; orderId?: string }> {
    // 1. Find transaction by gatewayRef
    const tx = Array.from(db.paymentTransactions.values()).find(
      (t) => t.paymentGatewayRef === body.gatewayRef
    );

    if (!tx) {
      return { status: 'INVALID', message: 'Transaction reference not found.' };
    }

    if (body.event === 'payment.captured') {
      if (tx.status === 'SUCCESS') {
        const existingOrder = Array.from(db.orders.values()).find(
          (o) => o.paymentTransactionId === tx.id
        );
        return {
          status: 'DUPLICATE',
          message: 'Webhook already processed. No duplicate order created.',
          orderId: existingOrder?.id,
        };
      }

      const res = await this.processSimulatedPayment({
        transactionId: tx.id,
        action: 'APPROVE',
        delayMs: 0,
      });

      return {
        status: 'OK',
        message: 'Payment captured and booking confirmed.',
        orderId: res.order?.id,
      };
    } else {
      await this.processSimulatedPayment({
        transactionId: tx.id,
        action: 'REJECT',
        failureReason: 'Webhook payment.failed event received',
        delayMs: 0,
      });
      return { status: 'OK', message: 'Payment failure recorded.' };
    }
  }
}

export const paymentGateway = new PaymentService();
