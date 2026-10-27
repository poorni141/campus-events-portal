import React, { useState } from 'react';
import { Reservation, Event } from '../types';
import {
  Clock,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  Lock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface CheckoutViewProps {
  reservation: Reservation;
  event: Event | null;
  timeRemainingSeconds: number;
  onPay: (params: {
    reservationId: string;
    action: 'APPROVE' | 'REJECT';
    paymentMethod: string;
    failureReason?: string;
  }) => Promise<void>;
  onCancelReservation: (reservationId: string) => Promise<void>;
  onReturnToEvents: () => void;
  isProcessing: boolean;
  paymentError?: string | null;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  reservation,
  event,
  timeRemainingSeconds,
  onPay,
  onCancelReservation,
  onReturnToEvents,
  isProcessing,
  paymentError,
}) => {
  const [testOutcome, setTestOutcome] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [paymentMethod, setPaymentMethod] = useState<'SIMULATED_CARD' | 'SIMULATED_UPI'>('SIMULATED_CARD');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  const isExpired = timeRemainingSeconds <= 0;

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePayClick = async () => {
    if (isExpired) return;
    await onPay({
      reservationId: reservation.id,
      action: testOutcome,
      paymentMethod,
      failureReason: testOutcome === 'REJECT' ? 'Simulated card declined: insufficient test funds' : undefined,
    });
  };

  if (isExpired) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-red-200 text-center shadow-lg animate-in fade-in">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Reservation Expired</h2>
        <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          The 10-minute hold window for your selected tickets has elapsed. Held seats have been safely released back to available inventory for other attendees.
        </p>
        <button
          onClick={onReturnToEvents}
          className="mt-6 px-6 py-2.5 bg-[#1B0A2A] text-white text-xs font-semibold rounded-lg hover:bg-[#FF5A36] transition-colors"
        >
          Return to Events & Re-select
        </button>
      </div>
    );
  }

  const isUrgent = timeRemainingSeconds < 120; // less than 2 minutes

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={onReturnToEvents}
        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </button>

      {/* Countdown Timer Alert Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between gap-4 mb-6 transition-colors ${
          isUrgent
            ? 'bg-red-50 border-red-200 text-red-900 animate-pulse'
            : 'bg-[#2D124D] text-white border-[#1B0A2A]'
        }`}
      >
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-[#FF5A36]'}`} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">
              Temporary Ticket Hold Active
            </p>
            <p className={`text-xs ${isUrgent ? 'text-red-700' : 'text-slate-300'}`}>
              Complete checkout before time expires to guarantee your booking.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-400 block uppercase font-mono">Time Left</span>
          <span className={`text-2xl font-black font-mono tabular-nums ${isUrgent ? 'text-red-600' : 'text-[#FF5A36]'}`}>
            {formatTimer(timeRemainingSeconds)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Order Review */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Order Breakdown
            </h3>

            <div className="mt-4">
              <h4 className="font-bold text-slate-900 text-sm">
                {reservation.eventTitle || event?.title}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {reservation.venueName || event?.venueName} · {event?.city}
              </p>
            </div>

            <div className="mt-5 space-y-3 pt-3 border-t border-slate-100">
              {reservation.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{item.ticketCategoryName}</span>
                    <span className="text-slate-500 font-mono ml-2">× {item.quantity}</span>
                  </div>
                  <span className="font-mono font-medium text-slate-800 tabular-nums">
                    ₹{item.subtotal.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">Total Payable</span>
                <span className="text-[11px] text-slate-400 block">Inclusive of simulated taxes</span>
              </div>
              <span className="text-xl font-black text-[#1B0A2A] font-mono tabular-nums">
                ₹{reservation.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cancellation Option */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">Change your mind?</p>
              <p className="text-[11px] text-slate-500">Release held tickets immediately for other fans.</p>
            </div>
            <button
              onClick={() => onCancelReservation(reservation.id)}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-red-600 hover:bg-white rounded-md border border-slate-300 transition-colors font-medium"
            >
              Release & Cancel Hold
            </button>
          </div>
        </div>

        {/* Right Column: Simulated Payment Form */}
        <div className="md:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#FF5A36]" />
              Simulated Payment
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded font-semibold">
              Sandbox Mode
            </span>
          </div>

          {paymentError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* Payment Method Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPaymentMethod('SIMULATED_CARD')}
              className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                paymentMethod === 'SIMULATED_CARD'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('SIMULATED_UPI')}
              className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                paymentMethod === 'SIMULATED_UPI'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              UPI / QR
            </button>
          </div>

          {/* Test Outcome Selector */}
          <div className="mb-5 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Select Test Gateway Behavior:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  checked={testOutcome === 'APPROVE'}
                  onChange={() => setTestOutcome('APPROVE')}
                  className="text-[#FF5A36] focus:ring-[#FF5A36]"
                />
                <span className="font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Simulate Payment Approval (Success)
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  checked={testOutcome === 'REJECT'}
                  onChange={() => setTestOutcome('REJECT')}
                  className="text-[#FF5A36] focus:ring-[#FF5A36]"
                />
                <span className="font-medium flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  Simulate Card Rejection (Failure Test)
                </span>
              </label>
            </div>
          </div>

          {/* Mock Card Input Fields */}
          <div className="space-y-3 mb-6">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Card Number (Pre-filled)
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-[#FF5A36]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Expiry
                </label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-[#FF5A36]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  CVC / CVV
                </label>
                <input
                  type="text"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-[#FF5A36]"
                />
              </div>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayClick}
            disabled={isProcessing}
            className={`w-full py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
              testOutcome === 'APPROVE'
                ? 'bg-[#FF5A36] hover:bg-[#E84C2A] text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isProcessing ? (
              <span>Contacting Mock Gateway...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {testOutcome === 'APPROVE'
                    ? `Confirm & Pay ₹${reservation.totalAmount.toLocaleString()}`
                    : `Simulate Decline (₹${reservation.totalAmount.toLocaleString()})`}
                </span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            Simulated end-to-end transaction with idempotency protection.
          </p>
        </div>
      </div>
    </div>
  );
};
