import React, { useState } from 'react';
import { Order, Reservation } from '../types';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  QrCode,
  AlertCircle,
  X,
  Printer,
  Ban,
  ArrowRight,
} from 'lucide-react';

interface AttendeeDashboardProps {
  orders: Order[];
  activeReservation: Reservation | null;
  reservationTimeRemaining: number;
  onResumeReservation: () => void;
  onCancelOrder: (orderId: string) => Promise<void>;
  onExploreEvents: () => void;
}

export const AttendeeDashboard: React.FC<AttendeeDashboardProps> = ({
  orders,
  activeReservation,
  reservationTimeRemaining,
  onResumeReservation,
  onCancelOrder,
  onExploreEvents,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    setCancelling(true);
    await onCancelOrder(cancelModalOrder.id);
    setCancelling(false);
    setCancelModalOrder(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold text-[#FF5A36] uppercase tracking-wider">
            Attendee Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B0A2A] mt-0.5">
            My Bookings & Tickets
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your verified booking passes, entry QR codes, and booking history.
          </p>
        </div>

        <button
          onClick={onExploreEvents}
          className="self-start sm:self-auto px-4 py-2 bg-[#1B0A2A] text-white text-xs font-semibold rounded-lg hover:bg-[#FF5A36] transition-colors flex items-center gap-1.5"
        >
          <Ticket className="w-3.5 h-3.5" />
          Find More Events
        </button>
      </div>

      {/* Active Reservation Notice Banner if ongoing */}
      {activeReservation && activeReservation.status === 'PENDING' && reservationTimeRemaining > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-[#2D124D] text-white border border-[#1B0A2A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#FF5A36] shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF5A36]">
                You have an unconfirmed ticket hold!
              </p>
              <p className="text-xs text-slate-300">
                "{activeReservation.eventTitle}" · Held for{' '}
                <span className="font-mono font-bold text-white tabular-nums">
                  {formatTimer(reservationTimeRemaining)}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onResumeReservation}
            className="px-4 py-2 bg-[#FF5A36] hover:bg-[#E84C2A] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            Resume Checkout
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bookings List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 bg-purple-50 text-[#1B0A2A] rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No bookings yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
            You haven't reserved or booked any tickets yet. Browse our curated festivals, tech conferences, and culinary expos!
          </p>
          <button
            onClick={onExploreEvents}
            className="px-5 py-2.5 bg-[#FF5A36] hover:bg-[#E84C2A] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Explore Events Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isConfirmed = order.status === 'CONFIRMED';
            const formattedDate = new Date(order.eventDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs mb-1.5">
                    <span className="font-mono font-bold text-[#1B0A2A]">{order.bookingReference}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold uppercase tracking-wider text-[10px] ${
                        isConfirmed ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {order.status}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-400">
                      Booked {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{order.eventTitle}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formattedDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {order.venueName}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span
                        key={item.id}
                        className="text-[11px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded"
                      >
                        {item.quantity}× {item.ticketCategoryName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price & Action */}
                <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Total Paid
                    </span>
                    <span className="text-lg font-black text-[#1B0A2A] font-mono tabular-nums">
                      ₹{order.totalAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConfirmed && (
                      <button
                        onClick={() => setCancelModalOrder(order)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium border border-transparent hover:border-red-200"
                        title="Cancel booking and restore inventory"
                      >
                        Cancel Booking
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-4 py-2 bg-[#1B0A2A] hover:bg-[#FF5A36] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      View Pass
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Pass Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-[#1B0A2A] text-white p-5 relative">
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-[#FF5A36]">
                {selectedOrder.bookingReference}
              </span>
              <h3 className="text-base font-bold mt-1 pr-6">{selectedOrder.eventTitle}</h3>
              <p className="text-xs text-white/70 mt-1">{selectedOrder.venueName}</p>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="w-40 h-40 bg-slate-50 rounded-xl border border-slate-300 mx-auto flex flex-col items-center justify-center p-3 shadow-inner">
                <QrCode className="w-32 h-32 text-slate-900" />
              </div>
              <p className="text-[11px] font-mono text-slate-500">
                Gate Entry Code: {selectedOrder.bookingReference}
              </p>

              <div className="text-left pt-3 border-t border-slate-100 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Attendee:</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.userName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Tickets:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedOrder.items.reduce((acc, i) => acc + i.quantity, 0)} passes
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{selectedOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Pass
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-2 rounded-lg bg-[#1B0A2A] text-white text-xs font-semibold hover:bg-[#FF5A36]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Cancel Booking?</h3>
            <p className="text-xs text-slate-600 mt-1 mb-4 leading-relaxed">
              Are you sure you want to cancel booking{' '}
              <strong className="font-mono">{cancelModalOrder.bookingReference}</strong> for "
              {cancelModalOrder.eventTitle}"? Your tickets will immediately be restored to available inventory.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
