import React, { useMemo } from 'react';
import { Icons } from './Icons';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

interface ReleaseNote {
  id: string;
  /** 'YYYY-MM-DD' — shows with NEW badge for 2 days, then disappears. */
  date: string;
  version?: string;
  title: string;
  description: string;
  tag?: 'feature' | 'fix' | 'improvement';
}

// ── Add new releases here ──────────────────────────────────────────────────
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: 'group-chat-2026-06-20',
    date: '2026-06-20',
    version: 'v1.2',
    title: 'Group Chat',
    description: 'Real-time team group chat — send messages to your whole team instantly.',
    tag: 'feature',
  }
];
// ──────────────────────────────────────────────────────────────────────────

const tagStyles: Record<string, string> = {
  feature:     'bg-blue-100 text-blue-700',
  fix:         'bg-amber-100 text-amber-700',
  improvement: 'bg-emerald-100 text-emerald-700',
};
const tagLabels: Record<string, string> = {
  feature: 'Feature', fix: 'Fix', improvement: 'Improvement',
};

function formatNoteDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Returns true when there is at least one note within the 2-day window. */
export function hasActiveReleaseNotes(): boolean {
  const now = Date.now();
  return RELEASE_NOTES.some(n => now - new Date(n.date).getTime() < TWO_DAYS_MS);
}

const ReleaseNotesView: React.FC = () => {
  const activeNotes = useMemo(() => {
    const now = Date.now();
    return RELEASE_NOTES
      .filter(n => now - new Date(n.date).getTime() < TWO_DAYS_MS)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
          <Icons.FileText className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm">What's New</h3>
            {activeNotes.length > 0 && (
              <span className="bg-purple-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wider">
                NEW
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Latest feature releases — visible for 2 days from release date
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {activeNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <Icons.FileText className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">No new releases</p>
            <p className="text-xs opacity-70">Check back after the next update.</p>
          </div>
        ) : (
          <ul className="space-y-3 max-w-xl">
            {activeNotes.map(note => (
              <li
                key={note.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-4"
              >
                {/* Left accent bar */}
                <div className="w-1 rounded-full bg-purple-500 shrink-0" />

                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 text-sm">
                      {note.title}
                    </span>
                    {note.version && (
                      <span className="text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
                        {note.version}
                      </span>
                    )}
                    <span className="bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                      NEW
                    </span>
                    {note.tag && (
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${tagStyles[note.tag]}`}>
                        {tagLabels[note.tag]}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {note.description}
                  </p>

                  {/* Date */}
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">
                    Released {formatNoteDate(note.date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ReleaseNotesView;
