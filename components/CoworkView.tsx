import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Armchair, CalendarCheck, LayoutDashboard, Plus, Building2, Package, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import { CoworkingSpace, Booking } from '../cowork/types';
import { isSeatBooked } from '../cowork/utils/storage';
import { getTodayDateString, TIME_SLOT_PRESETS, calculateDateDifferenceDays, INITIAL_SPACES } from '../cowork/data/initialData';
import { SlotSelector } from '../cowork/components/SlotSelector';
import { SeatMap } from '../cowork/components/SeatMap';
import { BookingSummaryBar } from '../cowork/components/BookingSummaryBar';
import { BookingModal } from '../cowork/components/BookingModal';
import { TicketPassModal } from '../cowork/components/TicketPassModal';
import { SpaceConfigModal } from '../cowork/components/SpaceConfigModal';
import { BookingsList } from '../cowork/components/BookingsList';
import { SpacesManagerTab } from '../cowork/components/SpacesManagerTab';
import { OccupancyStats } from '../cowork/components/OccupancyStats';
import { VirtualManagedTab } from '../cowork/components/VirtualManagedTab';

type Tab = 'booking' | 'virtual_managed' | 'spaces' | 'bookings_list' | 'analytics';
type ServiceType = 'seats' | 'meeting_room' | 'private_office' | 'virtual_office' | 'managed_office';

interface CoworkViewProps {
  isAdmin: boolean;
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'booking', label: 'Seat & Room Booking', icon: <Armchair className="w-4 h-4" /> },
  { key: 'virtual_managed', label: 'Virtual & Managed', icon: <Package className="w-4 h-4" /> },
  { key: 'spaces', label: 'Spaces', icon: <Building2 className="w-4 h-4" /> },
  { key: 'bookings_list', label: 'All Bookings', icon: <CalendarCheck className="w-4 h-4" /> },
  { key: 'analytics', label: 'Occupancy Stats', icon: <LayoutDashboard className="w-4 h-4" /> },
];

