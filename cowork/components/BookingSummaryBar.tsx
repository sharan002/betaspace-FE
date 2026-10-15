import React from 'react';
import { Armchair, ArrowRight, X, Calendar, Clock, Building } from 'lucide-react';
import { Seat } from '../types';
import { formatINR } from '../utils/storage';

interface BookingSummaryBarProps {
  selectedSeats: Seat[];
  fromDate: string;
  toDate: string;
  totalDays: number;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalPrice: number;
  companyName?: string;
  onClearSelection: () => void;
  onProceedToBooking: () => void;
}

export const BookingSummaryBar: React.FC<BookingSummaryBarProps> = ({
  selectedSeats,
  fromDate,
  toDate,
  totalDays,
  startTime,
  endTime,
  durationHours,
  totalPrice,
  companyName,
  onClearSelection,
  onProceedToBooking,
}) => {
  if (selectedSeats.length === 0) {
    return (
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 md:left-64 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-4 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 font-medium gap-2">
          <div className="flex items-center gap-2">
            <Armchair className="w-4 h-4 text-sky-600" />
            <span>Select one or more seats on the interactive floor map to start booking</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              {fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`} ({totalDays}d)
            </span>
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              {startTime} - {endTime}
            </span>
            {companyName && (
              <span className="flex items-center gap-1 text-sky-800 font-semibold truncate max-w-48">
                <Building className="w-3 h-3 text-sky-600" />
                {companyName}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const durationLabel = totalDays === 1 ? '1 Day' : totalDays >= 720 ? `${totalDays}d (2 Years)` : `${totalDays} Days`;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 md:left-64 right-0 z-30 bg-white/95 backdrop-blur-md border-t-2 border-sky-600 shadow-xl py-3.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Selected Seats Info */}
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
            <Armchair className="w-5 h-5" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {selectedSeats.length} Seat{selectedSeats.length > 1 ? 's' : ''} Selected
              </span>
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-0.5 cursor-pointer font-semibold"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>

            {/* Seat names badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-sm sm:max-w-md">
              {selectedSeats.map((seat) => (
                <span
                  key={seat.id}
                  className="font-mono text-xs px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 whitespace-nowrap shrink-0 font-bold"
                >
                  {seat.id}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Slot Details with Company and Date Range */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-700 border-x border-slate-200 px-6 font-mono font-medium">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Booking Window</span>
            <span className="text-slate-900 font-semibold">
              {fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`} ({durationLabel})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Office Hours</span>
            <span className="text-slate-900 font-semibold">
              {startTime} - {endTime}
            </span>
          </div>
          {companyName && (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Company</span>
              <span className="text-sky-800 font-bold truncate max-w-36 block">
                {companyName}
              </span>
            </div>
          )}
        </div>

        {/* Right: Price & Proceed CTA */}
        <div className="flex items-center justify-between sm:justify-end gap-5">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
              Total Payable (INR)
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              {formatINR(totalPrice)}
            </div>
          </div>

          <button
            type="button"
            onClick={onProceedToBooking}
            className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Proceed to Book</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
