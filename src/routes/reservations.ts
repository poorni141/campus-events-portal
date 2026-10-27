import { Router, Request, Response } from 'express';
import { db } from '../services/db';
import { cache } from '../services/cache';
import { expirationQueue } from '../services/queue';
import { getAuthenticatedUser } from './auth';

const router = Router();

// POST /api/reservations - Atomic concurrency-safe ticket reservation
router.post('/', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { eventId, items, idempotencyKey } = req.body;

  if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Event ID and at least one ticket tier are required.' });
  }

  const result = await db.createReservation({
    userId: user.id,
    eventId,
    items,
    idempotencyKey,
  });

  if (!result.success || !result.reservation) {
    return res.status(400).json({ error: result.error || 'Unable to complete reservation.' });
  }

  // Schedule BullMQ expiration worker for 10 minutes (600,000 ms)
  expirationQueue.scheduleExpiration(result.reservation.id, 10 * 60 * 1000);

  // Invalidate cached event listing to reflect reserved inventory
  cache.invalidateEventCaches(eventId);

  const timeRemainingSeconds = Math.max(
    0,
    Math.floor((new Date(result.reservation.expiresAt).getTime() - Date.now()) / 1000)
  );

  res.status(201).json({
    reservation: result.reservation,
    timeRemainingSeconds,
    message: 'Tickets temporarily held for 10 minutes. Please complete payment to confirm.',
  });
});

// GET /api/reservations/:id - Fetch reservation status & remaining countdown
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const reservation = db.reservations.get(id);

  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found.' });
  }

  const now = Date.now();
  const expiresAtMs = new Date(reservation.expiresAt).getTime();
  const timeRemainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));

  // If expired and still marked pending, trigger background expiration
  if (reservation.status === 'PENDING' && timeRemainingSeconds === 0) {
    db.releaseReservation(id, 'EXPIRED');
    expirationQueue.cancelExpiration(id);
    reservation.status = 'EXPIRED';
  }

  res.json({
    reservation,
    timeRemainingSeconds,
    isExpired: reservation.status === 'EXPIRED' || (reservation.status === 'PENDING' && timeRemainingSeconds === 0),
  });
});

// POST /api/reservations/:id/cancel - Manual reservation cancellation
router.post('/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params;
  const reservation = db.reservations.get(id);

  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found.' });
  }

  const result = await db.releaseReservation(id, 'CANCELLED');
  expirationQueue.cancelExpiration(id);
  cache.invalidateEventCaches(reservation.eventId);

  res.json({
    success: result.success,
    status: 'CANCELLED',
    message: result.message,
  });
});

export default router;
