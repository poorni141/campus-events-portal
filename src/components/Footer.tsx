import React from 'react';
import { Ticket, Shield, Lock, Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-[#EDE7F2] bg-[#210D2D] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#30123D] flex items-center justify-center text-[#FF626B]">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white">TicketNest</span>
            </div>
            <p className="text-xs text-[#B9ADC5] leading-relaxed">
              Smart event booking and multi-tenant management engine with ACID concurrency guarantees and fair temporary ticket holds.
            </p>
          </div>

          {/* Guarantees Col */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Core Invariants
            </h4>
            <ul className="space-y-1.5 text-[#B9ADC5]">
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#FF626B]" />
                Zero Overselling via Row Mutex
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#FF626B]" />
                Strict 10-Minute Hold Expiration
              </li>
              <li className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#FF626B]" />
                Tenant-Isolated Organizer Data
              </li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Infrastructure
            </h4>
            <p className="text-[#B9ADC5] leading-relaxed text-[11px]">
              PostgreSQL Schema with Prisma ORM, Redis Cache-Aside, BullMQ Background Expiration Sweeper, and Simulated Idempotent Payment Gateway.
            </p>
          </div>

          {/* Persona Switcher Note */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Demo Personas
            </h4>
            <p className="text-[#B9ADC5] text-[11px] leading-relaxed">
              Use the top-right persona selector to test as Attendee (Sarah Jenkins), Organizer (Aura Live Events), or Platform Administrator.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#B9ADC5] gap-4">
          <p>© 2026 TicketNest Technologies. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Concurrency Safe</span>
            <span>·</span>
            <span>Idempotency Protected</span>
            <span>·</span>
            <span>Multi-Tenant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
