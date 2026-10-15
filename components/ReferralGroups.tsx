import React from 'react';
import { ReferralGroup, ReferralGroupMember } from '../types';
import { Icons } from './Icons';

// ── Colour palette ──────────────────────────────────────────────────────────
// Deterministic pastel colour from the referral code string, mirroring
// batchColor() in InternshipEnrolledView.tsx / groupColor() in LeadGroups.tsx
// so referral chips read as a sibling of those existing badges.
type RefColor = { bg: string; border: string; text: string; dot: string; solid: string };

const PALETTE: RefColor[] = [
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-400', solid: 'bg-violet-600' },
  { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', dot: 'bg-sky-400', solid: 'bg-sky-600' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400', solid: 'bg-amber-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-400', solid: 'bg-rose-600' },
  { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-400', solid: 'bg-teal-600' },
  { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700', dot: 'bg-fuchsia-400', solid: 'bg-fuchsia-600' },
  { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', dot: 'bg-lime-400', solid: 'bg-lime-600' },
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-400', solid: 'bg-orange-500' },
];

export function referralColor(code: string): RefColor {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) & 0xffff;
  return PALETTE[hash % PALETTE.length];
}

// ── Per-row chip (rendered inline on a referred lead's row, next to LeadGroupChips) ──
interface ReferralCodeChipProps {
  code: string;
  onOpen: () => void;
}

export const ReferralCodeChip: React.FC<ReferralCodeChipProps> = ({ code, onOpen }) => {
  if (!code) return null;
  const c = referralColor(code);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      title="Click to see referral group"
      className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border cursor-pointer hover:shadow-sm active:scale-95 transition-all ${c.bg} ${c.border} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {code}
    </button>
  );
};

// ── Toolbar launcher button ─────────────────────────────────────────────────
interface ReferralGroupsButtonProps {
  groups: ReferralGroup[];
  onClick: () => void;
  className?: string;
}

export const ReferralGroupsButton: React.FC<ReferralGroupsButtonProps> = ({ groups, onClick, className }) => {
  if (groups.length === 0) return null;
  return (
    <button
      onClick={onClick}
      className={className || 'flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-bold text-sm transition-all border border-amber-200'}
    >
      <Icons.User className="w-4 h-4" />
      <span>Referrals ({groups.length})</span>
    </button>
  );
};

// ── Groups list panel ───────────────────────────────────────────────────────
interface ReferralGroupsPanelProps {
  groups: ReferralGroup[];
  onOpen: (group: ReferralGroup) => void;
  onClose: () => void;
}

export const ReferralGroupsPanel: React.FC<ReferralGroupsPanelProps> = ({ groups, onOpen, onClose }) => {
  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-24 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-800">Referral Groups</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Icons.X className="w-4 h-4" /></button>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 px-1 py-2">
          {groups.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400 italic">No referral groups yet.</p>
          ) : (
            groups.map(g => {
              const c = referralColor(g.code);
              return (
                <button
                  key={g.code}
                  onClick={() => onOpen(g)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-slate-800 truncate">{g.leaderName}</span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {g.code} • {g.memberCount} referred
                    </span>
                  </span>
                  <Icons.ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ── Group members popup ─────────────────────────────────────────────────────
interface ReferralGroupPopupProps {
  group: ReferralGroup;
  members: ReferralGroupMember[];
  loading: boolean;
  onClose: () => void;
  onOpenLead: (leadId: string) => void;
}

export const ReferralGroupPopup: React.FC<ReferralGroupPopupProps> = ({ group, members, loading, onClose, onOpenLead }) => {
  const c = referralColor(group.code);

  const statusPill = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'hot' ? 'bg-red-100 text-red-700' : s === 'warm' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase border ${c.bg} ${c.border} ${c.text}`}>
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              {group.code}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              {group.memberCount} referred by {group.leaderName}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 flex-shrink-0"><Icons.X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="px-4 py-10 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Icons.RefreshCcw className="w-4 h-4 animate-spin" /> Loading members…
            </div>
          ) : members.length === 0 ? (
            <div className="px-4 py-10 text-center text-slate-400 italic text-sm">No members found.</div>
          ) : (
            members.map(m => (
              <button key={m._id} onClick={() => onOpenLead(m._id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {(m.userName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-800 truncate">{m.userName}</span>
                    {m.is_referral_leader ? (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase bg-amber-100 text-amber-700" title="Referral Leader">
                        <Icons.Crown className="w-2.5 h-2.5" /> Leader
                      </span>
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${statusPill(m.status)}`}>{m.status}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {m.userNumber}
                    {m.course ? ` • ${m.course}` : ''}
                    {m.assignedto ? ` • ${m.assignedto}` : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
