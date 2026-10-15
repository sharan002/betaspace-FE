import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { apiService } from '../services/api';
import { Icons } from './Icons';

// ── Types (local — mirrors the SalesTrainingSession documents wpchat-api
// writes daily at 3:30 PM IST; this view is read-only over that data) ──
interface TrainingQuestion {
  text: string;
  answer?: string;
  score?: number | null;
  feedback?: string;
}
interface TrainingSession {
  _id: string;
  userNumber: string;
  username: string;
  topic: string;
  script: string;
  questions: TrainingQuestion[];
  status: 'in_progress' | 'completed';
  totalScore: number | null;
  startedAt: string;
  completedAt?: string | null;
}
interface DateSummary {
  date: string;
  total: number;
  completed: number;
  inProgress: number;
  avgScore: number | null;
}
type ChatMessage = { role: 'user' | 'assistant'; content: string };

const fmtDate = (d: string): string => {
  const parsed = new Date(`${d}T00:00:00`);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
};

const fmtTime = (v?: string | null): string => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const statusBadge = (status: TrainingSession['status']) => {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-amber-100 text-amber-700',
  };
  const label: Record<string, string> = {
    completed: 'Completed',
    in_progress: 'In Progress',
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {label[status] || status}
    </span>
  );
};

const scoreBadge = (totalScore: number | null) => {
  if (totalScore === null || totalScore === undefined) return null;
  const cls = totalScore >= 4 ? 'bg-indigo-100 text-indigo-700' : totalScore >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${cls}`}>{totalScore}/5</span>;
};

// Expandable transcript + Q&A card, shared by both the admin day view and
// the counsellor's own history list.
const SessionCard: React.FC<{ session: TrainingSession; showCounsellor: boolean; expanded: boolean; onToggle: () => void }> = ({ session, showCounsellor, expanded, onToggle }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {showCounsellor && <Icons.User className="w-5 h-5 text-slate-400 flex-shrink-0" />}
          <div className="min-w-0">
            {showCounsellor && <h3 className="font-black text-slate-800 truncate">{session.username || session.userNumber}</h3>}
            <p className={`truncate ${showCounsellor ? 'text-xs text-slate-500' : 'font-black text-slate-800'}`}>{session.topic}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {statusBadge(session.status)}
          {scoreBadge(session.totalScore)}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className="text-[11px] font-semibold text-slate-400">
          {session.questions?.length || 0} questions
          {session.startedAt ? ` · sent ${fmtTime(session.startedAt)}` : ''}
          {session.completedAt ? ` · finished ${fmtTime(session.completedAt)}` : ''}
        </span>
        <button onClick={onToggle} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
          {expanded ? 'Hide transcript' : 'View transcript'}
        </button>
      </div>
    </div>

    {expanded && (
      <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4 max-h-96 overflow-y-auto">
        <div>
          <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Training sent</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white rounded-xl border border-slate-200 p-3">{session.script || '(no script recorded)'}</p>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase text-slate-400">Questions &amp; answers</p>
          {(session.questions || []).map((q, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 text-sm">
              <p className="font-semibold text-slate-800">{i + 1}. {q.text}</p>
              <p className="text-slate-600 mt-1"><span className="font-semibold text-slate-400">Answer: </span>{q.answer || <span className="italic text-slate-400">No answer yet</span>}</p>
              {q.feedback && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  {q.score === 1 ? <Icons.Check className="w-3.5 h-3.5 text-green-600" /> : <Icons.X className="w-3.5 h-3.5 text-rose-500" />}
                  {q.feedback}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Embedded (non-floating) training assistant — general-purpose, familiar
// with every topic the program has covered so far. Used identically by both
// admins and counsellors (the backend personalizes with the caller's own
// sessions automatically for counsellors; admins get the general program
// assistant — no counsellor selection needed either way).
const TrainingAssistantPanel: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAsk = async (customQuestion?: string) => {
    const userMessage = customQuestion || question.trim();
    if (!userMessage || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(nextMessages);
    setQuestion('');
    setLoading(true);

    try {
      const res = await apiService.askTrainingAssistant({ question: userMessage, history: nextMessages.slice(-8) });
      if (res.success && res.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not get a response. Please try again.' }]);
      }
    } catch (error) {
      console.error('Training assistant error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred. Please check your connection and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "Explain today's topic again",
    'How did I score on my last quiz?',
    'Give me an example for this topic',
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[560px]">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center gap-2 rounded-t-2xl flex-shrink-0">
        <div className="bg-white/20 p-2 rounded-lg"><Icons.Bot className="w-5 h-5" /></div>
        <div>
          <h3 className="font-bold">Training Assistant</h3>
          <p className="text-xs opacity-80">Ask anything about the sales training</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <Icons.Bot className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Ask a question about the training</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {quickQuestions.map((q, idx) => (
                <button key={idx} onClick={() => handleAsk(q)} className="text-xs bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-100 bg-white flex-shrink-0 rounded-b-2xl">
        <div className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 max-h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
          />
          <button
            onClick={() => handleAsk()}
            disabled={!question.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-lg transition"
            aria-label="Send message"
          >
            <Icons.Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Admin: browse every counsellor's training by day, with day-level stats,
// plus the general training assistant.
const AdminTrainingBrowser: React.FC = () => {
  const [dates, setDates] = useState<DateSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState('');

  const loadDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const rows = await apiService.getSalesTrainingDates();
      setDates(rows);
      if (rows.length > 0) setSelectedDate((prev) => prev || rows[0].date);
    } catch (err: any) {
      setError(err.message || 'Failed to load training dates');
    } finally {
      setLoadingDates(false);
    }
  }, []);

  const loadDay = useCallback(async (date: string) => {
    setLoadingDay(true);
    setError('');
    try {
      const result = await apiService.getSalesTrainingSessions(date);
      setSessions(result.sessions);
    } catch (err: any) {
      setError(err.message || 'Failed to load training sessions');
      setSessions([]);
    } finally {
      setLoadingDay(false);
    }
  }, []);

  useEffect(() => { loadDates(); }, [loadDates]);
  useEffect(() => { if (selectedDate) loadDay(selectedDate); }, [selectedDate, loadDay]);

  const handleTriggerNow = useCallback(async () => {
    setTriggering(true);
    setTriggerMsg('');
    setError('');
    try {
      const result = await apiService.triggerSalesTraining();
      setTriggerMsg(
        result.disabled
          ? 'Sales training is currently paused — enable it in wpchat-api before triggering.'
          : result.started > 0
          ? `Started ${result.started} training session${result.started === 1 ? '' : 's'}` +
            (result.alreadyStarted > 0 ? ` (${result.alreadyStarted} already started today)` : '') +
            (result.failed > 0 ? ` — ${result.failed} failed` : '')
          : `Nothing to start — ${result.alreadyStarted} counsellor${result.alreadyStarted === 1 ? '' : 's'} already have today's training`
      );
      await loadDates();
      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      await loadDay(selectedDate || todayIST);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger sales training');
    } finally {
      setTriggering(false);
    }
  }, [loadDates, loadDay, selectedDate]);

  const selectedSummary = dates.find((d) => d.date === selectedDate);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Icons.GraduationCap className="w-6 h-6 text-indigo-600" /> Sales Training
          </h1>
          <p className="text-sm text-slate-500">
            Daily 3:30 PM WhatsApp training sent to every counsellor — the transcript, quiz questions, their answers, and scores.
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
            title="Send today's sales training right now, instead of waiting for 3:30 PM"
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div>
          {triggerMsg && (
            <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold px-4 py-2.5 rounded-lg">
              {triggerMsg}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-2.5 rounded-lg">{error}</div>
          )}

          {loadingDates ? (
            <div className="mb-4 text-sm text-slate-400 flex items-center gap-2">
              <Icons.RefreshCcw className="w-4 h-4 animate-spin" /> Loading dates…
            </div>
          ) : dates.length === 0 ? (
            <div className="mb-4 text-sm text-slate-400">No training sessions recorded yet.</div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
              {dates.map((d) => (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={`flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all ${selectedDate === d.date ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                >
                  <span className="text-xs font-bold">{fmtDate(d.date)}</span>
                  <span className={`text-[11px] ${selectedDate === d.date ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {d.total} counsellor{d.total === 1 ? '' : 's'}{d.avgScore !== null ? ` · avg ${d.avgScore}/5` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

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
                <p className="text-[11px] font-bold uppercase text-slate-400">Avg Score</p>
                <p className="text-lg font-black text-indigo-600">{selectedSummary.avgScore !== null ? `${selectedSummary.avgScore}/5` : '—'}</p>
              </div>
            </div>
          )}

          {loadingDay ? (
            <div className="py-20 text-center text-slate-400">
              <Icons.RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading…
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Icons.GraduationCap className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="font-bold">No training sent for this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <SessionCard
                  key={s._id}
                  session={s}
                  showCounsellor
                  expanded={expandedId === s._id}
                  onToggle={() => setExpandedId(expandedId === s._id ? null : s._id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4">
          <TrainingAssistantPanel />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Counsellor: their own training history, plus the assistant to ask about it.
const CounsellorTrainingView: React.FC = () => {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiService.getSalesTrainingHistory()
      .then((rows) => { if (!cancelled) setSessions(rows); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load your training history'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Icons.GraduationCap className="w-6 h-6 text-indigo-600" /> Sales Training
        </h1>
        <p className="text-sm text-slate-500">
          Your daily 3:30 PM WhatsApp training — past topics, quiz questions, your answers, and scores. Ask the assistant if anything's unclear.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div>
          <p className="text-[11px] font-bold uppercase text-slate-400 mb-3">My training history</p>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-2.5 rounded-lg">{error}</div>
          )}
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Icons.RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading…
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Icons.GraduationCap className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="font-bold">No training sessions yet</p>
              <p className="text-sm opacity-70">Your first daily training will arrive on WhatsApp at 3:30 PM.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <SessionCard
                  key={s._id}
                  session={s}
                  showCounsellor={false}
                  expanded={expandedId === s._id}
                  onToggle={() => setExpandedId(expandedId === s._id ? null : s._id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4">
          <TrainingAssistantPanel />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
interface SalesTrainingViewProps {
  currentUser: User | null;
}

const SalesTrainingView: React.FC<SalesTrainingViewProps> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      {isAdmin ? <AdminTrainingBrowser /> : <CounsellorTrainingView />}
    </div>
  );
};

export default SalesTrainingView;
