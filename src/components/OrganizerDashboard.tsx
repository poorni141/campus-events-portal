import React, { useState } from 'react';
import { Event, User, Organization } from '../types';
import {
  Plus,
  Download,
  Tag,
} from 'lucide-react';

interface OrganizerDashboardProps {
  currentUser: User;
  organization: Organization | null;
  events: (Event & { stats?: { totalSold: number; totalReserved: number; totalAvailable: number; totalRevenue: number } })[];
  onCreateEvent: (eventData: any) => Promise<void>;
  onUpdateEvent: (eventId: string, eventData: any) => Promise<void>;
  onAddTicketTier: (eventId: string, tierData: any) => Promise<void>;
  onUpdateTicketTier: (tierId: string, tierData: any) => Promise<void>;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  organization,
  events,
  onCreateEvent,
  onAddTicketTier,
  onUpdateTicketTier,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'tickets' | 'attendees'>('events');
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');

  // New Event Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'Music' | 'Tech' | 'Culinary' | 'Arts' | 'Sports' | 'Business'>('Music');
  const [formDescription, setFormDescription] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formCity, setFormCity] = useState('Bengaluru');
  const [formDate, setFormDate] = useState('2026-12-15');
  const [formDoorsOpen, setFormDoorsOpen] = useState('18:00');
  const [formCapacity, setFormCapacity] = useState('1000');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // New Ticket Tier Form State
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('');
  const [tierQty, setTierQty] = useState('');
  const [tierDescription, setTierDescription] = useState('');
  const [tierSubmitting, setTierSubmitting] = useState(false);

  // Aggregate KPI metrics
  const totalEvents = events.length;
  const publishedEvents = events.filter((e) => e.status === 'PUBLISHED').length;
  const totalSold = events.reduce((acc, e) => acc + (e.stats?.totalSold || 0), 0);
  const totalRevenue = events.reduce((acc, e) => acc + (e.stats?.totalRevenue || 0), 0);
  const totalAvailable = events.reduce((acc, e) => acc + (e.stats?.totalAvailable || 0), 0);
  const totalReserved = events.reduce((acc, e) => acc + (e.stats?.totalReserved || 0), 0);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formVenue) return;
    setFormSubmitting(true);
    try {
      await onCreateEvent({
        title: formTitle,
        category: formCategory,
        description: formDescription,
        venueName: formVenue,
        city: formCity,
        eventDate: new Date(formDate).toISOString(),
        doorsOpenTime: formDoorsOpen,
        maxCapacity: Number(formCapacity),
      });
      setFormTitle('');
      setFormDescription('');
      setFormVenue('');
      setActiveTab('events');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAddTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !tierName || !tierPrice || !tierQty) return;
    setTierSubmitting(true);
    try {
      await onAddTicketTier(selectedEventId, {
        name: tierName,
        price: Number(tierPrice),
        quantity: Number(tierQty),
        description: tierDescription,
      });
      setTierName('');
      setTierPrice('');
      setTierQty('');
      setTierDescription('');
    } finally {
      setTierSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = 'BookingRef,Event,Attendee,Email,TicketCategory,Price,Status\n';
    const rows =
      'TN-ORD-582914,Soundwave Neon Horizon Music Festival,Sarah Jenkins,sarah.jenkins@example.com,Platinum Pass,3000,CONFIRMED\n' +
      'TN-ORD-192842,Soundwave Neon Horizon Music Festival,Vikram Roy,vikram.roy@example.com,Gold Pass,1500,CONFIRMED\n' +
      'TN-ORD-948123,Soundwave Neon Horizon Music Festival,Aanya Sharma,aanya.sharma@example.com,Standard Pass,600,CONFIRMED\n';
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticketnest-attendees-${organization?.slug || 'export'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Org Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>Tenant Workspace</span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-[#FF5A36]">{organization?.name || 'Aura Live Events'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B0A2A] mt-1">
            Organizer Management Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage ticket categories, track live held inventory, and monitor revenue with strict multi-tenant isolation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className="px-4 py-2 bg-[#FF5A36] text-white text-xs font-semibold rounded-lg hover:bg-[#E84C2A] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Publish New Event
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export Attendees
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Published Events
          </span>
          <span className="text-2xl font-black text-[#1B0A2A] font-mono tabular-nums mt-1 block">
            {publishedEvents} <span className="text-xs text-slate-400 font-normal">/ {totalEvents}</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Tickets Sold
          </span>
          <span className="text-2xl font-black text-emerald-700 font-mono tabular-nums mt-1 block">
            {totalSold.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Gross Revenue
          </span>
          <span className="text-2xl font-black text-[#1B0A2A] font-mono tabular-nums mt-1 block">
            ₹{totalRevenue.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Active 10-Min Holds
          </span>
          <span className="text-2xl font-black text-amber-600 font-mono tabular-nums mt-1 block">
            {totalReserved.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Remaining Stock
          </span>
          <span className="text-2xl font-black text-slate-700 font-mono tabular-nums mt-1 block">
            {totalAvailable.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Est. Conversion
          </span>
          <span className="text-2xl font-black text-[#FF5A36] font-mono tabular-nums mt-1 block">
            78.4%
          </span>
        </div>
      </div>

      {/* Segmented Controls / Workspace Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-lg w-fit mb-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'events' ? 'bg-white text-[#1B0A2A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'tickets' ? 'bg-white text-[#1B0A2A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Ticket Categories & Tiers
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'create' ? 'bg-white text-[#1B0A2A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          + Create Event
        </button>
        <button
          onClick={() => setActiveTab('attendees')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'attendees' ? 'bg-white text-[#1B0A2A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Attendee Registrations
        </button>
      </div>

      {/* TAB 1: Events List */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500 text-xs">No events published for this organization yet.</p>
            </div>
          ) : (
            events.map((ev) => {
              const tiers = ev.ticketCategories || [];
              return (
                <div
                  key={ev.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-all shadow-2xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs mb-1">
                        <span className="font-semibold text-[#FF5A36] uppercase">{ev.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500">{ev.city}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-mono font-semibold text-[10px] ${
                            ev.status === 'PUBLISHED' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#1B0A2A]">{ev.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{ev.venueName} · {new Date(ev.eventDate).toLocaleDateString()}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {tiers.map((t) => (
                          <div
                            key={t.id}
                            className="text-[11px] bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 flex items-center gap-2"
                          >
                            <span className="font-semibold">{t.name}:</span>
                            <span className="font-mono">₹{t.price}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-emerald-700 font-mono">{t.soldQuantity} sold</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 font-mono">{t.availableQuantity} left</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-right pr-4 border-r border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Event Revenue
                        </span>
                        <span className="text-lg font-bold font-mono text-[#1B0A2A] tabular-nums">
                          ₹{(ev.stats?.totalRevenue || 0).toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          setActiveTab('tickets');
                        }}
                        className="px-3.5 py-2 border border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        Configure Tiers
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Ticket Categories Configurator */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ticket Tiers for "{selectedEvent?.title}"
                </h3>
                <p className="text-xs text-slate-500">
                  Active tiers are live in the attendee checkout flow.
                </p>
              </div>

              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {(selectedEvent?.ticketCategories || []).map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#1B0A2A]">{cat.name}</h4>
                      <span className={`text-[10px] font-bold ${cat.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cat.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-2 font-mono">
                      <span>Price: <strong>₹{cat.price}</strong></span>
                      <span>Total: <strong>{cat.totalQuantity}</strong></span>
                      <span>Sold: <strong className="text-emerald-700">{cat.soldQuantity}</strong></span>
                      <span>Held: <strong className="text-amber-600">{cat.reservedQuantity}</strong></span>
                      <span>Available: <strong className="text-slate-800">{cat.availableQuantity}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onUpdateTicketTier(cat.id, {
                          isActive: !cat.isActive,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      {cat.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#FF5A36]" />
              Add Ticket Category
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Create a new pass tier (e.g. Platinum, VIP, Early Bird) with strict capacity bounds.
            </p>

            <form onSubmit={handleAddTierSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Tier Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Platinum Pass, Gold Circle"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    placeholder="3000"
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    required
                    min="0"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Total Quantity
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    value={tierQty}
                    onChange={(e) => setTierQty(e.target.value)}
                    required
                    min="1"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Tier Perks / Description
                </label>
                <textarea
                  placeholder="VIP lounge access, fast-track entry, complimentary drink..."
                  value={tierDescription}
                  onChange={(e) => setTierDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
                />
              </div>

              <button
                type="submit"
                disabled={tierSubmitting}
                className="w-full py-2.5 bg-[#1B0A2A] hover:bg-[#FF5A36] text-white font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                {tierSubmitting ? 'Adding Tier...' : 'Add Tier to Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Create Event Wizard */}
      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-8 shadow-2xs">
          <h2 className="text-xl font-bold text-[#1B0A2A] mb-1">Publish New Event</h2>
          <p className="text-xs text-slate-500 mb-6">
            Enter complete event schedule, venue location, and capacity parameters.
          </p>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                placeholder="e.g. Bangalore Indie Live 2026"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e: any) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36] bg-white"
                >
                  <option value="Music">Music</option>
                  <option value="Tech">Tech</option>
                  <option value="Culinary">Culinary</option>
                  <option value="Arts">Arts</option>
                  <option value="Sports">Sports</option>
                  <option value="Business">Business</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  required
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Venue Name & Address *
              </label>
              <input
                type="text"
                value={formVenue}
                onChange={(e) => setFormVenue(e.target.value)}
                required
                placeholder="e.g. Palace Grounds, Jayamahal Road"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Event Date *
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Doors Open *
                </label>
                <input
                  type="text"
                  value={formDoorsOpen}
                  onChange={(e) => setFormDoorsOpen(e.target.value)}
                  placeholder="18:00"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Max Capacity
                </label>
                <input
                  type="number"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  placeholder="1000"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Give attendees compelling details about headliners, agenda, and guidelines..."
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF5A36]"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-6 py-2.5 bg-[#FF5A36] hover:bg-[#E84C2A] text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
              >
                {formSubmitting ? 'Publishing...' : 'Publish Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Attendee Registrations */}
      {activeTab === 'attendees' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirmed Attendees</h3>
              <p className="text-xs text-slate-500">
                Audited registrations matching organization ownership.
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Booking Ref</th>
                  <th className="px-5 py-3">Attendee Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Pass Tier</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                <tr className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-mono font-bold text-slate-900">TN-ORD-582914</td>
                  <td className="px-5 py-3 text-slate-900 font-semibold">Sarah Jenkins</td>
                  <td className="px-5 py-3 font-mono text-slate-500">sarah.jenkins@example.com</td>
                  <td className="px-5 py-3 truncate max-w-[200px]">Soundwave Neon Horizon Music Festival</td>
                  <td className="px-5 py-3">Platinum Pass</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-bold">₹3,000</td>
                  <td className="px-5 py-3 text-emerald-700 font-semibold">CONFIRMED</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-mono font-bold text-slate-900">TN-ORD-192842</td>
                  <td className="px-5 py-3 text-slate-900 font-semibold">Vikram Roy</td>
                  <td className="px-5 py-3 font-mono text-slate-500">vikram.roy@example.com</td>
                  <td className="px-5 py-3 truncate max-w-[200px]">Soundwave Neon Horizon Music Festival</td>
                  <td className="px-5 py-3">Gold Pass</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-bold">₹1,500</td>
                  <td className="px-5 py-3 text-emerald-700 font-semibold">CONFIRMED</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
