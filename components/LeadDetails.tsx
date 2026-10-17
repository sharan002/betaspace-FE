
import React, { useState, useEffect, useRef } from 'react';
import { Lead, User } from '../types';
import { Icons } from './Icons';
import { isConvertedStage, isQualifiedStage } from '../utils/pipeline';
import { apiService } from '../services/api';

interface LeadDetailsProps {
  lead: Lead;
  users: User[];
  currentUserRole?: string;
  onUpdate: (updatedLead: Lead) => void;
  onDelete: (id: string) => void;
  onEdit: (lead: Lead) => void;
  onClose: () => void;
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, users, currentUserRole, onUpdate, onDelete, onEdit, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'remarks' | 'analysis' | 'campaigns'>('info');
  const [activeStrategy, setActiveStrategy] = useState<'A' | 'B'>('A');
  const [loading, setLoading] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const summarizeTriedRef = useRef<Set<string>>(new Set());
  // Always points at the latest lead prop, so the async summary callback merges
  // onto current state (e.g. a remark added while the summary was generating).
  const leadRef = useRef(lead);
  leadRef.current = lead;
  const isAdmin = currentUserRole === 'admin';

  // When the Remarks tab is opened, generate a one-time AI summary of the lead's
  // WhatsApp conversation. Runs at most once per lead: the backend is idempotent
  // (never re-summarises once `aiConversationSummary` exists) and this guard
  // avoids repeat calls while the panel is open.
  useEffect(() => {
    if (activeTab !== 'remarks') return;
    const id = lead._id;
    if (!id) return;
    if (lead.aiConversationSummary?.text) return;
    if (!lead.conversations || lead.conversations.length === 0) return;
    if (summarizeTriedRef.current.has(id)) return;
    summarizeTriedRef.current.add(id);

    let cancelled = false;
    (async () => {
      try {
        setSummarizing(true);
        const res = await apiService.summarizeLeadConversation(id);
        if (!cancelled && res?.lead?.aiConversationSummary && leadRef.current._id === id) {
          onUpdate({ ...leadRef.current, aiConversationSummary: res.lead.aiConversationSummary });
        }
      } catch (err) {
        console.error('Conversation summary failed:', err);
      } finally {
        if (!cancelled) setSummarizing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeTab, lead._id, lead.aiConversationSummary?.text]);

  const parseMongoDate = (date: any): string => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date.$date) return date.$date;
    return '';
  };

  const handleAssign = async (username: string) => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const updated = await apiService.updateLead({ _id: lead._id, assignedto: username });
      onUpdate(updated);
    } catch (err) { alert('Assignment failed'); } finally { setLoading(false); }
  };

  const handleStatusChange = async (status: string) => {
    try {
      setLoading(true);
      const updated = await apiService.updateLead({ _id: lead._id, status });
      onUpdate(updated);
    } catch (err) { alert('Status update failed'); } finally { setLoading(false); }
  };

  const handleReminderChange = async (date: string) => {
    try {
      setLoading(true);
      const updated = await apiService.updateLead({ _id: lead._id, reminder: date || null });
      onUpdate(updated);
    } catch (err) { alert('Reminder update failed'); } finally { setLoading(false); }
  };

  const handleAddRemark = async () => {
    if (!newRemark.trim()) return;
    try {
      setLoading(true);
      const updated = await apiService.addRemark(lead._id, newRemark);
      onUpdate(updated);
      setNewRemark('');
    } catch (err) { alert('Failed to add remark'); } finally { setLoading(false); }
  };

  const handleSendToMeta = async () => {
    try {
      setLoading(true);
      const result = await apiService.sendLeadToMeta(lead._id);
      if (result.lead) onUpdate(result.lead);
      alert(result.message || (result.success ? 'Sent to Meta.' : 'Failed to send to Meta.'));
    } catch (err) { alert('Failed to send to Meta'); } finally { setLoading(false); }
  };

  const handleDeleteRemark = async (remarkId: string) => {
    try {
      setLoading(true);
      const updated = await apiService.deleteRemark(lead._id, remarkId);
      onUpdate(updated);
    } catch (err) { alert('Failed to delete remark'); } finally { setLoading(false); }
  };

  const formatDate = (date: any) => {
    const d = parseMongoDate(date);
    if (!d) return 'N/A';
    return new Date(d).toLocaleString();
  };

  const toDateObject = (date: any): Date | null => {
    const parsed = parseMongoDate(date);
    if (!parsed) return null;
    const obj = new Date(parsed);
    return Number.isNaN(obj.getTime()) ? null : obj;
  };

  const formatChatDayLabel = (date: Date) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((todayStart.getTime() - messageDayStart.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatChatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const chatTimeline = (() => {
    const sorted = [...(lead.conversations || [])].sort((a, b) => {
      const aTime = toDateObject(a.timestamp)?.getTime() || 0;
      const bTime = toDateObject(b.timestamp)?.getTime() || 0;
      return aTime - bTime;
    });

    const grouped: { dayKey: string; dayLabel: string; items: typeof sorted }[] = [];
    sorted.forEach((conversation) => {
      const conversationDate = toDateObject(conversation.timestamp);
      const dayKey = conversationDate
        ? `${conversationDate.getFullYear()}-${conversationDate.getMonth()}-${conversationDate.getDate()}`
        : 'unknown';
      const dayLabel = conversationDate ? formatChatDayLabel(conversationDate) : 'Unknown Date';

      const existingGroup = grouped.find(group => group.dayKey === dayKey);
      if (existingGroup) {
        existingGroup.items.push(conversation);
      } else {
        grouped.push({ dayKey, dayLabel, items: [conversation] });
      }
    });

    return grouped;
  })();

  const handleGenerateAnalysis = async () => {
    try {
      setLoading(true);
      const result = await apiService.analyzeLead(lead._id);
      if (result.success && result.analysis) {
        onUpdate({ ...lead, aiAnalysis: result.analysis });
      }
    } catch (err) {
      alert('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const renderAnalysisContent = () => {
    if (!lead.aiAnalysis || (!lead.aiAnalysis.solutionA && !lead.aiAnalysis.solutionB)) {
      return (
        <div className="text-center py-12 px-6">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <Icons.Settings className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Dual-Strategy Insight</h3>
          <p className="text-sm text-slate-500 mb-6">Analyze this lead to generate a <b>Soft Re-Engagement</b> strategy and a <b>Career Push</b> strategy.</p>
          <button
            onClick={handleGenerateAnalysis}
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing Profiles...' : 'Generate AI Strategies'}
          </button>
        </div>
      );
    }

    const current = activeStrategy === 'A' ? lead.aiAnalysis.solutionA : lead.aiAnalysis.solutionB;

    if (!current) return null;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Strategy Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveStrategy('A')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStrategy === 'A' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            Solution A: Soft
          </button>
          <button 
            onClick={() => setActiveStrategy('B')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStrategy === 'B' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            Solution B: Push
          </button>
        </div>

        <div className="space-y-5">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-white to-indigo-50/30 p-4 rounded-2xl border border-indigo-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-tighter">{current.title}</h4>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${parseInt(current.probability) > 60 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {current.probability || 'N/A'} PROBABILITY
              </span>
            </div>
            <p className="text-xs text-indigo-800 font-medium leading-relaxed italic">
              " {current.why || 'No details provided'} "
            </p>
          </div>

          {/* Detailed Points */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1 h-1 bg-indigo-400 rounded-full"></div> 1. Behaviour & Psychology
              </label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
                {current.psychology || 'No details provided'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1 h-1 bg-indigo-400 rounded-full"></div> 2. Market Trend Injection
              </label>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-800 font-medium">
                {current.marketTrend || 'No details provided'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1 h-1 bg-indigo-400 rounded-full"></div> 3. ROI & Business Value Framing
              </label>
              <div className="p-3 bg-green-50/50 rounded-xl border border-green-100 text-xs text-green-800 font-medium">
                {current.roi || 'No details provided'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                <Icons.Chat className="w-3 h-3" /> 4. WhatsApp Template
              </label>
              <div className="relative group">
                <div className="p-4 bg-white rounded-xl border-2 border-indigo-100 text-xs text-slate-800 font-semibold italic whitespace-pre-line leading-relaxed">
                  {current.whatsapp || 'No details provided'}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(current.whatsapp);
                    alert('Template copied to clipboard!');
                  }}
                  className="absolute bottom-2 right-2 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100 shadow-sm border border-indigo-200"
                >
                  <Icons.Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
              <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 block">5. Recommended Next Action</label>
              <p className="text-sm text-white font-bold flex items-center gap-2">
                <Icons.Check className="w-4 h-4 bg-white/20 rounded p-0.5" />
                {current.nextAction || 'No details provided'}
              </p>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button 
              onClick={handleGenerateAnalysis}
              className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-tighter"
            >
              Regenerate Strategies
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border rounded-2xl shadow-lg overflow-hidden text-left animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b bg-slate-50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg uppercase">
            {lead.userName.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-slate-800 truncate max-w-[120px]">{lead.userName}</h2>
            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-2">
              <span>{lead.userNumber}</span>
              <span
                role="button"
                title="Open in WhatsApp"
                onClick={(e) => { e.stopPropagation(); const num = (lead.userNumber || '').replace(/\D/g, ''); if (num) window.open(`https://wa.me/${num}`, '_blank', 'noopener'); }}
                className="text-green-500 hover:text-green-600 cursor-pointer"
              >
                <Icons.WhatsApp className="w-4 h-4" />
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(lead)} className="p-2 hover:bg-white rounded-lg text-slate-600 transition-colors" title="Edit"><Icons.Edit className="w-4 h-4" /></button>
          {isAdmin && <button onClick={() => onDelete(lead._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Delete"><Icons.Trash className="w-4 h-4" /></button>}
          <button onClick={onClose} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-colors" title="Close"><Icons.X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex border-b bg-slate-50/50">
        {[
          { id: 'info', label: 'Info' },
          { id: 'chat', label: 'History' },
          { id: 'remarks', label: 'Remarks' },
          { id: 'campaigns', label: 'Campaigns' },
          { id: 'analysis', label: 'AI Strategy' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === t.id ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'info' && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Staff</label>
              <select
                disabled={!isAdmin}
                value={lead.assignedto || ''}
                onChange={e => handleAssign(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-700 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                <select
                  disabled
                  title="Lead Status is set automatically by AI and cannot be changed manually"
                  value={lead.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-700 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Duration</label>
                <div className="p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border">{lead.programType || 'N/A'}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Follow-up Reminder</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={lead.reminder ? new Date(parseMongoDate(lead.reminder)).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleReminderChange(e.target.value)}
                  className="w-full p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Icons.Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Workspace Interest</p>
                <p className="text-sm font-bold text-slate-800">{lead.course || 'General Enquiry'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source</p>
                <p className="text-sm font-semibold text-slate-600">{lead.leadfrom || 'Manual'}</p>
              </div>
            </div>

            {(lead.leadgenId || (lead.metaCapiEvents && lead.metaCapiEvents.length > 0)) && (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Meta Ads Conversion</p>
                  {lead.leadgenId && <span className="text-[9px] font-bold text-blue-400">Lead ID: {lead.leadgenId}</span>}
                </div>

                {lead.metaCapiEvents && lead.metaCapiEvents.length > 0 ? (
                  <div className="space-y-1.5">
                    {[...lead.metaCapiEvents].reverse().slice(0, 3).map((ev, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${ev.success ? 'text-green-600' : 'text-red-500'}`}>
                          {ev.success ? '✓' : '✗'} {ev.eventName} sent to Meta
                        </span>
                        <span className="text-[9px] text-slate-400">{formatDate(ev.sentAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Not sent to Meta yet.</p>
                )}

                {(isQualifiedStage(lead.pipeline) || isConvertedStage(lead.pipeline)) && (
                  <button
                    onClick={handleSendToMeta}
                    disabled={loading || !lead.leadgenId}
                    title={!lead.leadgenId ? 'This lead has no Meta lead ID' : undefined}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Icons.Send className="w-3.5 h-3.5" />
                    {isConvertedStage(lead.pipeline) ? 'Send Converted Lead to Meta' : 'Send Qualified Lead to Meta'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-4">
            {lead.conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic text-xs">
                <Icons.Chat className="w-10 h-10 mb-2 opacity-10" />
                <p>No conversation history found</p>
              </div>
            ) : (
              chatTimeline.map((group) => (
                <div key={group.dayKey} className="space-y-3">
                  <div className="flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100 uppercase tracking-wide">
                      {group.dayLabel}
                    </span>
                  </div>
                  {group.items.map((c, i) => {
                    const msgDate = toDateObject(c.timestamp);
                    const timeLabel = formatChatTime(msgDate);
                    return (
                      <div key={`${group.dayKey}-${i}`} className="space-y-2">
                        <div className="flex flex-col items-end">
                          <div className="bg-blue-600 text-white p-2.5 rounded-2xl rounded-tr-none text-xs max-w-[90%] shadow-sm leading-relaxed">
                            {c.userMsg}
                            {timeLabel && (
                              <div className="text-[9px] text-blue-100 mt-1 text-right">
                                {timeLabel}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-start">
                          <div className="bg-slate-100 text-slate-700 p-2.5 rounded-2xl rounded-tl-none text-xs max-w-[90%] border border-slate-200 shadow-sm leading-relaxed">
                            {(c.botReply || '').split('\n').map((l, j) => <p key={j} className="mb-1 last:mb-0">{l}</p>)}
                            {timeLabel && (
                              <div className="text-[9px] text-slate-400 mt-1 text-right">
                                {timeLabel}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'remarks' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New remark..."
                value={newRemark}
                onChange={e => setNewRemark(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddRemark}
                disabled={!newRemark.trim() || loading}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Icons.Plus className="w-5 h-5" />
              </button>
            </div>

            {(summarizing || lead.aiConversationSummary?.text) && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icons.Bot className="w-4 h-4 text-indigo-600" />
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI Conversation Summary</p>
                </div>
                {summarizing && !lead.aiConversationSummary?.text ? (
                  <p className="text-xs text-indigo-500 italic animate-pulse">Summarizing WhatsApp conversation…</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{lead.aiConversationSummary?.text}</p>
                    {lead.aiConversationSummary?.generatedAt && (
                      <p className="text-[9px] text-slate-400 mt-1.5 font-bold">
                        Generated {formatDate(lead.aiConversationSummary.generatedAt)}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              {lead.remarks.length === 0 ? (
                <p className="text-center text-slate-400 text-xs italic py-10">No remarks yet</p>
              ) : (
                [...lead.remarks].reverse().map(r => (
                  <div key={r._id} className="group p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between gap-3 items-start transition-all hover:border-blue-200">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-700 leading-normal">{r.remark}</p>
                      <p className="text-[9px] text-slate-400 mt-1 font-bold">{formatDate(r.timestamp)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteRemark(r._id)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Icons.Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-3">
            {(lead.campaignHistory || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic text-xs">
                <Icons.Chat className="w-10 h-10 mb-2 opacity-10" />
                <p>No campaign messages sent yet</p>
              </div>
            ) : (
              [...(lead.campaignHistory || [])].reverse().map((c, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-800 truncate">{c.campaignName}</p>
                    {c.repliedAt ? (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-green-100 text-green-700">Replied</span>
                    ) : (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-200 text-slate-500">No reply yet</span>
                    )}
                  </div>
                  {c.message && <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{c.message}</p>}
                  <p className="text-[9px] text-slate-400 mt-1.5 font-bold">
                    Sent {formatDate(c.sentAt)}{c.repliedAt ? ` · Replied ${formatDate(c.repliedAt)}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'analysis' && renderAnalysisContent()}
      </div>

      <div className="p-4 border-t bg-slate-50 shrink-0">
        <button onClick={onClose} className="w-full py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-300 transition-all active:scale-[0.98]">
          Close Details
        </button>
      </div>
    </div>
  );
};

export default LeadDetails;
