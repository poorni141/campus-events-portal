export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  website?: string;
  contactEmail: string;
  isVerified: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'SUSPENDED';
export type EventCategory = 'Music' | 'Tech' | 'Culinary' | 'Arts' | 'Sports' | 'Business';

export interface Event {
  id: string;
  organizationId: string;
  organizationName?: string;
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  coverImageUrl: string;
  venueName: string;
  address: string;
  city: string;
  eventDate: string; // ISO date string
  doorsOpenTime: string;
  bookingOpensAt: string;
  bookingClosesAt: string;
  maxCapacity: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  ticketCategories?: TicketCategory[];
}

export interface TicketCategory {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number; // in INR (₹)
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export interface ReservationItem {
  id: string;
  reservationId: string;
  ticketCategoryId: string;
  ticketCategoryName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Reservation {
  id: string;
  userId: string;
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  venueName?: string;
  status: ReservationStatus;
  expiresAt: string; // 10 minutes from creation
  idempotencyKey?: string;
  totalAmount: number;
  items: ReservationItem[];
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  ticketCategoryId: string;
  ticketCategoryName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  attendeeName?: string;
  attendeeEmail?: string;
}

export interface Order {
  id: string;
  bookingReference: string; // e.g. TN-ORD-83921
  userId: string;
  userEmail: string;
  userName: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  reservationId: string;
  paymentTransactionId: string;
  totalAmount: number;
  status: OrderStatus;
  items: OrderItem[];
  qrCodeData: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentTransaction {
  id: string;
  reservationId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  paymentGatewayRef: string;
  idempotencyKey: string;
  failureReason?: string;
  processedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: 'EVENT' | 'RESERVATION' | 'ORDER' | 'USER' | 'ORGANIZATION' | 'TICKET_CATEGORY';
  entityId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'BOOKING_SUCCESS' | 'RESERVATION_EXPIRING' | 'PAYMENT_FAILED' | 'EVENT_UPDATE';
  isRead: boolean;
  createdAt: string;
}

export interface AnalyticsOverview {
  totalEvents: number;
  publishedEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  confirmedBookings: number;
  pendingReservations: number;
  remainingInventory: number;
  conversionRate: number; // percentage
  revenueByCategory: { category: string; revenue: number; tickets: number }[];
  salesTrend: { date: string; revenue: number; bookings: number }[];
  categoryPerformance: { name: string; sold: number; total: number; price: number }[];
}

export interface ConcurrencyTestResult {
  totalRequests: number;
  successfulReservations: number;
  rejectedReservations: number;
  initialStock: number;
  finalStock: number;
  heldStock: number;
  durationMs: number;
  passed: boolean;
  logs: string[];
}
