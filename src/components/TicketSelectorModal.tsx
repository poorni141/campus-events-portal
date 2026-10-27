import React, { useState } from 'react';
import { Event, TicketCategory } from '../types';
import { X, ShieldCheck, Clock, AlertCircle, Plus, Minus, ArrowRight } from 'lucide-react';

interface TicketSelectorModalProps {
  event: Event;
  ticketCategories: TicketCategory[];
  onClose: () => void;
  onReserve: (items: { ticketCategoryId: string; quantity: number }[]) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

export const TicketSelectorModal: React.FC<TicketSelectorModalProps> = ({
  event,
  ticketCategories,
  onClose,
  onReserve,
  isSubmitting,
  errorMessage,
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleQuantityChange = (categoryId: string, delta: number, maxAvailable: number) => {
    const current = quantities[categoryId] || 0;
    const next = Math.max(0, Math.min(maxAvailable, current + delta));
    setQuantities({ ...quantities, [categoryId]: next });
  };

  const selectedItems = Object.entries(quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([catId, qty]) => {
      const cat = ticketCategories.find((c) => c.id === catId);
      return {
        ticketCategoryId: catId,
        quantity: qty,
        unitPrice: cat ? cat.price : 0,
        subtotal: (cat ? cat.price : 0) * qty,
        name: cat?.name || 'Ticket',
      };
    });

  const totalQuantity = selectedItems.reduce((acc, i) => acc + i.quantity, 0);
  const totalAmount = selectedItems.reduce((acc, i) => acc + i.subtotal, 0);

  const handleSubmit = async () => {
    if (totalQuantity === 0) return;
    await onReserve(selectedItems.map((i) => ({ ticketCategoryId: i.ticketCategoryId, quantity: i.quantity })));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#1B0A2A] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs text-[#FF5A36] font-semibold uppercase tracking-wider mb-1">
            <span>{event.category}</span>
            <span aria-hidden="true">·</span>
            <span>{event.city}</span>
          </div>
          <h2 className="text-xl font-bold pr-8 leading-snug">{event.title}</h2>
          <p className="text-xs text-white/70 mt-1">{event.venueName} · Doors open {event.doorsOpenTime}</p>
        </div>

        {/* Notice Strip */}
        <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-200/60 flex items-center gap-2 text-xs text-amber-900">
          <Clock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Selected tickets will be <strong>held exclusively for 10 minutes</strong> during checkout to ensure fair inventory allocation.
          </span>
        </div>

        {/* Tier Selection Body */}
        <div className="p-6 max-h-[55vh] overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {ticketCategories.map((tier) => {
            const isSoldOut = tier.availableQuantity <= 0;
            const currentQty = quantities[tier.id] || 0;

            return (
              <div
                key={tier.id}
                className={`p-4 rounded-xl border transition-all ${
                  currentQty > 0
                    ? 'border-[#1B0A2A] bg-purple-50/20'
                    : isSoldOut
                    ? 'border-slate-200 bg-slate-50/60 opacity-60'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#1B0A2A] text-sm">{tier.name}</h4>
                      {isSoldOut ? (
                        <span className="text-[11px] font-semibold text-red-600">Sold Out</span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {tier.availableQuantity} available
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {tier.description}
                      </p>
                    )}
                    <div className="mt-2 text-sm font-extrabold text-[#1B0A2A] font-mono tabular-nums">
                      ₹{tier.price.toLocaleString()}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="shrink-0 flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <button
                      type="button"
                      disabled={currentQty === 0 || isSoldOut}
                      onClick={() => handleQuantityChange(tier.id, -1, tier.availableQuantity)}
                      className="w-7 h-7 rounded bg-white text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 shadow-xs"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs text-slate-800 tabular-nums">
                      {currentQty}
                    </span>
                    <button
                      type="button"
                      disabled={currentQty >= tier.availableQuantity || isSoldOut}
                      onClick={() => handleQuantityChange(tier.id, 1, tier.availableQuantity)}
                      className="w-7 h-7 rounded bg-white text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer / Summary */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">
              Total ({totalQuantity} {totalQuantity === 1 ? 'ticket' : 'tickets'})
            </span>
            <span className="text-xl font-extrabold text-[#1B0A2A] font-mono tabular-nums">
              ₹{totalAmount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={totalQuantity === 0 || isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-[#FF5A36] text-white font-semibold text-xs flex items-center gap-2 hover:bg-[#E84C2A] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {isSubmitting ? (
                <>Holding Inventory...</>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Hold & Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
