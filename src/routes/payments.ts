import { Router, Request, Response } from 'express';
import { paymentGateway } from '../services/payment';
import { getAuthenticatedUser } from './auth';

const router = Router();

// POST /api/payments/initiate - Initiate simulated payment session
router.post('/initiate', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { reservationId, paymentMethod, idempotencyKey } = req.body;

  if (!reservationId) {
    return res.status(400).json({ error: 'Reservation ID is required.' });
  }

  const result = await paymentGateway.initiatePayment({
    reservationId,
    userId: user.id,
    paymentMethod: paymentMethod || 'SIMULATED_CARD',
    idempotencyKey: idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json(result.data);
});

// GET /api/payments/:id/status - Check payment status
router.get('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const tx = paymentGateway.getTransaction(id);

  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  res.json({ transaction: tx });
});

// POST /api/payments/:id/simulate - Trigger simulated payment approval or rejection
router.post('/:id/simulate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, failureReason, delayMs } = req.body;

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
  }

  const result = await paymentGateway.processSimulatedPayment({
    transactionId: id,
    action,
    failureReason,
    delayMs: typeof delayMs === 'number' ? delayMs : 500,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error, transaction: result.transaction });
  }

  res.json({
    transaction: result.transaction,
    order: result.order,
    message: action === 'APPROVE' ? 'Payment approved and booking confirmed!' : 'Payment was declined as simulated.',
  });
});

// POST /api/payments/webhook - Asynchronous payment gateway callback
router.post('/webhook', async (req: Request, res: Response) => {
  const { gatewayRef, event, signature, timestamp } = req.body;

  if (!gatewayRef || !event) {
    return res.status(400).json({ error: 'Invalid webhook payload.' });
  }

  const result = await paymentGateway.handleWebhook({
    gatewayRef,
    event,
    signature: signature || 'sim-sig-verified',
    timestamp: timestamp || Date.now(),
  });

  res.json(result);
});

export default router;
