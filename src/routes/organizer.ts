import { Router, Request, Response } from 'express';
import { db } from '../services/db';
import { cache } from '../services/cache';
import { getAuthenticatedUser } from './auth';
import { Event, TicketCategory } from '../types';

const router = Router();

// Middleware: ensure user is ORGANIZER or ADMIN and has organizationId
function requireOrganizer(req: Request, res: Response, next: () => void) {
  const user = getAuthenticatedUser(req);
  if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access restricted to event organizers.' });
  }
  if (!user.organizationId && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'User does not belong to any organization.' });
  }
  next();
}

router.use(requireOrganizer);

// GET /api/organizer/events - Multi-tenant isolated event listing
router.get('/events', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const targetOrgId = user.organizationId;

  const events = Array.from(db.events.values())
    .filter((e) => user.role === 'ADMIN' || e.organizationId === targetOrgId)
    .map((e) => {
      const tiers = Array.from(db.ticketCategories.values()).filter((t) => t.eventId === e.id);
      const totalSold = tiers.reduce((acc, t) => acc + t.soldQuantity, 0);
      const totalReserved = tiers.reduce((acc, t) => acc + t.reservedQuantity, 0);
      const totalAvailable = tiers.reduce((acc, t) => acc + t.availableQuantity, 0);
      const totalRevenue = tiers.reduce((acc, t) => acc + t.soldQuantity * t.price, 0);

      return {
        ...e,
        ticketCategories: tiers,
        stats: {
          totalSold,
          totalReserved,
          totalAvailable,
          totalRevenue,
        },
      };
    });

  res.json({ events });
});

