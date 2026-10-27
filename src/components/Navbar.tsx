import React, { useState } from 'react';
import { User, Reservation } from '../types';
import {
  Ticket,
  Clock,
  Shield,
  LayoutDashboard,
  BarChart3,
  FlaskConical,
  Database,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
  onSwitchUser: (userId: string) => void;
  activeReservation: Reservation | null;
  reservationTimeRemaining: number;
  onOpenReservation: () => void;
  demoUsers: { id: string; name: string; email: string; role: string; organizationName?: string }[];
  onOpenERSchema: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onSwitchUser,
  activeReservation,
  reservationTimeRemaining,
  onOpenReservation,
  demoUsers,
  onOpenERSchema,
  onOpenAuth,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#210D2D] text-white border-b border-[#30123D]/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
        {/* Left Zone: TicketNest Logo with Coral-Pink Ticket Icon & SMART TICKETING subtitle */}
        <button
          onClick={() => setCurrentTab('events')}
          className="flex items-center gap-3 text-left group shrink-0 focus-visible:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-[#30123D] border border-white/10 flex items-center justify-center text-[#FF626B] shadow-sm transition-transform group-hover:scale-105">
            <Ticket className="w-5 h-5 text-[#FF626B]" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white block leading-none">
              Ticket<span className="text-[#FF626B]">Nest</span>
            </span>
            <span className="text-[10px] text-[#B9ADC5] font-semibold tracking-widest uppercase block mt-1">
              SMART TICKETING
            </span>
          </div>
        </button>

        {/* Center Zone: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setCurrentTab('events')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1.5 ${
              currentTab === 'events'
                ? 'text-white font-bold border-b-2 border-[#FF626B]'
                : 'text-[#B9ADC5] hover:text-white'
            }`}
          >
            Explore Events
          </button>

          <button
            onClick={onOpenERSchema}
            className="whitespace-nowrap shrink-0 text-[#B9ADC5] hover:text-white transition-colors py-1.5 flex items-center gap-1.5"
          >
            <Database className="w-4 h-4 text-[#FF626B]" />
            ER Schema
          </button>

          {currentUser.role === 'ATTENDEE' && (
            <button
              onClick={() => setCurrentTab('my-bookings')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1.5 ${
                currentTab === 'my-bookings'
                  ? 'text-white font-bold border-b-2 border-[#FF626B]'
                  : 'text-[#B9ADC5] hover:text-white'
              }`}
            >
              My Bookings
            </button>
          )}

          {(currentUser.role === 'ORGANIZER' || currentUser.role === 'ADMIN') && (
            <button
              onClick={() => setCurrentTab('organizer')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1.5 flex items-center gap-1.5 ${
                currentTab === 'organizer'
                  ? 'text-white font-bold border-b-2 border-[#FF626B]'
                  : 'text-[#B9ADC5] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Organizer Hub
            </button>
          )}

          {(currentUser.role === 'ORGANIZER' || currentUser.role === 'ADMIN') && (
            <button
              onClick={() => setCurrentTab('analytics')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1.5 flex items-center gap-1.5 ${
                currentTab === 'analytics'
                  ? 'text-white font-bold border-b-2 border-[#FF626B]'
                  : 'text-[#B9ADC5] hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          )}

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1.5 flex items-center gap-1.5 ${
                currentTab === 'admin'
                  ? 'text-white font-bold border-b-2 border-[#FF626B]'
                  : 'text-[#B9ADC5] hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              Platform Admin
            </button>
          )}

          <button
            onClick={() => setCurrentTab('lab')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1.5 flex items-center gap-1.5 ${
              currentTab === 'lab'
                ? 'text-white font-bold border-b-2 border-[#FF626B]'
                : 'text-[#B9ADC5] hover:text-white'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-[#FF626B]" />
            Concurrency Lab
          </button>
        </nav>

        {/* Right Zone: Active Reservation Badge, Role Selector, Log In & Coral-Pink Sign Up */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Active 10-Minute Hold Badge (if active) */}
          {activeReservation && activeReservation.status === 'PENDING' && (
            <button
              onClick={onOpenReservation}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#30123D] border border-[#FF626B]/50 text-white text-xs font-semibold hover:bg-[#30123D]/80 transition-colors shadow-sm animate-pulse"
              title="Click to resume checkout"
            >
              <Clock className="w-3.5 h-3.5 text-[#FF626B]" />
              <span className="hidden sm:inline text-xs text-[#B9ADC5]">Held:</span>
              <span className="tabular-nums font-mono font-bold text-[#FF626B]">
                {formatTimer(reservationTimeRemaining)}
              </span>
            </button>
          )}

          {/* Role Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#30123D] border border-white/10 hover:border-white/20 text-xs font-medium text-white transition-colors"
              title="Switch user role or persona"
            >
              <div className="w-5 h-5 rounded-full bg-[#FF626B] text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser.name[0]}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-semibold text-white block truncate max-w-[100px] leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-[#B9ADC5] font-mono block capitalize leading-none">
                  {currentUser.role.toLowerCase()}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#B9ADC5]" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#210D2D] rounded-xl shadow-2xl border border-[#30123D] py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3.5 py-2 border-b border-white/10">
                  <p className="text-[10px] font-bold text-[#B9ADC5] uppercase tracking-wider">
                    Role & Persona Selector
                  </p>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    Test role-based access control & tenant boundaries:
                  </p>
                </div>

                <div className="py-1">
                  {demoUsers.map((u) => {
                    const isSelected = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSwitchUser(u.id);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#30123D] transition-colors ${
                          isSelected ? 'bg-[#30123D] text-[#FF626B] font-bold' : 'text-slate-200'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{u.name}</p>
                          <p className="text-[10px] text-[#B9ADC5] font-mono">
                            {u.role} {u.organizationName ? `· ${u.organizationName}` : ''}
                          </p>
                        </div>
                        {isSelected && <span className="text-[#FF626B] text-xs font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Log In Button */}
          <button
            onClick={() => onOpenAuth('login')}
            className="px-3.5 py-2 text-xs font-semibold text-[#B9ADC5] hover:text-white transition-colors"
          >
            Log In
          </button>

          {/* Coral-Pink Sign Up Button */}
          <button
            onClick={() => onOpenAuth('signup')}
            className="px-4 py-2 rounded-lg bg-[#FF626B] hover:bg-[#FA4F59] text-white text-xs font-bold shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
          >
            Sign Up
          </button>
        </div>
      </div>
    </header>
  );
};
