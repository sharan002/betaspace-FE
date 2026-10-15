import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LeadGroup, LeadGroupMember } from '../types';
import { apiService } from '../services/api';
import { Icons } from './Icons';

// ── Colour palette ──────────────────────────────────────────────────────────
// Mirrors batchColor() in InternshipEnrolledView.tsx so group badges feel like
// a sibling of the batch-code badges.
type GroupColor = { bg: string; border: string; text: string; dot: string; solid: string };

const PALETTE: Record<string, GroupColor> = {
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  dot: 'bg-violet-400',  solid: 'bg-violet-600' },
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-700',     dot: 'bg-sky-400',     solid: 'bg-sky-600' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-400',   solid: 'bg-amber-500' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    dot: 'bg-rose-400',    solid: 'bg-rose-600' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-700',    dot: 'bg-teal-400',    solid: 'bg-teal-600' },
  fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700', dot: 'bg-fuchsia-400', solid: 'bg-fuchsia-600' },
  lime:    { bg: 'bg-lime-50',    border: 'border-lime-200',    text: 'text-lime-700',    dot: 'bg-lime-400',    solid: 'bg-lime-600' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  dot: 'bg-orange-400',  solid: 'bg-orange-500' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  dot: 'bg-indigo-400',  solid: 'bg-indigo-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400', solid: 'bg-emerald-600' },
};

export const GROUP_COLORS = Object.keys(PALETTE);

export function groupColor(key?: string | null, fallbackName?: string): GroupColor {
  if (key && PALETTE[key]) return PALETTE[key];
  const source = key || fallbackName || '';
  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) & 0xffff;
  return PALETTE[GROUP_COLORS[hash % GROUP_COLORS.length]];
}

// ── Per-row badges (rendered inside the "Program & Source" cell) ─────────────
interface LeadGroupChipsProps {
  groups: LeadGroup[];
  onOpen: (group: LeadGroup) => void;
}

