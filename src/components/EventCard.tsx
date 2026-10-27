import React from 'react';
import { Event } from '../types';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

interface EventCardProps {
  event: Event & {
    minPrice?: number;
    maxPrice?: number;
    totalRemaining?: number;
    ticketCount?: number;
  };
  onSelect: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  const [imgError, setImgError] = React.useState(false);

  const eventDateObj = new Date(event.eventDate);
  const formattedDate = eventDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = event.doorsOpenTime || '18:00';

  const isSoldOut = event.totalRemaining !== undefined && event.totalRemaining <= 0;

  return (
    <div className="group bg-white rounded-2xl border border-[#EDE7F2] overflow-hidden hover:border-[#D6CAE3] transition-all hover:shadow-lg flex flex-col h-full">
      {/* Cover Image with Fallback */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#210D2D]">
        {!imgError && event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={event.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#210D2D] to-[#30123D] flex items-center justify-center p-6 text-center">
            <span className="text-white/80 font-bold text-lg tracking-tight">
              {event.title}
            </span>
          </div>
        )}

        {/* Quiet Category Tag */}
        <div className="absolute top-3 left-3 bg-[#210D2D]/85 backdrop-blur-md px-3 py-1 rounded-lg text-[11px] font-bold text-white tracking-wider uppercase border border-white/10">
          {event.category}
        </div>

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-wider uppercase bg-red-600/90 px-3 py-1 rounded-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata with typographic separator */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FF626B]" />
              {formattedDate} · {formattedTime}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 truncate max-w-[140px]">
              <MapPin className="w-3.5 h-3.5 text-[#FF626B] shrink-0" />
              {event.city}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-[#210D2D] group-hover:text-[#FF626B] transition-colors line-clamp-2 leading-snug">
            {event.title}
          </h3>

          {/* Venue & Organizer */}
          <p className="text-xs text-slate-500 mt-1 line-clamp-1 font-medium">
            {event.venueName}
          </p>

          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Card Footer: Pricing & Action */}
        <div className="mt-6 pt-4 border-t border-[#F0EAF5] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">
              Tickets From
            </span>
            <span className="text-lg font-extrabold text-[#210D2D] tabular-nums font-mono">
              ₹{event.minPrice ? event.minPrice.toLocaleString() : '600'}
            </span>
          </div>

          <button
            onClick={() => onSelect(event)}
            disabled={isSoldOut}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isSoldOut
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-[#210D2D] text-white hover:bg-[#FF626B] shadow-xs hover:gap-2'
            }`}
          >
            {isSoldOut ? 'Sold Out' : 'Select Tickets'}
            {!isSoldOut && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
