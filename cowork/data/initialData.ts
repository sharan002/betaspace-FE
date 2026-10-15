import { CoworkingSpace, TimeSlotPreset } from '../types';

export const TIME_SLOT_PRESETS: TimeSlotPreset[] = [
  { id: 'standard_office', label: 'Office Hours (9:30 - 6:30)', startTime: '09:30', endTime: '18:30', hours: 9, isPopular: true },
  { id: 'morning', label: 'Morning Slot', startTime: '09:00', endTime: '13:00', hours: 4 },
  { id: 'afternoon', label: 'Afternoon Slot', startTime: '13:00', endTime: '17:00', hours: 4 },
  { id: 'evening', label: 'Evening Slot', startTime: '17:00', endTime: '21:00', hours: 4 },
  { id: 'fullday', label: 'Full Day Access', startTime: '08:30', endTime: '20:30', hours: 12 },
];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDatePlusDays(baseDate: string, days: number): string {
  const [y, m, d] = baseDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDatePlusMonths(baseDate: string, months: number): string {
  const [y, m, d] = baseDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDatePlusYears(baseDate: string, years: number): string {
  const [y, m, d] = baseDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setFullYear(dt.getFullYear() + years);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateDateDifferenceDays(start: string, end: string): number {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  const dt1 = new Date(y1, m1 - 1, d1);
  const dt2 = new Date(y2, m2 - 1, d2);
  const diffTime = dt2.getTime() - dt1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
  return Math.max(1, diffDays);
}

export const INITIAL_SPACES: CoworkingSpace[] = [
  // 1. RAM NAGAR (Prime Central Coimbatore Hub)
  {
    id: 'cbe-ram-nagar',
    name: 'CoWork Prime - Ram Nagar',
    branchArea: 'Ram Nagar',
    tagline: 'Premium Co-Working Hub in the Heart of Coimbatore Commercial District',
    address: 'No. 42, 2nd Cross Cut Road, Ram Nagar',
    city: 'Coimbatore, Tamil Nadu',
    pincode: '641009',
    phone: '+91 98422 41100',
    screenLabel: 'FRONT PRESENTATION STAGE & PROJECTION SCREEN',
    openHours: { open: '08:00', close: '22:00' },
    amenities: [
      'High-Speed 500 Mbps Airtel Fiber',
      'South Indian Filter Coffee & Tea Bar',
      '4K Smart Video Conferencing & Projector',
      '100% DG Power Backup (No interruptions)',
      'Reception & Parcel Receiving Desk',
      'Air Conditioned Ergonomic Ergostyle Chairs',
    ],
    meetingRooms: [
      {
        id: 'mr-siruvani',
        name: 'Siruvani Executive Boardroom',
        capacity: 8,
        seatIds: ['MR1-1', 'MR1-2', 'MR1-3', 'MR1-4', 'MR1-5', 'MR1-6', 'MR1-7', 'MR1-8'],
        pricePerHour: 650,
        equipment: ['75" 4K Interactive Display', 'Logitech MeetUp HD Video/Mic', 'Magnetic Glass Whiteboard', 'HDMI/Type-C Hub'],
        colorTheme: '#6366f1',
      },
      {
        id: 'mr-bhavani',
        name: 'Bhavani Discussion Pod',
        capacity: 4,
        seatIds: ['MR2-1', 'MR2-2', 'MR2-3', 'MR2-4'],
        pricePerHour: 350,
        equipment: ['50" 4K Screen', 'Wireless Screen Casting', 'JBL Conference Mic'],
        colorTheme: '#0284c7',
      },
    ],
    privateOffices: [
      {
        id: 'po-alpha',
        name: 'Private Office Suite 101',
        capacity: 4,
        seatIds: ['PO1-1', 'PO1-2', 'PO1-3', 'PO1-4'],
        pricePerHour: 450,
        monthlyRent: 28000,
        features: ['Office inside office shared by 4 people', 'Lockable Acoustic Glass Door', 'Whiteboard', 'Dedicated AC Control'],
      },
      {
        id: 'po-beta',
        name: 'Private Office Suite 102',
        capacity: 2,
        seatIds: ['PO2-1', 'PO2-2'],
        pricePerHour: 280,
        monthlyRent: 16000,
        features: ['Office inside office shared by 2 people', 'Dual Standing Desks', 'Sound Insulated'],
      },
    ],
    virtualOfficePlans: [
      {
        id: 'vo-basic',
        name: 'Virtual Office - Mail & Parcel Box',
        tagline: 'Professional Coimbatore business address to receive parcels and letters',
        pricePerMonth: 1499,
        features: [
          'Prestigious Ram Nagar, Coimbatore commercial address',
          'Physical parcel & courier receiving at front desk',
          'SMS / WhatsApp alert upon parcel arrival',
          'Mail storage & weekend collection access',
        ],
        parcelHandlingNotes: 'Parcels signed for and safely stored in secure lockers at Ram Nagar front desk',
      },
      {
        id: 'vo-gst',
        name: 'Virtual Office - GST & Business Registration',
        tagline: 'Complete compliance address with NOC, utility bills & parcel receiving',
        pricePerMonth: 2499,
        features: [
          'Authorized business address for GST / ROC Company Registration',
          'Landlord NOC & Electricity Bill for legal verification',
          'Unlimited parcel and courier receiving',
          '2 Hours of Free Meeting Room access per month',
        ],
        parcelHandlingNotes: 'Dedicated parcel logbook with courier photo confirmation via WhatsApp',
      },
    ],
    managedOffices: [
      {
        id: 'mo-wing-ramnagar',
        name: 'Enterprise Managed Floor - Ram Nagar Wing',
        companyCapacity: 35,
        dedicatedFloorArea: '1,800 sq.ft private floor',
        monthlyRate: 85000,
        features: [
          'Full dedicated office managed by one company exclusively',
          'Custom company logo branding at floor entrance',
          'Private manager cabins, pantry, and dedicated washrooms',
          'Full-time facility management and housekeeping staff included',
          'Dedicated high-capacity UPS + Silent DG Generator backup',
        ],
        status: 'available',
      },
    ],
    seats: [
      // Meeting Room 1: Siruvani (8 seats)
      { id: 'MR1-1', row: 'MR1', number: 1, category: 'meeting_room', name: 'Siruvani Chair 1', pricePerHour: 80, pricePerDay: 500, amenities: ['Executive Leather Chair', 'Table Mic Console'], meetingRoomId: 'mr-siruvani' },
      { id: 'MR1-2', row: 'MR1', number: 2, category: 'meeting_room', name: 'Siruvani Chair 2', pricePerHour: 80, pricePerDay: 500, amenities: ['Executive Leather Chair', 'Table Mic Console'], meetingRoomId: 'mr-siruvani' },
      { id: 'MR1-3', row: 'MR1', number: 3, category: 'meeting_room', name: 'Siruvani Chair 3', pricePerHour: 80, pricePerDay: 500, amenities: ['Executive Leather Chair', 'Table Mic Console'], meetingRoomId: 'mr-siruvani' },
      { id: 'MR1-4', row: 'MR1', number: 4, category: 'meeting_room', name: 'Siruvani Chair 4', pricePerHour: 80, pricePerDay: 500, amenities: ['Executive Leather Chair', 'Table Mic Console'], meetingRoomId: 'mr-siruvani' },
      { id: 'MR1-5', row: 'MR1', number: 5, category: 'meeting_room', name: 'Siruvani Chair 5', pricePerHour: 80, pricePerDay: 500, amenities: ['Executive Leather Chair', 'Table Mic Console'], meetingRoomId: 'mr-siruvani' },
      { id: 'MR1-6', row: 'MR1', number: 6, category: 'meeting_room', name: 'Siruvani Chair 6', pricePerHour: 80, pricePerDay: 500, amenities: ['Executive Leather Chair', 'Table Mic Console'], meetingRoomId: 'mr-siruvani' },
      { id: 'MR1-7', row: 'MR1', number: 7, category: 'meeting_room', name: 'Siruvani Chair 7', pricePerHour: 80, pricePerDay: 500, amenities: ['Executive Leather Chair', 'Table Mic Console'], meetingRoomId: 'mr-siruvani' },
      { id: 'MR1-8', row: 'MR1', number: 8, category: 'meeting_room', name: 'Siruvani Chair 8', pricePerHour: 80, pricePerDay: 500, amenities: ['Executive Leather Chair', 'Table Mic Console'], meetingRoomId: 'mr-siruvani' },

      // Meeting Room 2: Bhavani (4 seats)
      { id: 'MR2-1', row: 'MR2', number: 1, category: 'meeting_room', name: 'Bhavani Chair 1', pricePerHour: 90, pricePerDay: 550, amenities: ['Swivel Conference Chair', 'HDMI Hub'], meetingRoomId: 'mr-bhavani' },
      { id: 'MR2-2', row: 'MR2', number: 2, category: 'meeting_room', name: 'Bhavani Chair 2', pricePerHour: 90, pricePerDay: 550, amenities: ['Swivel Conference Chair', 'HDMI Hub'], meetingRoomId: 'mr-bhavani' },
      { id: 'MR2-3', row: 'MR2', number: 3, category: 'meeting_room', name: 'Bhavani Chair 3', pricePerHour: 90, pricePerDay: 550, amenities: ['Swivel Conference Chair', 'HDMI Hub'], meetingRoomId: 'mr-bhavani' },
      { id: 'MR2-4', row: 'MR2', number: 4, category: 'meeting_room', name: 'Bhavani Chair 4', pricePerHour: 90, pricePerDay: 550, amenities: ['Swivel Conference Chair', 'HDMI Hub'], meetingRoomId: 'mr-bhavani' },

      // Private Office 101: Shared by 4 people
      { id: 'PO1-1', row: 'PO1', number: 1, category: 'private_office', name: 'Private Office 101 - Desk 1', pricePerHour: 110, pricePerDay: 650, amenities: ['Lockable Cabin Chair', 'Under-desk Storage'], privateOfficeId: 'po-alpha' },
      { id: 'PO1-2', row: 'PO1', number: 2, category: 'private_office', name: 'Private Office 101 - Desk 2', pricePerHour: 110, pricePerDay: 650, amenities: ['Lockable Cabin Chair', 'Under-desk Storage'], privateOfficeId: 'po-alpha' },
      { id: 'PO1-3', row: 'PO1', number: 3, category: 'private_office', name: 'Private Office 101 - Desk 3', pricePerHour: 110, pricePerDay: 650, amenities: ['Lockable Cabin Chair', 'Under-desk Storage'], privateOfficeId: 'po-alpha' },
      { id: 'PO1-4', row: 'PO1', number: 4, category: 'private_office', name: 'Private Office 101 - Desk 4', pricePerHour: 110, pricePerDay: 650, amenities: ['Lockable Cabin Chair', 'Under-desk Storage'], privateOfficeId: 'po-alpha' },

      // Private Office 102: Shared by 2 people
      { id: 'PO2-1', row: 'PO2', number: 1, category: 'private_office', name: 'Private Office 102 - Desk 1', pricePerHour: 140, pricePerDay: 800, amenities: ['Executive Suite Seat', 'Pinup Board'], privateOfficeId: 'po-beta' },
      { id: 'PO2-2', row: 'PO2', number: 2, category: 'private_office', name: 'Private Office 102 - Desk 2', pricePerHour: 140, pricePerDay: 800, amenities: ['Executive Suite Seat', 'Pinup Board'], privateOfficeId: 'po-beta' },

      // Hotdesk: "Fixed and static place where it will not change often"
      { id: 'HD-1', row: 'HD', number: 1, category: 'hotdesk', name: 'Fixed Hotdesk HD1 (Static)', pricePerHour: 95, pricePerDay: 550, amenities: ['Fixed Dedicated Desk', 'Nameplate Holder', 'Personal Lockable Pedestal', 'Dual Power Sockets'] },
      { id: 'HD-2', row: 'HD', number: 2, category: 'hotdesk', name: 'Fixed Hotdesk HD2 (Static)', pricePerHour: 95, pricePerDay: 550, amenities: ['Fixed Dedicated Desk', 'Nameplate Holder', 'Personal Lockable Pedestal', 'Dual Power Sockets'] },
      { id: 'HD-3', row: 'HD', number: 3, category: 'hotdesk', name: 'Fixed Hotdesk HD3 (Static)', pricePerHour: 95, pricePerDay: 550, amenities: ['Fixed Dedicated Desk', 'Nameplate Holder', 'Personal Lockable Pedestal', 'Dual Power Sockets'] },
      { id: 'HD-4', row: 'HD', number: 4, category: 'hotdesk', name: 'Fixed Hotdesk HD4 (Static)', pricePerHour: 95, pricePerDay: 550, amenities: ['Fixed Dedicated Desk', 'Nameplate Holder', 'Personal Lockable Pedestal', 'Dual Power Sockets'] },
      { id: 'HD-5', row: 'HD', number: 5, category: 'hotdesk', name: 'Fixed Hotdesk HD5 (Static)', pricePerHour: 95, pricePerDay: 550, amenities: ['Fixed Dedicated Desk', 'Nameplate Holder', 'Personal Lockable Pedestal', 'Dual Power Sockets'] },
      { id: 'HD-6', row: 'HD', number: 6, category: 'hotdesk', name: 'Fixed Hotdesk HD6 (Static)', pricePerHour: 95, pricePerDay: 550, amenities: ['Fixed Dedicated Desk', 'Nameplate Holder', 'Personal Lockable Pedestal', 'Dual Power Sockets'] },
      { id: 'HD-7', row: 'HD', number: 7, category: 'hotdesk', name: 'Fixed Hotdesk HD7 (Static)', pricePerHour: 95, pricePerDay: 550, amenities: ['Fixed Dedicated Desk', 'Nameplate Holder', 'Personal Lockable Pedestal', 'Dual Power Sockets'] },
      { id: 'HD-8', row: 'HD', number: 8, category: 'hotdesk', name: 'Fixed Hotdesk HD8 (Static)', pricePerHour: 95, pricePerDay: 550, amenities: ['Fixed Dedicated Desk', 'Nameplate Holder', 'Personal Lockable Pedestal', 'Dual Power Sockets'] },

      // Co Working: "will change" (Flex seats that change dynamically based on booking slots)
      // Row A (8 chairs)
      { id: 'CW-A1', row: 'A', number: 1, category: 'co_working', name: 'Co-Working Flex A1', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'AC Power Socket', 'High-speed Wi-Fi'] },
      { id: 'CW-A2', row: 'A', number: 2, category: 'co_working', name: 'Co-Working Flex A2', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'AC Power Socket', 'High-speed Wi-Fi'] },
      { id: 'CW-A3', row: 'A', number: 3, category: 'co_working', name: 'Co-Working Flex A3', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'AC Power Socket', 'High-speed Wi-Fi'] },
      { id: 'CW-A4', row: 'A', number: 4, category: 'co_working', name: 'Co-Working Flex A4', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'AC Power Socket', 'High-speed Wi-Fi'] },
      { id: 'CW-A5', row: 'A', number: 5, category: 'co_working', name: 'Co-Working Flex A5', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'AC Power Socket', 'High-speed Wi-Fi'] },
      { id: 'CW-A6', row: 'A', number: 6, category: 'co_working', name: 'Co-Working Flex A6', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'AC Power Socket', 'High-speed Wi-Fi'] },
      { id: 'CW-A7', row: 'A', number: 7, category: 'co_working', name: 'Co-Working Flex A7', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'AC Power Socket', 'High-speed Wi-Fi'] },
      { id: 'CW-A8', row: 'A', number: 8, category: 'co_working', name: 'Co-Working Flex A8', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'AC Power Socket', 'High-speed Wi-Fi'] },

      // Row B (8 chairs)
      { id: 'CW-B1', row: 'B', number: 1, category: 'co_working', name: 'Co-Working Flex B1', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Fast Wi-Fi', 'Coffee Access'] },
      { id: 'CW-B2', row: 'B', number: 2, category: 'co_working', name: 'Co-Working Flex B2', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Fast Wi-Fi', 'Coffee Access'] },
      { id: 'CW-B3', row: 'B', number: 3, category: 'co_working', name: 'Co-Working Flex B3', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Fast Wi-Fi', 'Coffee Access'] },
      { id: 'CW-B4', row: 'B', number: 4, category: 'co_working', name: 'Co-Working Flex B4', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Fast Wi-Fi', 'Coffee Access'] },
      { id: 'CW-B5', row: 'B', number: 5, category: 'co_working', name: 'Co-Working Flex B5', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Fast Wi-Fi', 'Coffee Access'] },
      { id: 'CW-B6', row: 'B', number: 6, category: 'co_working', name: 'Co-Working Flex B6', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Fast Wi-Fi', 'Coffee Access'] },
      { id: 'CW-B7', row: 'B', number: 7, category: 'co_working', name: 'Co-Working Flex B7', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Fast Wi-Fi', 'Coffee Access'] },
      { id: 'CW-B8', row: 'B', number: 8, category: 'co_working', name: 'Co-Working Flex B8', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Fast Wi-Fi', 'Coffee Access'] },

      // Row C (8 chairs)
      { id: 'CW-C1', row: 'C', number: 1, category: 'co_working', name: 'Co-Working Flex C1', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Window View'] },
      { id: 'CW-C2', row: 'C', number: 2, category: 'co_working', name: 'Co-Working Flex C2', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Window View'] },
      { id: 'CW-C3', row: 'C', number: 3, category: 'co_working', name: 'Co-Working Flex C3', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Window View'] },
      { id: 'CW-C4', row: 'C', number: 4, category: 'co_working', name: 'Co-Working Flex C4', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Window View'] },
      { id: 'CW-C5', row: 'C', number: 5, category: 'co_working', name: 'Co-Working Flex C5', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Window View'] },
      { id: 'CW-C6', row: 'C', number: 6, category: 'co_working', name: 'Co-Working Flex C6', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Window View'] },
      { id: 'CW-C7', row: 'C', number: 7, category: 'co_working', name: 'Co-Working Flex C7', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Window View'] },
      { id: 'CW-C8', row: 'C', number: 8, category: 'co_working', name: 'Co-Working Flex C8', pricePerHour: 60, pricePerDay: 350, amenities: ['Flex Roving Seat', 'Window View'] },
    ],
  },

  // 2. SINGANALLUR (Trichy Road Tech & Industrial Hub)
  {
    id: 'cbe-singanallur',
    name: 'CoWork Metro - Singanallur',
    branchArea: 'Singanallur',
    tagline: 'Spacious Workstations & Modern Meeting Rooms along Trichy Road',
    address: 'Near Singanallur Bus Stand, Trichy Road',
    city: 'Coimbatore, Tamil Nadu',
    pincode: '641005',
    phone: '+91 98422 42200',
    screenLabel: 'KEYNOTE PRESENTATION STAGE & LED WALL',
    openHours: { open: '08:30', close: '21:30' },
    amenities: [
      'High-Speed Jio Fiber Connection',
      'Dedicated Two-Wheeler & Car Parking',
      'Seminar & Meeting Room with Projector',
      'Pantry with RO Drinking Water & Snacks',
      'Parcel Receiving with Real-time App Notification',
    ],
    meetingRooms: [
      {
        id: 'mr-marudhamalai',
        name: 'Marudhamalai Conference Hall',
        capacity: 6,
        seatIds: ['SMR-1', 'SMR-2', 'SMR-3', 'SMR-4', 'SMR-5', 'SMR-6'],
        pricePerHour: 500,
        equipment: ['65" 4K Smart TV', 'Conference Cam & Speakerphone', 'Whiteboard'],
        colorTheme: '#6366f1',
      },
    ],
    privateOffices: [
      {
        id: 'po-singanallur-1',
        name: 'Private Team Cabin S1',
        capacity: 3,
        seatIds: ['SPO-1', 'SPO-2', 'SPO-3'],
        pricePerHour: 320,
        monthlyRent: 21000,
        features: ['Office inside office shared by 3 people', 'Glass Partitions', 'Acoustic Ceiling'],
      },
    ],
    virtualOfficePlans: [
      {
        id: 'vo-singanallur',
        name: 'Singanallur Business Address & Courier Point',
        tagline: 'Strategic commercial address on Trichy Road for parcel receiving',
        pricePerMonth: 1299,
        features: [
          'Singanallur, Coimbatore registered address',
          'Prompt SMS alert upon courier arrival',
          'Package safeguarding with 30 days retention',
        ],
        parcelHandlingNotes: 'Daily receipt log with OTP hand-off system',
      },
    ],
    managedOffices: [
      {
        id: 'mo-singanallur',
        name: 'Managed Branch Office - Singanallur',
        companyCapacity: 25,
        dedicatedFloorArea: '1,400 sq.ft private space',
        monthlyRate: 65000,
        features: [
          'Full office floor managed for one single company',
          'Furnished with 25 workstations + 1 director cabin',
          'Dedicated pantry & high-speed leased line',
        ],
        status: 'available',
      },
    ],
    seats: [
      { id: 'SMR-1', row: 'MR', number: 1, category: 'meeting_room', name: 'Marudhamalai Chair 1', pricePerHour: 85, pricePerDay: 500, amenities: ['Conference Chair'], meetingRoomId: 'mr-marudhamalai' },
      { id: 'SMR-2', row: 'MR', number: 2, category: 'meeting_room', name: 'Marudhamalai Chair 2', pricePerHour: 85, pricePerDay: 500, amenities: ['Conference Chair'], meetingRoomId: 'mr-marudhamalai' },
      { id: 'SMR-3', row: 'MR', number: 3, category: 'meeting_room', name: 'Marudhamalai Chair 3', pricePerHour: 85, pricePerDay: 500, amenities: ['Conference Chair'], meetingRoomId: 'mr-marudhamalai' },
      { id: 'SMR-4', row: 'MR', number: 4, category: 'meeting_room', name: 'Marudhamalai Chair 4', pricePerHour: 85, pricePerDay: 500, amenities: ['Conference Chair'], meetingRoomId: 'mr-marudhamalai' },
      { id: 'SMR-5', row: 'MR', number: 5, category: 'meeting_room', name: 'Marudhamalai Chair 5', pricePerHour: 85, pricePerDay: 500, amenities: ['Conference Chair'], meetingRoomId: 'mr-marudhamalai' },
      { id: 'SMR-6', row: 'MR', number: 6, category: 'meeting_room', name: 'Marudhamalai Chair 6', pricePerHour: 85, pricePerDay: 500, amenities: ['Conference Chair'], meetingRoomId: 'mr-marudhamalai' },

      { id: 'SPO-1', row: 'PO', number: 1, category: 'private_office', name: 'Private Cabin S1 - Desk 1', pricePerHour: 110, pricePerDay: 650, amenities: ['Cabin Desk', 'Lockable Drawer'], privateOfficeId: 'po-singanallur-1' },
      { id: 'SPO-2', row: 'PO', number: 2, category: 'private_office', name: 'Private Cabin S1 - Desk 2', pricePerHour: 110, pricePerDay: 650, amenities: ['Cabin Desk', 'Lockable Drawer'], privateOfficeId: 'po-singanallur-1' },
      { id: 'SPO-3', row: 'PO', number: 3, category: 'private_office', name: 'Private Cabin S1 - Desk 3', pricePerHour: 110, pricePerDay: 650, amenities: ['Cabin Desk', 'Lockable Drawer'], privateOfficeId: 'po-singanallur-1' },

      { id: 'SHD-1', row: 'HD', number: 1, category: 'hotdesk', name: 'Static Desk SHD1', pricePerHour: 90, pricePerDay: 500, amenities: ['Fixed Static Desk', 'Personal Locker'] },
      { id: 'SHD-2', row: 'HD', number: 2, category: 'hotdesk', name: 'Static Desk SHD2', pricePerHour: 90, pricePerDay: 500, amenities: ['Fixed Static Desk', 'Personal Locker'] },
      { id: 'SHD-3', row: 'HD', number: 3, category: 'hotdesk', name: 'Static Desk SHD3', pricePerHour: 90, pricePerDay: 500, amenities: ['Fixed Static Desk', 'Personal Locker'] },
      { id: 'SHD-4', row: 'HD', number: 4, category: 'hotdesk', name: 'Static Desk SHD4', pricePerHour: 90, pricePerDay: 500, amenities: ['Fixed Static Desk', 'Personal Locker'] },

      { id: 'SCW-1', row: 'A', number: 1, category: 'co_working', name: 'Flex Seat A1', pricePerHour: 55, pricePerDay: 300, amenities: ['Flex Chair', 'Power Outlet'] },
      { id: 'SCW-2', row: 'A', number: 2, category: 'co_working', name: 'Flex Seat A2', pricePerHour: 55, pricePerDay: 300, amenities: ['Flex Chair', 'Power Outlet'] },
      { id: 'SCW-3', row: 'A', number: 3, category: 'co_working', name: 'Flex Seat A3', pricePerHour: 55, pricePerDay: 300, amenities: ['Flex Chair', 'Power Outlet'] },
      { id: 'SCW-4', row: 'A', number: 4, category: 'co_working', name: 'Flex Seat A4', pricePerHour: 55, pricePerDay: 300, amenities: ['Flex Chair', 'Power Outlet'] },
      { id: 'SCW-5', row: 'A', number: 5, category: 'co_working', name: 'Flex Seat A5', pricePerHour: 55, pricePerDay: 300, amenities: ['Flex Chair', 'Power Outlet'] },
      { id: 'SCW-6', row: 'A', number: 6, category: 'co_working', name: 'Flex Seat A6', pricePerHour: 55, pricePerDay: 300, amenities: ['Flex Chair', 'Power Outlet'] },
    ],
  },

  // 3. KOUNDAMPALAYAM (North Coimbatore MTP Road Hub)
  {
    id: 'cbe-koundampalayam',
    name: 'CoWork Studio - Koundampalayam',
    branchArea: 'Koundampalayam',
    tagline: 'Peaceful Work Haven on Mettupalayam Road with Great Natural Light',
    address: 'Opposite Ganga Hospital Annexe, Mettupalayam Main Road',
    city: 'Coimbatore, Tamil Nadu',
    pincode: '641030',
    phone: '+91 98422 43300',
    screenLabel: 'STAGE & AUDIO-VISUAL DEMO DISPLAY',
    openHours: { open: '08:00', close: '21:00' },
    amenities: [
      'High-Speed Fiber Network',
      'Cafeteria with Tea/Snacks',
      'Spacious Hotdesks & Meeting Rooms',
      'EV Charging Point',
      'Postal Address & Courier Desk',
    ],
    meetingRooms: [
      {
        id: 'mr-nilgiri',
        name: 'Nilgiri Meeting Pod',
        capacity: 6,
        seatIds: ['KMR-1', 'KMR-2', 'KMR-3', 'KMR-4', 'KMR-5', 'KMR-6'],
        pricePerHour: 450,
        equipment: ['55" 4K Smart Display', 'Conference Mic', 'Glass Whiteboard'],
        colorTheme: '#6366f1',
      },
    ],
    privateOffices: [
      {
        id: 'po-kp-1',
        name: 'Private Team Office K1',
        capacity: 4,
        seatIds: ['KPO-1', 'KPO-2', 'KPO-3', 'KPO-4'],
        pricePerHour: 400,
        monthlyRent: 24000,
        features: ['Office inside office shared by 4 people', 'Quiet North Coimbatore Wing'],
      },
    ],
    virtualOfficePlans: [
      {
        id: 'vo-kp',
        name: 'Koundampalayam Parcel & Business Address',
        tagline: 'Reliable North Coimbatore location for receiving business parcels and deliveries',
        pricePerMonth: 1299,
        features: [
          'Official Mettupalayam Road address',
          'Secure parcel storage and mail forwarding',
        ],
        parcelHandlingNotes: 'Parcels received by duty officer and stored under CCTV monitoring',
      },
    ],
    managedOffices: [
      {
        id: 'mo-kp',
        name: 'Turnkey Managed Office - Koundampalayam',
        companyCapacity: 20,
        dedicatedFloorArea: '1,200 sq.ft dedicated suite',
        monthlyRate: 55000,
        features: [
          'Complete managed workspace for single corporate team',
          'Private conference room and dedicated pantry',
        ],
        status: 'available',
      },
    ],
    seats: [
      { id: 'KMR-1', row: 'MR', number: 1, category: 'meeting_room', name: 'Nilgiri Chair 1', pricePerHour: 75, pricePerDay: 450, amenities: ['Conference Chair'], meetingRoomId: 'mr-nilgiri' },
      { id: 'KMR-2', row: 'MR', number: 2, category: 'meeting_room', name: 'Nilgiri Chair 2', pricePerHour: 75, pricePerDay: 450, amenities: ['Conference Chair'], meetingRoomId: 'mr-nilgiri' },
      { id: 'KMR-3', row: 'MR', number: 3, category: 'meeting_room', name: 'Nilgiri Chair 3', pricePerHour: 75, pricePerDay: 450, amenities: ['Conference Chair'], meetingRoomId: 'mr-nilgiri' },
      { id: 'KMR-4', row: 'MR', number: 4, category: 'meeting_room', name: 'Nilgiri Chair 4', pricePerHour: 75, pricePerDay: 450, amenities: ['Conference Chair'], meetingRoomId: 'mr-nilgiri' },
      { id: 'KMR-5', row: 'MR', number: 5, category: 'meeting_room', name: 'Nilgiri Chair 5', pricePerHour: 75, pricePerDay: 450, amenities: ['Conference Chair'], meetingRoomId: 'mr-nilgiri' },
      { id: 'KMR-6', row: 'MR', number: 6, category: 'meeting_room', name: 'Nilgiri Chair 6', pricePerHour: 75, pricePerDay: 450, amenities: ['Conference Chair'], meetingRoomId: 'mr-nilgiri' },

      { id: 'KPO-1', row: 'PO', number: 1, category: 'private_office', name: 'Cabin K1 - Desk 1', pricePerHour: 100, pricePerDay: 600, amenities: ['Team Cabin Desk'], privateOfficeId: 'po-kp-1' },
      { id: 'KPO-2', row: 'PO', number: 2, category: 'private_office', name: 'Cabin K1 - Desk 2', pricePerHour: 100, pricePerDay: 600, amenities: ['Team Cabin Desk'], privateOfficeId: 'po-kp-1' },
      { id: 'KPO-3', row: 'PO', number: 3, category: 'private_office', name: 'Cabin K1 - Desk 3', pricePerHour: 100, pricePerDay: 600, amenities: ['Team Cabin Desk'], privateOfficeId: 'po-kp-1' },
      { id: 'KPO-4', row: 'PO', number: 4, category: 'private_office', name: 'Cabin K1 - Desk 4', pricePerHour: 100, pricePerDay: 600, amenities: ['Team Cabin Desk'], privateOfficeId: 'po-kp-1' },

      { id: 'KHD-1', row: 'HD', number: 1, category: 'hotdesk', name: 'Static Desk KHD1', pricePerHour: 85, pricePerDay: 480, amenities: ['Fixed Static Desk', 'Personal Locker'] },
      { id: 'KHD-2', row: 'HD', number: 2, category: 'hotdesk', name: 'Static Desk KHD2', pricePerHour: 85, pricePerDay: 480, amenities: ['Fixed Static Desk', 'Personal Locker'] },
      { id: 'KHD-3', row: 'HD', number: 3, category: 'hotdesk', name: 'Static Desk KHD3', pricePerHour: 85, pricePerDay: 480, amenities: ['Fixed Static Desk', 'Personal Locker'] },
      { id: 'KHD-4', row: 'HD', number: 4, category: 'hotdesk', name: 'Static Desk KHD4', pricePerHour: 85, pricePerDay: 480, amenities: ['Fixed Static Desk', 'Personal Locker'] },

      { id: 'KCW-1', row: 'A', number: 1, category: 'co_working', name: 'Flex Seat A1', pricePerHour: 50, pricePerDay: 280, amenities: ['Flex Desk', 'Fast Wi-Fi'] },
      { id: 'KCW-2', row: 'A', number: 2, category: 'co_working', name: 'Flex Seat A2', pricePerHour: 50, pricePerDay: 280, amenities: ['Flex Desk', 'Fast Wi-Fi'] },
      { id: 'KCW-3', row: 'A', number: 3, category: 'co_working', name: 'Flex Seat A3', pricePerHour: 50, pricePerDay: 280, amenities: ['Flex Desk', 'Fast Wi-Fi'] },
      { id: 'KCW-4', row: 'A', number: 4, category: 'co_working', name: 'Flex Seat A4', pricePerHour: 50, pricePerDay: 280, amenities: ['Flex Desk', 'Fast Wi-Fi'] },
      { id: 'KCW-5', row: 'A', number: 5, category: 'co_working', name: 'Flex Seat A5', pricePerHour: 50, pricePerDay: 280, amenities: ['Flex Desk', 'Fast Wi-Fi'] },
      { id: 'KCW-6', row: 'A', number: 6, category: 'co_working', name: 'Flex Seat A6', pricePerHour: 50, pricePerDay: 280, amenities: ['Flex Desk', 'Fast Wi-Fi'] },
    ],
  },

  // 4. NEELIKONAMPALAYAM (East Coimbatore Tech & Textile Growth Corridor)
  {
    id: 'cbe-neelikonampalayam',
    name: 'CoWork Next - Neelikonampalayam',
    branchArea: 'Neelikonampalayam',
    tagline: 'Modern Tech Workspace near Peelamedu & Avinashi Road Tech Belt',
    address: 'Near Neelikonampalayam Main Road, adjacent to Singanallur Link',
    city: 'Coimbatore, Tamil Nadu',
    pincode: '641033',
    phone: '+91 98422 44400',
    screenLabel: 'INNOVATION AUDITORIUM & DEMO SCREEN',
    openHours: { open: '08:00', close: '22:00' },
    amenities: [
      'Ultra Fast 1 Gbps Fiber Backbone',
      'Acoustic Meeting Rooms',
      '24/7 Biometric Entry for Static Hotdesk members',
      'Virtual Office Parcel Lockers',
      'Modern Cafeteria & Recreation Zone',
    ],
    meetingRooms: [
      {
        id: 'mr-noyyal',
        name: 'Noyyal Conference Suite',
        capacity: 8,
        seatIds: ['NMR-1', 'NMR-2', 'NMR-3', 'NMR-4', 'NMR-5', 'NMR-6', 'NMR-7', 'NMR-8'],
        pricePerHour: 600,
        equipment: ['75" 4K Video Wall', 'Poly Studio 4K Camera', 'Glass Whiteboard'],
        colorTheme: '#6366f1',
      },
    ],
    privateOffices: [
      {
        id: 'po-neeli-1',
        name: 'Private Suite N1',
        capacity: 4,
        seatIds: ['NPO-1', 'NPO-2', 'NPO-3', 'NPO-4'],
        pricePerHour: 420,
        monthlyRent: 26000,
        features: ['Office inside office shared by 4 people', 'Sound Insulated Glass Cabin'],
      },
    ],
    virtualOfficePlans: [
      {
        id: 'vo-neeli',
        name: 'Neelikonampalayam Registered Address & Parcel Hub',
        tagline: 'Registered commercial address for receiving business courier and parcels',
        pricePerMonth: 1399,
        features: [
          'Neelikonampalayam commercial address for GST & billing',
          'Prompt parcel intimation with recipient name logging',
          'Flexible pickup hours at reception desk',
        ],
        parcelHandlingNotes: 'Authorized mail & parcel receiving with tamper-evident locker custody',
      },
    ],
    managedOffices: [
      {
        id: 'mo-neeli',
        name: 'Managed Enterprise Facility - Neelikonampalayam',
        companyCapacity: 40,
        dedicatedFloorArea: '2,200 sq.ft private floor',
        monthlyRate: 95000,
        features: [
          'Complete office managed exclusively for one corporate company',
          'Private conference room, executive cabins & 40 seats',
        ],
        status: 'available',
      },
    ],
    seats: [
      { id: 'NMR-1', row: 'MR', number: 1, category: 'meeting_room', name: 'Noyyal Chair 1', pricePerHour: 75, pricePerDay: 480, amenities: ['Conference Chair'], meetingRoomId: 'mr-noyyal' },
      { id: 'NMR-2', row: 'MR', number: 2, category: 'meeting_room', name: 'Noyyal Chair 2', pricePerHour: 75, pricePerDay: 480, amenities: ['Conference Chair'], meetingRoomId: 'mr-noyyal' },
      { id: 'NMR-3', row: 'MR', number: 3, category: 'meeting_room', name: 'Noyyal Chair 3', pricePerHour: 75, pricePerDay: 480, amenities: ['Conference Chair'], meetingRoomId: 'mr-noyyal' },
      { id: 'NMR-4', row: 'MR', number: 4, category: 'meeting_room', name: 'Noyyal Chair 4', pricePerHour: 75, pricePerDay: 480, amenities: ['Conference Chair'], meetingRoomId: 'mr-noyyal' },
      { id: 'NMR-5', row: 'MR', number: 5, category: 'meeting_room', name: 'Noyyal Chair 5', pricePerHour: 75, pricePerDay: 480, amenities: ['Conference Chair'], meetingRoomId: 'mr-noyyal' },
      { id: 'NMR-6', row: 'MR', number: 6, category: 'meeting_room', name: 'Noyyal Chair 6', pricePerHour: 75, pricePerDay: 480, amenities: ['Conference Chair'], meetingRoomId: 'mr-noyyal' },
      { id: 'NMR-7', row: 'MR', number: 7, category: 'meeting_room', name: 'Noyyal Chair 7', pricePerHour: 75, pricePerDay: 480, amenities: ['Conference Chair'], meetingRoomId: 'mr-noyyal' },
      { id: 'NMR-8', row: 'MR', number: 8, category: 'meeting_room', name: 'Noyyal Chair 8', pricePerHour: 75, pricePerDay: 480, amenities: ['Conference Chair'], meetingRoomId: 'mr-noyyal' },

      { id: 'NPO-1', row: 'PO', number: 1, category: 'private_office', name: 'Private Suite N1 - Desk 1', pricePerHour: 105, pricePerDay: 620, amenities: ['Cabin Desk'], privateOfficeId: 'po-neeli-1' },
      { id: 'NPO-2', row: 'PO', number: 2, category: 'private_office', name: 'Private Suite N1 - Desk 2', pricePerHour: 105, pricePerDay: 620, amenities: ['Cabin Desk'], privateOfficeId: 'po-neeli-1' },
      { id: 'NPO-3', row: 'PO', number: 3, category: 'private_office', name: 'Private Suite N1 - Desk 3', pricePerHour: 105, pricePerDay: 620, amenities: ['Cabin Desk'], privateOfficeId: 'po-neeli-1' },
      { id: 'NPO-4', row: 'PO', number: 4, category: 'private_office', name: 'Private Suite N1 - Desk 4', pricePerHour: 105, pricePerDay: 620, amenities: ['Cabin Desk'], privateOfficeId: 'po-neeli-1' },

      { id: 'NHD-1', row: 'HD', number: 1, category: 'hotdesk', name: 'Static Desk NHD1', pricePerHour: 90, pricePerDay: 520, amenities: ['Fixed Static Desk', 'Personal Lockable Pedestal'] },
      { id: 'NHD-2', row: 'HD', number: 2, category: 'hotdesk', name: 'Static Desk NHD2', pricePerHour: 90, pricePerDay: 520, amenities: ['Fixed Static Desk', 'Personal Lockable Pedestal'] },
      { id: 'NHD-3', row: 'HD', number: 3, category: 'hotdesk', name: 'Static Desk NHD3', pricePerHour: 90, pricePerDay: 520, amenities: ['Fixed Static Desk', 'Personal Lockable Pedestal'] },
      { id: 'NHD-4', row: 'HD', number: 4, category: 'hotdesk', name: 'Static Desk NHD4', pricePerHour: 90, pricePerDay: 520, amenities: ['Fixed Static Desk', 'Personal Lockable Pedestal'] },

      { id: 'NCW-1', row: 'A', number: 1, category: 'co_working', name: 'Flex Seat A1', pricePerHour: 55, pricePerDay: 320, amenities: ['Flex Chair', 'Fast Wi-Fi'] },
      { id: 'NCW-2', row: 'A', number: 2, category: 'co_working', name: 'Flex Seat A2', pricePerHour: 55, pricePerDay: 320, amenities: ['Flex Chair', 'Fast Wi-Fi'] },
      { id: 'NCW-3', row: 'A', number: 3, category: 'co_working', name: 'Flex Seat A3', pricePerHour: 55, pricePerDay: 320, amenities: ['Flex Chair', 'Fast Wi-Fi'] },
      { id: 'NCW-4', row: 'A', number: 4, category: 'co_working', name: 'Flex Seat A4', pricePerHour: 55, pricePerDay: 320, amenities: ['Flex Chair', 'Fast Wi-Fi'] },
      { id: 'NCW-5', row: 'A', number: 5, category: 'co_working', name: 'Flex Seat A5', pricePerHour: 55, pricePerDay: 320, amenities: ['Flex Chair', 'Fast Wi-Fi'] },
      { id: 'NCW-6', row: 'A', number: 6, category: 'co_working', name: 'Flex Seat A6', pricePerHour: 55, pricePerDay: 320, amenities: ['Flex Chair', 'Fast Wi-Fi'] },
    ],
  },
];

