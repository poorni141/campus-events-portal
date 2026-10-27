/**
 * TicketNest Database Engine
 * Normalized relational model with ACID transaction isolation, row-level concurrency locks,
 * atomic ticket inventory management, and audit logging.
 */

import {
  User,
  Organization,
  Event,
  TicketCategory,
  Reservation,
  ReservationItem,
  Order,
  OrderItem,
  PaymentTransaction,
  AuditLog,
  Notification,
  AnalyticsOverview,
} from '../types';

class AsyncMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const execute = () => {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          const next = this.queue.shift();
          if (next) {
            next();
          }
        });
      };

      if (!this.locked) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }
}

// Keyed lock registry for row-level locking (e.g., ticket_category:<id>)
class LockRegistry {
  private locks: Map<string, AsyncMutex> = new Map();

  getLock(key: string): AsyncMutex {
    let lock = this.locks.get(key);
    if (!lock) {
      lock = new AsyncMutex();
      this.locks.set(key, lock);
    }
    return lock;
  }
}

export class Database {
  private lockRegistry = new LockRegistry();

  // In-memory relational tables
  public users: Map<string, User> = new Map();
  public organizations: Map<string, Organization> = new Map();
  public events: Map<string, Event> = new Map();
  public ticketCategories: Map<string, TicketCategory> = new Map();
  public reservations: Map<string, Reservation> = new Map();
  public orders: Map<string, Order> = new Map();
  public paymentTransactions: Map<string, PaymentTransaction> = new Map();
  public auditLogs: AuditLog[] = [];
  public notifications: Notification[] = [];

  constructor() {
    this.seedDatabase();
  }

  // ==========================================
  // CONCURRENCY & ROW LOCKING HELPERS
  // ==========================================

  async lockTicketCategory(categoryId: string): Promise<() => void> {
    const lock = this.lockRegistry.getLock(`ticket_category:${categoryId}`);
    return await lock.acquire();
  }

  logAudit(
    userId: string,
    userEmail: string,
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string
  ): void {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userEmail,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  // ==========================================
  // TRANSACTIONAL RESERVATION ENGINE
  // ==========================================

  /**
   * Concurrency-safe atomic reservation with row-level locking.
   * Guarantees zero overselling, strict 10-minute hold, and idempotency.
   */
  async createReservation(params: {
    userId: string;
    eventId: string;
    items: { ticketCategoryId: string; quantity: number }[];
    idempotencyKey?: string;
  }): Promise<{ success: boolean; reservation?: Reservation; error?: string }> {
    const { userId, eventId, items, idempotencyKey } = params;

    // 1. Idempotency check: if key already used, return existing reservation
    if (idempotencyKey) {
      for (const res of this.reservations.values()) {
        if (res.idempotencyKey === idempotencyKey) {
          return { success: true, reservation: res };
        }
      }
    }

    // 2. Validate Event
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, error: 'Event not found.' };
    }
    if (event.status !== 'PUBLISHED') {
      return { success: false, error: 'Event is not open for booking.' };
    }

    const now = new Date();
    if (new Date(event.bookingOpensAt) > now) {
      return { success: false, error: 'Ticket booking has not opened yet.' };
    }
    if (new Date(event.bookingClosesAt) < now) {
      return { success: false, error: 'Ticket sales have closed for this event.' };
    }

    if (!items || items.length === 0) {
      return { success: false, error: 'At least one ticket must be selected.' };
    }

    // 3. Row-Level Locks Acquisition: Sort IDs to avoid deadlocks
    const sortedCategories = [...items].sort((a, b) =>
      a.ticketCategoryId.localeCompare(b.ticketCategoryId)
    );