// POST /api/organizer/events - Create new event
router.post('/events', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const orgId = user.organizationId || 'org-aura';

  const {
    title,
    description,
    category,
    coverImageUrl,
    venueName,
    address,
    city,
    eventDate,
    doorsOpenTime,
    bookingOpensAt,
    bookingClosesAt,
    maxCapacity,
    ticketCategories,
  } = req.body;

  if (!title || !category || !venueName || !eventDate) {
    return res.status(400).json({ error: 'Required fields: title, category, venueName, eventDate.' });
  }

  const org = db.organizations.get(orgId);
  const eventId = `evt-${Date.now()}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-') + `-${Date.now().toString(36)}`;

  const newEvent: Event = {
    id: eventId,
    organizationId: orgId,
    organizationName: org?.name || 'Organization',
    title,
    slug,
    description: description || '',
    category: category || 'Music',
    coverImageUrl: coverImageUrl || '/src/assets/images/hero_event_stage_1793115717016.jpg',
    venueName,
    address: address || '',
    city: city || 'Bengaluru',
    eventDate,
    doorsOpenTime: doorsOpenTime || '18:00',
    bookingOpensAt: bookingOpensAt || new Date().toISOString(),
    bookingClosesAt: bookingClosesAt || eventDate,
    maxCapacity: Number(maxCapacity) || 1000,
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.events.set(eventId, newEvent);

  // Add initial ticket tiers if provided
  if (Array.isArray(ticketCategories) && ticketCategories.length > 0) {
    for (const cat of ticketCategories) {
      const catId = `tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const qty = Number(cat.quantity) || 100;
      const tier: TicketCategory = {
        id: catId,
        eventId,
        name: cat.name || 'General Admission',
        description: cat.description || '',
        price: Number(cat.price) || 500,
        totalQuantity: qty,
        availableQuantity: qty,
        reservedQuantity: 0,
        soldQuantity: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.ticketCategories.set(catId, tier);
    }
  } else {
    // Default standard pass tier
    const catId = `tc-${Date.now()}-std`;
    db.ticketCategories.set(catId, {
      id: catId,
      eventId,
      name: 'Standard Pass',
      description: 'Standard event entry ticket',
      price: 999,
      totalQuantity: 250,
      availableQuantity: 250,
      reservedQuantity: 0,
      soldQuantity: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Invalidate Redis cache
  cache.invalidateEventCaches(eventId);

  db.logAudit(
    user.id,
    user.email,
    'CREATE_EVENT',
    'EVENT',
    eventId,
    `Created event "${newEvent.title}" under organization ${org?.name}`
  );

  res.status(201).json({ event: newEvent, message: 'Event successfully created.' });
});

// PUT /api/organizer/events/:id - Update event with tenant check
router.put('/events/:id', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { id } = req.params;

  const event = db.events.get(id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  // Tenant Isolation: verify ownership
  if (user.role !== 'ADMIN' && event.organizationId !== user.organizationId) {
    return res.status(403).json({ error: 'Unauthorized: Cannot modify events belonging to another organization.' });
  }

  const {
    title,
    description,
    category,
    venueName,
    address,
    city,
    eventDate,
    doorsOpenTime,
    bookingOpensAt,
    bookingClosesAt,
    maxCapacity,
    status,
    coverImageUrl,
  } = req.body;

  if (title) event.title = title;
  if (description !== undefined) event.description = description;
  if (category) event.category = category;
  if (venueName) event.venueName = venueName;
  if (address !== undefined) event.address = address;
  if (city) event.city = city;
  if (eventDate) event.eventDate = eventDate;
  if (doorsOpenTime) event.doorsOpenTime = doorsOpenTime;
  if (bookingOpensAt) event.bookingOpensAt = bookingOpensAt;
  if (bookingClosesAt) event.bookingClosesAt = bookingClosesAt;
  if (maxCapacity) event.maxCapacity = Number(maxCapacity);
  if (status) event.status = status;
  if (coverImageUrl) event.coverImageUrl = coverImageUrl;
  event.updatedAt = new Date().toISOString();

  // Invalidate cache
  cache.invalidateEventCaches(id);

  db.logAudit(
    user.id,
    user.email,
    'UPDATE_EVENT',
    'EVENT',
    id,
    `Updated event "${event.title}"`
  );

  res.json({ event, message: 'Event updated successfully.' });
});

// POST /api/organizer/events/:eventId/tickets - Add ticket tier
router.post('/events/:eventId/tickets', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { eventId } = req.params;

  const event = db.events.get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  // Tenant isolation
  if (user.role !== 'ADMIN' && event.organizationId !== user.organizationId) {
    return res.status(403).json({ error: 'Unauthorized: Cross-tenant ticket modification denied.' });
  }

  const { name, description, price, quantity } = req.body;
  if (!name || price === undefined || !quantity) {
    return res.status(400).json({ error: 'Tier name, price, and quantity are required.' });
  }

  const catId = `tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const qty = Number(quantity);

  const tier: TicketCategory = {
    id: catId,
    eventId,
    name,
    description: description || '',
    price: Number(price),
    totalQuantity: qty,
    availableQuantity: qty,
    reservedQuantity: 0,
    soldQuantity: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.ticketCategories.set(catId, tier);
  cache.invalidateEventCaches(eventId);

  db.logAudit(
    user.id,
    user.email,
    'CREATE_TICKET_TIER',
    'TICKET_CATEGORY',
    catId,
    `Added tier "${name}" (₹${price}, Qty: ${qty}) to event "${event.title}"`
  );

  res.status(201).json({ ticketCategory: tier, message: 'Ticket tier created.' });
});

// PUT /api/organizer/tickets/:id - Edit ticket tier (price, total stock, active status)
router.put('/tickets/:id', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { id } = req.params;

  const tier = db.ticketCategories.get(id);
  if (!tier) {
    return res.status(404).json({ error: 'Ticket tier not found.' });
  }

  const event = db.events.get(tier.eventId);
  if (!event || (user.role !== 'ADMIN' && event.organizationId !== user.organizationId)) {
    return res.status(403).json({ error: 'Unauthorized: Cross-tenant modification denied.' });
  }

  const { name, description, price, totalQuantity, isActive } = req.body;

  // Lock this category during update
  const unlock = await db.lockTicketCategory(id);
  try {
    if (name) tier.name = name;
    if (description !== undefined) tier.description = description;
    if (price !== undefined) tier.price = Number(price);
    if (isActive !== undefined) tier.isActive = Boolean(isActive);

    if (totalQuantity !== undefined) {
      const newTotal = Number(totalQuantity);
      const committed = tier.soldQuantity + tier.reservedQuantity;
      if (newTotal < committed) {
        return res.status(400).json({
          error: `Cannot reduce total capacity below already committed quantity (${committed} sold/reserved).`,
        });
      }
      tier.totalQuantity = newTotal;
      tier.availableQuantity = newTotal - committed;
    }

    tier.updatedAt = new Date().toISOString();
  } finally {
    unlock();
  }

  cache.invalidateEventCaches(tier.eventId);

  res.json({ ticketCategory: tier, message: 'Ticket tier updated.' });
});

// GET /api/organizer/registrations - Export attendee registration records for organizer's events
router.get('/registrations', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const orgEvents = Array.from(db.events.values()).filter(
    (e) => user.role === 'ADMIN' || e.organizationId === user.organizationId
  );
  const orgEventIds = new Set(orgEvents.map((e) => e.id));

  const orders = Array.from(db.orders.values()).filter((o) => orgEventIds.has(o.eventId));

  const registrations = orders.flatMap((o) =>
    o.items.map((item) => ({
      orderId: o.id,
      bookingReference: o.bookingReference,
      eventId: o.eventId,
      eventTitle: o.eventTitle,
      attendeeName: item.attendeeName || o.userName,
      attendeeEmail: item.attendeeEmail || o.userEmail,
      ticketCategory: item.ticketCategoryName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalAmount: item.totalPrice,
      orderStatus: o.status,
      bookedAt: o.createdAt,
    }))
  );

  res.json({ registrations });
});

export default router;
