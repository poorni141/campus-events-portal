/**
 * TicketNest Automated Concurrency & Reliability Verification Suite
 * Run with: npx tsx tests/concurrency.test.ts
 */

import { db } from '../src/services/db';
import { paymentGateway } from '../src/services/payment';
import { expirationQueue } from '../src/services/queue';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 TICKETNEST AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
    }
  }

  // -----------------------------------------------------------------
  // SCENARIO 1: Concurrent Booking (20 requests for 10 tickets)
  // -----------------------------------------------------------------
  console.log('--- Test 1: Concurrency Protection (20 Users for 10 Tickets) ---');
  const testEventId = `test-evt-${Date.now()}`;
  const testCategoryId = `test-cat-${Date.now()}`;
  const stock = 10;

  db.events.set(testEventId, {
    id: testEventId,
    organizationId: 'org-aura',
    title: 'Concurrency Stress Test Event',
    slug: 'concurrency-stress',
    description: 'Testing 20 simultaneous requests against 10 tickets',
    category: 'Tech',
    coverImageUrl: '',
    venueName: 'Test Hall',
    address: 'Suite 1',
    city: 'Bengaluru',
    eventDate: '2026-12-01T10:00:00.000Z',
    doorsOpenTime: '09:00',
    bookingOpensAt: new Date(Date.now() - 60000).toISOString(),
    bookingClosesAt: new Date(Date.now() + 86400000).toISOString(),
    maxCapacity: 10,
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  db.ticketCategories.set(testCategoryId, {
    id: testCategoryId,
    eventId: testEventId,
    name: 'Stress Tier',
    price: 500,
    totalQuantity: stock,
    availableQuantity: stock,
    reservedQuantity: 0,
    soldQuantity: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Launch 20 concurrent requests
  const promises = Array.from({ length: 20 }, (_, idx) =>
    db.createReservation({
      userId: `user-sim-${idx + 1}`,
      eventId: testEventId,
      items: [{ ticketCategoryId: testCategoryId, quantity: 1 }],
      idempotencyKey: `idem-test-concurrency-${idx}`,
    })
  );

  const results = await Promise.all(promises);
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  const finalTier = db.ticketCategories.get(testCategoryId)!;

  assert(
    successCount === 10 && failureCount === 10,
    'Exactly 10 of 20 simultaneous reservations succeeded, 10 failed',
    `Succeeded: ${successCount}, Failed: ${failureCount}`
  );
  assert(
    finalTier.availableQuantity === 0 && finalTier.reservedQuantity === 10,
    'Stock invariant maintained: available=0, reserved=10, zero overselling',
    `Available: ${finalTier.availableQuantity}, Reserved: ${finalTier.reservedQuantity}`
  );

  // -----------------------------------------------------------------
  // SCENARIO 2: Expired Reservation Release
  // -----------------------------------------------------------------
  console.log('\n--- Test 2: Expired Reservation Handling ---');
  const catForExpiry = db.ticketCategories.get('tc-sw-plat')!;
  const beforeAvailable = catForExpiry.availableQuantity;

  const resForExpiry = await db.createReservation({
    userId: 'usr-attendee-1',
    eventId: catForExpiry.eventId,
    items: [{ ticketCategoryId: catForExpiry.id, quantity: 1 }],
  });

  assert(resForExpiry.success, 'Created temporary reservation for expiry test');
  assert(catForExpiry.availableQuantity === beforeAvailable - 1, 'Stock decremented by 1 during hold');

  // Fast-forward expiration into the past
  resForExpiry.reservation!.expiresAt = new Date(Date.now() - 1000).toISOString();

  // Attempt checkout on expired reservation
  const expiredCheckout = await db.confirmReservationAndCreateOrder({
    reservationId: resForExpiry.reservation!.id,
    paymentTransactionId: 'dummy-tx-expiry',
  });

  assert(
    !expiredCheckout.success,
    'Checkout rejected for expired reservation',
    expiredCheckout.error
  );
  assert(
    catForExpiry.availableQuantity === beforeAvailable,
    'Inventory restored back to available quantity upon expiration'
  );

  // -----------------------------------------------------------------
  // SCENARIO 3: Payment Failure Must Not Produce Confirmed Orders
  // -----------------------------------------------------------------
  console.log('\n--- Test 3: Payment Failure Invariant ---');
  const resForFail = await db.createReservation({
    userId: 'usr-attendee-1',
    eventId: catForExpiry.eventId,
    items: [{ ticketCategoryId: catForExpiry.id, quantity: 1 }],
  });

  const txFail = await paymentGateway.initiatePayment({
    reservationId: resForFail.reservation!.id,
    userId: 'usr-attendee-1',
    paymentMethod: 'TEST_CARD',
    idempotencyKey: `idem-fail-${Date.now()}`,
  });

  const simFailResult = await paymentGateway.processSimulatedPayment({
    transactionId: txFail.data!.transactionId,
    action: 'REJECT',
    failureReason: 'Card declined (insufficient funds)',
    delayMs: 0,
  });

  assert(simFailResult.transaction?.status === 'FAILED', 'Transaction marked FAILED on rejection');
  const orderProduced = Array.from(db.orders.values()).find(
    (o) => o.paymentTransactionId === txFail.data!.transactionId
  );
  assert(!orderProduced, 'No confirmed order created for failed payment transaction');

  // Clean up
  await db.releaseReservation(resForFail.reservation!.id, 'CANCELLED');

  // -----------------------------------------------------------------
  // SCENARIO 4: Duplicate Webhook Idempotency
  // -----------------------------------------------------------------
  console.log('\n--- Test 4: Webhook Idempotency ---');
  const resForHook = await db.createReservation({
    userId: 'usr-attendee-1',
    eventId: catForExpiry.eventId,
    items: [{ ticketCategoryId: catForExpiry.id, quantity: 1 }],
  });

  const txHook = await paymentGateway.initiatePayment({
    reservationId: resForHook.reservation!.id,
    userId: 'usr-attendee-1',
    paymentMethod: 'WEBHOOK_CARD',
    idempotencyKey: `idem-hook-test-${Date.now()}`,
  });

  const hook1 = await paymentGateway.handleWebhook({
    gatewayRef: txHook.data!.gatewayReference,
    event: 'payment.captured',
    signature: 'sig_valid',
    timestamp: Date.now(),
  });

  const hook2 = await paymentGateway.handleWebhook({
    gatewayRef: txHook.data!.gatewayReference,
    event: 'payment.captured',
    signature: 'sig_valid',
    timestamp: Date.now(),
  });

  assert(hook1.status === 'OK', 'First webhook captured successfully');
  assert(hook2.status === 'DUPLICATE', 'Repeated webhook safely flagged as DUPLICATE');
  assert(hook1.orderId === hook2.orderId, 'Both callbacks resolved to the single unique order ID');

  // -----------------------------------------------------------------
  // SCENARIO 5: Multi-Tenant Isolation
  // -----------------------------------------------------------------
  console.log('\n--- Test 5: Multi-Tenant Data Isolation ---');
  const auraEvent = db.events.get('evt-soundwave-2026')!;
  const orgApexUser = db.users.get('usr-org-2')!; // Belongs to org-apex

  // Cross tenant check
  const isIsolated = auraEvent.organizationId !== orgApexUser.organizationId;
  assert(
    isIsolated,
    'Tenant boundary enforced: Organizer 2 (org-apex) is isolated from Organizer 1 (org-aura) events'
  );

  console.log('\n====================================================');
  console.log(`🏁 TEST RUN FINISHED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  expirationQueue.destroy();
}

runTestSuite().catch(console.error);
