import React, { useState } from 'react';
import { Calendar, Clock, MapPin, ChevronDown, Sparkles, Building } from 'lucide-react';
import { CoworkingSpace } from '../types';
import {
  TIME_SLOT_PRESETS,
  getTodayDateString,
  getTomorrowDateString,
  getDatePlusDays,
  getDatePlusMonths,
  getDatePlusYears,
  calculateDateDifferenceDays,
} from '../data/initialData';

interface SlotSelectorProps {
  spaces: CoworkingSpace[];
  activeSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
  fromDate: string;
  toDate: string;
  onSelectDateRange: (from: string, to: string) => void;
  startTime: string;
  endTime: string;
  onSelectTimeRange: (start: string, end: string) => void;
  companyName: string;
  onChangeCompanyName: (name: string) => void;
  availableSeatsCount: number;
  totalSeatsCount: number;
}

export const SlotSelector: React.FC<SlotSelectorProps> = ({
  spaces,
  activeSpaceId,
  onSelectSpace,
  fromDate,
  toDate,
  onSelectDateRange,
  startTime,
  endTime,
  onSelectTimeRange,
  companyName,
  onChangeCompanyName,
  availableSeatsCount,
  totalSeatsCount,
}) => {
  const [isCustomTime, setIsCustomTime] = useState<boolean>(() => {
    return !TIME_SLOT_PRESETS.some((p) => p.startTime === startTime && p.endTime === endTime);
  });
  const [customStart, setCustomStart] = useState<string>(startTime);
  const [customEnd, setCustomEnd] = useState<string>(endTime);

  const today = getTodayDateString();
  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  const totalDays = calculateDateDifferenceDays(fromDate, toDate);

  // Friendly duration label
  const getDurationText = () => {
    if (totalDays === 1) return '1 Day';
    if (totalDays >= 720) return `${totalDays} Days (2 Years)`;
    if (totalDays >= 360) return `${totalDays} Days (1 Year)`;
    if (totalDays >= 170) return `${totalDays} Days (6 Months)`;
    if (totalDays >= 28) return `${totalDays} Days (~${Math.round(totalDays / 30)} Months)`;
    return `${totalDays} Days`;
  };

  const handlePresetSelect = (presetStart: string, presetEnd: string) => {
    setIsCustomTime(false);
    onSelectTimeRange(presetStart, presetEnd);
  };

  const handleCustomTimeApply = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    if (start < end) {
      onSelectTimeRange(start, end);
    }
  };

  const handleQuickDuration = (type: '1day' | '1month' | '6months' | '1year' | '2years') => {
    let newToDate = fromDate;
    if (type === '1day') newToDate = fromDate;
    else if (type === '1month') newToDate = getDatePlusMonths(fromDate, 1);
    else if (type === '6months') newToDate = getDatePlusMonths(fromDate, 6);
    else if (type === '1year') newToDate = getDatePlusYears(fromDate, 1);
    else if (type === '2years') newToDate = getDatePlusYears(fromDate, 2);

    onSelectDateRange(fromDate, newToDate);
  };

  const startMins = parseInt(startTime.split(':')[0], 10) * 60 + parseInt(startTime.split(':')[1] || '0', 10);
  const endMins = parseInt(endTime.split(':')[0], 10) * 60 + parseInt(endTime.split(':')[1] || '0', 10);
  const durationHours = Math.max(1, Math.round(((endMins - startMins) / 60) * 10) / 10);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Space Bar & Coimbatore Location */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <label htmlFor="space-selector-coimbatore" className="sr-only">Select Coimbatore Workspace</label>
            <select
              id="space-selector-coimbatore"
              value={activeSpaceId}
              onChange={(e) => onSelectSpace(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer shadow-xs transition-colors"
            >
              {spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} ({sp.branchArea})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center text-xs text-slate-600 gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{activeSpace?.address}, Coimbatore - {activeSpace?.pincode}</span>
          </div>
        </div>

        {/* Real-time Availability Counter Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>
              <strong className="text-slate-900 font-mono text-sm">{availableSeatsCount}</strong> of{' '}
              <span className="font-mono text-slate-600">{totalSeatsCount}</span> seats available
            </span>
          </div>

          <div className="text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Real-time Theater Map</span>
          </div>
        </div>
      </div>

      {/* Row 2: Company Name (Prompt Requirement: "with company name") */}
      <div className="bg-sky-50/50 border border-sky-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-sky-700 shrink-0" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Booking on Behalf of Company:
          </span>
        </div>
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="e.g. Kovai Tech Solutions, Innovate AI Labs, Acme Textiles..."
            value={companyName}
            onChange={(e) => onChangeCompanyName(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Row 3: From Date to To Date Picker with 2-Year Support */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Date Range Section (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              1. Booking Date Range (From Date to To Date)
            </span>
            <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
              {getDurationText()}
            </span>
          </div>

          {/* Quick Duration Buttons (including 2 Years!) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => handleQuickDuration('1day')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-xs ${
                totalDays === 1
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              1 Day
            </button>
            <button
              onClick={() => handleQuickDuration('1month')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-xs ${
                totalDays >= 28 && totalDays <= 32
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              1 Month
            </button>
            <button
              onClick={() => handleQuickDuration('6months')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-xs ${
                totalDays >= 175 && totalDays <= 185
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => handleQuickDuration('1year')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-xs ${
                totalDays >= 360 && totalDays <= 370
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              1 Year
            </button>
            <button
              onClick={() => handleQuickDuration('2years')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer text-xs ${
                totalDays >= 720
                  ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
              }`}
              title="Book for an extended 2 years long-term lease"
            >
              ⭐ 2 Years (Long Term)
            </button>
          </div>

          {/* Dual Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg p-1.5 px-2.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">From:</span>
              <input
                type="date"
                value={fromDate}
                min={today}
                onChange={(e) => {
                  const newFrom = e.target.value;
                  const newTo = toDate < newFrom ? newFrom : toDate;
                  onSelectDateRange(newFrom, newTo);
                }}
                className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded px-2 py-1 font-mono font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg p-1.5 px-2.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">To:</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={getDatePlusYears(today, 3)}
                onChange={(e) => {
                  const newTo = e.target.value;
                  onSelectDateRange(fromDate, newTo >= fromDate ? newTo : fromDate);
                }}
                className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded px-2 py-1 font-mono font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Time Slot Section with 9.30 to 6.30 (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              2. Timings (9:30 to 6:30 Standard)
            </span>
            <span className="text-xs text-indigo-700 font-mono font-bold">
              {durationHours} hrs / day
            </span>
          </div>

          {/* Time Slot Presets */}
          <div className="grid grid-cols-2 gap-1.5">
            {TIME_SLOT_PRESETS.slice(0, 4).map((preset) => {
              const isSelected = !isCustomTime && startTime === preset.startTime && endTime === preset.endTime;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.startTime, preset.endTime)}
                  className={`p-1.5 text-xs rounded-lg text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-xs ring-2 ring-indigo-300'
                      : preset.isPopular
                      ? 'bg-indigo-50/80 text-indigo-900 hover:bg-indigo-100 border border-indigo-200 font-bold'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="truncate font-bold">
                    {preset.id === 'standard_office' ? '9:30 AM - 6:30 PM' : preset.label}
                  </div>
                  <div className={`text-[10px] font-mono ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {preset.startTime} - {preset.endTime}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Time Slot Toggle */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => {
                setIsCustomTime(true);
                handleCustomTimeApply(customStart, customEnd);
              }}
              className={`text-[11px] font-bold transition-colors cursor-pointer ${
                isCustomTime ? 'text-sky-700 underline' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isCustomTime ? 'Custom Hours Active' : 'Custom Time Hours:'}
            </button>
            <div className="flex items-center gap-1 flex-1">
              <input
                type="time"
                value={customStart}
                onChange={(e) => {
                  setIsCustomTime(true);
                  handleCustomTimeApply(e.target.value, customEnd);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded px-1.5 py-1 font-mono text-center w-full"
              />
              <span className="text-[10px] text-slate-400 font-mono">-</span>
              <input
                type="time"
                value={customEnd}
                onChange={(e) => {
                  setIsCustomTime(true);
                  handleCustomTimeApply(customStart, e.target.value);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded px-1.5 py-1 font-mono text-center w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
