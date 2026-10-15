import React from 'react';
import { X, Check, Printer, Wifi, MapPin, Calendar, Clock, Armchair, Building2 } from 'lucide-react';
import { Booking, CoworkingSpace } from '../types';
import { formatINR } from '../utils/storage';

interface TicketPassModalProps {
  booking: Booking;
  space?: CoworkingSpace;
  onClose: () => void;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({
  booking,
  space,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg my-8">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-slate-200 hover:text-white bg-slate-800/80 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* BOOKMYSHOW STYLE DIGITAL PASS CARD - LIGHT THEME */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl text-slate-900">
          {/* Top Header Banner */}
          <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-indigo-700 p-6 text-center text-white relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xl"></div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold text-white mb-2 shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>COIMBATORE PASS CONFIRMED</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">CoWorkPass Entry Ticket</h2>
            <p className="text-xs text-sky-100 mt-1 font-mono">
              Booking Ref #{booking.id}
            </p>
          </div>

          {/* Main Ticket Body */}
          <div className="p-6 space-y-5">
            {/* Venue & Screen Info */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <span>{booking.spaceName}</span>
                </h3>
                <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {booking.branchArea} Hub
                </span>
              </div>
              {space && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{space.address}, Coimbatore - {space.pincode}</span>
                </p>
              )}
            </div>

            {/* Date, Time & Duration Matrix */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Booking Period
                </span>
                <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="truncate">
                    {booking.fromDate && booking.toDate && booking.fromDate !== booking.toDate
                      ? `${booking.fromDate} → ${booking.toDate}`
                      : booking.date}
                  </span>
                </div>
                {booking.totalDays && booking.totalDays > 1 && (
                  <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded mt-1 inline-block">
                    {booking.totalDays >= 720 ? '2-Year Long Term Lease' : `${booking.totalDays} Days Lease`}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Daily Timings
                </span>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{booking.startTime} - {booking.endTime}</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ({booking.durationHours} hrs / day)
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Company / Organization
                </span>
                <div className="text-sm font-bold text-sky-950 mt-0.5 truncate">
                  {booking.companyName}
                </div>
                <div className="text-[11px] text-slate-600">
                  Contact: {booking.clientName}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Total Paid (INR)
                </span>
                <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
                  {formatINR(booking.totalPrice)}
                </div>
              </div>
            </div>

            {/* Reserved Seats Graphic Strip */}
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-2">
                Confirmed Seats / Chairs ({booking.seatIds.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {booking.seatIds.map((seatId) => (
                  <div
                    key={seatId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 font-mono text-xs font-bold shadow-xs"
                  >
                    <Armchair className="w-3.5 h-3.5 text-sky-600" />
                    <span>{seatId}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Co-Working Perks & Wi-Fi */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">
                    Fast Coimbatore Fiber Access
                  </div>
                  <div className="font-mono text-slate-900 text-xs font-bold">
                    SSID: CoWorkKovai-Guest · Pass: kovai2026
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded font-bold">
                Active
              </div>
            </div>
          </div>

          {/* PERFORATED TICKET DIVIDER (BookMyShow Cinema Notch) */}
          <div className="relative flex items-center justify-between px-2 bg-white">
            <div className="w-6 h-6 -ml-5 rounded-full bg-slate-900/60 border-r border-slate-300"></div>
            <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2"></div>
            <div className="w-6 h-6 -mr-5 rounded-full bg-slate-900/60 border-l border-slate-300"></div>
          </div>

          {/* Ticket Stub / QR Code Footer */}
          <div className="p-6 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Visual QR Code Pattern */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white p-1.5 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 shadow-xs">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                  <rect x="0" y="0" width="30" height="30" rx="3" />
                  <rect x="5" y="5" width="20" height="20" fill="white" />
                  <rect x="9" y="9" width="12" height="12" />

                  <rect x="70" y="0" width="30" height="30" rx="3" />
                  <rect x="75" y="5" width="20" height="20" fill="white" />
                  <rect x="79" y="9" width="12" height="12" />

                  <rect x="0" y="70" width="30" height="30" rx="3" />
                  <rect x="5" y="75" width="20" height="20" fill="white" />
                  <rect x="9" y="79" width="12" height="12" />

                  <rect x="40" y="10" width="8" height="20" />
                  <rect x="15" y="40" width="18" height="8" />
                  <rect x="45" y="45" width="12" height="12" />
                  <rect x="70" y="45" width="8" height="16" />
                  <rect x="40" y="75" width="20" height="8" />
                  <rect x="75" y="75" width="15" height="15" />
                </svg>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">
                  Scan at Coimbatore Desk
                </span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {booking.id}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Present this boarding pass or quote your mobile number at reception.
                </p>
              </div>
            </div>

            {/* Print & Close CTAs */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-300 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Pass</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
