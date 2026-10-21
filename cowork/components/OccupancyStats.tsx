import React, { useState } from 'react';
import {
  TrendingUp,
  Armchair,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Lock,
  Filter,
  Download,
  Clock,
  Sparkles,
  Building,
} from 'lucide-react';
import { CoworkingSpace, Booking, Seat } from '../types';
import { formatINR, isSeatBooked, getSeatBooking } from '../utils/storage';
import { getTodayDateString, getKnownAreas } from '../data/initialData';

interface OccupancyStatsProps {
  spaces: CoworkingSpace[];
  bookings: Booking[];
}

export const OccupancyStats: React.FC<OccupancyStatsProps> = ({ spaces, bookings }) => {
  const [filterDate, setFilterDate] = useState<string>(getTodayDateString());
  const [filterStartTime, setFilterStartTime] = useState<string>('09:30');
  const [filterEndTime, setFilterEndTime] = useState<string>('18:30');
  const [activeBranchTab, setActiveBranchTab] = useState<string>('all');
  const [seatViewMode, setSeatViewMode] = useState<'both' | 'booked' | 'free'>('both');

  // Calculate live occupancy for the selected date & time window
  const activeBookings = bookings.filter((b) => b.status !== 'cancelled');
  const totalRevenue = activeBookings.reduce((sum, b) => sum + b.totalPrice, 0);

  // Compute branch-wise stats for current filter window
  const branchData = spaces.map((space) => {
    const bookedSeats: Array<{ seat: Seat; booking: Booking }> = [];
    const freeSeats: Seat[] = [];

    space.seats.forEach((seat) => {
      const booked = isSeatBooked(seat.id, filterDate, filterDate, filterStartTime, filterEndTime, bookings, space.id);
      if (booked) {
        const b = getSeatBooking(seat.id, filterDate, filterDate, filterStartTime, filterEndTime, bookings, space.id);
        if (b) {
          bookedSeats.push({ seat, booking: b });
        }
      } else {
        freeSeats.push(seat);
      }
    });

    const total = space.seats.length;
    const occupiedCount = bookedSeats.length;
    const freeCount = freeSeats.length;
    const occupancyRate = total > 0 ? Math.round((occupiedCount / total) * 100) : 0;

    return {
      space,
      total,
      occupiedCount,
      freeCount,
      occupancyRate,
      bookedSeats,
      freeSeats,
    };
  });

  // Overall totals across all Coimbatore spaces for this filter window
  const totalAllSeats = branchData.reduce((sum, b) => sum + b.total, 0);
  const totalAllOccupied = branchData.reduce((sum, b) => sum + b.occupiedCount, 0);
  const totalAllFree = branchData.reduce((sum, b) => sum + b.freeCount, 0);
  const overallOccupancyPct = totalAllSeats > 0 ? Math.round((totalAllOccupied / totalAllSeats) * 100) : 0;

  // Filtered branches to display
  const displayedBranches = activeBranchTab === 'all'
    ? branchData
    : branchData.filter((b) => b.space.branchArea === activeBranchTab);

  const handleExportOccupancyCSV = () => {
    const headers = [
      'Branch Area',
      'Hub Name',
      'Seat ID',
      'Seat Name',
      'Category',
      'Status (At Selected Slot)',
      'Occupant Client Name',
      'Company Name',
      'Booking ID',
      'Rate Per Hour (INR)',
    ];

    const rows: any[] = [];
    branchData.forEach((b) => {
      b.bookedSeats.forEach(({ seat, booking }) => {
        rows.push([
          `"${b.space.branchArea}"`,
          `"${b.space.name}"`,
          seat.id,
          `"${seat.name}"`,
          `"${seat.category}"`,
          'OCCUPIED',
          `"${booking.clientName}"`,
          `"${booking.companyName || ''}"`,
          booking.id,
          seat.pricePerHour,
        ]);
      });
      b.freeSeats.forEach((seat) => {
        rows.push([
          `"${b.space.branchArea}"`,
          `"${b.space.name}"`,
          seat.id,
          `"${seat.name}"`,
          `"${seat.category}"`,
          'AVAILABLE (FREE)',
          '-',
          '-',
          '-',
          seat.pricePerHour,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `coimbatore_occupancy_report_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP SUMMARY CARDS: TOTAL SEATS, OCCUPIED SEATS & FREE SEATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Capacity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Seats</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
              <Armchair className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalAllSeats}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Across 4 Coimbatore Hubs</p>
        </div>

        {/* Occupied / Booked Seats */}
        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Occupied Seats</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-800">{totalAllOccupied} Booked</div>
          <p className="text-[11px] text-rose-600 mt-0.5 font-medium">Currently reserved</p>
        </div>

        {/* Free / Available Seats */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Free / Available Seats</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-800">{totalAllFree} Free</div>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Ready for immediate booking</p>
        </div>

        {/* Occupancy Rate % */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Occupancy Index</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{overallOccupancyPct}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${overallOccupancyPct}%` }}
            ></div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <span className="font-bold font-mono">₹</span>
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{formatINR(totalRevenue)}</div>
          <p className="text-[11px] text-emerald-700 mt-0.5 font-semibold">
            {activeBookings.length} confirmed bookings
          </p>
        </div>
      </div>

      {/* 2. FILTER & CONTROLS STRIP FOR OCCUPANCY WINDOW */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Branch-Wise Occupancy & Seat Availability Inspector</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect both occupied and free seats for any date and time window across all Coimbatore hubs
            </p>
          </div>

          <button
            onClick={handleExportOccupancyCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer self-start md:self-auto shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Branch Occupancy (CSV)</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Select Inspection Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-1.5 font-mono font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Inspection Time Slot
            </label>
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-300">
              <input
                type="time"
                value={filterStartTime}
                onChange={(e) => setFilterStartTime(e.target.value)}
                className="bg-white border border-slate-200 text-slate-900 text-xs rounded px-2 py-1 font-mono text-center w-full"
              />
              <span className="text-slate-400 font-mono text-xs">to</span>
              <input
                type="time"
                value={filterEndTime}
                onChange={(e) => setFilterEndTime(e.target.value)}
                className="bg-white border border-slate-200 text-slate-900 text-xs rounded px-2 py-1 font-mono text-center w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Filter Branch Hub
            </label>
            <select
              value={activeBranchTab}
              onChange={(e) => setActiveBranchTab(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="all">All Coimbatore Hubs</option>
              {getKnownAreas(spaces).map((a) => (
                <option key={a} value={a}>{a} Hub</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
              Display Seats
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setSeatViewMode('both')}
                className={`flex-1 py-1 text-xs rounded font-bold cursor-pointer transition-colors ${
                  seatViewMode === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Both
              </button>
              <button
                onClick={() => setSeatViewMode('booked')}
                className={`flex-1 py-1 text-xs rounded font-bold cursor-pointer transition-colors ${
                  seatViewMode === 'booked' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700'
                }`}
              >
                Booked
              </button>
              <button
                onClick={() => setSeatViewMode('free')}
                className={`flex-1 py-1 text-xs rounded font-bold cursor-pointer transition-colors ${
                  seatViewMode === 'free' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700'
                }`}
              >
                Free
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BRANCH-WISE CARDS WITH DETAILED OCCUPIED AND AVAILABLE SEATS */}
      <div className="space-y-6">
        {displayedBranches.map((b) => (
          <div
            key={b.space.id}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5"
          >
            {/* Branch Header with Occupied and Free stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                    {b.space.branchArea} Hub
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    PIN: {b.space.pincode} · Phone: {b.space.phone}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{b.space.name}</h3>
                <p className="text-xs text-slate-500">{b.space.address}, Coimbatore</p>
              </div>

              {/* Branch metrics pill */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Capacity</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{b.total} Seats</span>
                </div>

                <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-rose-600 block text-[10px] uppercase font-bold">Booked Seats</span>
                  <span className="font-mono font-bold text-rose-700 text-sm">{b.occupiedCount} Seats</span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-emerald-600 block text-[10px] uppercase font-bold">Available (Free)</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{b.freeCount} Seats</span>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-indigo-600 block text-[10px] uppercase font-bold">Occupancy</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">{b.occupancyRate}%</span>
                </div>
              </div>
            </div>

            {/* Visual Progress Bar for this branch */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>
                  <strong className="text-rose-700 font-bold">{b.occupiedCount} Occupied</strong> vs{' '}
                  <strong className="text-emerald-700 font-bold">{b.freeCount} Free</strong>
                </span>
                <span className="font-mono font-semibold text-slate-700">
                  {b.occupiedCount} / {b.total} ({b.occupancyRate}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: `${b.occupancyRate}%` }}
                  title={`${b.occupiedCount} Occupied Seats`}
                ></div>
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${100 - b.occupancyRate}%` }}
                  title={`${b.freeCount} Free Seats`}
                ></div>
              </div>
            </div>

            {/* SEAT DETAILS ACCORDION/LIST (Shows which seats are booked and which are free!) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* BOOKED SEATS SECTION */}
              {(seatViewMode === 'both' || seatViewMode === 'booked') && (
                <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Booked Seats ({b.bookedSeats.length})</span>
                    </div>
                    <span className="text-[11px] font-mono text-rose-700 font-semibold">
                      Reserved at {filterStartTime}-{filterEndTime}
                    </span>
                  </div>

                  {b.bookedSeats.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      All seats in this branch are currently free during this time slot!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {b.bookedSeats.map(({ seat, booking }) => (
                        <div
                          key={seat.id}
                          className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-300">
                              {seat.id}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{seat.name}</div>
                              <div className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                                <Building className="w-3 h-3 text-slate-400" />
                                <span className="font-bold text-slate-800">{booking.companyName || 'Independent'}</span>
                                <span aria-hidden="true">·</span>
                                <span>{booking.clientName}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 block font-semibold">
                              {booking.id}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                              {booking.startTime}-{booking.endTime}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FREE / AVAILABLE SEATS SECTION */}
              {(seatViewMode === 'both' || seatViewMode === 'free') && (
                <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Available / Free Seats ({b.freeSeats.length})</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                      Ready to reserve
                    </span>
                  </div>

                  {b.freeSeats.length === 0 ? (
                    <div className="py-6 text-center text-xs text-rose-600 font-medium">
                      All seats in this branch are currently fully booked!
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto p-1">
                      {b.freeSeats.map((seat) => (
                        <div
                          key={seat.id}
                          className="group relative bg-white border border-emerald-200 hover:border-emerald-400 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs shadow-2xs transition-colors"
                        >
                          <span className="font-mono font-bold text-emerald-900">{seat.id}</span>
                          <span className="text-[10px] text-slate-500 capitalize">
                            ({seat.category === 'hotdesk'
                              ? 'Hotdesk'
                              : seat.category === 'co_working'
                              ? 'Flex'
                              : seat.category === 'meeting_room'
                              ? 'Meeting'
                              : 'Private'})
                          </span>
                          <span className="text-[10px] font-mono text-emerald-700 font-bold">
                            {formatINR(seat.pricePerHour)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
