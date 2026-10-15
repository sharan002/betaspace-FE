import React, { useState, useMemo } from 'react';
import { Search, Calendar, Ticket, Download, Armchair, Clock, XCircle } from 'lucide-react';
import { Booking, BookingStatus, CoworkingSpace } from '../types';
import { formatINR } from '../utils/storage';

interface BookingsListProps {
  bookings: Booking[];
  spaces: CoworkingSpace[];
  onCheckInBooking: (bookingId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onViewTicket: (booking: Booking) => void;
}

export const BookingsList: React.FC<BookingsListProps> = ({
  bookings,
  spaces,
  onCheckInBooking,
  onCancelBooking,
  onViewTicket,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedSpaceId !== 'all' && b.spaceId !== selectedSpaceId) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (dateFilter && b.date !== dateFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient = b.clientName.toLowerCase().includes(q);
        const matchesEmail = b.clientEmail.toLowerCase().includes(q);
        const matchesId = b.id.toLowerCase().includes(q);
        const matchesCompany = b.companyName?.toLowerCase().includes(q);
        const matchesBranch = b.branchArea?.toLowerCase().includes(q);
        const matchesSeats = b.seatIds.some((s) => s.toLowerCase().includes(q));
        if (!matchesClient && !matchesEmail && !matchesId && !matchesCompany && !matchesSeats && !matchesBranch) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, selectedSpaceId, statusFilter, dateFilter, searchQuery]);

  const handleExportCSV = () => {
    const headers = [
      'Booking ID',
      'Client Name',
      'Client Email',
      'Phone',
      'Company',
      'Branch Area',
      'Workspace Hub',
      'Date',
      'Start Time',
      'End Time',
      'Seats',
      'Total (INR)',
      'Status',
    ];

    const rows = filteredBookings.map((b) => [
      b.id,
      `"${b.clientName}"`,
      b.clientEmail,
      `"${b.clientPhone}"`,
      `"${b.companyName || ''}"`,
      `"${b.branchArea || ''}"`,
      `"${b.spaceName}"`,
      b.date,
      b.startTime,
      b.endTime,
      `"${b.seatIds.join(', ')}"`,
      b.totalPrice,
      b.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cowork_kovai_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
            CONFIRMED
          </span>
        );
      case 'checked_in':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            CHECKED IN
          </span>
        );
      case 'completed':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
            COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            CANCELLED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Search, Filters, Export (Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>Coimbatore Bookings & Client Reservations</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredBookings.length} of {bookings.length} reservations across Ram Nagar, Singanallur, Koundampalayam & Neelikonampalayam
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredBookings.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-40 cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filter inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client, seat, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>

          {/* Space filter */}
          <div>
            <label htmlFor="filter-hub" className="sr-only">Filter by Hub</label>
            <select
              id="filter-hub"
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="all">All Coimbatore Hubs</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.branchArea})
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label htmlFor="filter-status-select" className="sr-only">Filter by Status</label>
            <select
              id="filter-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="all">All Booking Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[11px] text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-200 rounded cursor-pointer font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bookings Table (Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Armchair className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No Reservations Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || dateFilter || statusFilter !== 'all'
                ? 'Try adjusting your search query or active filters.'
                : 'Book seats on the seat map to create your first client reservation.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Client & Company</th>
                  <th className="py-3 px-4">Hub & Slot</th>
                  <th className="py-3 px-4">Seats Reserved</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Booking ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-700 whitespace-nowrap">
                      {b.id}
                    </td>

                    {/* Client Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.clientName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>{b.clientPhone}</span>
                        {b.companyName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-700 font-medium">{b.companyName}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Workspace & Time */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-semibold truncate max-w-xs">
                        {b.spaceName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-sky-600" />
                        <span>{b.date}</span>
                        <Clock className="w-3 h-3 text-indigo-600 ml-1" />
                        <span>
                          {b.startTime}-{b.endTime} ({b.durationHours}h)
                        </span>
                      </div>
                    </td>

                    {/* Seats */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {b.seatIds.map((sId) => (
                          <span
                            key={sId}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold"
                          >
                            {sId}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Amount (INR) */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(b.totalPrice)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(b.status)}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewTicket(b)}
                          className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="View Digital Ticket Pass"
                        >
                          <Ticket className="w-4 h-4" />
                        </button>

                        {b.status === 'confirmed' && (
                          <button
                            onClick={() => onCheckInBooking(b.id)}
                            className="px-2 py-1 text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-md font-bold transition-colors cursor-pointer"
                            title="Check in client upon arrival"
                          >
                            Check In
                          </button>
                        )}

                        {b.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              if (confirm(`Cancel reservation #${b.id} and free up seats?`)) {
                                onCancelBooking(b.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Cancel Reservation"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
