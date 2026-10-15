import React from 'react';
import { SeatCategory } from '../types';

interface ChairIconProps {
  className?: string;
  selected?: boolean;
  booked?: boolean;
  category?: SeatCategory;
}

export const ChairIcon: React.FC<ChairIconProps> = ({
  className = 'w-6 h-6',
  selected = false,
  booked = false,
  category = 'co_working',
}) => {
  let strokeColor = '#64748b'; // slate-500
  let backFill = '#ffffff';
  let seatFill = '#f1f5f9';

  if (booked) {
    backFill = '#e2e8f0'; // slate-200
    seatFill = '#cbd5e1'; // slate-300
    strokeColor = '#94a3b8'; // slate-400
  } else if (selected) {
    backFill = '#0284c7'; // sky-600
    seatFill = '#38bdf8'; // sky-400
    strokeColor = '#0369a1'; // sky-700
  } else {
    if (category === 'meeting_room') {
      strokeColor = '#4f46e5'; // indigo-600
      backFill = '#eef2ff';
      seatFill = '#e0e7ff';
    } else if (category === 'hotdesk') {
      // Fixed and static place
      strokeColor = '#d97706'; // amber-600
      backFill = '#fffbeb';
      seatFill = '#fef3c7';
    } else if (category === 'private_office') {
      // Office inside office
      strokeColor = '#7c3aed'; // purple-600
      backFill = '#faf5ff';
      seatFill = '#f3e8ff';
    } else if (category === 'managed_office') {
      strokeColor = '#059669'; // emerald-600
      backFill = '#ecfdf5';
      seatFill = '#d1fae5';
    } else {
      // co_working (will change)
      strokeColor = '#0284c7'; // sky-600
      backFill = '#f0f9ff';
      seatFill = '#e0f2fe';
    }
  }

  return (
    <svg
      viewBox="0 0 28 28"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Backrest */}
      <rect
        x="6"
        y="3"
        width="16"
        height="10"
        rx="3"
        stroke={strokeColor}
        strokeWidth="1.8"
        fill={backFill}
      />
      {/* Headrest line */}
      <line
        x1="9"
        y1="6"
        x2="19"
        y2="6"
        stroke={strokeColor}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* Left Armrest */}
      <rect
        x="2.5"
        y="9"
        width="3"
        height="11"
        rx="1.5"
        stroke={strokeColor}
        strokeWidth="1.4"
        fill={selected ? '#0284c7' : seatFill}
      />
      {/* Right Armrest */}
      <rect
        x="22.5"
        y="9"
        width="3"
        height="11"
        rx="1.5"
        stroke={strokeColor}
        strokeWidth="1.4"
        fill={selected ? '#0284c7' : seatFill}
      />
      {/* Seat Cushion */}
      <rect
        x="6"
        y="12"
        width="16"
        height="11"
        rx="2.5"
        stroke={strokeColor}
        strokeWidth="1.8"
        fill={seatFill}
      />
      {/* Center Wheel Base / Swivel Base Stem */}
      <path
        d="M14 23 L14 26 M10 26 L18 26"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
