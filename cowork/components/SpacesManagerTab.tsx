import React from 'react';
import { Building2, Armchair, Users, Briefcase, Plus, Edit3, Trash2, ArrowRight, MapPin, Phone } from 'lucide-react';
import { CoworkingSpace } from '../types';
import { formatINR } from '../utils/storage';

interface SpacesManagerTabProps {
  spaces: CoworkingSpace[];
  onSelectSpaceForBooking: (spaceId: string) => void;
  onEditSpace: (space: CoworkingSpace) => void;
  onDeleteSpace: (spaceId: string) => void;
  onAddNewSpace: () => void;
}

export const SpacesManagerTab: React.FC<SpacesManagerTabProps> = ({
  spaces,
  onSelectSpaceForBooking,
  onEditSpace,
  onDeleteSpace,
  onAddNewSpace,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Header (Light Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            <span>Coimbatore Co-Working Hubs & Branches</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your spaces across Coimbatore
          </p>
        </div>

        <button
          onClick={onAddNewSpace}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Location</span>
        </button>
      </div>

      {/* Spaces Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {spaces.map((space) => {
          const meetingSeatsCount = space.seats.filter((s) => s.category === 'meeting_room').length;
          const privateOfficeSeatsCount = space.seats.filter((s) => s.category === 'private_office').length;
          const staticHotdesksCount = space.seats.filter((s) => s.category === 'hotdesk').length;
          const flexCoworkSeatsCount = space.seats.filter((s) => s.category === 'co_working').length;
          const totalSeats = space.seats.length;

          return (
            <div
              key={space.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-sky-300 hover:shadow-sm transition-all group"
            >
              <div className="space-y-4">
                {/* Title & Actions */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                        {space.branchArea} Hub
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        PIN: {space.pincode}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {space.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{space.address}, Coimbatore</span>
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{space.phone}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onEditSpace(space)}
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit layout & seats"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {spaces.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${space.name}?`)) {
                            onDeleteSpace(space.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete space"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Capacity Metrics Matrix (User-defined 4 seating types) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 mb-0.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Meeting</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-indigo-950">
                      {meetingSeatsCount}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      slot based
                    </div>
                  </div>

                  <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-purple-700 mb-0.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Private</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-purple-950">
                      {privateOfficeSeatsCount}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      shared cabin
                    </div>
                  </div>

                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 mb-0.5">
                      <Armchair className="w-3.5 h-3.5" />
                      <span>Hotdesk</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-amber-950">
                      {staticHotdesksCount}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      fixed & static
                    </div>
                  </div>

                  <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-sky-700 mb-0.5">
                      <Armchair className="w-3.5 h-3.5" />
                      <span>Co-Work</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-sky-950">
                      {flexCoworkSeatsCount}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      will change
                    </div>
                  </div>
                </div>

                {/* Meeting Room Highlights */}
                {space.meetingRooms.length > 0 && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                      Conference Rooms:
                    </span>
                    <div className="space-y-1">
                      {space.meetingRooms.map((mr) => (
                        <div key={mr.id} className="flex items-center justify-between text-slate-700">
                          <span className="font-semibold text-slate-900">{mr.name}</span>
                          <span className="text-slate-500 font-mono text-[11px] font-medium">
                            {mr.capacity} Seats · {formatINR(mr.pricePerHour)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom CTA to view seat map */}
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  Total Floor Capacity: <strong className="text-slate-900 font-bold">{totalSeats} Seats</strong>
                </span>

                <button
                  type="button"
                  onClick={() => onSelectSpaceForBooking(space.id)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-sky-600 text-sky-700 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Select Cinema Seats</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