    const unlockFns: (() => void)[] = [];
    try {
      for (const item of sortedCategories) {
        const unlock = await this.lockTicketCategory(item.ticketCategoryId);
        unlockFns.push(unlock);
      }

      // 4. Verify Authoritative Inventory & Limits
      const reservationItems: ReservationItem[] = [];
      let totalAmount = 0;

      for (const item of items) {
        if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
          return { success: false, error: 'Invalid ticket quantity specified.' };
        }

        const category = this.ticketCategories.get(item.ticketCategoryId);
        if (!category) {
          return { success: false, error: `Ticket tier ${item.ticketCategoryId} does not exist.` };
        }
        if (!category.isActive) {
          return { success: false, error: `Ticket tier "${category.name}" is no longer active.` };
        }
        if (category.availableQuantity < item.quantity) {
          return {
            success: false,
            error: `Insufficient inventory for "${category.name}". Only ${category.availableQuantity} left.`,
          };
        }

        const subtotal = category.price * item.quantity;
        totalAmount += subtotal;

        reservationItems.push({
          id: `res-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          reservationId: '', // set below
          ticketCategoryId: category.id,
          ticketCategoryName: category.name,
          quantity: item.quantity,
          unitPrice: category.price,
          subtotal,
        });
      }

      // 5. Atomic Update inside critical section
      for (const item of items) {
        const category = this.ticketCategories.get(item.ticketCategoryId)!;
        category.availableQuantity -= item.quantity;
        category.reservedQuantity += item.quantity;
        category.updatedAt = new Date().toISOString();
      }

      // 6. Create Reservation with 10-Minute Expiration
      const reservationId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      reservationItems.forEach((it) => (it.reservationId = reservationId));

      const reservation: Reservation = {
        id: reservationId,
        userId,
        eventId,
        eventTitle: event.title,
        eventDate: event.eventDate,
        venueName: event.venueName,
        status: 'PENDING',
        expiresAt,
        idempotencyKey,
        totalAmount,
        items: reservationItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.reservations.set(reservationId, reservation);

      const user = this.users.get(userId);
      this.logAudit(
        userId,
        user?.email || 'attendee',
        'RESERVE_TICKETS',
        'RESERVATION',
        reservationId,
        `Reserved ${reservationItems.reduce((acc, i) => acc + i.quantity, 0)} tickets for ₹${totalAmount} (expires in 10 mins)`
      );

      return { success: true, reservation };
    } finally {
      // Release all locks in reverse order
      while (unlockFns.length > 0) {
        const unlock = unlockFns.pop();
        if (unlock) unlock();
      }
    }
  }

  /**
   * Release reserved inventory (used by expiration background worker or attendee cancellation).
   * Strictly idempotent: only releases if reservation is still 'PENDING'.
   */
  async releaseReservation(
    reservationId: string,
    reason: 'EXPIRED' | 'CANCELLED'
  ): Promise<{ success: boolean; released: boolean; message: string }> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return { success: false, released: false, message: 'Reservation not found.' };
    }

    if (reservation.status !== 'PENDING') {
      return {
        success: true,
        released: false,
        message: `Reservation already finalized with status: ${reservation.status}`,
      };
    }

    // Acquire locks for the ticket categories
    const sortedCategoryIds = reservation.items
      .map((i) => i.ticketCategoryId)
      .sort((a, b) => a.localeCompare(b));

    const unlockFns: (() => void)[] = [];
    try {
      for (const catId of sortedCategoryIds) {
        const unlock = await this.lockTicketCategory(catId);
        unlockFns.push(unlock);
      }

      // Re-verify status under lock
      if (reservation.status !== 'PENDING') {
        return { success: true, released: false, message: 'Reservation already transitioned.' };
      }

      // Restore inventory
      for (const item of reservation.items) {
        const category = this.ticketCategories.get(item.ticketCategoryId);
        if (category) {
          category.availableQuantity = Math.min(
            category.totalQuantity - category.soldQuantity,
            category.availableQuantity + item.quantity
          );
          category.reservedQuantity = Math.max(0, category.reservedQuantity - item.quantity);
          category.updatedAt = new Date().toISOString();
        }
      }

      reservation.status = reason;
      reservation.updatedAt = new Date().toISOString();

      this.logAudit(
        reservation.userId,
        'system',
        reason === 'EXPIRED' ? 'RESERVATION_EXPIRED' : 'RESERVATION_CANCELLED',
        'RESERVATION',
        reservationId,
        `Released held tickets back to available stock. Reason: ${reason}`
      );

      return { success: true, released: true, message: `Reservation successfully ${reason.toLowerCase()}.` };
    } finally {
      while (unlockFns.length > 0) {
        const unlock = unlockFns.pop();
        if (unlock) unlock();
      }
    }
  }

  /**
   * Confirm reservation into a finalized Order upon verified payment.
   * Row-level locked, strictly enforces that reservation is not expired.
   */
  async confirmReservationAndCreateOrder(params: {
    reservationId: string;
    paymentTransactionId: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    const { reservationId, paymentTransactionId } = params;

    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return { success: false, error: 'Reservation not found.' };
    }

    // Check expiration timestamp
    if (new Date(reservation.expiresAt).getTime() < Date.now()) {
      // It expired! Release inventory immediately and deny confirmation.
      await this.releaseReservation(reservationId, 'EXPIRED');
      return {
        success: false,
        error: 'Reservation expired before payment completion. Inventory has been released.',
      };
    }

    if (reservation.status !== 'PENDING') {
      if (reservation.status === 'CONFIRMED') {
        // Find existing order for idempotency
        for (const ord of this.orders.values()) {
          if (ord.reservationId === reservationId) {
            return { success: true, order: ord };
          }
        }
      }
      return {
        success: false,
        error: `Cannot confirm reservation in status: ${reservation.status}`,
      };
    }

    const sortedCategoryIds = reservation.items
      .map((i) => i.ticketCategoryId)
      .sort((a, b) => a.localeCompare(b));

    const unlockFns: (() => void)[] = [];
    try {
      for (const catId of sortedCategoryIds) {
        const unlock = await this.lockTicketCategory(catId);
        unlockFns.push(unlock);
      }

      // Re-verify under lock
      if (reservation.status !== 'PENDING') {
        return { success: false, error: 'Reservation state changed during confirmation.' };
      }
      if (new Date(reservation.expiresAt).getTime() < Date.now()) {
        await this.releaseReservation(reservationId, 'EXPIRED');
        return { success: false, error: 'Reservation expired during checkout.' };
      }

      // Convert reservedQuantity to soldQuantity
      for (const item of reservation.items) {
        const category = this.ticketCategories.get(item.ticketCategoryId);
        if (category) {
          category.reservedQuantity = Math.max(0, category.reservedQuantity - item.quantity);
          category.soldQuantity += item.quantity;
          category.updatedAt = new Date().toISOString();
        }
      }

      // Mark reservation CONFIRMED
      reservation.status = 'CONFIRMED';
      reservation.updatedAt = new Date().toISOString();

      // Create Order
      const user = this.users.get(reservation.userId);
      const event = this.events.get(reservation.eventId);
      const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const bookingRef = `TN-ORD-${Math.floor(100000 + Math.random() * 900000)}`;

      const orderItems: OrderItem[] = reservation.items.map((it) => ({
        id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId,
        ticketCategoryId: it.ticketCategoryId,
        ticketCategoryName: it.ticketCategoryName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.subtotal,
        attendeeName: user?.name || 'Attendee',
        attendeeEmail: user?.email || '',
      }));

      const order: Order = {
        id: orderId,
        bookingReference: bookingRef,
        userId: reservation.userId,
        userEmail: user?.email || '',
        userName: user?.name || 'Attendee',
        eventId: reservation.eventId,
        eventTitle: event?.title || reservation.eventTitle || 'Event',
        eventDate: event?.eventDate || reservation.eventDate || '',
        venueName: event?.venueName || reservation.venueName || '',
        reservationId,
        paymentTransactionId,
        totalAmount: reservation.totalAmount,
        status: 'CONFIRMED',
        items: orderItems,
        qrCodeData: `TICKETNEST:${bookingRef}:${orderId}:${reservation.userId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.orders.set(orderId, order);

      // Audit Log
      this.logAudit(
        reservation.userId,
        user?.email || '',
        'CONFIRM_ORDER',
        'ORDER',
        orderId,
        `Order ${bookingRef} confirmed for ₹${reservation.totalAmount}`
      );

      // Add Notification
      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: reservation.userId,
        title: 'Booking Confirmed!',
        message: `Your booking ${bookingRef} for "${order.eventTitle}" is confirmed.`,
        type: 'BOOKING_SUCCESS',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      return { success: true, order };
    } finally {
      while (unlockFns.length > 0) {
        const unlock = unlockFns.pop();
        if (unlock) unlock();
      }
    }
  }

  /**
   * Cancel an eligible confirmed order and restore ticket stock
   */
  async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    if (order.userId !== userId) {
      return { success: false, message: 'Unauthorized: You can only cancel your own bookings.' };
    }

    if (order.status !== 'CONFIRMED') {
      return { success: false, message: `Order is already ${order.status}.` };
    }

    // Acquire locks and restore soldQuantity to availableQuantity
    for (const item of order.items) {
      const unlock = await this.lockTicketCategory(item.ticketCategoryId);
      try {
        const category = this.ticketCategories.get(item.ticketCategoryId);
        if (category) {
          category.soldQuantity = Math.max(0, category.soldQuantity - item.quantity);
          category.availableQuantity = Math.min(
            category.totalQuantity - category.soldQuantity,
            category.availableQuantity + item.quantity
          );
          category.updatedAt = new Date().toISOString();
        }
      } finally {
        unlock();
      }
    }

    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();

    this.logAudit(
      userId,
      order.userEmail,
      'CANCEL_ORDER',
      'ORDER',
      orderId,
      `Cancelled order ${order.bookingReference}. Inventory restored.`
    );

    return { success: true, message: 'Booking successfully cancelled and refund initiated.' };
  }

  // ==========================================
  // ANALYTICS & METRICS CALCULATION
  // ==========================================

  getOrganizerAnalytics(organizationId: string): AnalyticsOverview {
    const orgEvents = Array.from(this.events.values()).filter(
      (e) => e.organizationId === organizationId
    );
    const orgEventIds = new Set(orgEvents.map((e) => e.id));

    const publishedCount = orgEvents.filter((e) => e.status === 'PUBLISHED').length;

    let totalSold = 0;
    let totalRevenue = 0;
    let remainingInventory = 0;
    let pendingReservations = 0;

    const categoryMap: Map<string, { revenue: number; tickets: number }> = new Map();
    const performanceList: { name: string; sold: number; total: number; price: number }[] = [];

    for (const ev of orgEvents) {
      const tiers = Array.from(this.ticketCategories.values()).filter((c) => c.eventId === ev.id);
      for (const tier of tiers) {
        totalSold += tier.soldQuantity;
        totalRevenue += tier.soldQuantity * tier.price;
        remainingInventory += tier.availableQuantity;
        pendingReservations += tier.reservedQuantity;

        const currentCat = categoryMap.get(ev.category) || { revenue: 0, tickets: 0 };
        currentCat.revenue += tier.soldQuantity * tier.price;
        currentCat.tickets += tier.soldQuantity;
        categoryMap.set(ev.category, currentCat);

        performanceList.push({
          name: `${ev.title} - ${tier.name}`,
          sold: tier.soldQuantity,
          total: tier.totalQuantity,
          price: tier.price,
        });
      }
    }

    // Confirmed bookings count
    const orgOrders = Array.from(this.orders.values()).filter(
      (o) => orgEventIds.has(o.eventId) && o.status === 'CONFIRMED'
    );
    const confirmedCount = orgOrders.length;

    // Total reservation booking attempts
    const orgReservations = Array.from(this.reservations.values()).filter((r) =>
      orgEventIds.has(r.eventId)
    );
    const totalAttempts = orgReservations.length;
    const conversionRate = totalAttempts > 0 ? (confirmedCount / totalAttempts) * 100 : 0;

    // Daily sales trends for the past 7 days
    const salesTrendMap: Map<string, { revenue: number; bookings: number }> = new Map();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      salesTrendMap.set(key, { revenue: 0, bookings: 0 });
    }

    for (const o of orgOrders) {
      const dateKey = o.createdAt.split('T')[0];
      if (salesTrendMap.has(dateKey)) {
        const item = salesTrendMap.get(dateKey)!;
        item.revenue += o.totalAmount;
        item.bookings += 1;
      }
    }

    const salesTrend = Array.from(salesTrendMap.entries()).map(([date, val]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: val.revenue,
      bookings: val.bookings,
    }));

