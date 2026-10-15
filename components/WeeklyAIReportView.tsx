import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Icons } from './Icons';
import { User } from '../types';
import { downloadWeeklyReportPdf, downloadMonthlyReportPdf } from '../utils/aiReportPdf';

export interface WeeklyReportMetrics {
  newLeads: number;
  enrolledThisWeek: number;
  noContactCount: number;
  notContactedPct: number;
  avgResponseMins: number | null;
  avgOffHoursResponseMins: number | null;
  offHoursLeadsCount: number;
  offHoursContactedCount: number;
  slowResponses: number;
  slowBuckets: Record<string, number>;
  thisWeekFees: { totalBilled: number; totalPaid: number };
  prevWeekFees: { totalBilled: number; totalPaid: number };
  billedPct: number | null;
  paidPct: number | null;
  upcomingPayments: { totalAmount: number; count: number };
}

export interface MonthlyReportMetrics {
  newLeads: number;
  enrolledThisMonth: number;
  noContactCount: number;
  notContactedPct: number;
  avgResponseMins: number | null;
  avgOffHoursResponseMins: number | null;
  offHoursLeadsCount: number;
  offHoursContactedCount: number;
  slowResponses: number;
  slowBuckets: Record<string, number>;
  thisMonthFees: { totalBilled: number; totalPaid: number };
  prevMonthFees: { totalBilled: number; totalPaid: number };
  billedPct: number | null;
  paidPct: number | null;
}

export interface HotLead {
  userName: string;
  course: string;
  status: string;
  lastRemark: string;
}

export interface RespondedLead {
  userName: string;
  course: string;
  status: string;
}

export interface UpcomingInstallment {
  userName: string;
  course: string;
  amount: number;
  dueDate: string;
}

export interface WeeklyReport {
  _id: string;
  counsellor: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  metrics: WeeklyReportMetrics;
  aiSummary: string;
  likelyToConfirm: string;
  hotNotEnrolled: HotLead[];
  respondedAfterFollowUp: RespondedLead[];
  upcomingInstallments: UpcomingInstallment[];
}

export interface MonthlyReport {
  _id: string;
  counsellor: string;
  monthStart: string;
  monthEnd: string;
  generatedAt: string;
  metrics: MonthlyReportMetrics;
  aiSummary: string;
  likelyToConfirm: string;
  hotNotEnrolled: HotLead[];
  respondedAfterFollowUp: RespondedLead[];
}

interface MinminiSummary {
  weekStart?: string;
  weekEnd?: string;
  monthStart?: string;
  monthEnd?: string;
  activeLeads: number;
  enrolledAfterWA: number;
  totalMessages: number;
  avgMessagesPerLead: number;
  avgDurationMins: number;
  peakHour: number | null;
  peakHours: Record<string, number>;
  topCourses: { course: string; count: number }[];
  followUpsSent: number;
  followUpResponded: number;
  followUpResponsePct: number;
  aiSummary: string;
}

interface Props {
  currentUser: User | null;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const currency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function MetricCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  const styles: Record<string, string> = {
    blue:   'text-blue-700   bg-blue-50   border-blue-200',
    green:  'text-green-700  bg-green-50  border-green-200',
    red:    'text-red-700    bg-red-50    border-red-200',
    amber:  'text-amber-700  bg-amber-50  border-amber-200',
    purple: 'text-purple-700 bg-purple-50 border-purple-200',
    teal:   'text-teal-700   bg-teal-50   border-teal-200',
    indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${styles[accent] ?? styles.blue}`}>
      <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1 leading-none">{label}</p>
      <p className="text-base font-black leading-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function TrendBadge({ pct, prev, vsLabel = 'vs last week' }: { pct: number | null; prev: number; vsLabel?: string }) {
  if (pct === null && prev === 0) return <span className="text-xs text-slate-400">No data</span>;
  if (pct === null) return <span className="text-xs text-slate-400">—</span>;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-bold ${up ? 'text-green-600' : 'text-red-600'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct)}% {vsLabel}
    </span>
  );
}

function MinminiSummarySection({
  minmini,
  loading,
  error,
  onLoad,
  reports,
}: {
  minmini: MinminiSummary | null;
  loading: boolean;
  error: string | null;
  onLoad: (weekStart?: string, weekEnd?: string, refresh?: boolean) => void;
  reports: WeeklyReport[];
}) {
  const latestReport = reports[0] ?? null;

  const handleGenerate = () => {
    if (latestReport) {
      onLoad(latestReport.weekStart, latestReport.weekEnd, true);
    } else {
      onLoad(undefined, undefined, true);
    }
  };

  const weekLabel = latestReport
    ? `${fmt(latestReport.weekStart)} – ${fmt(latestReport.weekEnd)}`
    : 'Last 7 days';

  const maxCourseCount = minmini?.topCourses?.[0]?.count ?? 1;

  const topPeakHours = minmini
    ? Object.entries(minmini.peakHours)
        .map(([h, c]) => ({ hour: Number(h), count: c }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    : [];
  const maxPeakCount = topPeakHours[0]?.count ?? 1;

  const formatHour = (h: number) => {
    const suffix = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}${suffix}`;
  };

  const conversionPct = minmini && minmini.activeLeads > 0
    ? Math.round((minmini.enrolledAfterWA / minmini.activeLeads) * 100)
    : 0;

