import React from 'react';
import { Order } from '../types';
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Download,
  Share2,
  ArrowRight,
  Ticket,
  QrCode,
  Printer,
} from 'lucide-react';

interface ConfirmationViewProps {
  order: Order;
  onViewBookings: () => void;
  onExploreMore: () => void;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  order,
  onViewBookings,
  onExploreMore,
}) => {
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);

  const formattedDate = new Date(order.eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Success Banner */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
          Payment Approved · Order Confirmed
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B0A2A] mt-1">
          You're Going!
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          A confirmation has been recorded under your TicketNest profile.
        </p>
      </div>

      {/* High-Fidelity Ticket Pass Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl mb-6">
        {/* Ticket Header */}
        <div className="bg-[#1B0A2A] text-white p-6 relative">
          <div className="flex items-center justify-between text-xs text-[#FF5A36] font-semibold mb-2">
            <span>OFFICIAL E-TICKET PASS</span>
            <span className="font-mono text-white/80">{order.bookingReference}</span>
          </div>
          <h2 className="text-xl font-bold leading-snug">{order.eventTitle}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/70">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FF5A36]" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF5A36]" />
              {order.venueName}
            </span>
          </div>
        </div>

        {/* Notch separator */}
        <div className="relative h-6 bg-[#FAF8F5] flex items-center justify-between px-3 border-y border-dashed border-slate-200">
          <div className="w-5 h-5 rounded-full bg-[#FAF8F5] -ml-5 border-r border-slate-200" />
          <div className="flex-1 border-b border-dashed border-slate-300 mx-2" />
          <div className="w-5 h-5 rounded-full bg-[#FAF8F5] -mr-5 border-l border-slate-200" />
        </div>

        {/* Ticket Body & QR Code */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div className="sm:col-span-2 space-y-3">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Primary Attendee
              </span>
              <p className="text-sm font-bold text-slate-900">{order.userName}</p>
              <p className="text-xs text-slate-500 font-mono">{order.userEmail}</p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Tiers & Quantities
              </span>
              <div className="space-y-1">
                {order.items.map((item) => (
                  <div key={item.id} className="text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {item.quantity}× {item.ticketCategoryName}
                    </span>
                    <span className="font-mono text-slate-600">
                      ₹{item.totalPrice.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Total Paid</span>
              <span className="font-bold text-base text-[#1B0A2A] font-mono tabular-nums">
                ₹{order.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            {/* High visual fidelity simulated QR */}
            <div className="w-28 h-28 bg-white p-2 rounded-lg border border-slate-300 shadow-2xs flex flex-col items-center justify-center">
              <QrCode className="w-20 h-20 text-slate-900" />
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-2 block">
              Scan at Venue Gate
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Receipt
          </button>
          <button
            onClick={handleDownload}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadSuccess ? 'Downloaded!' : 'Download PDF'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewBookings}
            className="px-4 py-2 rounded-lg bg-[#1B0A2A] text-white text-xs font-semibold hover:bg-[#2D124D] transition-colors flex items-center gap-1.5"
          >
            <Ticket className="w-3.5 h-3.5" />
            My Bookings
          </button>
          <button
            onClick={onExploreMore}
            className="px-4 py-2 rounded-lg bg-[#FF5A36] text-white text-xs font-semibold hover:bg-[#E84C2A] transition-colors flex items-center gap-1.5"
          >
            Explore More
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
