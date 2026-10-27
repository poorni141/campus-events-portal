import { Router, Request, Response } from 'express';
import { db } from '../services/db';
import { cache } from '../services/cache';
import { expirationQueue } from '../services/queue';
import { paymentGateway } from '../services/payment';
import { ConcurrencyTestResult, TicketCategory } from '../types';

const router = Router();

// POST /api/system/simulate-concurrency
// Executes the exact specification: 20 simultaneous requests for 10 tickets
router.post('/simulate-concurrency', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const logs: string[] = [];

  logs.push(`[INIT] Creating temporary test event and ticket tier with STRICTLY 10 tickets.`);

  // 1. Create a dedicated test event and category with exactly 10 tickets
  const testEventId = `evt-concurrency-test-${Date.now()}`;
  const testCategoryId = `tc-concurrency-${Date.now()}`;
  const initialStock = 10;

  db.events.set(testEventId, {
    id: testEventId,
    organizationId: 'org-aura',
    title: 'High-Concurrency Flash Test',
    slug: 'concurrency-test',
    description: 'Automated test harness for 20 simultaneous bookings against 10 tickets.',
    category: 'Tech',
    coverImageUrl: '/src/assets/images/event_tech_summit_1793115718930.jpg',
    venueName: 'Concurrency Test Arena',
    address: 'Memory Buffer 0x1',
    city: 'Bengaluru',
    eventDate: '2026-12-31T18:00:00.000Z',
    doorsOpenTime: '17:00',
    bookingOpensAt: new Date(Date.now() - 3600000).toISOString(),
    bookingClosesAt: new Date(Date.now() + 86400000).toISOString(),
    maxCapacity: 10,
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const testTier: TicketCategory = {
    id: testCategoryId,
    eventId: testEventId,
    name: 'Flash Pass (Strict 10 Qty)',
    price: 500,
    totalQuantity: initialStock,
    availableQuantity: initialStock,
    reservedQuantity: 0,
    soldQuantity: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.ticketCategories.set(testCategoryId, testTier);
  logs.push(`[SETUP] Category "${testTier.name}" initialized. Available stock: ${initialStock}`);

  // 2. Launch 20 concurrent booking requests simultaneously via Promise.all
  const totalAttendees = 20;
  logs.push(`[DISPATCH] Firing ${totalAttendees} simultaneous attendee requests in parallel...`);

  const attendeePromises = Array.from({ length: totalAttendees }, (_, index) => {
    const attendeeId = `sim-user-${index + 1}`;
    return db.createReservation({
      userId: attendeeId,
      eventId: testEventId,
      items: [{ ticketCategoryId: testCategoryId, quantity: 1 }],
      idempotencyKey: `idem-concurrency-${testCategoryId}-${attendeeId}`,
    });
  });

  const results = await Promise.all(attendeePromises);

  let successCount = 0;
  let failureCount = 0;

  results.forEach((res, index) => {
    if (res.success && res.reservation) {
      successCount++;
      logs.push(`[ATTENDEE #${String(index + 1).padStart(2, '0')}] SUCCESS: Reserved 1 ticket. Res ID: ${res.reservation.id}`);
    } else {
      failureCount++;
      logs.push(`[ATTENDEE #${String(index + 1).padStart(2, '0')}] REJECTED: ${res.error}`);
    }
  });

  const finalTier = db.ticketCategories.get(testCategoryId)!;
  const durationMs = Date.now() - startTime;
  const passed = successCount === 10 && failureCount === 10 && finalTier.availableQuantity === 0 && finalTier.reservedQuantity === 10;

  logs.push(`[VERIFICATION] Completed in ${durationMs}ms.`);
  logs.push(`[RESULT] Succeeded: ${successCount} / 20. Rejected: ${failureCount} / 20.`);
  logs.push(`[INVENTORY] Final Available: ${finalTier.availableQuantity}, Held/Reserved: ${finalTier.reservedQuantity}, Sold: ${finalTier.soldQuantity}.`);
  logs.push(passed ? `[STATUS] PASS: Zero overselling achieved! Concurrency safety verified.` : `[STATUS] FAIL: Invariant violated!`);

  const responsePayload: ConcurrencyTestResult = {
    totalRequests: totalAttendees,
    successfulReservations: successCount,
    rejectedReservations: failureCount,
    initialStock,
    finalStock: finalTier.availableQuantity,
    heldStock: finalTier.reservedQuantity,
    durationMs,
    passed,
    logs,
  };

  res.json(responsePayload);
});

// POST /api/system/test-expiration
router.post('/test-expiration', async (_req: Request, res: Response) => {
  const logs: string[] = [];
  logs.push('[INIT] Testing 10-Minute Hold Expiration & Safe Inventory Release');

  // Create 1 ticket reservation
  const cat = Array.from(db.ticketCategories.values())[0];
  const initialAvailable = cat.availableQuantity;

  const resResult = await db.createReservation({
    userId: 'usr-attendee-1',
    eventId: cat.eventId,
    items: [{ ticketCategoryId: cat.id, quantity: 1 }],
  });

  if (!resResult.success || !resResult.reservation) {
    return res.status(400).json({ error: 'Failed to create test reservation' });
  }

  logs.push(`[RESERVE] Held 1 ticket. Stock changed from ${initialAvailable} to ${cat.availableQuantity}`);

  // Artificially fast-forward expiration time
  resResult.reservation.expiresAt = new Date(Date.now() - 5000).toISOString();
  logs.push(`[TIME TRAVEL] Fast-forwarded reservation expiresAt to past`);

  // Run worker sweep
  const sweep = await expirationQueue.runSweep();
  logs.push(`[WORKER] Swept ${sweep.sweptCount} expired reservations. Released: ${sweep.releasedCount}`);
  logs.push(`[INVENTORY] Restored available stock back to: ${cat.availableQuantity}`);

  // Try to confirm expired reservation
  const confirmResult = await db.confirmReservationAndCreateOrder({
    reservationId: resResult.reservation.id,
    paymentTransactionId: 'dummy-tx',
  });

  logs.push(`[CONFIRM ATTEMPT] Confirming expired reservation: ${confirmResult.success ? 'UNEXPECTED SUCCESS' : 'SAFELY REJECTED: ' + confirmResult.error}`);

  res.json({
    passed: !confirmResult.success && cat.availableQuantity === initialAvailable,
    logs,
  });
});

// POST /api/system/test-webhook-idempotency
router.post('/test-webhook-idempotency', async (_req: Request, res: Response) => {
  const logs: string[] = [];
  logs.push('[INIT] Testing Payment Webhook Idempotency & Duplicate Callback Protection');

  const cat = Array.from(db.ticketCategories.values())[0];
  const resResult = await db.createReservation({
    userId: 'usr-attendee-1',
    eventId: cat.eventId,
    items: [{ ticketCategoryId: cat.id, quantity: 1 }],
  });

  if (!resResult.success || !resResult.reservation) {
    return res.status(400).json({ error: 'Failed to create reservation' });
  }

  const txInit = await paymentGateway.initiatePayment({
    reservationId: resResult.reservation.id,
    userId: 'usr-attendee-1',
    paymentMethod: 'TEST_WEBHOOK',
    idempotencyKey: `idem-hook-${Date.now()}`,
  });

  if (!txInit.success || !txInit.data) {
    return res.status(400).json({ error: 'Failed to initiate payment' });
  }

  const gatewayRef = txInit.data.gatewayReference;
  logs.push(`[TX] Initiated payment transaction. Gateway Ref: ${gatewayRef}`);

  // Send first webhook
  logs.push(`[HOOK 1] Dispatching initial payment.captured webhook...`);
  const hook1 = await paymentGateway.handleWebhook({
    gatewayRef,
    event: 'payment.captured',
    signature: 'sig_valid',
    timestamp: Date.now(),
  });
  logs.push(`[HOOK 1 RESULT] Status: ${hook1.status}, OrderId: ${hook1.orderId}`);

  // Send duplicate webhook
  logs.push(`[HOOK 2] Dispatching DUPLICATE payment.captured webhook with same gatewayRef...`);
  const hook2 = await paymentGateway.handleWebhook({
    gatewayRef,
    event: 'payment.captured',
    signature: 'sig_valid',
    timestamp: Date.now(),
  });
  logs.push(`[HOOK 2 RESULT] Status: ${hook2.status}, Message: "${hook2.message}"`);

  const passed = hook1.status === 'OK' && hook2.status === 'DUPLICATE' && hook1.orderId === hook2.orderId;
  logs.push(passed ? `[STATUS] PASS: Webhook idempotency strictly guaranteed!` : `[STATUS] FAIL: Invariant broken`);

  res.json({ passed, logs });
});

// GET /api/system/diagnostics
router.get('/diagnostics', (_req: Request, res: Response) => {
  res.json({
    database: {
      usersCount: db.users.size,
      organizationsCount: db.organizations.size,
      eventsCount: db.events.size,
      ticketCategoriesCount: db.ticketCategories.size,
      reservationsCount: db.reservations.size,
      ordersCount: db.orders.size,
      paymentTransactionsCount: db.paymentTransactions.size,
      auditLogsCount: db.auditLogs.length,
    },
    cache: cache.getStats(),
    queue: expirationQueue.getStats(),
  });
});

// POST /api/system/trigger-sweep
router.post('/trigger-sweep', async (_req: Request, res: Response) => {
  const result = await expirationQueue.runSweep();
  res.json({ message: 'Sweep executed.', ...result });
});

// POST /api/system/reset-seed
router.post('/reset-seed', (_req: Request, res: Response) => {
  db.seedDatabase();
  cache.flushAll();
  res.json({ message: 'Database reset to initial seed state.' });
});

export default router;