const CoworkView: React.FC<CoworkViewProps> = ({ isAdmin }) => {
  const [spaces, setSpaces] = useState<CoworkingSpace[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('booking');
  const [activeSpaceId, setActiveSpaceId] = useState('');
  const [fromDate, setFromDate] = useState(() => getTodayDateString());
  const [toDate, setToDate] = useState(() => getTodayDateString());
  const [startTime, setStartTime] = useState(TIME_SLOT_PRESETS[0].startTime);
  const [endTime, setEndTime] = useState(TIME_SLOT_PRESETS[0].endTime);
  const [companyName, setCompanyName] = useState('');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSpaceConfigModalOpen, setIsSpaceConfigModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<CoworkingSpace | undefined>(undefined);
  const [viewingTicketBooking, setViewingTicketBooking] = useState<Booking | null>(null);
  const [customBookingDetails, setCustomBookingDetails] = useState<{
    serviceType: ServiceType;
    title: string;
    price: number;
    space: CoworkingSpace;
  } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      let loadedSpaces = await apiService.getCoworkSpaces();
      // First run: nothing configured yet — an admin seeds the default hubs.
      if (loadedSpaces.length === 0 && isAdmin) {
        loadedSpaces = await Promise.all(INITIAL_SPACES.map((s) => apiService.saveCoworkSpace(s)));
      }
      const loadedBookings = await apiService.getCoworkBookings();
      setSpaces(loadedSpaces);
      setBookings(loadedBookings);
      setActiveSpaceId((prev) => (loadedSpaces.some((s) => s.id === prev) ? prev : loadedSpaces[0]?.id || ''));
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load co-working data');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) || spaces[0],
    [spaces, activeSpaceId]
  );

  const totalDays = useMemo(() => calculateDateDifferenceDays(fromDate, toDate), [fromDate, toDate]);

  const durationHours = useMemo(() => {
    const sMins = parseInt(startTime.split(':')[0], 10) * 60 + parseInt(startTime.split(':')[1] || '0', 10);
    const eMins = parseInt(endTime.split(':')[0], 10) * 60 + parseInt(endTime.split(':')[1] || '0', 10);
    return Math.max(1, Math.round(((eMins - sMins) / 60) * 10) / 10);
  }, [startTime, endTime]);

  const availableSeatsCount = useMemo(() => {
    if (!activeSpace) return 0;
    return activeSpace.seats.filter(
      (s) => !isSeatBooked(s.id, fromDate, toDate, startTime, endTime, bookings, activeSpace.id)
    ).length;
  }, [activeSpace, fromDate, toDate, startTime, endTime, bookings]);

  const selectedSeats = useMemo(() => {
    if (!activeSpace) return [];
    return activeSpace.seats.filter((s) => selectedSeatIds.includes(s.id));
  }, [activeSpace, selectedSeatIds]);

  // Daily rate × days, with long-term corporate discounts (30 days 15%, 1 year 20%, 2 years 30%).
  const totalPrice = useMemo(() => {
    if (customBookingDetails) return customBookingDetails.price;
    const singleDayTotal = selectedSeats.reduce((sum, seat) => sum + seat.pricePerHour * durationHours, 0);
    if (totalDays === 1) return singleDayTotal;
    if (totalDays >= 720) return Math.round(singleDayTotal * totalDays * 0.7);
    if (totalDays >= 360) return Math.round(singleDayTotal * totalDays * 0.8);
    if (totalDays >= 30) return Math.round(singleDayTotal * totalDays * 0.85);
    return singleDayTotal * totalDays;
  }, [selectedSeats, durationHours, totalDays, customBookingDetails]);

  const handleSelectTimeRange = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    setSelectedSeatIds((prev) =>
      prev.filter((id) => !isSeatBooked(id, fromDate, toDate, start, end, bookings, activeSpaceId))
    );
  };

  const handleSelectDateRange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
    setSelectedSeatIds((prev) =>
      prev.filter((id) => !isSeatBooked(id, from, to, startTime, endTime, bookings, activeSpaceId))
    );
  };

  // Persist the booking; the server re-checks for double-booking. A returned string is shown in the modal.
  const handleConfirmBooking = async (draft: Booking): Promise<string | void> => {
    try {
      const saved = await apiService.createCoworkBooking(draft);
      setBookings((prev) => [saved, ...prev]);
      setIsBookingModalOpen(false);
      setSelectedSeatIds([]);
      setCustomBookingDetails(null);
      setViewingTicketBooking(saved);
    } catch (err: any) {
      // A 409 means someone else took the seat — refresh so the map reflects it.
      apiService.getCoworkBookings().then(setBookings).catch(() => {});
      return err?.message || 'Failed to save booking';
    }
  };

  const updateBookingStatus = async (bookingId: string, status: 'checked_in' | 'cancelled') => {
    try {
      const updated = await apiService.updateCoworkBookingStatus(bookingId, status);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    } catch (err: any) {
      alert(err?.message || 'Failed to update booking');
    }
  };

  const handleSaveSpace = async (savedSpace: CoworkingSpace) => {
    try {
      const stored = await apiService.saveCoworkSpace(savedSpace);
      setSpaces((prev) =>
        prev.some((s) => s.id === stored.id) ? prev.map((s) => (s.id === stored.id ? stored : s)) : [...prev, stored]
      );
      setActiveSpaceId(stored.id);
      setIsSpaceConfigModalOpen(false);
      setEditingSpace(undefined);
    } catch (err: any) {
      alert(err?.message || 'Failed to save space');
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    try {
      await apiService.deleteCoworkSpace(spaceId);
      const remaining = spaces.filter((s) => s.id !== spaceId);
      setSpaces(remaining);
      if (activeSpaceId === spaceId) setActiveSpaceId(remaining[0]?.id || '');
    } catch (err: any) {
      alert(err?.message || 'Failed to delete space');
    }
  };

  const openAddSpace = () => {
    setEditingSpace(undefined);
    setIsSpaceConfigModalOpen(true);
  };

  const startCustomBooking = (serviceType: ServiceType, space: CoworkingSpace, title: string, price: number) => {
    setCustomBookingDetails({ serviceType, title, price, space });
    setIsBookingModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Loading co-working spaces…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-3">
        <p className="text-sm font-semibold text-rose-600">{loadError}</p>
        <button onClick={load} className="px-4 py-2 text-xs font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-500">
          Retry
        </button>
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="max-w-md mx-auto py-24 text-center text-sm text-slate-500">
        No co-working spaces are configured yet. Ask an admin to open this page to set them up.
      </div>
    );
  }

  const activeBookingsCount = bookings.filter((b) => b.status !== 'cancelled').length;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-28 space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1.5 overflow-x-auto text-sm font-medium">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setCustomBookingDetails(null); }}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === t.key
                  ? 'bg-sky-50 text-sky-700 font-semibold border border-sky-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.key === 'bookings_list' && activeBookingsCount > 0 && (
                <span className="font-mono text-xs px-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
                  {activeBookingsCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        {isAdmin && (
          <button
            onClick={openAddSpace}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 rounded-lg hover:from-sky-500 hover:to-indigo-500 transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Space</span>
          </button>
        )}
      </div>

      {activeTab === 'booking' && activeSpace && (
        <div className="space-y-6">
          <SlotSelector
            spaces={spaces}
            activeSpaceId={activeSpace.id}
            onSelectSpace={(id) => { setActiveSpaceId(id); setSelectedSeatIds([]); }}
            fromDate={fromDate}
            toDate={toDate}
            onSelectDateRange={handleSelectDateRange}
            startTime={startTime}
            endTime={endTime}
            onSelectTimeRange={handleSelectTimeRange}
            companyName={companyName}
            onChangeCompanyName={setCompanyName}
            availableSeatsCount={availableSeatsCount}
            totalSeatsCount={activeSpace.seats.length}
          />
          <SeatMap
            space={activeSpace}
            fromDate={fromDate}
            toDate={toDate}
            startTime={startTime}
            endTime={endTime}
            bookings={bookings}
            selectedSeatIds={selectedSeatIds}
            onToggleSeat={(id) =>
              setSelectedSeatIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
            }
            onSelectMultipleSeats={setSelectedSeatIds}
          />
        </div>
      )}

      {activeTab === 'virtual_managed' && (
        <VirtualManagedTab
          spaces={spaces}
          onBookVirtualOffice={(space, planName, price) => startCustomBooking('virtual_office', space, planName, price)}
          onInquireManagedOffice={(space, officeName) => startCustomBooking('managed_office', space, officeName, 0)}
        />
      )}

      {activeTab === 'spaces' && (
        <SpacesManagerTab
          spaces={spaces}
          onSelectSpaceForBooking={(id) => { setActiveSpaceId(id); setSelectedSeatIds([]); setActiveTab('booking'); }}
          onEditSpace={(sp) => {
            if (!isAdmin) return alert('Only admins can edit spaces');
            setEditingSpace(sp);
            setIsSpaceConfigModalOpen(true);
          }}
          onDeleteSpace={(id) => {
            if (!isAdmin) return alert('Only admins can delete spaces');
            handleDeleteSpace(id);
          }}
          onAddNewSpace={() => (isAdmin ? openAddSpace() : alert('Only admins can add spaces'))}
        />
      )}

      {activeTab === 'bookings_list' && (
        <BookingsList
          bookings={bookings}
          spaces={spaces}
          onCheckInBooking={(id) => updateBookingStatus(id, 'checked_in')}
          onCancelBooking={(id) => updateBookingStatus(id, 'cancelled')}
          onViewTicket={setViewingTicketBooking}
        />
      )}

      {activeTab === 'analytics' && <OccupancyStats spaces={spaces} bookings={bookings} />}

      {activeTab === 'booking' && (
        <BookingSummaryBar
          selectedSeats={selectedSeats}
          fromDate={fromDate}
          toDate={toDate}
          totalDays={totalDays}
          startTime={startTime}
          endTime={endTime}
          durationHours={durationHours}
          totalPrice={totalPrice}
          companyName={companyName}
          onClearSelection={() => setSelectedSeatIds([])}
          onProceedToBooking={() => { setCustomBookingDetails(null); setIsBookingModalOpen(true); }}
        />
      )}

      {isBookingModalOpen && (customBookingDetails?.space || activeSpace) && (
        <BookingModal
          space={(customBookingDetails?.space || activeSpace)!}
          selectedSeats={customBookingDetails ? [] : selectedSeats}
          fromDate={fromDate}
          toDate={toDate}
          totalDays={totalDays}
          startTime={startTime}
          endTime={endTime}
          durationHours={durationHours}
          totalPrice={totalPrice}
          initialCompanyName={companyName}
          serviceType={customBookingDetails?.serviceType || 'seats'}
          onClose={() => { setIsBookingModalOpen(false); setCustomBookingDetails(null); }}
          onConfirmBooking={handleConfirmBooking}
        />
      )}

      {viewingTicketBooking && (
        <TicketPassModal
          booking={viewingTicketBooking}
          space={spaces.find((s) => s.id === viewingTicketBooking.spaceId)}
          onClose={() => setViewingTicketBooking(null)}
        />
      )}

      {isSpaceConfigModalOpen && (
        <SpaceConfigModal
          existingSpace={editingSpace}
          onClose={() => { setIsSpaceConfigModalOpen(false); setEditingSpace(undefined); }}
          onSaveSpace={handleSaveSpace}
        />
      )}
    </div>
  );
};

export default CoworkView;
