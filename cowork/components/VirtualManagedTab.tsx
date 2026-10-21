import React, { useState } from 'react';
import { Package, Building2, Check, ArrowRight, ShieldCheck, Mail, MapPin, Phone, Users, Clock } from 'lucide-react';
import { CoworkingSpace } from '../types';
import { formatINR } from '../utils/storage';
import { getKnownAreas } from '../data/initialData';

interface VirtualManagedTabProps {
  spaces: CoworkingSpace[];
  onBookVirtualOffice: (space: CoworkingSpace, planName: string, price: number) => void;
  onInquireManagedOffice: (space: CoworkingSpace, officeName: string) => void;
}

export const VirtualManagedTab: React.FC<VirtualManagedTabProps> = ({
  spaces,
  onBookVirtualOffice,
  onInquireManagedOffice,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  const filteredSpaces = selectedBranch === 'all'
    ? spaces
    : spaces.filter((s) => s.branchArea === selectedBranch);

  return (
    <div className="space-y-8">
      {/* SECTION 1: VIRTUAL OFFICE (Were we use only office address to receive parcels) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 mb-2">
              <Package className="w-3.5 h-3.5" />
              <span>PARCEL RECEIVING & OFFICIAL BUSINESS ADDRESS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Virtual Office Solutions (Coimbatore)
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Use our prime Coimbatore commercial address to receive parcels, client couriers, and register your GST / business without paying for physical desk rent.
            </p>
          </div>

          {/* Branch filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="branch-filter-vo" className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Hub:</label>
            <select
              id="branch-filter-vo"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Coimbatore Hubs</option>
              {getKnownAreas(spaces).map((a) => (
                <option key={a} value={a}>{a} Hub</option>
              ))}
            </select>
          </div>
        </div>

        {/* Virtual Office Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          {filteredSpaces.flatMap((space) =>
            (space.virtualOfficePlans || []).map((plan) => (
              <div
                key={`${space.id}-${plan.id}`}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-sky-400 hover:bg-white hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                      {space.branchArea} Branch
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      PIN: {space.pincode}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{plan.tagline}</p>

                  <div className="mt-4 mb-4 pb-4 border-b border-slate-200">
                    <div className="text-2xl font-bold font-mono text-slate-900">
                      {formatINR(plan.pricePerMonth)}
                      <span className="text-xs font-normal text-slate-500 font-sans"> / month</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Parcel & Service Features:
                    </span>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 mb-4 flex items-start gap-2">
                    <Package className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">Parcel Receiving Policy:</strong>
                      <span>{plan.parcelHandlingNotes}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onBookVirtualOffice(space, plan.name, plan.pricePerMonth)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <span>Book Parcel Receiving Address</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: MANAGED OFFICE (Full office managed by one company) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="pb-6 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>ENTERPRISE TURNKEY SOLUTION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Managed Offices (Full Office Managed for One Company)
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Custom dedicated office wings and floors exclusively reserved and fully operated for a single corporate team. Housekeeping, IT network, DG backup, and pantry are completely managed by CoWork Kovai.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
          {spaces.flatMap((space) =>
            (space.managedOffices || []).map((mo) => (
              <div
                key={mo.id}
                className="bg-emerald-50/30 border border-emerald-200/80 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-400 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {space.branchArea} Prime Wing
                    </span>
                    <span className="text-xs font-bold text-emerald-700 uppercase font-mono">
                      Turnkey Available
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{mo.name}</h3>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{space.address}, Coimbatore</span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 my-4 p-3 bg-white rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Team Size</span>
                      <div className="text-sm font-bold font-mono text-slate-900">{mo.companyCapacity} Seats</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Dedicated Area</span>
                      <div className="text-sm font-bold font-mono text-slate-900">{mo.dedicatedFloorArea}</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    {mo.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-emerald-100 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">All-Inclusive Rate</span>
                    <div className="text-xl font-bold font-mono text-slate-900">
                      {formatINR(mo.monthlyRate)}
                      <span className="text-xs font-normal text-slate-500 font-sans"> / mo</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onInquireManagedOffice(space, mo.name)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Request Floor Plan & Tour</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
