import React, { useState } from 'react';
import { X, Database, Layers, ShieldCheck, Key, ArrowRight, ExternalLink } from 'lucide-react';

interface ERSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ERSchemaModal: React.FC<ERSchemaModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'tables'>('diagram');

  if (!isOpen) return null;

  const tables = [
    {
      name: 'organizations',
      desc: 'Multi-tenant event organizer companies and collectives',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', pk: true },
        { name: 'name', type: 'VARCHAR(255)' },
        { name: 'slug', type: 'VARCHAR(255) UNIQUE' },
        { name: 'status', type: 'ACTIVE | SUSPENDED' },
        { name: 'is_verified', type: 'BOOLEAN' },
      ],
    },
    {
      name: 'users',
      desc: 'Attendee, organizer, and platform administrator accounts',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', pk: true },
        { name: 'email', type: 'VARCHAR(255) UNIQUE' },
        { name: 'name', type: 'VARCHAR(255)' },
        { name: 'role', type: 'ATTENDEE | ORGANIZER | ADMIN' },
        { name: 'organization_id', type: 'VARCHAR(64) FK -> organizations.id' },
      ],
    },
    {
      name: 'events',
      desc: 'Scheduled public events published by tenant organizations',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', pk: true },
        { name: 'organization_id', type: 'VARCHAR(64) FK -> organizations.id' },
        { name: 'title', type: 'VARCHAR(255)' },
        { name: 'category', type: 'Music | Tech | Culinary | Arts | Sports' },
        { name: 'event_date', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'booking_opens_at', type: 'TIMESTAMP' },
        { name: 'booking_closes_at', type: 'TIMESTAMP' },
        { name: 'status', type: 'DRAFT | PUBLISHED | CANCELLED' },
      ],
    },
    {
      name: 'ticket_categories',
      desc: 'Authoritative inventory tiers (Platinum, Gold, Standard Pass)',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', pk: true },
        { name: 'event_id', type: 'VARCHAR(64) FK -> events.id' },
        { name: 'name', type: 'VARCHAR(255)' },
        { name: 'price', type: 'NUMERIC(10,2)' },
        { name: 'total_quantity', type: 'INTEGER' },
        { name: 'available_quantity', type: 'INTEGER (Atomic Counter)' },
        { name: 'reserved_quantity', type: 'INTEGER (10-min Holds)' },
        { name: 'sold_quantity', type: 'INTEGER (Confirmed Orders)' },
      ],
    },
    {
      name: 'reservations',
      desc: 'Temporary 10-minute inventory holds with automatic expiration',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', pk: true },
        { name: 'user_id', type: 'VARCHAR(64) FK -> users.id' },
        { name: 'event_id', type: 'VARCHAR(64) FK -> events.id' },
        { name: 'status', type: 'PENDING | CONFIRMED | EXPIRED | CANCELLED' },
        { name: 'expires_at', type: 'TIMESTAMP (Now + 10 mins)' },
        { name: 'idempotency_key', type: 'VARCHAR(128) UNIQUE' },
        { name: 'total_amount', type: 'NUMERIC(10,2)' },
      ],
    },
    {
      name: 'payment_transactions',
      desc: 'Simulated payment authorizations with webhook callback idempotency',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', pk: true },
        { name: 'reservation_id', type: 'VARCHAR(64) FK -> reservations.id' },
        { name: 'payment_gateway_ref', type: 'VARCHAR(128) UNIQUE' },
        { name: 'amount', type: 'NUMERIC(10,2)' },
        { name: 'status', type: 'PENDING | SUCCESS | FAILED' },
        { name: 'idempotency_key', type: 'VARCHAR(128) UNIQUE' },
      ],
    },
    {
      name: 'orders',
      desc: 'Confirmed bookings with unique references and digital entry QR passes',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', pk: true },
        { name: 'booking_reference', type: 'VARCHAR(64) UNIQUE (e.g. TN-ORD-849201)' },
        { name: 'reservation_id', type: 'VARCHAR(64) FK -> reservations.id' },
        { name: 'payment_transaction_id', type: 'VARCHAR(64) FK -> payment_transactions.id' },
        { name: 'status', type: 'CONFIRMED | CANCELLED | REFUNDED' },
        { name: 'qr_code_data', type: 'TEXT' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-[#210D2D] text-white p-6 relative flex items-center justify-between border-b border-[#30123D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#30123D] border border-white/10 flex items-center justify-center text-[#FF626B]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">PostgreSQL Relational ER Schema</h2>
                <span className="text-[10px] font-mono bg-[#FF626B]/20 text-[#FF626B] font-bold px-2 py-0.5 rounded border border-[#FF626B]/30">
                  Prisma ORM
                </span>
              </div>
              <p className="text-xs text-[#B9ADC5] mt-0.5">
                Normalized relational entities, foreign keys, row locks, and inventory hold invariants
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg transition-colors hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 bg-[#FAF8FC]">
          <button
            onClick={() => setActiveTab('diagram')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'diagram'
                ? 'border-[#FF626B] text-[#210D2D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Visual Entity Flow & Relationships
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'tables'
                ? 'border-[#FF626B] text-[#210D2D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Data Dictionary & Constraints ({tables.length} Core Tables)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'diagram' ? (
            <div className="space-y-6">
              {/* Architecture Invariants Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#FAF8FC] border border-purple-100 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#210D2D] mb-1">
                    <ShieldCheck className="w-4 h-4 text-[#FF626B]" />
                    Row Mutex Locking
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Categories lock during hold creation to prevent negative inventory or overbooking.
                  </p>
                </div>

                <div className="bg-[#FAF8FC] border border-purple-100 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#210D2D] mb-1">
                    <Key className="w-4 h-4 text-[#FF626B]" />
                    Idempotency Keys
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Reservations, payments, and callbacks enforce uniqueness against duplicate submissions.
                  </p>
                </div>

                <div className="bg-[#FAF8FC] border border-purple-100 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#210D2D] mb-1">
                    <Layers className="w-4 h-4 text-[#FF626B]" />
                    Multi-Tenant Isolation
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Organizers strictly query events linked to their organization ID.
                  </p>
                </div>
              </div>

              {/* Entity Flow Representation */}
              <div className="bg-[#210D2D] text-white p-6 rounded-xl border border-[#30123D] font-mono text-xs overflow-x-auto">
                <div className="text-[11px] text-[#B9ADC5] mb-4 pb-2 border-b border-white/10 uppercase tracking-wider font-sans font-semibold">
                  Relational Entity Relationship Architecture
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-[#30123D] text-[#FF626B] rounded border border-[#FF626B]/30 font-bold">
                      ORGANIZATIONS
                    </span>
                    <span className="text-slate-400">── 1:N ──&gt;</span>
                    <span className="px-3 py-1.5 bg-[#30123D] text-white rounded border border-white/20 font-bold">
                      EVENTS
                    </span>
                    <span className="text-slate-400">── 1:N ──&gt;</span>
                    <span className="px-3 py-1.5 bg-[#30123D] text-[#FF626B] rounded border border-[#FF626B]/30 font-bold">
                      TICKET_CATEGORIES
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pl-8">
                    <span className="text-slate-500">│</span>
                    <span className="text-slate-400">───────────────────</span>
                    <span className="text-slate-400">── 1:N ──&gt;</span>
                    <span className="px-3 py-1.5 bg-purple-900/60 text-amber-300 rounded border border-amber-300/30 font-bold">
                      RESERVATIONS (10-Min Hold)
                    </span>
                    <span className="text-slate-400">── 1:N ──&gt;</span>
                    <span className="px-3 py-1.5 bg-purple-900/60 text-white rounded border border-white/20">
                      RESERVATION_ITEMS
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pl-24">
                    <span className="text-slate-500">│</span>
                    <span className="text-slate-400">──────────────</span>
                    <span className="text-slate-400">── 1:1 ──&gt;</span>
                    <span className="px-3 py-1.5 bg-emerald-950 text-emerald-400 rounded border border-emerald-500/30 font-bold">
                      PAYMENT_TRANSACTIONS
                    </span>
                    <span className="text-slate-400">── 1:1 ──&gt;</span>
                    <span className="px-3 py-1.5 bg-emerald-900 text-white rounded border border-emerald-400/40 font-bold">
                      ORDERS (QR Pass Entry)
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-[#B9ADC5] font-sans">
                  Files backing this model: <code className="text-white">/prisma/schema.prisma</code> and{' '}
                  <code className="text-white">/database/schema.sql</code>.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {tables.map((tbl) => (
                <div key={tbl.name} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-[#FAF8FC] px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-[#210D2D]">{tbl.name}</span>
                      <span className="text-[11px] text-slate-500 ml-2 font-sans">{tbl.desc}</span>
                    </div>
                  </div>
                  <div className="p-3 divide-y divide-slate-100 text-xs">
                    {tbl.fields.map((f) => (
                      <div key={f.name} className="py-1.5 flex items-center justify-between font-mono">
                        <span className={`font-semibold ${f.pk ? 'text-[#FF626B]' : 'text-slate-800'}`}>
                          {f.name} {f.pk && '(PK)'}
                        </span>
                        <span className="text-slate-500 text-[11px]">{f.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            PostgreSQL 16 · Redis Cache · BullMQ Worker
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#210D2D] text-white text-xs font-semibold rounded-lg hover:bg-[#30123D] transition-colors"
          >
            Close Schema View
          </button>
        </div>
      </div>
    </div>
  );
};