  return (
    <div className="bg-white border border-green-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-100 border border-green-200 flex-shrink-0">
            <Icons.WhatsApp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-green-900">Minmini Summary</h3>
            <p className="text-[11px] text-green-700 opacity-70">WhatsApp AI Engagement · New Leads This Week · {weekLabel}</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {loading
            ? <Icons.RefreshCcw className="w-3.5 h-3.5 animate-spin" />
            : <Icons.Bot className="w-3.5 h-3.5" />}
          {loading ? 'Analysing…' : minmini ? 'Refresh' : 'Generate'}
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {!minmini && !loading && !error && (
          <div className="text-center py-10 text-slate-400">
            <Icons.Chat className="w-10 h-10 mx-auto mb-3 opacity-25" />
            <p className="text-sm font-semibold text-slate-500">Click Generate to analyse this week's WhatsApp activity</p>
            <p className="text-xs mt-1 opacity-70">Analyses new leads, conversations, peak hours, course enquiries & follow-up suggestions</p>
          </div>
        )}

        {loading && !minmini && (
          <div className="space-y-3 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-40 bg-slate-100 rounded-xl" />
              <div className="h-40 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-32 bg-slate-100 rounded-xl" />
            <div className="h-28 bg-slate-100 rounded-xl" />
          </div>
        )}

        {error && !loading && (
          <p className="text-center text-sm text-red-500 py-6">{error}</p>
        )}

        {minmini && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { label: 'New WA Leads', value: minmini.activeLeads, color: 'text-green-700 bg-green-50 border-green-200' },
                { label: 'Enrolled After WA', value: minmini.enrolledAfterWA, sub: `${conversionPct}% conv.`, color: minmini.enrolledAfterWA > 0 ? 'text-teal-700 bg-teal-50 border-teal-200' : 'text-slate-600 bg-slate-50 border-slate-200' },
                { label: 'Total Exchanges', value: minmini.totalMessages, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { label: 'Avg per Lead', value: minmini.avgMessagesPerLead, color: 'text-purple-700 bg-purple-50 border-purple-200' },
                { label: 'Avg Duration', value: minmini.avgDurationMins > 0 ? `${minmini.avgDurationMins}m` : '< 1m', color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { label: 'Peak Hour', value: minmini.peakHour !== null ? formatHour(minmini.peakHour) : 'N/A', sub: 'excl. 8 AM', color: 'text-orange-700 bg-orange-50 border-orange-200' },
              ].map(({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) => (
                <div key={label} className={`rounded-xl border p-3 ${color}`}>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1 leading-none">{label}</p>
                  <p className="text-base font-black leading-tight">{value}</p>
                  {sub && <p className="text-[10px] opacity-50 mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icons.Send className="w-4 h-4 text-indigo-600" />
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Follow-up Performance This Week</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg border border-indigo-100 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-1">Sent</p>
                  <p className="text-2xl font-black text-indigo-800">{minmini.followUpsSent}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">leads</p>
                </div>
                <div className="bg-white rounded-lg border border-indigo-100 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-teal-500 mb-1">Responded</p>
                  <p className="text-2xl font-black text-teal-700">{minmini.followUpResponded}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">leads</p>
                </div>
                <div className={`bg-white rounded-lg border p-3 text-center ${
                  minmini.followUpResponsePct >= 30
                    ? 'border-green-200'
                    : minmini.followUpResponsePct >= 10
                    ? 'border-amber-200'
                    : 'border-red-200'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Response Rate</p>
                  <p className={`text-2xl font-black ${
                    minmini.followUpResponsePct >= 30
                      ? 'text-green-700'
                      : minmini.followUpResponsePct >= 10
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}>
                    {minmini.followUpsSent > 0 ? `${minmini.followUpResponsePct}%` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {minmini.followUpsSent === 0 ? 'no follow-ups' : minmini.followUpResponsePct >= 30 ? 'good' : minmini.followUpResponsePct >= 10 ? 'moderate' : 'low'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-green-700 mb-3">Course Enquiries This Week</p>
                {minmini.topCourses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No course data</p>
                ) : (
                  <div className="space-y-2">
                    {minmini.topCourses.map(({ course, count }, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-700 font-semibold truncate max-w-[70%]">{course}</span>
                          <span className="text-[11px] font-black text-green-700">{count}</span>
                        </div>
                        <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${Math.round((count / maxCourseCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Peak Activity Hours</p>
                  <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">8 AM excluded</span>
                </div>
                {topPeakHours.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hourly data</p>
                ) : (
                  <div className="space-y-2">
                    {topPeakHours.map(({ hour, count }) => (
                      <div key={hour}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-700 font-semibold">
                            {formatHour(hour)} – {formatHour(hour + 1)}
                          </span>
                          <span className="text-[11px] font-black text-blue-700">{count} msgs</span>
                        </div>
                        <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.round((count / maxPeakCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {minmini.aiSummary && minmini.aiSummary !== 'AI analysis unavailable.' && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icons.Bot className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-bold text-purple-800">WhatsApp Engagement Analysis</p>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{minmini.aiSummary}</p>
              </div>
            )}

            {minmini.activeLeads === 0 && (
              <p className="text-center text-sm text-slate-400 py-4">No new leads with WhatsApp conversations found for this week.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MonthlyMinminiSection({
  minmini,
  loading,
  error,
  onLoad,
  latestMonthStart,
  latestMonthEnd,
}: {
  minmini: MinminiSummary | null;
  loading: boolean;
  error: string | null;
  onLoad: (monthStart?: string, monthEnd?: string, refresh?: boolean) => void;
  latestMonthStart?: string;
  latestMonthEnd?: string;
}) {
  const handleGenerate = () => {
    onLoad(latestMonthStart, latestMonthEnd, true);
  };

  const monthLabel = latestMonthStart && latestMonthEnd
    ? `${fmt(latestMonthStart)} – ${fmt(latestMonthEnd)}`
    : 'Last Month';

  const maxCourseCount = minmini?.topCourses?.[0]?.count ?? 1;

  const topPeakHours = minmini
    ? Object.entries(minmini.peakHours)
        .map(([h, c]) => ({ hour: Number(h), count: c }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    : [];
  const maxPeakCount = topPeakHours[0]?.count ?? 1;

  const formatHour = (h: number) => {
    const suffix = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}${suffix}`;
  };

  const conversionPct = minmini && minmini.activeLeads > 0
    ? Math.round((minmini.enrolledAfterWA / minmini.activeLeads) * 100)
    : 0;

  return (
    <div className="bg-white border border-green-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-100 border border-green-200 flex-shrink-0">
            <Icons.WhatsApp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-green-900">Monthly Minmini Summary</h3>
            <p className="text-[11px] text-green-700 opacity-70">WhatsApp AI Engagement · New Leads This Month · {monthLabel}</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {loading
            ? <Icons.RefreshCcw className="w-3.5 h-3.5 animate-spin" />
            : <Icons.Bot className="w-3.5 h-3.5" />}
          {loading ? 'Analysing…' : minmini ? 'Refresh' : 'Generate'}
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {!minmini && !loading && !error && (
          <div className="text-center py-10 text-slate-400">
            <Icons.Chat className="w-10 h-10 mx-auto mb-3 opacity-25" />
            <p className="text-sm font-semibold text-slate-500">Click Generate to analyse this month's WhatsApp activity</p>
            <p className="text-xs mt-1 opacity-70">Analyses new leads, conversations, peak hours, course enquiries & follow-up suggestions</p>
          </div>
        )}

        {loading && !minmini && (
          <div className="space-y-3 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-40 bg-slate-100 rounded-xl" />
              <div className="h-40 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-32 bg-slate-100 rounded-xl" />
            <div className="h-28 bg-slate-100 rounded-xl" />
          </div>
        )}

        {error && !loading && (
          <p className="text-center text-sm text-red-500 py-6">{error}</p>
        )}

        {minmini && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { label: 'New WA Leads', value: minmini.activeLeads, color: 'text-green-700 bg-green-50 border-green-200' },
                { label: 'Enrolled After WA', value: minmini.enrolledAfterWA, sub: `${conversionPct}% conv.`, color: minmini.enrolledAfterWA > 0 ? 'text-teal-700 bg-teal-50 border-teal-200' : 'text-slate-600 bg-slate-50 border-slate-200' },
                { label: 'Total Exchanges', value: minmini.totalMessages, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { label: 'Avg per Lead', value: minmini.avgMessagesPerLead, color: 'text-purple-700 bg-purple-50 border-purple-200' },
                { label: 'Avg Duration', value: minmini.avgDurationMins > 0 ? `${minmini.avgDurationMins}m` : '< 1m', color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { label: 'Peak Hour', value: minmini.peakHour !== null ? formatHour(minmini.peakHour) : 'N/A', sub: 'excl. 8 AM', color: 'text-orange-700 bg-orange-50 border-orange-200' },
              ].map(({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) => (
                <div key={label} className={`rounded-xl border p-3 ${color}`}>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1 leading-none">{label}</p>
                  <p className="text-base font-black leading-tight">{value}</p>
                  {sub && <p className="text-[10px] opacity-50 mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icons.Send className="w-4 h-4 text-indigo-600" />
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Follow-up Performance This Month</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg border border-indigo-100 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-1">Sent</p>
                  <p className="text-2xl font-black text-indigo-800">{minmini.followUpsSent}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">leads</p>
                </div>
                <div className="bg-white rounded-lg border border-indigo-100 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-teal-500 mb-1">Responded</p>
                  <p className="text-2xl font-black text-teal-700">{minmini.followUpResponded}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">leads</p>
                </div>
                <div className={`bg-white rounded-lg border p-3 text-center ${
                  minmini.followUpResponsePct >= 30
                    ? 'border-green-200'
                    : minmini.followUpResponsePct >= 10
                    ? 'border-amber-200'
                    : 'border-red-200'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Response Rate</p>
                  <p className={`text-2xl font-black ${
                    minmini.followUpResponsePct >= 30
                      ? 'text-green-700'
                      : minmini.followUpResponsePct >= 10
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}>
                    {minmini.followUpsSent > 0 ? `${minmini.followUpResponsePct}%` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {minmini.followUpsSent === 0 ? 'no follow-ups' : minmini.followUpResponsePct >= 30 ? 'good' : minmini.followUpResponsePct >= 10 ? 'moderate' : 'low'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-green-700 mb-3">Course Enquiries This Month</p>
                {minmini.topCourses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No course data</p>
                ) : (
                  <div className="space-y-2">
                    {minmini.topCourses.map(({ course, count }, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-700 font-semibold truncate max-w-[70%]">{course}</span>
                          <span className="text-[11px] font-black text-green-700">{count}</span>
                        </div>
                        <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${Math.round((count / maxCourseCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Peak Activity Hours</p>
                  <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">8 AM excluded</span>
                </div>
                {topPeakHours.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hourly data</p>
                ) : (
                  <div className="space-y-2">
                    {topPeakHours.map(({ hour, count }) => (
                      <div key={hour}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-700 font-semibold">
                            {formatHour(hour)} – {formatHour(hour + 1)}
                          </span>
                          <span className="text-[11px] font-black text-blue-700">{count} msgs</span>
                        </div>
                        <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.round((count / maxPeakCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {minmini.aiSummary && minmini.aiSummary !== 'AI analysis unavailable.' && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icons.Bot className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-bold text-purple-800">WhatsApp Engagement Analysis</p>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{minmini.aiSummary}</p>
              </div>
            )}

            {minmini.activeLeads === 0 && (
              <p className="text-center text-sm text-slate-400 py-4">No new leads with WhatsApp conversations found for this month.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const MINMINI_CACHE_KEY = 'crm_minmini_summary';
const MONTHLY_MINMINI_CACHE_KEY = 'crm_monthly_minmini_summary';
const WEEKLY_REPORTS_PAGE_SIZE = 5;

export default function WeeklyAIReportView({ currentUser }: Props) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');

  // ── Weekly state ──────────────────────────────────────────────────────────
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCounsellor, setSelectedCounsellor] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [minmini, setMinmini] = useState<MinminiSummary | null>(null);
  const [minminiLoading, setMinminiLoading] = useState(true);
  const [minminiError, setMinminiError] = useState<string | null>(null);
  const [weeklyView, setWeeklyView] = useState<'reports' | 'summary'>('reports');
  const [showAllWeekly, setShowAllWeekly] = useState(false);
  const [weeklyPage, setWeeklyPage] = useState(1);

  // ── Monthly state ─────────────────────────────────────────────────────────
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const [monthlySelectedCounsellor, setMonthlySelectedCounsellor] = useState<string>('all');
  const [monthlyExpandedId, setMonthlyExpandedId] = useState<string | null>(null);
  const [monthlyMinmini, setMonthlyMinmini] = useState<MinminiSummary | null>(null);
  const [monthlyMinminiLoading, setMonthlyMinminiLoading] = useState(false);
  const [monthlyMinminiError, setMonthlyMinminiError] = useState<string | null>(null);
  const [monthlyDataLoaded, setMonthlyDataLoaded] = useState(false);
  const [monthlyView, setMonthlyView] = useState<'reports' | 'summary'>('reports');
  const [showAllMonthly, setShowAllMonthly] = useState(false);
  const [monthlyPage, setMonthlyPage] = useState(1);

  const isAdmin = currentUser?.role === 'admin';

  // Load weekly reports on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiService.fetchWeeklyAIReports();
        setReports(res.reports || []);
        if (res.reports?.length) setExpandedId(res.reports[0]._id);
      } catch {
        setError('Failed to load weekly AI reports. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadMinmini = async (weekStart?: string, weekEnd?: string, refresh?: boolean) => {
    try {
      setMinminiLoading(true);
      setMinminiError(null);
      const res = await apiService.fetchMinminiSummary(weekStart, weekEnd, refresh);
      setMinmini(res);
      try { localStorage.setItem(MINMINI_CACHE_KEY, JSON.stringify(res)); } catch {}
    } catch {
      setMinminiError('Failed to load WhatsApp summary.');
    } finally {
      setMinminiLoading(false);
    }
  };

  // Auto-load weekly Minmini on mount (cache then background refresh)
  useEffect(() => {
    const cached = localStorage.getItem(MINMINI_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.followUpsSent != null) setMinmini(parsed);
      } catch {}
    }
    loadMinmini();
  }, []);

  // Load monthly data lazily when Monthly tab is first opened
  const loadMonthlyData = async () => {
    if (monthlyDataLoaded) return;
    setMonthlyDataLoaded(true);

    try {
      setMonthlyLoading(true);
      const res = await apiService.fetchMonthlyAIReports();
      setMonthlyReports(res.reports || []);
      if (res.reports?.length) setMonthlyExpandedId(res.reports[0]._id);
    } catch {
      setMonthlyError('Failed to load monthly AI reports. Please try again.');
    } finally {
      setMonthlyLoading(false);
    }

    const cached = localStorage.getItem(MONTHLY_MINMINI_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.followUpsSent != null) setMonthlyMinmini(parsed);
      } catch {}
    }
    loadMonthlyMinmini();
  };

  const loadMonthlyMinmini = async (monthStart?: string, monthEnd?: string, refresh?: boolean) => {
    try {
      setMonthlyMinminiLoading(true);
      setMonthlyMinminiError(null);
      const res = await apiService.fetchMonthlyMinminiSummary(monthStart, monthEnd, refresh);
      setMonthlyMinmini(res);
      try { localStorage.setItem(MONTHLY_MINMINI_CACHE_KEY, JSON.stringify(res)); } catch {}
    } catch {
      setMonthlyMinminiError('Failed to load monthly WhatsApp summary.');
    } finally {
      setMonthlyMinminiLoading(false);
    }
  };

  const handleTabChange = (tab: 'weekly' | 'monthly') => {
    setActiveTab(tab);
    if (tab === 'monthly') loadMonthlyData();
  };

  // Reset weekly pagination whenever the counsellor filter changes
  useEffect(() => {
    setShowAllWeekly(false);
    setWeeklyPage(1);
  }, [selectedCounsellor]);

  // Reset monthly pagination whenever the counsellor filter changes
  useEffect(() => {
    setShowAllMonthly(false);
    setMonthlyPage(1);
  }, [monthlySelectedCounsellor]);

  // ── Weekly derived values ─────────────────────────────────────────────────
  const counsellors = isAdmin
    ? ['all', ...Array.from(new Set(reports.map(r => r.counsellor))).sort()]
    : [];

  const visible = isAdmin && selectedCounsellor !== 'all'
    ? reports.filter(r => r.counsellor === selectedCounsellor)
    : reports;

  // All reports for the latest week (every counsellor) are shown by default;
  // older weeks are paginated behind "View older reports". `reports` arrives
  // sorted newest-week-first, so visible[0].weekStart is the latest week.
  const latestWeekStart = visible[0]?.weekStart ?? null;
  const latestWeekReports = latestWeekStart ? visible.filter(r => r.weekStart === latestWeekStart) : [];
  const olderWeeklyReports = latestWeekStart ? visible.filter(r => r.weekStart !== latestWeekStart) : [];
  const weeklyTotalPages = Math.max(1, Math.ceil(olderWeeklyReports.length / WEEKLY_REPORTS_PAGE_SIZE));
  const pagedOlderWeeklyReports = olderWeeklyReports.slice(
    (weeklyPage - 1) * WEEKLY_REPORTS_PAGE_SIZE,
    weeklyPage * WEEKLY_REPORTS_PAGE_SIZE
  );
  const displayedWeeklyReports = showAllWeekly
    ? [...latestWeekReports, ...pagedOlderWeeklyReports]
    : latestWeekReports;

  // ── Monthly derived values ────────────────────────────────────────────────
  const monthlyCounsellors = isAdmin
    ? ['all', ...Array.from(new Set(monthlyReports.map(r => r.counsellor))).sort()]
    : [];

  const monthlyVisible = isAdmin && monthlySelectedCounsellor !== 'all'
    ? monthlyReports.filter(r => r.counsellor === monthlySelectedCounsellor)
    : monthlyReports;

  // All reports for the latest month (every counsellor) are shown by default;
  // older months are paginated behind "View older reports".
  const latestMonthStartKey = monthlyVisible[0]?.monthStart ?? null;
  const latestMonthReports = latestMonthStartKey ? monthlyVisible.filter(r => r.monthStart === latestMonthStartKey) : [];
  const olderMonthlyReports = latestMonthStartKey ? monthlyVisible.filter(r => r.monthStart !== latestMonthStartKey) : [];
  const monthlyTotalPages = Math.max(1, Math.ceil(olderMonthlyReports.length / WEEKLY_REPORTS_PAGE_SIZE));
  const pagedOlderMonthlyReports = olderMonthlyReports.slice(
    (monthlyPage - 1) * WEEKLY_REPORTS_PAGE_SIZE,
    monthlyPage * WEEKLY_REPORTS_PAGE_SIZE
  );
  const displayedMonthlyReports = showAllMonthly
    ? [...latestMonthReports, ...pagedOlderMonthlyReports]
    : latestMonthReports;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Icons.RefreshCcw className="w-7 h-7 animate-spin" />
        <p className="text-sm">Loading AI reports…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-red-500">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="p-4 sm:p-6 space-y-4">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-200 flex-shrink-0">
            <Icons.Bot className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">AI Reports</h2>
            <p className="text-xs text-slate-500">AI-generated counsellor performance analysis</p>
          </div>
        </div>

        {/* Weekly / Monthly tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => handleTabChange('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'weekly'
                ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => handleTabChange('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'monthly'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Monthly
          </button>
        </div>

        {/* ── WEEKLY TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'weekly' && (
          <>
            <p className="text-xs text-slate-400 -mt-1">Generated every Monday at 9 AM</p>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && counsellors.length > 1 && counsellors.map(c => (
                <button
                  key={c}
                  onClick={() => { setSelectedCounsellor(c); setWeeklyView('reports'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    weeklyView === 'reports' && selectedCounsellor === c
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
                  }`}
                >
                  {c === 'all' ? 'All Counsellors' : c}
                </button>
              ))}

              <button
                onClick={() => setWeeklyView('summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  weeklyView === 'summary'
                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                    : 'bg-white text-green-700 border-green-200 hover:border-green-400 hover:bg-green-50'
                }`}
              >
                <Icons.WhatsApp className="w-3.5 h-3.5" />
                WA Summary
              </button>
            </div>

            {weeklyView === 'summary' && (
              <MinminiSummarySection
                minmini={minmini}
                loading={minminiLoading}
                error={minminiError}
                onLoad={loadMinmini}
                reports={reports}
              />
            )}

            {weeklyView === 'reports' && visible.length === 0 && (
              <div className="text-center py-20 text-slate-400">
                <Icons.Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-base font-semibold text-slate-500">No weekly reports yet</p>
                <p className="text-xs mt-1">Reports are generated every Monday at 9 AM</p>
              </div>
            )}

            {weeklyView === 'reports' && displayedWeeklyReports.map(report => {
              const isOpen = expandedId === report._id;
              const m = report.metrics ?? {} as WeeklyReportMetrics;
              const thisWeekFees = m.thisWeekFees ?? { totalBilled: 0, totalPaid: 0 };
              const prevWeekFees = m.prevWeekFees ?? { totalBilled: 0, totalPaid: 0 };
              const upcomingPayments = m.upcomingPayments ?? { totalAmount: 0, count: 0 };
              const slowBuckets = m.slowBuckets ?? {};
              const hotLeads = report.hotNotEnrolled ?? [];
              const responded = report.respondedAfterFollowUp ?? [];
              const upcomingInstallments = report.upcomingInstallments ?? [];
              const likelyLines = (report.likelyToConfirm || '')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l && l !== 'No active leads to analyse.' && l !== 'No strong conversion signals found.');

              return (
                <div key={report._id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    onClick={() => setExpandedId(isOpen ? null : report._id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isAdmin && (
                        <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-black text-sm uppercase flex-shrink-0">
                          {report.counsellor.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        {isAdmin && (
                          <p className="text-sm font-bold text-slate-800">{report.counsellor}</p>
                        )}
                        <p className="text-xs text-slate-500">
                          {fmt(report.weekStart)} – {fmt(report.weekEnd)}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 ml-2 flex-wrap">
                        <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-semibold">
                          {m.newLeads ?? 0} leads
                        </span>
                        <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200 font-semibold">
                          {m.enrolledThisWeek ?? 0} enrolled
                        </span>
                        {(m.billedPct ?? null) !== null && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                            (m.billedPct ?? 0) >= 0
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            Billed {(m.billedPct ?? 0) >= 0 ? '↑' : '↓'}{Math.abs(m.billedPct ?? 0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadWeeklyReportPdf(report); }}
                        title="Download PDF"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm"
                      >
                        <Icons.Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                      <Icons.ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-4 border-t border-slate-100 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        <MetricCard label="New Leads" value={m.newLeads ?? 0} accent="blue" />
                        <MetricCard label="Enrolled" value={m.enrolledThisWeek ?? 0} accent="green" />
                        <MetricCard
                          label="Not Contacted"
                          value={m.noContactCount ?? 0}
                          sub={`${m.notContactedPct ?? 0}% of leads`}
                          accent={(m.noContactCount ?? 0) > 0 ? 'red' : 'green'}
                        />
                        <MetricCard
                          label="Avg Response"
                          value={(m.avgResponseMins ?? null) !== null ? `${m.avgResponseMins}m` : 'N/A'}
                          sub={(m.avgResponseMins ?? null) !== null && (m.avgResponseMins ?? 0) > 60 ? '⚠ target <60m' : 'office hours'}
                          accent={(m.avgResponseMins ?? null) !== null && (m.avgResponseMins ?? 0) > 60 ? 'amber' : 'teal'}
                        />
                        <MetricCard
                          label="Slow >1hr"
                          value={m.slowResponses ?? 0}
                          accent={(m.slowResponses ?? 0) > 0 ? 'amber' : 'green'}
                        />
                        <MetricCard
                          label="Billed"
                          value={currency(thisWeekFees.totalBilled)}
                          accent="purple"
                        />
                        <MetricCard
                          label="Off-Hours Effort"
                          value={(m.avgOffHoursResponseMins ?? null) !== null ? `${m.avgOffHoursResponseMins}m` : 'N/A'}
                          accent="indigo"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Fees Billed This Week</p>
                          <p className="text-2xl font-black text-slate-800">{currency(thisWeekFees.totalBilled)}</p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <TrendBadge pct={m.billedPct ?? null} prev={prevWeekFees.totalBilled} />
                            {prevWeekFees.totalBilled > 0 && (
                              <span className="text-[11px] text-slate-400">({currency(prevWeekFees.totalBilled)} prev week)</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Fees Collected This Week</p>
                          <p className="text-2xl font-black text-slate-800">{currency(thisWeekFees.totalPaid)}</p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <TrendBadge pct={m.paidPct ?? null} prev={prevWeekFees.totalPaid} />
                            {prevWeekFees.totalPaid > 0 && (
                              <span className="text-[11px] text-slate-400">({currency(prevWeekFees.totalPaid)} prev week)</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Upcoming Payments (Next Week)</p>
                          <p className="text-2xl font-black text-slate-800">{currency(upcomingPayments.totalAmount)}</p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-400">
                              {upcomingPayments.count} installment{upcomingPayments.count !== 1 ? 's' : ''} due
                            </span>
                          </div>
                        </div>
                      </div>

                      {upcomingInstallments.length > 0 && (
                        <div className="bg-teal-50 rounded-xl p-3 border border-teal-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-teal-700 mb-2">
                            📆 Upcoming Installments — Next Week ({upcomingInstallments.length})
                          </p>
                          <div className="space-y-1.5">
                            {upcomingInstallments.map((inst, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-teal-100">
                                <span className="font-semibold text-slate-700">{inst.userName} <span className="text-slate-400 font-normal">({inst.course || 'N/A'})</span></span>
                                <span className="flex items-center gap-2">
                                  <span className="text-slate-400">{new Date(inst.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                  <span className="font-bold text-teal-700">{currency(inst.amount)}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(m.offHoursLeadsCount ?? 0) > 0 && (
                        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700 mb-1">Off-Hours Effort</p>
                          <p className="text-xs text-slate-600">
                            {(m.offHoursContactedCount ?? 0) > 0
                              ? <>Leads that arrived outside office hours were contacted after an avg of{' '}
                                  <span className="font-bold text-indigo-700">{(m.avgOffHoursResponseMins ?? null) !== null ? `${m.avgOffHoursResponseMins}m` : 'N/A'}</span>{' '}
                                  of off-hours time — extra effort beyond scheduled working hours.</>
                              : <>{m.offHoursLeadsCount} lead{(m.offHoursLeadsCount ?? 0) !== 1 ? 's' : ''} arrived outside office hours and {(m.offHoursLeadsCount ?? 0) !== 1 ? 'were' : 'was'} not yet contacted.</>
                            }
                          </p>
                        </div>
                      )}

                      {(m.slowResponses ?? 0) > 0 && Object.values(slowBuckets).some(v => v > 0) && (
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-2">Slow Response Breakdown (office hours)</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(slowBuckets).map(([range, count]) =>
                              count > 0 ? (
                                <span key={range} className="text-xs bg-white text-amber-700 border border-amber-300 px-2.5 py-1 rounded-lg font-semibold">
                                  {range}: {count}
                                </span>
                              ) : null
                            )}
                          </div>
                        </div>
                      )}

                      {report.aiSummary && report.aiSummary !== 'AI analysis unavailable.' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Icons.Bot className="w-4 h-4 text-amber-600" />
                            <p className="text-sm font-bold text-amber-800">AI Performance Summary</p>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{report.aiSummary}</p>
                        </div>
                      )}

                      {likelyLines.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Icons.Crown className="w-4 h-4 text-green-700" />
                            <p className="text-sm font-bold text-green-800">Likely to Confirm</p>
                          </div>
                          <ul className="space-y-1.5">
                            {likelyLines.map((line, i) => (
                              <li key={i} className="flex gap-2 text-sm text-slate-700">
                                <span className="text-green-600 font-bold flex-shrink-0 w-4">{i + 1}.</span>
                                <span>{line.replace(/^\d+[\.\)]\s*/, '')}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {hotLeads.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Icons.Phone className="w-4 h-4 text-red-600" />
                            <p className="text-sm font-bold text-red-800">Pipeline Not Updated</p>
                            <span className="text-xs text-slate-500">Hot/Warm leads not moved to Enrolled ({hotLeads.length})</span>
                          </div>
                          <div className="space-y-2">
                            {hotLeads.map((lead, i) => (
                              <div key={i} className="py-2 border-b border-red-100 last:border-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                                    lead.status === 'Hot'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {lead.status}
                                  </span>
                                  <span className="text-sm font-semibold text-slate-800">{lead.userName}</span>
                                  <span className="text-xs text-slate-500">({lead.course})</span>
                                </div>
                                {lead.lastRemark && (
                                  <p className="text-xs text-slate-500 italic mt-0.5 ml-1">"{lead.lastRemark}"</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {responded.length > 0 && (
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Icons.Chat className="w-4 h-4 text-teal-700" />
                            <p className="text-sm font-bold text-teal-800">Responded After Follow-Up ({responded.length})</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {responded.map((lead, i) => (
                              <span key={i} className="text-xs bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-teal-200">
                                {lead.userName}
                                {lead.course && <span className="text-slate-400 ml-1">· {lead.course}</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 text-right">
                        Generated {new Date(report.generatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {weeklyView === 'reports' && olderWeeklyReports.length > 0 && !showAllWeekly && (
              <button
                onClick={() => setShowAllWeekly(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all"
              >
                <Icons.ChevronDown className="w-3.5 h-3.5" />
                View older reports ({olderWeeklyReports.length})
              </button>
            )}

            {weeklyView === 'reports' && showAllWeekly && olderWeeklyReports.length > 0 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => setShowAllWeekly(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Show only latest
                </button>
                {weeklyTotalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWeeklyPage(p => Math.max(1, p - 1))}
                      disabled={weeklyPage === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber-300 hover:text-amber-700 transition-all"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-400 font-semibold">
                      Page {weeklyPage} of {weeklyTotalPages}
                    </span>
                    <button
                      onClick={() => setWeeklyPage(p => Math.min(weeklyTotalPages, p + 1))}
                      disabled={weeklyPage === weeklyTotalPages}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber-300 hover:text-amber-700 transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── MONTHLY TAB ────────────────────────────────────────────────── */}
        {activeTab === 'monthly' && (
          <>
            <p className="text-xs text-slate-400 -mt-1">Generated on the 1st of every month at 9 AM</p>

            {monthlyLoading && (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-20">
                <Icons.RefreshCcw className="w-7 h-7 animate-spin" />
                <p className="text-sm">Loading monthly reports…</p>
              </div>
            )}

            {monthlyError && !monthlyLoading && (
              <div className="flex flex-col items-center justify-center gap-3 text-red-500 py-10">
                <p className="text-sm">{monthlyError}</p>
              </div>
            )}

            {!monthlyLoading && !monthlyError && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && monthlyCounsellors.length > 1 && monthlyCounsellors.map(c => (
                    <button
                      key={c}
                      onClick={() => { setMonthlySelectedCounsellor(c); setMonthlyView('reports'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        monthlyView === 'reports' && monthlySelectedCounsellor === c
                          ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      {c === 'all' ? 'All Counsellours' : c}
                    </button>
                  ))}

                  <button
                    onClick={() => setMonthlyView('summary')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      monthlyView === 'summary'
                        ? 'bg-green-600 text-white border-green-600 shadow-sm'
                        : 'bg-white text-green-700 border-green-200 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    <Icons.WhatsApp className="w-3.5 h-3.5" />
                    WA Summary
                  </button>
                </div>

                {monthlyView === 'summary' && (
                  <MonthlyMinminiSection
                    minmini={monthlyMinmini}
                    loading={monthlyMinminiLoading}
                    error={monthlyMinminiError}
                    onLoad={loadMonthlyMinmini}
                    latestMonthStart={monthlyReports[0]?.monthStart}
                    latestMonthEnd={monthlyReports[0]?.monthEnd}
                  />
                )}

                {monthlyView === 'reports' && monthlyVisible.length === 0 && (
                  <div className="text-center py-20 text-slate-400">
                    <Icons.Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-base font-semibold text-slate-500">No monthly reports yet</p>
                    <p className="text-xs mt-1">Reports are generated on the 1st of every month at 9 AM</p>
                  </div>
                )}

                {monthlyView === 'reports' && displayedMonthlyReports.map(report => {
                  const isOpen = monthlyExpandedId === report._id;
                  const m = report.metrics ?? {} as MonthlyReportMetrics;
                  const thisMonthFees = m.thisMonthFees ?? { totalBilled: 0, totalPaid: 0 };
                  const prevMonthFees = m.prevMonthFees ?? { totalBilled: 0, totalPaid: 0 };
                  const slowBuckets = m.slowBuckets ?? {};
                  const hotLeads = report.hotNotEnrolled ?? [];
                  const responded = report.respondedAfterFollowUp ?? [];
                  const likelyLines = (report.likelyToConfirm || '')
                    .split('\n')
                    .map(l => l.trim())
                    .filter(l => l && l !== 'No active leads to analyse.' && l !== 'No strong conversion signals found.');

                  return (
                    <div key={report._id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                        onClick={() => setMonthlyExpandedId(isOpen ? null : report._id)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {isAdmin && (
                            <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-sm uppercase flex-shrink-0">
                              {report.counsellor.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            {isAdmin && (
                              <p className="text-sm font-bold text-slate-800">{report.counsellor}</p>
                            )}
                            <p className="text-xs text-slate-500">
                              {fmt(report.monthStart)} – {fmt(report.monthEnd)}
                            </p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 ml-2 flex-wrap">
                            <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-semibold">
                              {m.newLeads ?? 0} leads
                            </span>
                            <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200 font-semibold">
                              {m.enrolledThisMonth ?? 0} enrolled
                            </span>
                            {(m.billedPct ?? null) !== null && (
                              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                                (m.billedPct ?? 0) >= 0
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                Billed {(m.billedPct ?? 0) >= 0 ? '↑' : '↓'}{Math.abs(m.billedPct ?? 0)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadMonthlyReportPdf(report); }}
                            title="Download PDF"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-sm"
                          >
                            <Icons.Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">PDF</span>
                          </button>
                          <Icons.ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-4 border-t border-slate-100 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                            <MetricCard label="New Leads" value={m.newLeads ?? 0} accent="blue" />
                            <MetricCard label="Enrolled" value={m.enrolledThisMonth ?? 0} accent="green" />
                            <MetricCard
                              label="Not Contacted"
                              value={m.noContactCount ?? 0}
                              sub={`${m.notContactedPct ?? 0}% of leads`}
                              accent={(m.noContactCount ?? 0) > 0 ? 'red' : 'green'}
                            />
                            <MetricCard
                              label="Avg Response"
                              value={(m.avgResponseMins ?? null) !== null ? `${m.avgResponseMins}m` : 'N/A'}
                              sub={(m.avgResponseMins ?? null) !== null && (m.avgResponseMins ?? 0) > 60 ? '⚠ target <60m' : 'office hours'}
                              accent={(m.avgResponseMins ?? null) !== null && (m.avgResponseMins ?? 0) > 60 ? 'amber' : 'teal'}
                            />
                            <MetricCard
                              label="Slow >1hr"
                              value={m.slowResponses ?? 0}
                              accent={(m.slowResponses ?? 0) > 0 ? 'amber' : 'green'}
                            />
                            <MetricCard
                              label="Billed"
                              value={currency(thisMonthFees.totalBilled)}
                              accent="purple"
                            />
                            <MetricCard
                              label="Off-Hours Effort"
                              value={(m.avgOffHoursResponseMins ?? null) !== null ? `${m.avgOffHoursResponseMins}m` : 'N/A'}
                              accent="indigo"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Fees Billed This Month</p>
                              <p className="text-2xl font-black text-slate-800">{currency(thisMonthFees.totalBilled)}</p>
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <TrendBadge pct={m.billedPct ?? null} prev={prevMonthFees.totalBilled} vsLabel="vs last month" />
                                {prevMonthFees.totalBilled > 0 && (
                                  <span className="text-[11px] text-slate-400">({currency(prevMonthFees.totalBilled)} prev month)</span>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Fees Collected This Month</p>
                              <p className="text-2xl font-black text-slate-800">{currency(thisMonthFees.totalPaid)}</p>
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <TrendBadge pct={m.paidPct ?? null} prev={prevMonthFees.totalPaid} vsLabel="vs last month" />
                                {prevMonthFees.totalPaid > 0 && (
                                  <span className="text-[11px] text-slate-400">({currency(prevMonthFees.totalPaid)} prev month)</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {(m.offHoursLeadsCount ?? 0) > 0 && (
                            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200">
                              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700 mb-1">Off-Hours Effort</p>
                              <p className="text-xs text-slate-600">
                                {(m.offHoursContactedCount ?? 0) > 0
                                  ? <>Leads that arrived outside office hours were contacted after an avg of{' '}
                                      <span className="font-bold text-indigo-700">{(m.avgOffHoursResponseMins ?? null) !== null ? `${m.avgOffHoursResponseMins}m` : 'N/A'}</span>{' '}
                                      of off-hours time — extra effort beyond scheduled working hours.</>
                                  : <>{m.offHoursLeadsCount} lead{(m.offHoursLeadsCount ?? 0) !== 1 ? 's' : ''} arrived outside office hours and {(m.offHoursLeadsCount ?? 0) !== 1 ? 'were' : 'was'} not yet contacted.</>
                                }
                              </p>
                            </div>
                          )}

                          {(m.slowResponses ?? 0) > 0 && Object.values(slowBuckets).some(v => v > 0) && (
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-2">Slow Response Breakdown (office hours)</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(slowBuckets).map(([range, count]) =>
                                  count > 0 ? (
                                    <span key={range} className="text-xs bg-white text-amber-700 border border-amber-300 px-2.5 py-1 rounded-lg font-semibold">
                                      {range}: {count}
                                    </span>
                                  ) : null
                                )}
                              </div>
                            </div>
                          )}

                          {report.aiSummary && report.aiSummary !== 'AI analysis unavailable.' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Icons.Bot className="w-4 h-4 text-blue-600" />
                                <p className="text-sm font-bold text-blue-800">AI Monthly Performance Summary</p>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{report.aiSummary}</p>
                            </div>
                          )}

                          {likelyLines.length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Icons.Crown className="w-4 h-4 text-green-700" />
                                <p className="text-sm font-bold text-green-800">Likely to Confirm</p>
                              </div>
                              <ul className="space-y-1.5">
                                {likelyLines.map((line, i) => (
                                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                                    <span className="text-green-600 font-bold flex-shrink-0 w-4">{i + 1}.</span>
                                    <span>{line.replace(/^\d+[\.\)]\s*/, '')}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {hotLeads.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <Icons.Phone className="w-4 h-4 text-red-600" />
                                <p className="text-sm font-bold text-red-800">Pipeline Not Updated</p>
                                <span className="text-xs text-slate-500">Hot/Warm leads not moved to Enrolled ({hotLeads.length})</span>
                              </div>
                              <div className="space-y-2">
                                {hotLeads.map((lead, i) => (
                                  <div key={i} className="py-2 border-b border-red-100 last:border-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                                        lead.status === 'Hot'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {lead.status}
                                      </span>
                                      <span className="text-sm font-semibold text-slate-800">{lead.userName}</span>
                                      <span className="text-xs text-slate-500">({lead.course})</span>
                                    </div>
                                    {lead.lastRemark && (
                                      <p className="text-xs text-slate-500 italic mt-0.5 ml-1">"{lead.lastRemark}"</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {responded.length > 0 && (
                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Icons.Chat className="w-4 h-4 text-teal-700" />
                                <p className="text-sm font-bold text-teal-800">Responded After Follow-Up ({responded.length})</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {responded.map((lead, i) => (
                                  <span key={i} className="text-xs bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-teal-200">
                                    {lead.userName}
                                    {lead.course && <span className="text-slate-400 ml-1">· {lead.course}</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <p className="text-[10px] text-slate-400 text-right">
                            Generated {new Date(report.generatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {monthlyView === 'reports' && olderMonthlyReports.length > 0 && !showAllMonthly && (
                  <button
                    onClick={() => setShowAllMonthly(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all"
                  >
                    <Icons.ChevronDown className="w-3.5 h-3.5" />
                    View older reports ({olderMonthlyReports.length})
                  </button>
                )}

                {monthlyView === 'reports' && showAllMonthly && olderMonthlyReports.length > 0 && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setShowAllMonthly(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                      Show only latest
                    </button>
                    {monthlyTotalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMonthlyPage(p => Math.max(1, p - 1))}
                          disabled={monthlyPage === 1}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300 hover:text-blue-700 transition-all"
                        >
                          Prev
                        </button>
                        <span className="text-xs text-slate-400 font-semibold">
                          Page {monthlyPage} of {monthlyTotalPages}
                        </span>
                        <button
                          onClick={() => setMonthlyPage(p => Math.min(monthlyTotalPages, p + 1))}
                          disabled={monthlyPage === monthlyTotalPages}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300 hover:text-blue-700 transition-all"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
