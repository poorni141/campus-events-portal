import { Router, Request, Response } from 'express';
import { db } from '../services/db';
import { cache } from '../services/cache';
import { getAuthenticatedUser } from './auth';

const router = Router();

// Middleware: Admin check
function requireAdmin(req: Request, res: Response, next: () => void) {
  const user = getAuthenticatedUser(req);
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access restricted to Platform Administrators.' });
  }
  next();
}

router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', (_req: Request, res: Response) => {
  const users = Array.from(db.users.values());
  const orgs = Array.from(db.organizations.values());
  const events = Array.from(db.events.values());
  const orders = Array.from(db.orders.values());
  const reservations = Array.from(db.reservations.values());

  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED');
  const gmv = confirmedOrders.reduce((acc, o) => acc + o.totalAmount, 0);

  res.json({
    stats: {
      totalUsers: users.length,
      attendeeCount: users.filter((u) => u.role === 'ATTENDEE').length,
      organizerCount: users.filter((u) => u.role === 'ORGANIZER').length,
      totalOrganizations: orgs.length,
      totalEvents: events.length,
      publishedEvents: events.filter((e) => e.status === 'PUBLISHED').length,
      suspendedEvents: events.filter((e) => e.status === 'SUSPENDED').length,
      totalConfirmedOrders: confirmedOrders.length,
      totalGrossMerchandiseValue: gmv,
      pendingReservations: reservations.filter((r) => r.status === 'PENDING').length,
      cacheStats: cache.getStats(),
    },
  });
});

// GET /api/admin/users
router.get('/users', (_req: Request, res: Response) => {
  const users = Array.from(db.users.values()).map((u) => {
    const org = u.organizationId ? db.organizations.get(u.organizationId) : null;
    return {
      ...u,
      organizationName: org?.name,
    };
  });
  res.json({ users });
});

// GET /api/admin/organizations
router.get('/organizations', (_req: Request, res: Response) => {
  const orgs = Array.from(db.organizations.values()).map((o) => {
    const eventCount = Array.from(db.events.values()).filter((e) => e.organizationId === o.id).length;
    return {
      ...o,
      eventCount,
    };
  });
  res.json({ organizations: orgs });
});

// PATCH /api/admin/organizations/:id/status
router.patch('/organizations/:id/status', (req: Request, res: Response) => {
  const admin = getAuthenticatedUser(req);
  const { id } = req.params;
  const { status, isVerified } = req.body;

  const org = db.organizations.get(id);
  if (!org) {
    return res.status(404).json({ error: 'Organization not found.' });
  }

  if (status) org.status = status;
  if (isVerified !== undefined) org.isVerified = Boolean(isVerified);

  db.logAudit(
    admin.id,
    admin.email,
    'MODERATE_ORGANIZATION',
    'ORGANIZATION',
    id,
    `Admin updated organization status to ${org.status}, verified: ${org.isVerified}`
  );

  res.json({ organization: org, message: 'Organization updated.' });
});

// GET /api/admin/events
router.get('/events', (_req: Request, res: Response) => {
  const events = Array.from(db.events.values());
  res.json({ events });
});

// PATCH /api/admin/events/:id/status
router.patch('/events/:id/status', (req: Request, res: Response) => {
  const admin = getAuthenticatedUser(req);
  const { id } = req.params;
  const { status } = req.body;

  const event = db.events.get(id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  event.status = status;
  event.updatedAt = new Date().toISOString();

  cache.invalidateEventCaches(id);

  db.logAudit(
    admin.id,
    admin.email,
    'MODERATE_EVENT',
    'EVENT',
    id,
    `Admin set event status to ${status} for "${event.title}"`
  );

  res.json({ event, message: `Event status updated to ${status}.` });
});

// GET /api/admin/audit-logs
router.get('/audit-logs', (_req: Request, res: Response) => {
  res.json({ auditLogs: db.auditLogs });
});

export default router;
