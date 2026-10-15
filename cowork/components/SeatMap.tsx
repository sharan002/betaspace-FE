import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Lock, Check, Monitor, Users, Briefcase, Sparkles, ShieldCheck } from 'lucide-react';
import { CoworkingSpace, Seat, Booking } from '../types';
import { ChairIcon } from './ChairIcon';
import { isSeatBooked, getSeatBooking, formatINR } from '../utils/storage';

interface SeatMapProps {
  space: CoworkingSpace;
  fromDate: string;
  toDate?: string;
  selectedDate?: string;
  startTime: string;
  endTime: string;
  bookings: Booking[];
  selectedSeatIds: string[];
  onToggleSeat: (seatId: string) => void;
  onSelectMultipleSeats: (seatIds: string[]) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  space,
  fromDate,
  toDate,
  selectedDate,
  startTime,
  endTime,
  bookings,
  selectedSeatIds,
  onToggleSeat,
  onSelectMultipleSeats,
}) => {
  const effectiveFrom = fromDate || selectedDate || '';
  const effectiveTo = toDate || effectiveFrom;

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(1.4, Math.max(0.75, Math.round((prev + delta) * 10) / 10)));
  };

  const resetZoom = () => setZoomLevel(1);

  // Group seats by user categories
  const meetingSeats = space.seats.filter((s) => s.category === 'meeting_room');
  const privateOfficeSeats = space.seats.filter((s) => s.category === 'private_office');
  const staticHotdesks = space.seats.filter((s) => s.category === 'hotdesk');
  const flexCoworkingSeats = space.seats.filter((s) => s.category === 'co_working');

  // Group flex coworking seats by row (e.g., Row A, B, C)
  const flexRows = Array.from(new Set(flexCoworkingSeats.map((s) => s.row))).sort();

  // Helper to render an individual seat
  const renderSeat = (seat: Seat) => {
    const isBooked = isSeatBooked(seat.id, effectiveFrom, effectiveTo, startTime, endTime, bookings, space.id);
    const isSelected = selectedSeatIds.includes(seat.id);
    const bookingInfo = isBooked ? getSeatBooking(seat.id, effectiveFrom, effectiveTo, startTime, endTime, bookings, space.id) : null;

    return (
      <div
        key={seat.id}
        className="relative group inline-block m-1"
        onMouseEnter={() => setHoveredSeat(seat)}
        onMouseLeave={() => setHoveredSeat(null)}
      >
        <button
          type="button"
          disabled={isBooked}
          onClick={() => onToggleSeat(seat.id)}
          aria-label={`${seat.name} - ${isBooked ? 'Booked' : isSelected ? 'Selected' : 'Available'}`}
          className={`relative flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl transition-all duration-150 cursor-pointer ${
            isBooked
              ? 'bg-slate-100 border border-slate-200 opacity-60 cursor-not-allowed shadow-none'
              : isSelected
              ? 'bg-sky-100 border-2 border-sky-600 ring-3 ring-sky-300/70 shadow-md -translate-y-0.5'
              : 'bg-white border border-slate-300 hover:border-sky-500 hover:bg-sky-50/60 hover:-translate-y-0.5 shadow-xs'
          }`}
        >
          {/* Seat Chair Graphic */}
          <ChairIcon
            className="w-7 h-7 sm:w-8 sm:h-8"
            selected={isSelected}
            booked={isBooked}
            category={seat.category}
          />

          {/* Seat Number / ID Label */}
          <span
            className={`text-[10px] sm:text-[11px] font-mono mt-1 font-bold ${
              isBooked
                ? 'text-slate-400'
                : isSelected
                ? 'text-sky-800'
                : 'text-slate-700'
            }`}
          >
            {seat.number}
          </span>

          {/* Indicator icons */}
          {isSelected && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-md">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}

          {isBooked && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center border border-slate-300">
              <Lock className="w-2 h-2" />
            </div>
          )}
        </button>

        {/* Hover Tooltip - Light Theme BookMyShow style */}
        {hoveredSeat?.id === seat.id && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3.5 bg-white border border-slate-300 rounded-xl shadow-xl pointer-events-none text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-xs text-slate-900 truncate">{seat.name}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  isBooked
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : isSelected
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isBooked ? 'OCCUPIED' : isSelected ? 'SELECTED' : 'AVAILABLE'}
              </span>
            </div>

            <div className="py-2 text-[11px] space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Rate:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatINR(seat.pricePerHour)}/hr · {formatINR(seat.pricePerDay)}/day
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {seat.category === 'hotdesk'
                    ? 'Fixed & Static Desk'
                    : seat.category === 'co_working'
                    ? 'Co-Working (Flex)'
                    : seat.category === 'meeting_room'
                    ? 'Meeting Room Seat'
                    : 'Private Office Seat'}
                </span>
              </div>

              {seat.amenities && seat.amenities.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Amenities:</span>
                  <div className="flex flex-wrap gap-1">
                    {seat.amenities.map((am, i) => (
                      <span
                        key={i}
                        className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-medium"
                      >
                        {am}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isBooked && bookingInfo && (
                <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-rose-700">
                  <span className="block text-slate-500 font-semibold">Reserved by:</span>
                  <strong className="text-slate-900">{bookingInfo.clientName}</strong>
                  {bookingInfo.companyName && (
                    <span className="text-slate-600 block truncate">({bookingInfo.companyName})</span>
                  )}
                  <span className="font-mono text-[9px] text-slate-500">
                    Slot: {bookingInfo.startTime} - {bookingInfo.endTime}
                  </span>
                </div>
              )}
            </div>

            <div className="text-[9px] text-slate-500 text-center pt-1.5 border-t border-slate-100 font-medium">
              {isBooked ? 'Unavailable for selected slot' : isSelected ? 'Click to deselect' : 'Click to select this seat'}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Top Controls: Legend & Zoom Bar (Light Theme) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-200 bg-slate-50/70">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-white border border-slate-300 flex items-center justify-center">
              <ChairIcon className="w-3.5 h-3.5" />
            </div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-sky-100 border-2 border-sky-600 flex items-center justify-center">
              <Check className="w-3 h-3 text-sky-700" />
            </div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-slate-200 border border-slate-300 opacity-70 flex items-center justify-center">
              <Lock className="w-2.5 h-2.5 text-slate-500" />
            </div>
            <span>Occupied</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">|</span>

          {/* User category color hints */}
          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Meeting Room (Slot)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Private Office (Shared)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Hotdesk (Fixed & Static)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Co-Working (Flex)
            </span>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => handleZoom(-0.1)}
            disabled={zoomLevel <= 0.75}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-mono font-semibold text-slate-800 min-w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.1)}
            disabled={zoomLevel >= 1.4}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={resetZoom}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors ml-1 cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Floor Container with Zoom Transform */}
      <div
        ref={containerRef}
        className="p-6 sm:p-10 overflow-x-auto min-h-[580px] flex flex-col items-center select-none bg-slate-50/30"
      >
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 ease-out flex flex-col items-center w-full max-w-4xl"
        >
          {/* THE CINEMA CURVED SCREEN / PRESENTATION STAGE (BookMyShow Light Theme) */}
          <div className="w-full max-w-2xl mb-12 flex flex-col items-center">
            <div className="w-full cinema-screen-glow pt-4 pb-2 px-8 flex flex-col items-center">
              <div className="w-full h-4 cinema-curve-bar"></div>
            </div>
            <div className="text-center mt-2.5">
              <span className="text-xs font-bold tracking-widest uppercase text-sky-800">
                {space.screenLabel}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">
                {space.name} ({space.branchArea}, Coimbatore) · Screen & Entrance Direction
              </p>
            </div>
          </div>

          {/* 1. MEETING ROOMS (Based on Time Slot) */}
          {space.meetingRooms.length > 0 && (
            <div className="w-full mb-10">
              <div className="flex items-center justify-between pb-2 mb-4 border-b border-indigo-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Meeting Rooms (Slot-Based Booking)
                  </h3>
                  <span className="text-xs text-indigo-700 font-mono font-semibold">
                    ({formatINR(space.meetingRooms[0]?.pricePerHour || 650)}/hr for full room)
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Reserve individual chairs or whole room</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {space.meetingRooms.map((room) => {
                  const roomSeats = space.seats.filter((s) => room.seatIds.includes(s.id));
                  const availableRoomSeatIds = roomSeats
                    .filter((s) => !isSeatBooked(s.id, effectiveFrom, effectiveTo, startTime, endTime, bookings, space.id))
                    .map((s) => s.id);
                  const isEntireRoomAvailable = availableRoomSeatIds.length === roomSeats.length;
                  const areAllRoomSeatsSelected =
                    roomSeats.length > 0 && roomSeats.every((s) => selectedSeatIds.includes(s.id));

                  return (
                    <div
                      key={room.id}
                      className="bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-2xl p-4 sm:p-5 flex flex-col items-center relative hover:border-indigo-400 transition-colors"
                    >
                      {/* Meeting Room Header */}
                      <div className="w-full flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>{room.name}</span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold">
                              {room.capacity} Pax
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {room.equipment.join(' · ')}
                          </p>
                        </div>

                        {/* Quick Action: Select Whole Room */}
                        {isEntireRoomAvailable && (
                          <button
                            type="button"
                            onClick={() => {
                              if (areAllRoomSeatsSelected) {
                                onSelectMultipleSeats(
                                  selectedSeatIds.filter((id) => !room.seatIds.includes(id))
                                );
                              } else {
                                const newSet = new Set([...selectedSeatIds, ...room.seatIds]);
                                onSelectMultipleSeats(Array.from(newSet));
                              }
                            }}
                            className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                              areAllRoomSeatsSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300'
                            }`}
                          >
                            {areAllRoomSeatsSelected ? 'Deselect Room' : 'Select All Chairs'}
                          </button>
                        )}
                      </div>

                      {/* Conference Table Graphic */}
                      <div className="flex flex-col items-center my-2 w-full">
                        {/* Top Row Chairs */}
                        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1">
                          {roomSeats.slice(0, Math.ceil(roomSeats.length / 2)).map(renderSeat)}
                        </div>

                        {/* Conference Table Surface */}
                        <div className="w-11/12 max-w-sm h-11 rounded-xl bg-gradient-to-r from-indigo-100 via-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center shadow-xs my-1 px-4">
                          <div className="flex items-center gap-2 text-indigo-900 text-xs font-bold tracking-wide">
                            <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Conference Table & 4K Screen</span>
                          </div>
                        </div>

                        {/* Bottom Row Chairs */}
                        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1">
                          {roomSeats.slice(Math.ceil(roomSeats.length / 2)).map(renderSeat)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. PRIVATE OFFICE ("Office inside office one office shared by 2 or many people") */}
          {privateOfficeSeats.length > 0 && (
            <div className="w-full mb-10">
              <div className="flex items-center justify-between pb-2 mb-4 border-b border-purple-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                    Private Office (Office inside office - Shared by 2 or more people)
                  </h3>
                  <span className="text-xs text-purple-700 font-mono font-semibold">
                    (from {formatINR(space.privateOffices[0]?.pricePerHour || 450)}/hr)
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Enclosed glass cabin team suites inside the coworking floor
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {space.privateOffices.map((office) => {
                  const officeSeats = space.seats.filter((s) => office.seatIds.includes(s.id));
                  return (
                    <div
                      key={office.id}
                      className="bg-purple-50/50 border border-purple-200 rounded-2xl p-5 hover:border-purple-400 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-purple-600" />
                            <span>{office.name}</span>
                          </h4>
                          <span className="text-[11px] text-purple-700 font-medium">
                            {office.features[0] || `Shared by ${office.capacity} people`}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-purple-800">
                            {formatINR(office.monthlyRent)}/mo
                          </span>
                          <span className="text-[10px] text-slate-500 block">or hourly slot</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 sm:gap-3 bg-white p-3 rounded-xl border border-purple-200">
                        {officeSeats.map(renderSeat)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. HOTDESK ("Fixed and static place where it will not change often") */}
          {staticHotdesks.length > 0 && (
            <div className="w-full mb-10">
              <div className="flex items-center justify-between pb-2 mb-4 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Hotdesk (Fixed & Static Place - Will Not Change Often)
                  </h3>
                  <span className="text-xs text-amber-800 font-mono font-semibold">
                    ({formatINR(staticHotdesks[0]?.pricePerHour || 95)}/hr · {formatINR(staticHotdesks[0]?.pricePerDay || 550)}/day)
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Permanent static desk with lockable storage & nameplate
                </span>
              </div>

              <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  {staticHotdesks.map(renderSeat)}
                </div>
              </div>
            </div>
          )}

          {/* 4. CO WORKING ("will change" - Flex Seats in Cinema Rows) */}
          {flexCoworkingSeats.length > 0 && (
            <div className="w-full mb-8">
              <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-600"></div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Co-Working Seats (Flex Roving Chairs - Dynamic & Will Change)
                  </h3>
                  <span className="text-xs text-sky-700 font-mono font-semibold">
                    ({formatINR(flexCoworkingSeats[0]?.pricePerHour || 60)}/hr · {formatINR(flexCoworkingSeats[0]?.pricePerDay || 350)}/day)
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Open flex workspace with theater row aisles
                </span>
              </div>

              {/* Theater Cinema Style Rows */}
              <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                {flexRows.map((rowName) => {
                  const rowSeats = flexCoworkingSeats.filter((s) => s.row === rowName);
                  const midPoint = Math.ceil(rowSeats.length / 2);
                  const leftHalf = rowSeats.slice(0, midPoint);
                  const rightHalf = rowSeats.slice(midPoint);

                  return (
                    <div key={rowName} className="flex items-center gap-3 sm:gap-4 w-full justify-center">
                      {/* Left Row Indicator */}
                      <span className="w-6 text-center text-xs font-bold font-mono text-slate-600 shrink-0">
                        {rowName}
                      </span>

                      {/* Left Block */}
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {leftHalf.map(renderSeat)}
                      </div>

                      {/* Theater Center Aisle */}
                      <div className="w-6 sm:w-10 flex flex-col items-center justify-center">
                        <div className="w-0.5 h-6 bg-slate-200"></div>
                      </div>

                      {/* Right Block */}
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {rightHalf.map(renderSeat)}
                      </div>

                      {/* Right Row Indicator */}
                      <span className="w-6 text-center text-xs font-bold font-mono text-slate-600 shrink-0">
                        {rowName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