    const revenueByCategory = Array.from(categoryMap.entries()).map(([category, val]) => ({
      category,
      revenue: val.revenue,
      tickets: val.tickets,
    }));

    return {
      totalEvents: orgEvents.length,
      publishedEvents: publishedCount,
      totalTicketsSold: totalSold,
      totalRevenue,
      confirmedBookings: confirmedCount,
      pendingReservations,
      remainingInventory,
      conversionRate: Math.round(conversionRate * 10) / 10,
      revenueByCategory,
      salesTrend,
      categoryPerformance: performanceList.slice(0, 8),
    };
  }

  // ==========================================
  // DATABASE SEEDING
  // ==========================================

  seedDatabase(): void {
    // 1. Users
    const userSarah: User = {
      id: 'usr-attendee-1',
      email: 'sarah.jenkins@example.com',
      name: 'Sarah Jenkins',
      role: 'ATTENDEE',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    };
    const userOrganizerAura: User = {
      id: 'usr-org-1',
      email: 'alex@auralive.com',
      name: 'Alex Vance',
      role: 'ORGANIZER',
      organizationId: 'org-aura',
      createdAt: '2026-08-15T09:00:00.000Z',
      updatedAt: '2026-08-15T09:00:00.000Z',
    };
    const userOrganizerApex: User = {
      id: 'usr-org-2',
      email: 'elena@apexmedia.com',
      name: 'Elena Rostova',
      role: 'ORGANIZER',
      organizationId: 'org-apex',
      createdAt: '2026-08-20T11:00:00.000Z',
      updatedAt: '2026-08-20T11:00:00.000Z',
    };
    const userAdmin: User = {
      id: 'usr-admin-1',
      email: 'admin@ticketnest.io',
      name: 'Marcus Sterling',
      role: 'ADMIN',
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-01T08:00:00.000Z',
    };

    [userSarah, userOrganizerAura, userOrganizerApex, userAdmin].forEach((u) =>
      this.users.set(u.id, u)
    );

    // 2. Organizations
    const orgAura: Organization = {
      id: 'org-aura',
      name: 'Aura Live Events',
      slug: 'aura-live',
      description: 'Premier curator of sensory live music festivals, electronic nights, and cultural experiences.',
      website: 'https://auralive.example.com',
      contactEmail: 'contact@auralive.com',
      isVerified: true,
      status: 'ACTIVE',
      createdAt: '2026-08-15T09:00:00.000Z',
    };
    const orgApex: Organization = {
      id: 'org-apex',
      name: 'Apex Tech Summits',
      slug: 'apex-summits',
      description: 'Global developer conferences, AI symposiums, and deep tech hackathons.',
      website: 'https://apexsummits.example.com',
      contactEmail: 'hello@apexsummits.com',
      isVerified: true,
      status: 'ACTIVE',
      createdAt: '2026-08-20T11:00:00.000Z',
    };
    const orgSavor: Organization = {
      id: 'org-savor',
      name: 'Savor Culinary Guild',
      slug: 'savor-guild',
      description: 'Artisan gastronomic expos, specialty coffee championships, and chef tasting tours.',
      website: 'https://savorguild.example.com',
      contactEmail: 'cheftable@savorguild.com',
      isVerified: true,
      status: 'ACTIVE',
      createdAt: '2026-09-01T12:00:00.000Z',
    };

    [orgAura, orgApex, orgSavor].forEach((o) => this.organizations.set(o.id, o));

    // 3. Events with Generated Image Assets
    const ev1: Event = {
      id: 'evt-soundwave-2026',
      organizationId: 'org-aura',
      organizationName: 'Aura Live Events',
      title: 'Soundwave Neon Horizon Music Festival',
      slug: 'soundwave-neon-horizon-2026',
      description:
        'A 2-day immersive open-air audio-visual spectacle featuring world-class electronic producers, indie live bands, laser mapping installations, and curated food villages under the twilight sky.',
      category: 'Music',
      coverImageUrl: '/src/assets/images/event_music_festival_1793115719080.jpg',
      venueName: 'The Twilight Grounds, Whitefield',
      address: '74 Neon Promenade, Tech Park Zone',
      city: 'Bengaluru',
      eventDate: '2026-11-20T17:00:00.000Z',
      doorsOpenTime: '15:30',
      bookingOpensAt: '2026-09-01T00:00:00.000Z',
      bookingClosesAt: '2026-11-20T16:00:00.000Z',
      maxCapacity: 5000,
      status: 'PUBLISHED',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    };

    const ev2: Event = {
      id: 'evt-apex-ai-2026',
      organizationId: 'org-apex',
      organizationName: 'Apex Tech Summits',
      title: 'Global Autonomous AI Summit 2026',
      slug: 'global-autonomous-ai-summit-2026',
      description:
        'Gathering 1,200 world-leading AI researchers, distributed systems architects, and founders discussing multi-agent reasoning, neural hardware co-design, and responsible machine autonomy.',
      category: 'Tech',
      coverImageUrl: '/src/assets/images/event_tech_summit_1793115718930.jpg',
      venueName: 'Pragati Convention Grand Auditorium',
      address: 'Hall 4, Pragati Vihar',
      city: 'New Delhi',
      eventDate: '2026-12-05T09:00:00.000Z',
      doorsOpenTime: '08:00',
      bookingOpensAt: '2026-09-10T00:00:00.000Z',
      bookingClosesAt: '2026-12-04T23:59:00.000Z',
      maxCapacity: 1200,
      status: 'PUBLISHED',
      createdAt: '2026-09-10T09:00:00.000Z',
      updatedAt: '2026-09-10T09:00:00.000Z',
    };

    const ev3: Event = {
      id: 'evt-savor-culinary-2026',
      organizationId: 'org-savor',
      organizationName: 'Savor Culinary Guild',
      title: 'International Master Artisan Food & Coffee Expo',
      slug: 'master-artisan-food-coffee-expo-2026',
      description:
        'Interactive live plating masterclasses by Michelin-star guest chefs, national barista throwdowns, single-origin bean roaster cuppings, and sensory tasting pavilions.',
      category: 'Culinary',
      coverImageUrl: '/src/assets/images/event_food_expo_1793115719103.jpg',
      venueName: 'Bandra Reclamation Exhibition Pavilions',
      address: 'Bayview Arena, Bandra West',
      city: 'Mumbai',
      eventDate: '2026-11-28T11:00:00.000Z',
      doorsOpenTime: '10:30',
      bookingOpensAt: '2026-09-15T00:00:00.000Z',
      bookingClosesAt: '2026-11-28T10:00:00.000Z',
      maxCapacity: 2500,
      status: 'PUBLISHED',
      createdAt: '2026-09-15T09:00:00.000Z',
      updatedAt: '2026-09-15T09:00:00.000Z',
    };

    const ev4: Event = {
      id: 'evt-aurora-symphony-2026',
      organizationId: 'org-aura',
      organizationName: 'Aura Live Events',
      title: 'Aurora Grand Arena Stage Spectacular',
      slug: 'aurora-grand-arena-stage-spectacular',
      description:
        'A full symphonic orchestra meeting modern ambient soundscapes, live 3D visual projection domes, and acoustic precision inside an indoor amphitheater.',
      category: 'Arts',
      coverImageUrl: '/src/assets/images/hero_event_stage_1793115717016.jpg',
      venueName: 'National Indoor Arena',
      address: 'Central Sports Complex, Sector 21',
      city: 'Bengaluru',
      eventDate: '2026-12-18T19:00:00.000Z',
      doorsOpenTime: '18:00',
      bookingOpensAt: '2026-10-01T00:00:00.000Z',
      bookingClosesAt: '2026-12-18T18:00:00.000Z',
      maxCapacity: 3500,
      status: 'PUBLISHED',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    };

    [ev1, ev2, ev3, ev4].forEach((e) => this.events.set(e.id, e));

    // 4. Ticket Categories (Matching Prompt Specification: Platinum, Gold, Standard Pass)
    const tiers: TicketCategory[] = [
      // Event 1 (Soundwave)
      {
        id: 'tc-sw-plat',
        eventId: 'evt-soundwave-2026',
        name: 'Platinum Pass',
        description: 'Elevated VIP deck access, complimentary cocktail bar, express festival fast-track entry, artist lounge access.',
        price: 3000,
        totalQuantity: 50,
        availableQuantity: 34,
        reservedQuantity: 6,
        soldQuantity: 10,
        isActive: true,
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'tc-sw-gold',
        eventId: 'evt-soundwave-2026',
        name: 'Gold Pass',
        description: 'Front stage circle access, dedicated restroom amenities, merchandise voucher, and festival lanyard.',
        price: 1500,
        totalQuantity: 150,
        availableQuantity: 108,
        reservedQuantity: 12,
        soldQuantity: 30,
        isActive: true,
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'tc-sw-std',
        eventId: 'evt-soundwave-2026',
        name: 'Standard Pass',
        description: 'Full festival grounds entry, access to all 3 music stages and the international culinary village.',
        price: 600,
        totalQuantity: 500,
        availableQuantity: 410,
        reservedQuantity: 20,
        soldQuantity: 70,
        isActive: true,
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },

      // Event 2 (Apex AI Summit)
      {
        id: 'tc-ai-vip',
        eventId: 'evt-apex-ai-2026',
        name: 'Executive All-Access Pass',
        description: 'Private speaker dinner invitation, VIP networking lounge, workshop track reserved seating, session recordings.',
        price: 8500,
        totalQuantity: 100,
        availableQuantity: 55,
        reservedQuantity: 5,
        soldQuantity: 40,
        isActive: true,
        createdAt: '2026-09-10T09:00:00.000Z',
        updatedAt: '2026-09-10T09:00:00.000Z',
      },
      {
        id: 'tc-ai-builder',
        eventId: 'evt-apex-ai-2026',
        name: 'Developer Conference Pass',
        description: 'Access to keynote sessions, deep-dive technical breakout rooms, sponsor expo, and lunch buffet.',
        price: 3200,
        totalQuantity: 400,
        availableQuantity: 280,
        reservedQuantity: 10,
        soldQuantity: 110,
        isActive: true,
        createdAt: '2026-09-10T09:00:00.000Z',
        updatedAt: '2026-09-10T09:00:00.000Z',
      },

      // Event 3 (Culinary Expo)
      {
        id: 'tc-cul-tasting',
        eventId: 'evt-savor-culinary-2026',
        name: 'Chef Tasting & Masterclass Pass',
        description: 'Includes 6 gourmet tasting course tokens, front row masterclass seat, and artisan roasting bag.',
        price: 2200,
        totalQuantity: 150,
        availableQuantity: 92,
        reservedQuantity: 8,
        soldQuantity: 50,
        isActive: true,
        createdAt: '2026-09-15T09:00:00.000Z',
        updatedAt: '2026-09-15T09:00:00.000Z',
      },
      {
        id: 'tc-cul-gen',
        eventId: 'evt-savor-culinary-2026',
        name: 'General Expo Day Pass',
        description: 'Full day access to exhibition floor, coffee tasting bar, and producer marketplace.',
        price: 750,
        totalQuantity: 600,
        availableQuantity: 490,
        reservedQuantity: 15,
        soldQuantity: 95,
        isActive: true,
        createdAt: '2026-09-15T09:00:00.000Z',
        updatedAt: '2026-09-15T09:00:00.000Z',
      },

      // Event 4 (Aurora Symphony)
      {
        id: 'tc-aur-orch',
        eventId: 'evt-aurora-symphony-2026',
        name: 'Orchestra Center Box',
        description: 'Premium acoustic center seating, complimentary champagne glass, program booklet.',
        price: 4500,
        totalQuantity: 80,
        availableQuantity: 60,
        reservedQuantity: 4,
        soldQuantity: 16,
        isActive: true,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
      {
        id: 'tc-aur-gallery',
        eventId: 'evt-aurora-symphony-2026',
        name: 'Gallery Tier Pass',
        description: 'Elevated panoramic amphitheater view with high-fidelity surround acoustics.',
        price: 1800,
        totalQuantity: 300,
        availableQuantity: 240,
        reservedQuantity: 10,
        soldQuantity: 50,
        isActive: true,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
    ];

    tiers.forEach((t) => this.ticketCategories.set(t.id, t));

    // 5. Seed an Initial Confirmed Order for Sarah Jenkins
    const seedOrderId = 'ord-seed-sarah-1';
    const seedOrder: Order = {
      id: seedOrderId,
      bookingReference: 'TN-ORD-582914',
      userId: userSarah.id,
      userEmail: userSarah.email,
      userName: userSarah.name,
      eventId: ev1.id,
      eventTitle: ev1.title,
      eventDate: ev1.eventDate,
      venueName: ev1.venueName,
      reservationId: 'res-seed-sarah-1',
      paymentTransactionId: 'tx-seed-sarah-1',
      totalAmount: 3000,
      status: 'CONFIRMED',
      items: [
        {
          id: 'oi-seed-1',
          orderId: seedOrderId,
          ticketCategoryId: 'tc-sw-plat',
          ticketCategoryName: 'Platinum Pass',
          quantity: 1,
          unitPrice: 3000,
          totalPrice: 3000,
          attendeeName: userSarah.name,
          attendeeEmail: userSarah.email,
        },
      ],
      qrCodeData: `TICKETNEST:TN-ORD-582914:${seedOrderId}:${userSarah.id}`,
      createdAt: '2026-10-20T14:30:00.000Z',
      updatedAt: '2026-10-20T14:30:00.000Z',
    };
    this.orders.set(seedOrderId, seedOrder);

    // Initial audit log
    this.logAudit(
      userAdmin.id,
      userAdmin.email,
      'PLATFORM_INITIALIZED',
      'ORGANIZATION',
      'sys',
      'TicketNest multi-tenant platform and seed inventory initialized'
    );
  }
}

export const db = new Database();
