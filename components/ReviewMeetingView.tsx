import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Icons } from './Icons';

// ── Types (local — this view is self-contained, mirrors the ManagerCheckIn
// documents already stored by the backend's daily 5 PM manager check-in) ──
interface ReviewMeetingMessage {
  role: 'manager' | 'counsellor';
  text: string;
  timestamp?: string;
}
interface ReviewMeetingCheckIn {
  _id: string;
  counsellorUsername: string;
  counsellorNumber?: string;
  date: string;
  status: 'in_progress' | 'completed' | 'no_response';
  verdict?: 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | null;
  verdictReason?: string;
  adminSummaryReport?: string;
  questionCount?: number;
  escalatedToAdmin?: boolean;
  messages: ReviewMeetingMessage[];
  startedAt?: string;
  completedAt?: string | null;
}
interface DateSummary {
  date: string;
  total: number;
  completed: number;
  inProgress: number;
  noResponse: number;
  needsImprovement: number;
}

const fmtDate = (d: string): string => {
  const parsed = new Date(`${d}T00:00:00`);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
};

const fmtTime = (v?: string): string => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const statusBadge = (status: ReviewMeetingCheckIn['status']) => {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-amber-100 text-amber-700',
    no_response: 'bg-red-100 text-red-700',
  };
  const label: Record<string, string> = {
    completed: 'Completed',
    in_progress: 'In Progress',
    no_response: 'No Response',
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {label[status] || status}
    </span>
  );
};

const verdictBadge = (verdict?: ReviewMeetingCheckIn['verdict']) => {
  if (!verdict) return null;
  const cls = verdict === 'SATISFACTORY' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700';
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${cls}`}>{verdict.replace('_', ' ')}</span>;
};

// ═══════════════════════════════════════════════════════════════════════════
const ReviewMeetingView: React.FC = () => {
  const [dates, setDates] = useState<DateSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [checkIns, setCheckIns] = useState<ReviewMeetingCheckIn[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState('');

  const loadDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const rows = await apiService.getReviewMeetingDates();
      setDates(rows);
      if (rows.length > 0) setSelectedDate((prev) => prev || rows[0].date);
    } catch (err: any) {
      setError(err.message || 'Failed to load review meeting dates');
    } finally {
      setLoadingDates(false);
    }
  }, []);

  const loadDay = useCallback(async (date: string) => {
    setLoadingDay(true);
    setError('');
    try {
      const result = await apiService.getReviewMeetingsForDate(date);
      setCheckIns(result.checkIns);
    } catch (err: any) {
      setError(err.message || 'Failed to load review meeting');
      setCheckIns([]);
    } finally {
      setLoadingDay(false);
    }
  }, []);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useEffect(() => {
    if (selectedDate) loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  const handleTriggerNow = useCallback(async () => {
    setTriggering(true);
    setTriggerMsg('');
    setError('');
    try {
      const result = await apiService.triggerReviewMeeting();
      setTriggerMsg(
        result.started > 0
          ? `Started ${result.started} check-in${result.started === 1 ? '' : 's'}` +
            (result.alreadyStarted > 0 ? ` (${result.alreadyStarted} already started today)` : '') +
            (result.failed > 0 ? ` — ${result.failed} failed` : '')
          : `Nothing to start — ${result.alreadyStarted} counsellor${result.alreadyStarted === 1 ? '' : 's'} already have today's check-in`
      );
      await loadDates();
      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      await loadDay(selectedDate || todayIST);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger review meeting');
    } finally {
      setTriggering(false);
    }
  }, [loadDates, loadDay, selectedDate]);

  const selectedSummary = dates.find((d) => d.date === selectedDate);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Icons.Bot className="w-6 h-6 text-indigo-600" /> Review Meeting
            </h1>
            <p className="text-sm text-slate-500">
              Daily 5 PM manager check-in conversations with each counsellor, plus the AI-generated summary for each.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={handleTriggerNow}
              disabled={triggering}
              title="Start today's manager check-ins right now, instead of waiting for 5 PM"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {triggering ? (
                <Icons.RefreshCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Icons.Send className="w-4 h-4" />
              )}
              Trigger Now
            </button>
          </div>
        </div>

        {triggerMsg && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold px-4 py-2.5 rounded-lg">
            {triggerMsg}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        {/* Date chips */}
        {loadingDates ? (
          <div className="mb-4 text-sm text-slate-400 flex items-center gap-2">
            <Icons.RefreshCcw className="w-4 h-4 animate-spin" /> Loading dates…
          </div>
        ) : dates.length === 0 ? (
          <div className="mb-4 text-sm text-slate-400">No review meetings recorded yet.</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
            {dates.map((d) => (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all ${
                  selectedDate === d.date
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                <span className="text-xs font-bold">{fmtDate(d.date)}</span>
                <span className={`text-[11px] ${selectedDate === d.date ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {d.total} counsellor{d.total === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Day summary stats */}
        {selectedSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase text-slate-400">Total</p>
              <p className="text-lg font-black text-slate-800">{selectedSummary.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase text-slate-400">Completed</p>
              <p className="text-lg font-black text-green-600">{selectedSummary.completed}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase text-slate-400">In Progress</p>
              <p className="text-lg font-black text-amber-600">{selectedSummary.inProgress}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase text-slate-400">No Response</p>
              <p className="text-lg font-black text-red-600">{selectedSummary.noResponse}</p>
            </div>
          </div>
        )}

        {/* Check-ins for the selected day */}
        {loadingDay ? (
          <div className="py-20 text-center text-slate-400">
            <Icons.RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading…
          </div>
        ) : checkIns.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Icons.Chat className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No review meeting for this date</p>
            <p className="text-sm opacity-70">Check-ins run Monday–Saturday from 5 PM IST.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkIns.map((c) => {
              const expanded = expandedId === c._id;
              return (
                <div key={c._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icons.User className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <h3 className="font-black text-slate-800 truncate">{c.counsellorUsername}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {statusBadge(c.status)}
                        {verdictBadge(c.verdict)}
                        {c.escalatedToAdmin && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-50 text-red-600">
                            Escalated
                          </span>
                        )}
                      </div>
                    </div>

                    {c.adminSummaryReport ? (
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.adminSummaryReport}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Summary not generated yet.</p>
                    )}

                    {c.verdictReason && (
                      <p className="text-xs text-slate-500">
                        <span className="font-bold">Reason:</span> {c.verdictReason}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {c.messages?.length || 0} messages · {c.questionCount || 0} questions
                        {c.startedAt ? ` · started ${fmtTime(c.startedAt)}` : ''}
                      </span>
                      <button
                        onClick={() => setExpandedId(expanded ? null : c._id)}
                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        {expanded ? 'Hide transcript' : 'View transcript'}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-2 max-h-96 overflow-y-auto">
                      {(c.messages || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No messages recorded for this check-in.</p>
                      ) : (
                        c.messages.map((m, i) => (
                          <div key={i} className={`flex ${m.role === 'manager' ? 'justify-start' : 'justify-end'}`}>
                            <div
                              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                m.role === 'manager'
                                  ? 'bg-white border border-slate-200 text-slate-700'
                                  : 'bg-indigo-600 text-white'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.text}</p>
                              {m.timestamp && (
                                <p className={`text-[10px] mt-1 ${m.role === 'manager' ? 'text-slate-400' : 'text-indigo-200'}`}>
                                  {fmtTime(m.timestamp)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewMeetingView;
