export type SeatCategory =
  | 'hotdesk' // Fixed and static place where it will not change often
  | 'co_working' // Flex seat that changes frequently
  | 'meeting_room' // Meeting room based on time slot
  | 'private_office' // Office inside office shared by 2 or many people
  | 'managed_office' // Full office managed by one company
  | 'virtual_office'; // Business office address for receiving parcels

export interface Seat {
  id: string; // e.g., "HD-1", "CW-4", "MR1-1", "PO-1"
  row: string; // "A", "B", "MR1", "PO1"
  number: number;
  category: SeatCategory;
  name: string;
  pricePerHour: number; // in INR ₹
  pricePerDay: number; // in INR ₹
  amenities: string[];
  meetingRoomId?: string; // If part of a meeting room
  privateOfficeId?: string; // If part of a private office
  isUnderMaintenance?: boolean;
}

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  seatIds: string[];
  pricePerHour: number; // in INR ₹
  equipment: string[];
  colorTheme?: string;
  isBookWholeRoomOnly?: boolean;
}

export interface PrivateOffice {
  id: string;
  name: string;
  capacity: number;
  seatIds: string[];
  pricePerHour: number; // in INR ₹
  monthlyRent: number; // in INR ₹
  features: string[];
}

export interface VirtualOfficePlan {
  id: string;
  name: string;
  tagline: string;
  pricePerMonth: number; // in INR ₹
  features: string[];
  parcelHandlingNotes: string;
}

export interface ManagedOfficeOption {
  id: string;
  name: string;
  companyCapacity: number; // e.g., 20-50 people
  dedicatedFloorArea: string; // e.g. "2,500 sq.ft"
  monthlyRate: number; // in INR ₹
  features: string[];
  status: 'available' | 'reserved';
}

export interface CoworkingSpace {
  id: string;
  name: string;
  branchArea: string; // Coimbatore area, e.g. "Ram Nagar"; admins can add new ones
  tagline: string;
  address: string;
  city: string; // "Coimbatore, Tamil Nadu"
  pincode: string;
  phone: string;
  screenLabel: string;
  openHours: {
    open: string;
    close: string;
  };
  meetingRooms: MeetingRoom[];
  privateOffices: PrivateOffice[];
  seats: Seat[];
  amenities: string[];
  virtualOfficePlans?: VirtualOfficePlan[];
  managedOffices?: ManagedOfficeOption[];
}

export type BookingStatus = 'confirmed' | 'checked_in' | 'completed' | 'cancelled';

export interface Booking {
  id: string; // e.g. "CBE-48219"
  spaceId: string;
  spaceName: string;
  branchArea: string;
  seatIds: string[];
  meetingRoomIds?: string[];
  serviceType: 'seats' | 'meeting_room' | 'private_office' | 'virtual_office' | 'managed_office';
  date: string; // YYYY-MM-DD (start/primary date)
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD (supports up to 2 years)
  totalDays?: number;
  startTime: string; // e.g. "09:30"
  endTime: string; // e.g. "18:30"
  durationHours: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  companyName: string; // Prominent company name
  notes?: string;
  totalPrice: number; // in INR ₹
  status: BookingStatus;
  bookedAt: string;
  paymentMethod: 'upi_gpay' | 'credit_card' | 'corporate_account' | 'pay_at_desk';
  qrCodeData: string;
  leadId?: string | null; // linked CRM lead, when the client's phone matches one
}

export interface TimeSlotPreset {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  hours: number;
  isPopular?: boolean;
}