export const LeadGroupChips: React.FC<LeadGroupChipsProps> = ({ groups, onOpen }) => {
  if (!groups || groups.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {groups.map(g => {
        const c = groupColor(g.color, g.name);
        return (
          <button
            key={g._id}
            onClick={(e) => { e.stopPropagation(); onOpen(g); }}
            title="View group members"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border cursor-pointer hover:shadow-sm active:scale-95 transition-all ${c.bg} ${c.border} ${c.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {g.name}
          </button>
        );
      })}
    </div>
  );
};

// ── Colour swatch picker ────────────────────────────────────────────────────
const ColorPicker: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {GROUP_COLORS.map(key => {
      const c = PALETTE[key];
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`w-6 h-6 rounded-full ${c.solid} transition-all ${value === key ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
          title={key}
        />
      );
    })}
  </div>
);

// ── Create-group modal ──────────────────────────────────────────────────────
interface CreateGroupModalProps {
  open: boolean;
  selectedCount: number;
  busy?: boolean;
  onCreate: (name: string, color: string) => void;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ open, selectedCount, busy, onCreate, onClose }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('violet');

  useEffect(() => {
    if (open) { setName(''); setColor(GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]); }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, color);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-800">New Group</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Icons.X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-500">
            {selectedCount} lead{selectedCount !== 1 ? 's' : ''} selected
          </p>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Group name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              placeholder="e.g. October Walk-ins"
              className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colour</label>
            <div className="mt-2"><ColorPicker value={color} onChange={setColor} /></div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || !name.trim() || selectedCount === 0}
            className="flex-1 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Group members popup ─────────────────────────────────────────────────────
interface LeadGroupPopupProps {
  group: LeadGroup;
  members: LeadGroupMember[];
  loading: boolean;
  canManage: boolean;
  onClose: () => void;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onDelete: () => void;
  onRemoveMember: (leadId: string) => void;
  onAddMembers: (leadIds: string[]) => void;
  onOpenLead: (leadId: string) => void;
}

export const LeadGroupPopup: React.FC<LeadGroupPopupProps> = ({
  group, members, loading, canManage, onClose,
  onRename, onRecolor, onDelete, onRemoveMember, onAddMembers, onOpenLead,
}) => {
  const c = groupColor(group.color, group.name);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name);
  const [showColors, setShowColors] = useState(false);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LeadGroupMember[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setNameDraft(group.name); }, [group.name]);

  const memberIdSet = useMemo(() => new Set(group.memberIds), [group.memberIds]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = search.trim();
    if (!q || !canManage) { setResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const found = await apiService.searchLeadsForGroup(q);
      setResults(found);
      setSearching(false);
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, canManage]);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    setEditingName(false);
    if (trimmed && trimmed !== group.name) onRename(trimmed);
    else setNameDraft(group.name);
  };

  const statusPill = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'hot' ? 'bg-red-100 text-red-700' : s === 'warm' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameDraft(group.name); setEditingName(false); } }}
                className="px-2 py-1 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase border ${c.bg} ${c.border} ${c.text}`}>
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {group.name}
              </span>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              {group.memberCount} lead{group.memberCount !== 1 ? 's' : ''} in this group
              {group.createdBy ? ` • by ${group.createdBy}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {canManage && (
              <>
                <button onClick={() => setShowColors(v => !v)} title="Change colour" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                  <span className={`block w-4 h-4 rounded-full ${c.solid}`} />
                </button>
                <button onClick={() => setEditingName(true)} title="Rename" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                  <Icons.Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { if (window.confirm(`Delete group "${group.name}"? This does not delete any leads.`)) onDelete(); }}
                  title="Delete group"
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"
                >
                  <Icons.Trash className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Icons.X className="w-4 h-4" /></button>
          </div>
        </div>

        {canManage && showColors && (
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <ColorPicker value={group.color} onChange={(col) => { onRecolor(col); setShowColors(false); }} />
          </div>
        )}

        {/* Members */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="px-4 py-10 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Icons.RefreshCcw className="w-4 h-4 animate-spin" /> Loading members…
            </div>
          ) : members.length === 0 ? (
            <div className="px-4 py-10 text-center text-slate-400 italic text-sm">No leads in this group yet.</div>
          ) : (
            members.map(m => (
              <div key={m._id} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group/mem">
                <button onClick={() => onOpenLead(m._id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {(m.userName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800 truncate">{m.userName}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${statusPill(m.status)}`}>{m.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {m.userNumber}
                      {m.course ? ` • ${m.course}` : ''}
                      {m.assignedto ? ` • ${m.assignedto}` : ''}
                    </p>
                  </div>
                </button>
                {canManage && (
                  <button
                    onClick={() => onRemoveMember(m._id)}
                    title="Remove from group"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/mem:opacity-100 transition-all flex-shrink-0"
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add members */}
        {canManage && (
          <div className="border-t border-slate-100 bg-slate-50 p-3">
            <div className="relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search leads to add…"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {search.trim() && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-50">
                {searching ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-400">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-400 italic">No matching leads</div>
                ) : (
                  results.map(r => {
                    const already = memberIdSet.has(r._id);
                    return (
                      <button
                        key={r._id}
                        disabled={already}
                        onClick={() => { onAddMembers([r._id]); setSearch(''); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{r.userName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{r.userNumber}{r.course ? ` • ${r.course}` : ''}</p>
                        </div>
                        {already
                          ? <span className="text-[10px] font-bold text-slate-400 uppercase">Added</span>
                          : <Icons.Plus className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Groups management panel ─────────────────────────────────────────────────
interface GroupsPanelProps {
  groups: LeadGroup[];
  onOpen: (group: LeadGroup) => void;
  onNewGroup: () => void;
  onClose: () => void;
}

export const GroupsPanel: React.FC<GroupsPanelProps> = ({ groups, onOpen, onNewGroup, onClose }) => {
  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-24 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-800">Lead Groups</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Icons.X className="w-4 h-4" /></button>
        </div>
        <div className="p-3">
          <button
            onClick={onNewGroup}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
          >
            <Icons.Plus className="w-4 h-4" /> New Group
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 px-1 pb-2">
          {groups.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400 italic">No groups yet. Select leads on the dashboard and create one.</p>
          ) : (
            groups.map(g => {
              const c = groupColor(g.color, g.name);
              return (
                <button
                  key={g._id}
                  onClick={() => onOpen(g)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-slate-800 truncate">{g.name}</span>
                    <span className="block text-[10px] text-slate-400">
                      {g.memberCount} lead{g.memberCount !== 1 ? 's' : ''}
                      {g.createdBy ? ` • by ${g.createdBy}` : ''}
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
