import { Booking } from '../types';

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Convert "HH:MM" string to minutes from midnight for exact time math
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// Check if two time ranges overlap
export function doesTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
}

// Check if two date ranges overlap
export function doesDateRangeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return !(endA < startB || startA > endB);
}

// Check if a seat is booked for a specific date range and time slot
export function isSeatBooked(
  seatId: string,
  fromDate: string,
  toDate: string,
  startTime: string,
  endTime: string,
  bookings: Booking[],
  spaceId: string
): boolean {
  const qStart = fromDate;
  const qEnd = toDate || fromDate;

  return bookings.some((b) => {
    if (b.spaceId !== spaceId) return false;
    if (b.status === 'cancelled') return false;
    if (!b.seatIds.includes(seatId)) return false;

    const bStart = b.fromDate || b.date;
    const bEnd = b.toDate || b.fromDate || b.date;

    const dateOverlaps = doesDateRangeOverlap(qStart, qEnd, bStart, bEnd);
    if (!dateOverlaps) return false;

    return doesTimeOverlap(startTime, endTime, b.startTime, b.endTime);
  });
}

// Get the booking object for a seat in a time slot and date range
export function getSeatBooking(
  seatId: string,
  fromDate: string,
  toDate: string,
  startTime: string,
  endTime: string,
  bookings: Booking[],
  spaceId: string
): Booking | undefined {
  const qStart = fromDate;
  const qEnd = toDate || fromDate;

  return bookings.find((b) => {
    if (b.spaceId !== spaceId) return false;
    if (b.status === 'cancelled') return false;
    if (!b.seatIds.includes(seatId)) return false;

    const bStart = b.fromDate || b.date;
    const bEnd = b.toDate || b.fromDate || b.date;

    const dateOverlaps = doesDateRangeOverlap(qStart, qEnd, bStart, bEnd);
    if (!dateOverlaps) return false;

    return doesTimeOverlap(startTime, endTime, b.startTime, b.endTime);
  });
}
