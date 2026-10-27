import { Router, Request, Response } from 'express';
import { db } from '../services/db';
import { cache } from '../services/cache';
import { getAuthenticatedUser } from './auth';

const router = Router();

// GET /api/orders - List bookings for authenticated attendee
router.get('/', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);

  const orders = Array.from(db.orders.values())
    .filter((o) => (user.role === 'ADMIN' ? true : o.userId === user.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ orders });
});

// GET /api/orders/:id - Fetch single order details & ticket pass
router.get('/:id', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { id } = req.params;

  const order = db.orders.get(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  // Authorization check
  if (user.role !== 'ADMIN' && order.userId !== user.id) {
    return res.status(403).json({ error: 'Unauthorized to view this order.' });
  }

  const event = db.events.get(order.eventId);

  res.json({
    order,
    event,
  });
});

// POST /api/orders/:id/cancel - Cancel eligible booking and restore inventory
router.post('/:id/cancel', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { id } = req.params;

  const order = db.orders.get(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const result = await db.cancelOrder(id, user.id);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  cache.invalidateEventCaches(order.eventId);

  res.json({
    success: true,
    message: result.message,
    order: db.orders.get(id),
  });
});

export default router;
