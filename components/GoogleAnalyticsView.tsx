import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { GA4AcquisitionRow, GA4SessionSourceRow, GA4OrganicLandingPageRow, GA4EngagementRow } from '../types';
import { Icons } from './Icons';

// ─── Helpers ────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgoStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const formatDuration = (seconds: number) => {
  const s = Math.round(seconds || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value || 0);

const CountCard = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div className={`rounded-xl border border-current/10 p-4 ${color}`}>
    <p className="text-[11px] font-black uppercase tracking-wider opacity-70">{label}</p>
    <p className="mt-1 text-2xl font-black">{value}</p>
  </div>
);

const LINE_COLORS = { activeUsers: '#3b82f6', engagedSessions: '#22c55e', sessions: '#f97316' } as const;

const EngagementLineChart = ({ data }: { data: GA4EngagementRow[] }) => {
  if (!data.length) return null;
  const metrics: (keyof typeof LINE_COLORS)[] = ['activeUsers', 'engagedSessions', 'sessions'];
  const maxVal = Math.max(1, ...data.flatMap(d => metrics.map(m => d[m] as number)));
  const svgW = 760, svgH = 320;
  const ml = 44, mr = 16, mt = 20, mb = 56;
  const chartW = svgW - ml - mr;
  const chartH = svgH - mt - mb;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: Math.round(maxVal * t), y: chartH - t * chartH }));

  const pointsFor = (metric: keyof typeof LINE_COLORS) =>
    data.map((d, i) => `${i * stepX},${chartH - ((d[metric] as number) / maxVal) * chartH}`).join(' ');

  const xLabelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full">
      <g transform={`translate(${ml},${mt})`}>
        {yTicks.map(({ v, y }) => (
          <g key={v}>
            <line x1={0} y1={y} x2={chartW} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={-6} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{v}</text>
          </g>
        ))}
        {metrics.map(m => (
          <polyline key={m} points={pointsFor(m)} fill="none" stroke={LINE_COLORS[m]} strokeWidth={2} />
        ))}
        {data.map((d, i) => (
          i % xLabelEvery === 0 ? (
            <text key={d.date} x={i * stepX} y={chartH + 16} textAnchor="middle" fontSize={10} fill="#475569">
              {d.date.slice(5)}
            </text>
          ) : null
        ))}
        <line x1={0} y1={0} x2={0} y2={chartH} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#cbd5e1" strokeWidth={1} />
      </g>
      <g transform={`translate(${ml},${svgH - 18})`}>
        {metrics.map((m, i) => (
          <g key={m} transform={`translate(${i * 150},0)`}>
            <rect x={0} y={-9} width={12} height={12} fill={LINE_COLORS[m]} rx={2} />
            <text x={16} y={2} fontSize={11} fill="#475569">
              {m === 'activeUsers' ? 'Active Users' : m === 'engagedSessions' ? 'Engaged Sessions' : 'Sessions'}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};

type Tab = 'acquisition' | 'session-source' | 'organic-landing' | 'engagement';

const TABS: { key: Tab; label: string }[] = [
  { key: 'acquisition', label: 'Acquisition' },
  { key: 'session-source', label: 'Session Source' },
  { key: 'organic-landing', label: 'Organic Landing Pages' },
  { key: 'engagement', label: 'Engagement' },
];

const GoogleAnalyticsView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('acquisition');
  const [startDate, setStartDate] = useState(daysAgoStr(28));
  const [endDate, setEndDate] = useState(todayStr());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [acquisitionRows, setAcquisitionRows] = useState<GA4AcquisitionRow[]>([]);
  const [acquisitionTotals, setAcquisitionTotals] = useState({ sessions: 0, newUsers: 0, totalUsers: 0 });

  const [sourceRows, setSourceRows] = useState<GA4SessionSourceRow[]>([]);
  const [sourceTotals, setSourceTotals] = useState({ sessions: 0, newUsers: 0, totalUsers: 0 });

  const [landingRows, setLandingRows] = useState<GA4OrganicLandingPageRow[]>([]);
  const [landingTotals, setLandingTotals] = useState({ sessions: 0, views: 0, engagedSessions: 0, conversions: 0 });

  const [engagementRows, setEngagementRows] = useState<GA4EngagementRow[]>([]);
  const [engagementSummary, setEngagementSummary] = useState({ avgEngagementTimePerActiveUser: 0, engagedSessionsPerActiveUser: 0, avgEngagementTimePerSession: 0 });

  const loadReport = async (activeTab: Tab) => {
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'acquisition') {
        const data = await apiService.fetchGA4Acquisition(startDate, endDate);
        if (!data.success) throw new Error('Unable to load acquisition report');
        setAcquisitionRows(data.rows || []);
        setAcquisitionTotals(data.totals || { sessions: 0, newUsers: 0, totalUsers: 0 });
      } else if (activeTab === 'session-source') {
        const data = await apiService.fetchGA4SessionSource(startDate, endDate);
        if (!data.success) throw new Error('Unable to load session source report');
        setSourceRows(data.rows || []);
        setSourceTotals(data.totals || { sessions: 0, newUsers: 0, totalUsers: 0 });
      } else if (activeTab === 'organic-landing') {
        const data = await apiService.fetchGA4OrganicLandingPages(startDate, endDate);
        if (!data.success) throw new Error('Unable to load organic landing pages report');
        setLandingRows(data.rows || []);
        setLandingTotals(data.totals || { sessions: 0, views: 0, engagedSessions: 0, conversions: 0 });
      } else {
        const data = await apiService.fetchGA4EngagementOverview(startDate, endDate);
        if (!data.success) throw new Error('Unable to load engagement overview');
        setEngagementRows(data.rows || []);
        setEngagementSummary(data.summary || { avgEngagementTimePerActiveUser: 0, engagedSessionsPerActiveUser: 0, avgEngagementTimePerSession: 0 });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load Google Analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleTabChange = (next: Tab) => setTab(next);

  const handleApplyDateRange = () => loadReport(tab);

  const acquisitionTotalsCards = useMemo(() => (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <CountCard label="Sessions" value={formatNumber(acquisitionTotals.sessions)} color="bg-blue-50 text-blue-700" />
      <CountCard label="New Users" value={formatNumber(acquisitionTotals.newUsers)} color="bg-green-50 text-green-700" />
      <CountCard label="Total Users" value={formatNumber(acquisitionTotals.totalUsers)} color="bg-slate-100 text-slate-700" />
    </div>
  ), [acquisitionTotals]);

  const sourceTotalsCards = useMemo(() => (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <CountCard label="Sessions" value={formatNumber(sourceTotals.sessions)} color="bg-blue-50 text-blue-700" />
      <CountCard label="New Users" value={formatNumber(sourceTotals.newUsers)} color="bg-green-50 text-green-700" />
      <CountCard label="Total Users" value={formatNumber(sourceTotals.totalUsers)} color="bg-slate-100 text-slate-700" />
    </div>
  ), [sourceTotals]);

  const landingTotalsCards = useMemo(() => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <CountCard label="Sessions" value={formatNumber(landingTotals.sessions)} color="bg-blue-50 text-blue-700" />
      <CountCard label="Views" value={formatNumber(landingTotals.views)} color="bg-indigo-50 text-indigo-700" />
      <CountCard label="Engaged Sessions" value={formatNumber(landingTotals.engagedSessions)} color="bg-green-50 text-green-700" />
      <CountCard label="Conversions" value={formatNumber(landingTotals.conversions)} color="bg-amber-50 text-amber-700" />
    </div>
  ), [landingTotals]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-slate-800">Google Analytics</h3>
          <p className="text-sm text-slate-500">{startDate} to {endDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={endDate} min={startDate} max={todayStr()} onChange={e => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={handleApplyDateRange} disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <Icons.RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-1 gap-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${tab === t.key ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Icons.RefreshCcw className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Loading...</span>
        </div>
      )}

      {!loading && !error && tab === 'acquisition' && (
        <div className="space-y-4">
          {acquisitionTotalsCards}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">New Users</th>
                  <th className="px-4 py-3 text-right">Total Users</th>
                  <th className="px-4 py-3 text-right">Engagement Rate</th>
                  <th className="px-4 py-3 text-right">Avg. Session Duration</th>
                  <th className="px-4 py-3 text-right">Bounce Rate</th>
                </tr>
              </thead>
              <tbody>
                {acquisitionRows.map(row => (
                  <tr key={row.channel} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{row.channel}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.sessions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.newUsers)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.totalUsers)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.engagementRate}%</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatDuration(row.avgSessionDuration)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.bounceRate}%</td>
                  </tr>
                ))}
                {acquisitionRows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">No data for the selected date range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'session-source' && (
        <div className="space-y-4">
          {sourceTotalsCards}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">New Users</th>
                  <th className="px-4 py-3 text-right">Total Users</th>
                  <th className="px-4 py-3 text-right">Engagement Rate</th>
                  <th className="px-4 py-3 text-right">Avg. Session Duration</th>
                  <th className="px-4 py-3 text-right">Bounce Rate</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((row, idx) => (
                  <tr key={`${row.source}-${idx}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{row.source || '(not set)'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.sessions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.newUsers)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.totalUsers)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.engagementRate}%</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatDuration(row.avgSessionDuration)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.bounceRate}%</td>
                  </tr>
                ))}
                {sourceRows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">No data for the selected date range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'organic-landing' && (
        <div className="space-y-4">
          {landingTotalsCards}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Landing Page</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Bounce Rate</th>
                  <th className="px-4 py-3 text-right">Events / Session</th>
                  <th className="px-4 py-3 text-right">Engaged Sessions</th>
                  <th className="px-4 py-3 text-right">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {landingRows.map((row, idx) => (
                  <tr key={`${row.landingPage}-${idx}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700 max-w-xs truncate" title={row.landingPage}>{row.landingPage}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.sessions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.views)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.bounceRate}%</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.eventsPerSession}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.engagedSessions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.conversions)}</td>
                  </tr>
                ))}
                {landingRows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">No organic search landing pages for the selected date range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'engagement' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <CountCard label="Avg. Engagement Time / Active User" value={formatDuration(engagementSummary.avgEngagementTimePerActiveUser)} color="bg-blue-50 text-blue-700" />
            <CountCard label="Engaged Sessions / Active User" value={engagementSummary.engagedSessionsPerActiveUser} color="bg-green-50 text-green-700" />
            <CountCard label="Avg. Engagement Time / Session" value={formatDuration(engagementSummary.avgEngagementTimePerSession)} color="bg-indigo-50 text-indigo-700" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Daily Trend</p>
            {engagementRows.length === 0
              ? <p className="text-center text-xs italic text-slate-400 py-6">No data for the selected date range.</p>
              : <EngagementLineChart data={engagementRows} />}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Active Users</th>
                  <th className="px-4 py-3 text-right">Engaged Sessions</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">Avg. Engagement Time / Active User</th>
                  <th className="px-4 py-3 text-right">Engaged Sessions / Active User</th>
                  <th className="px-4 py-3 text-right">Avg. Engagement Time / Session</th>
                </tr>
              </thead>
              <tbody>
                {engagementRows.map(row => (
                  <tr key={row.date} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{row.date}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.activeUsers)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.engagedSessions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.sessions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatDuration(row.avgEngagementTimePerActiveUser)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.engagedSessionsPerActiveUser}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatDuration(row.avgEngagementTimePerSession)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleAnalyticsView;
