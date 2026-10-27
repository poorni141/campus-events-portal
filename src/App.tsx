import React, { useState, useEffect } from 'react';
import {
  User,
  Organization,
  Event,
  TicketCategory,
  Reservation,
  Order,
  AnalyticsOverview,
} from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { EventCard } from './components/EventCard';
import { TicketSelectorModal } from './components/TicketSelectorModal';
import { CheckoutView } from './components/CheckoutView';
import { ConfirmationView } from './components/ConfirmationView';
import { AttendeeDashboard } from './components/AttendeeDashboard';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { AnalyticsView } from './components/AnalyticsView';
import { AdminDashboard } from './components/AdminDashboard';
import { ConcurrencyLab } from './components/ConcurrencyLab';
import { ERSchemaModal } from './components/ERSchemaModal';
import { AuthModal } from './components/AuthModal';
import {
  Search,
  MapPin,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<
    'events' | 'checkout' | 'confirmation' | 'my-bookings' | 'organizer' | 'analytics' | 'admin' | 'lab'
  >('events');

  // Modal States
  const [isErModalOpen, setIsErModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');

  // Authenticated User State
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr-attendee-1',
    email: 'sarah.jenkins@example.com',
    name: 'Sarah Jenkins',
    role: 'ATTENDEE',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  });
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);

  // Events & Categories
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // Selected Event & Ticket Selector Modal
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventTicketCategories, setEventTicketCategories] = useState<TicketCategory[]>([]);
  const [isReserving, setIsReserving] = useState<boolean>(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  // Active 10-Minute Hold Reservation & Countdown
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [reservationTimeRemaining, setReservationTimeRemaining] = useState<number>(0);

  // Confirmed Order State
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Organizer Events & Analytics
  const [organizerEvents, setOrganizerEvents] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsOverview | null>(null);
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState<boolean>(false);

  // 1. Fetch Demo Users and Initial Data
  useEffect(() => {
    fetch('/api/auth/demo-users')
      .then((r) => r.json())
      .then((data) => setDemoUsers(data))
      .catch((err) => console.error(err));

    fetchEvents();
    fetchUserOrders(currentUser.id);
  }, []);

  // 2. Fetch Events (respects search, category, city filters)
  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedCity !== 'All') params.append('city', selectedCity);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, selectedCity]);

  // 3. User Switcher
  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'x-user-id': userId },
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        setCurrentOrg(data.organization);
        fetchUserOrders(data.user.id);

        if (data.user.role === 'ORGANIZER') {
          fetchOrganizerData(userId);
          setCurrentTab('organizer');
        } else if (data.user.role === 'ADMIN') {
          setCurrentTab('admin');
        } else {
          setCurrentTab('events');
        }
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  // 4. Fetch Attendee Orders
  const fetchUserOrders = async (userId: string) => {
    try {
      const res = await fetch('/api/orders', {
        headers: { 'x-user-id': userId },
      });
      const data = await res.json();
      setUserOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Fetch Organizer Data
  const fetchOrganizerData = async (userId: string = currentUser.id) => {
    try {
      const [resEv, resAn] = await Promise.all([
        fetch('/api/organizer/events', { headers: { 'x-user-id': userId } }).then((r) => r.json()),
        fetch('/api/organizer/analytics/overview', { headers: { 'x-user-id': userId } }).then((r) => r.json()),
      ]);
      setOrganizerEvents(resEv.events || []);
      setAnalyticsData(resAn.analytics || null);
    } catch (err) {
      console.error('Failed to load organizer data:', err);
    }
  };

  // 6. Reservation Countdown Timer Effect
  useEffect(() => {
    if (!activeReservation || activeReservation.status !== 'PENDING') return;

    const timer = setInterval(() => {
      const expiresAt = new Date(activeReservation.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setReservationTimeRemaining(diff);

      if (diff === 0) {
        clearInterval(timer);
        setActiveReservation((prev) => (prev ? { ...prev, status: 'EXPIRED' } : null));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeReservation]);

  // 7. Handle Event Selection for Booking
  const handleSelectEvent = async (event: Event) => {
    try {
      const res = await fetch(`/api/events/${event.id}`);
      const data = await res.json();
      setSelectedEvent(data.event);
      setEventTicketCategories(data.event.ticketCategories || []);
      setReservationError(null);
    } catch (err) {
      console.error('Failed to load event details:', err);
    }
  };

  // 8. Handle Create Reservation (10-minute hold)
  const handleReserveTickets = async (items: { ticketCategoryId: string; quantity: number }[]) => {
    if (!selectedEvent) return;
    setIsReserving(true);
    setReservationError(null);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          items,
          idempotencyKey: `idem-res-${Date.now()}-${currentUser.id}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReservationError(data.error || 'Failed to hold tickets.');
        return;
      }

      setActiveReservation(data.reservation);
      setReservationTimeRemaining(data.timeRemainingSeconds);
      setSelectedEvent(null);
      setCurrentTab('checkout');
    } catch (err: any) {
      setReservationError(err.message || 'Network error while making reservation.');
    } finally {
      setIsReserving(false);
    }
  };

  // 9. Handle Cancel Reservation Early
  const handleCancelReservation = async (reservationId: string) => {
    try {
      await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
      });
      setActiveReservation(null);
      setReservationTimeRemaining(0);
      fetchEvents();
      setCurrentTab('events');
    } catch (err) {
      console.error(err);
    }
  };

  // 10. Handle Simulated Payment
  const handlePay = async (params: {
    reservationId: string;
    action: 'APPROVE' | 'REJECT';
    paymentMethod: string;
    failureReason?: string;
  }) => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const initRes = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          reservationId: params.reservationId,
          paymentMethod: params.paymentMethod,
          idempotencyKey: `pay-idem-${params.reservationId}`,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        setPaymentError(initData.error || 'Failed to initialize payment.');
        setIsProcessingPayment(false);
        return;
      }

      const simRes = await fetch(`/api/payments/${initData.transactionId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: params.action,
          failureReason: params.failureReason,
          delayMs: 600,
        }),
      });

      const simData = await simRes.json();
      if (!simRes.ok || simData.transaction?.status === 'FAILED') {
        setPaymentError(
          simData.transaction?.failureReason || simData.error || 'Payment was declined by mock gateway.'
        );
        setIsProcessingPayment(false);
        return;
      }

      setConfirmedOrder(simData.order);
      setActiveReservation(null);
      setReservationTimeRemaining(0);
      fetchUserOrders(currentUser.id);
      fetchEvents();
      setCurrentTab('confirmation');
    } catch (err: any) {
      setPaymentError(err.message || 'Payment simulation error.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 11. Attendee Cancel Booking
  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        fetchUserOrders(currentUser.id);
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 12. Organizer Actions
  const handleCreateEvent = async (eventData: any) => {
    const res = await fetch('/api/organizer/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify(eventData),
    });
    if (res.ok) {
      fetchOrganizerData(currentUser.id);
      fetchEvents();
    }
  };

  const handleUpdateEvent = async (eventId: string, eventData: any) => {
    await fetch(`/api/organizer/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify(eventData),
    });
    fetchOrganizerData(currentUser.id);
    fetchEvents();
  };

  const handleAddTicketTier = async (eventId: string, tierData: any) => {
    await fetch(`/api/organizer/events/${eventId}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify(tierData),
    });
    fetchOrganizerData(currentUser.id);
  };

  const handleUpdateTicketTier = async (tierId: string, tierData: any) => {
    await fetch(`/api/organizer/tickets/${tierId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify(tierData),
    });
    fetchOrganizerData(currentUser.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8FC] text-slate-900 selection:bg-[#FF626B]/25">
      {/* 1. Sleek Navigation Bar with Deep Plum-Purple Background */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => setCurrentTab(tab as any)}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        activeReservation={activeReservation}
        reservationTimeRemaining={reservationTimeRemaining}
        onOpenReservation={() => setCurrentTab('checkout')}
        demoUsers={demoUsers}
        onOpenERSchema={() => setIsErModalOpen(true)}
        onOpenAuth={(mode) => {
          setAuthInitialMode(mode);
          setIsAuthModalOpen(true);
        }}
      />

      <main className="flex-1">
        {/* VIEW 1: Public Events & Discovery */}
        {currentTab === 'events' && (
          <div>
            {/* 2. Hero Section: Full-width Dark Plum & Deep Purple Gradient, Centered & Oversized */}
            <section className="relative bg-gradient-to-b from-[#210D2D] via-[#2A1038] to-[#30123D] text-white overflow-hidden py-18 sm:py-24 lg:py-28">
              {/* Soft atmospheric background lights */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#FF626B]/20 blur-[120px] rounded-full" />
                <div className="absolute top-1/2 left-1/4 w-[500px] h-[300px] bg-purple-600/20 blur-[100px] rounded-full" />
              </div>

              <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {/* Small Rounded Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-[#FAF8FC] shadow-sm mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#FF626B] animate-pulse" />
                  <span>Concurrency-Safe Ticket Engine · 10-Minute Fair Holds</span>
                </div>

                {/* Oversized Centered Headline (Line 1: White, Line 2: Coral Pink) */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-white text-balance">
                  <span>Live Experiences, Reserved</span>
                  <span className="block text-[#FF626B] mt-1 sm:mt-2">
                    Without Compromise
                  </span>
                </h1>

                {/* Centered Supporting Paragraph in Muted Lavender-Gray */}
                <p className="mt-6 text-base sm:text-lg text-[#B9ADC5] max-w-2xl mx-auto leading-relaxed">
                  Discover premier music festivals, technology conferences, and culinary expos. Temporarily lock your passes for 10 minutes with zero risk of overselling.
                </p>

                {/* 3. Event Search Bar: Horizontal on Desktop, White Background, Rounded-2xl, Subtle Shadow */}
                <div className="mt-10 max-w-4xl mx-auto bg-white p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-white/20 text-slate-900">
                  <div className="flex flex-col md:flex-row items-center gap-2">
                    {/* Search Input: Occupies majority of width */}
                    <div className="flex-1 flex items-center gap-3 px-3.5 py-2 w-full">
                      <Search className="w-5 h-5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search by event name, keynote speaker, or venue..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
                        className="w-full text-sm bg-transparent focus:outline-none placeholder:text-slate-400 font-medium"
                      />
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />

                    {/* City Selector with Location Icon */}
                    <div className="flex items-center gap-2 px-3 py-2 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-100">
                      <MapPin className="w-4 h-4 text-[#FF626B] shrink-0" />
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="text-xs sm:text-sm bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer pr-4"
                      >
                        <option value="All">All Cities</option>
                        <option value="Bengaluru">Bengaluru</option>
                        <option value="New Delhi">New Delhi</option>
                        <option value="Mumbai">Mumbai</option>
                      </select>
                    </div>

                    {/* Coral-Pink "Find Passes" Button with Right-Arrow Icon */}
                    <button
                      onClick={fetchEvents}
                      className="w-full md:w-auto px-6 py-3 bg-[#FF626B] hover:bg-[#FA4F59] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0 hover:scale-[1.01]"
                    >
                      <span>Find Passes</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Invariant Proof Strip */}
            <section className="bg-white border-b border-[#EDE7F2]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-800">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FF626B]/10 text-[#FF626B] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#210D2D]">Zero Overselling Protection</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Row-level locks guarantee atomic stock counts during high-volume flash sales.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#30123D] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#210D2D]">10-Minute Fair Holds</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Your chosen tickets are locked exclusively for you until payment or timeout.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#210D2D]">Verified Organizers</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Every event is moderated by platform admins with real-time audit ledger tracking.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Events Discovery Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
              {/* Category Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#210D2D]">
                    Upcoming Featured Events
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Showing available events with real-time ticket inventory.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-[#EDE7F2] rounded-xl overflow-x-auto">
                  {['All', 'Music', 'Tech', 'Culinary', 'Arts'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-white text-[#210D2D] shadow-xs'
                          : 'text-slate-600 hover:text-[#210D2D]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Events Grid */}
              {loadingEvents ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-96 rounded-2xl bg-slate-200/60 animate-pulse border border-slate-200"
                    />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
                  <p className="font-bold text-sm text-[#210D2D]">No events found matching your criteria</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Try clearing filters or changing city parameters.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedCity('All');
                      setSearchQuery('');
                      fetchEvents();
                    }}
                    className="px-4 py-2 bg-[#210D2D] text-white text-xs font-bold rounded-lg hover:bg-[#FF626B] transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} onSelect={handleSelectEvent} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW 2: Checkout & 10-Minute Hold Countdown */}
        {currentTab === 'checkout' && activeReservation && (
          <CheckoutView
            reservation={activeReservation}
            event={selectedEvent}
            timeRemainingSeconds={reservationTimeRemaining}
            onPay={handlePay}
            onCancelReservation={handleCancelReservation}
            onReturnToEvents={() => setCurrentTab('events')}
            isProcessing={isProcessingPayment}
            paymentError={paymentError}
          />
        )}

        {/* VIEW 3: Payment Result & Booking Confirmation */}
        {currentTab === 'confirmation' && confirmedOrder && (
          <ConfirmationView
            order={confirmedOrder}
            onViewBookings={() => setCurrentTab('my-bookings')}
            onExploreMore={() => setCurrentTab('events')}
          />
        )}

        {/* VIEW 4: Attendee Dashboard (My Bookings) */}
        {currentTab === 'my-bookings' && (
          <AttendeeDashboard
            orders={userOrders}
            activeReservation={activeReservation}
            reservationTimeRemaining={reservationTimeRemaining}
            onResumeReservation={() => setCurrentTab('checkout')}
            onCancelOrder={handleCancelOrder}
            onExploreEvents={() => setCurrentTab('events')}
          />
        )}

        {/* VIEW 5: Multi-Tenant Organizer Hub */}
        {currentTab === 'organizer' && (
          <OrganizerDashboard
            currentUser={currentUser}
            organization={currentOrg}
            events={organizerEvents}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onAddTicketTier={handleAddTicketTier}
            onUpdateTicketTier={handleUpdateTicketTier}
          />
        )}

        {/* VIEW 6: Sales Analytics */}
        {currentTab === 'analytics' && (
          <AnalyticsView
            analytics={analyticsData}
            onRefresh={() => fetchOrganizerData(currentUser.id)}
            isRefreshing={isRefreshingAnalytics}
          />
        )}

        {/* VIEW 7: Platform Administrator */}
        {currentTab === 'admin' && (
          <AdminDashboard
            onToggleEventStatus={async () => {}}
            onRefreshStats={() => {}}
          />
        )}

        {/* VIEW 8: Concurrency & Reliability Benchmark Lab */}
        {currentTab === 'lab' && <ConcurrencyLab />}
      </main>

      {/* Ticket Selection Modal */}
      {selectedEvent && (
        <TicketSelectorModal
          event={selectedEvent}
          ticketCategories={eventTicketCategories}
          onClose={() => setSelectedEvent(null)}
          onReserve={handleReserveTickets}
          isSubmitting={isReserving}
          errorMessage={reservationError}
        />
      )}

      {/* ER Schema Modal */}
      <ERSchemaModal
        isOpen={isErModalOpen}
        onClose={() => setIsErModalOpen(false)}
      />

      {/* Login & Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authInitialMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          fetchUserOrders(user.id);
        }}
        demoUsers={demoUsers}
        onSelectDemoUser={handleSwitchUser}
      />

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
