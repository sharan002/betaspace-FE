
import React from 'react';
import { Icons } from './Icons';
import { FilterState } from '../App';
import { User } from '../types';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  users: User[];
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  colleges?: string[]; // optional list provided by parent
  campaignNames?: string[]; // optional list of past campaign names provided by parent
}

export const SPACE_TYPES = ["Hotdesk", "Co-working", "Meeting Room", "Virtual Office", "Private Office", "Managed Office"];
const PROGRAM_TYPES = ["8 Hours", "2 Hours"];
const PROFESSIONS = ["Job Seeker", "Student", "Working Professional"];
const SOURCES = ["WhatsApp", "Meta Ads",'Google ads', "Website","Call","Walk-in","Referral","metaads","BulkMessage"];
const STATUSES = ["Hot", "Warm", "Cold"];
const PIPELINES = ["New", "RNR", "Contacted", "Asked Time", "Not Interested" , "Demo Scheduled", "Pre-Enrollment", "Enrolled", "Looking for job" ,  "Irrelevant" ];

const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose, filters, users, onFilterChange, onReset, colleges, campaignNames }) => {
  const toggleFilter = (category: keyof FilterState, value: string) => {
    const current = filters[category] as string[];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    onFilterChange({ ...filters, [category]: updated });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, [e.target.name]: e.target.value });
  };

  const staffNames = users.map(u => u.username);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}
      <div className={`fixed inset-y-0 right-0 w-80 max-w-[calc(100%-2rem)] bg-white shadow-2xl z-[9998] transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Advanced Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
            <Icons.X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* College dropdown (optional) */}
          {Array.isArray(colleges) && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">College</h3>
              <select
                value={filters.college || ''}
                onChange={(e) => onFilterChange({ ...filters, college: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Colleges</option>
                {(colleges as string[]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          {/* Date Range */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Date Created Range</h3>
            <div className="space-y-2">
              <input 
                type="date" 
                name="fromDate"
                value={filters.fromDate}
                onChange={handleDateChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <p className="text-[10px] text-center text-slate-400">to</p>
              <input 
                type="date" 
                name="toDate"
                value={filters.toDate}
                onChange={handleDateChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          <FilterGroup label="Lead Status" options={STATUSES} selected={filters.statuses} onToggle={(val) => toggleFilter('statuses', val)} />
          
          <FilterGroup label="Assigned Staff" options={staffNames} selected={filters.assignedUsers} onToggle={(val) => toggleFilter('assignedUsers', val)} />

          <FilterGroup label="Space Type" options={SPACE_TYPES} selected={filters.courses} onToggle={(val) => toggleFilter('courses', val)} />
          <FilterGroup label="Pipeline Stage" options={PIPELINES} selected={filters.pipelines} onToggle={(val) => toggleFilter('pipelines', val)} />
          <FilterGroup label="Profession" options={PROFESSIONS} selected={filters.professions} onToggle={(val) => toggleFilter('professions', val)} />
          <FilterGroup label="Lead Source" options={SOURCES} selected={filters.sources} onToggle={(val) => toggleFilter('sources', val)} />
          <FilterGroup label="Program Type" options={PROGRAM_TYPES} selected={filters.programTypes} onToggle={(val) => toggleFilter('programTypes', val)} />
          {Array.isArray(campaignNames) && campaignNames.length > 0 && (
            <FilterGroup label="Campaign Replied" options={campaignNames} selected={filters.campaigns} onToggle={(val) => toggleFilter('campaigns', val)} />
          )}
        </div>

        <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-slate-100 bg-slate-50 flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

interface FilterGroupProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ label, options, selected, onToggle }) => (
  <div className="space-y-3">
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</h3>
    <div className="flex flex-wrap gap-2">
      {options.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No options available</p>
      ) : (
        options.map(option => (
          <button
            key={option}
            onClick={() => onToggle(option)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              selected.includes(option)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
            }`}
          >
            {option}
          </button>
        ))
      )}
    </div>
  </div>
);

export default FilterPanel;
