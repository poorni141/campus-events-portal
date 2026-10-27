import React, { useState } from 'react';
import { X, User, Mail, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (user: any) => void;
  demoUsers: { id: string; name: string; email: string; role: string; organizationName?: string }[];
  onSelectDemoUser: (userId: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
  demoUsers,
  onSelectDemoUser,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ATTENDEE' | 'ORGANIZER'>('ATTENDEE');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            role,
            organizationName: role === 'ORGANIZER' ? orgName : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create account');
        onSuccess(data.user);
        onClose();
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Account not found');
        onSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#210D2D] text-white p-6 relative border-b border-[#30123D]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-[#B9ADC5] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF626B] uppercase tracking-wider mb-1">
            <span>TicketNest Account</span>
            <span aria-hidden="true">·</span>
            <span>{mode === 'login' ? 'Welcome Back' : 'Get Started'}</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            {mode === 'login' ? 'Log in to TicketNest' : 'Create an Account'}
          </h2>
          <p className="text-xs text-[#B9ADC5] mt-0.5">
            {mode === 'login'
              ? 'Access your reservations, booking passes, and organizer portals.'
              : 'Join thousands reserving live experiences with guaranteed fair holds.'}
          </p>
        </div>

        {/* Quick Demo Switcher Strip */}
        <div className="bg-[#FAF8FC] p-4 border-b border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
            One-Click Instant Demo Login:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {demoUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelectDemoUser(u.id);
                  onClose();
                }}
                className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-[#FF626B] hover:shadow-xs transition-all text-xs"
              >
                <p className="font-bold text-slate-900 truncate">{u.name}</p>
                <p className="text-[10px] text-slate-500 font-mono capitalize">
                  {u.role.toLowerCase()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Sarah Jenkins"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF626B]"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Email Address *
            </label>
            <input
              type="email"
              placeholder="sarah.jenkins@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF626B]"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Account Persona *
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRole('ATTENDEE')}
                  className={`py-2 rounded-lg border font-semibold transition-all ${
                    role === 'ATTENDEE'
                      ? 'border-[#FF626B] bg-[#FF626B]/10 text-[#210D2D]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Attendee / Fan
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ORGANIZER')}
                  className={`py-2 rounded-lg border font-semibold transition-all ${
                    role === 'ORGANIZER'
                      ? 'border-[#FF626B] bg-[#FF626B]/10 text-[#210D2D]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Event Organizer
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && role === 'ORGANIZER' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Organization / Production Company *
              </label>
              <input
                type="text"
                placeholder="e.g. Aura Live Events, Neon Horizon Ltd."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#FF626B]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#FF626B] hover:bg-[#FA4F59] text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Free Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-bold text-[#FF626B] hover:underline"
                >
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-bold text-[#FF626B] hover:underline"
                >
                  Log In
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
