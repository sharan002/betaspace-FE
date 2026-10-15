import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { DailyUserActivityReportItem, DailyReportFeeInstallment, MonthlyReportItem, PipelineDistributionItem, User, UserMonthlyTarget } from '../types';
import { Icons } from './Icons';

// ─── Helpers ────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

const getYearMonthFromDate = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

const getMonthlyPaidAmount = (row: MonthlyReportItem) =>
  Number(row.totalPaid ?? row.feesPaid ?? row.totalCollected ?? 0) || 0;

const getAchievementPercent = (paid: number, target: number) =>
  target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : 0;

const timeDiffLabel = (from: string, to: string): string => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return '';
  const diffMs = toDate.getTime() - fromDate.getTime();
  if (diffMs < 0) return '';
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (totalMinutes > 0) return `${totalMinutes}m`;
  return '< 1m';
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Shared small components ──────────────────────────────────────────────────

const CountCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`rounded-xl border border-current/10 p-4 ${color}`}>
    <p className="text-[11px] font-black uppercase tracking-wider opacity-70">{label}</p>
    <p className="mt-1 text-2xl font-black">{value}</p>
  </div>
);

// ─── SVG Chart Components ─────────────────────────────────────────────────────

const BAR_COLORS = { newLeads: '#3b82f6', totalRemarks: '#f97316', feesUpdated: '#22c55e' } as const;
const PIE_COLORS = ['#3b82f6','#f97316','#22c55e','#a855f7','#ec4899','#14b8a6','#f59e0b','#6366f1','#ef4444','#84cc16'];

type BarMetric = keyof typeof BAR_COLORS;

const GroupedBarChart = ({ data }: { data: MonthlyReportItem[] }) => {
  if (!data.length) return null;
  const metrics: BarMetric[] = ['newLeads', 'totalRemarks', 'feesUpdated'];
  const maxVal = Math.max(1, ...data.flatMap(d => metrics.map(m => d[m] as number)));
  const svgW = 760, svgH = 360;
  const ml = 44, mr = 16, mt = 20, mb = 72;
  const chartW = svgW - ml - mr;
  const chartH = svgH - mt - mb;
  const groupW = chartW / data.length;
  const barW = Math.max(6, (groupW - 12) / metrics.length);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: Math.round(maxVal * t), y: chartH - t * chartH }));
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full">
      <g transform={`translate(${ml},${mt})`}>
        {yTicks.map(({ v, y }) => (
          <g key={v}>
            <line x1={0} y1={y} x2={chartW} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={-6} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{v}</text>
          </g>
        ))}
        {data.map((item, gi) => {
          const gx = gi * groupW + 6;
          return metrics.map((m, mi) => {
            const bx = gx + mi * barW;
            const bh = (item[m] / maxVal) * chartH;
            const by = chartH - bh;
            return (
              <g key={`${item.username}-${m}`}>
                <rect x={bx} y={by} width={Math.max(1, barW - 2)} height={Math.max(1, bh)} fill={BAR_COLORS[m]} rx={2} />
                {item[m] > 0 && <text x={bx + (barW - 2) / 2} y={by - 3} textAnchor="middle" fontSize={9} fill="#475569">{item[m]}</text>}
              </g>
            );
          });
        })}
        {data.map((item, gi) => (
          <text key={item.username} x={gi * groupW + groupW / 2} y={chartH + 16} textAnchor="end" fontSize={11} fill="#475569"
            transform={`rotate(-35,${gi * groupW + groupW / 2},${chartH + 16})`}>{item.username}</text>
        ))}
        <line x1={0} y1={0} x2={0} y2={chartH} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#cbd5e1" strokeWidth={1} />
      </g>
      <g transform={`translate(${ml},${svgH - 18})`}>
        {metrics.map((m, i) => (
          <g key={m} transform={`translate(${i * 150},0)`}>
            <rect x={0} y={-9} width={12} height={12} fill={BAR_COLORS[m]} rx={2} />
            <text x={16} y={2} fontSize={11} fill="#475569">
              {m === 'newLeads' ? 'New Leads' : m === 'totalRemarks' ? 'Remarks' : 'Fees Updated'}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};

type PieMetric = 'newLeads' | 'totalRemarks' | 'feesUpdated' | 'totalBilled' | 'totalPaid';

const DonutChart = ({ data, metric, label, formatter }: {
  data: MonthlyReportItem[];
  metric: PieMetric;
  label: string;
  formatter?: (v: number) => string;
}) => {
  const total = data.reduce((s, d) => s + (Number(d[metric]) || 0), 0);
  if (!total) return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className="text-center text-xs italic text-slate-400 py-6">No data</p>
    </div>
  );
  const cx = 100, cy = 100, r = 80, ir = 42;
  let angle = -Math.PI / 2;
  const slices = data.filter(d => (d[metric] as number) > 0).map((item, idx) => {
    const val = Number(item[metric]) || 0;
    const frac = val / total;
    const sweep = frac * 2 * Math.PI;
    const sa = angle, ea = angle + sweep;
    angle = ea;
    const lg = sweep > Math.PI ? 1 : 0;
    const cos = (a: number) => Math.cos(a), sin = (a: number) => Math.sin(a);
    const d = `M ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} L ${cx + r * cos(sa)} ${cy + r * sin(sa)} A ${r} ${r} 0 ${lg} 1 ${cx + r * cos(ea)} ${cy + r * sin(ea)} L ${cx + ir * cos(ea)} ${cy + ir * sin(ea)} A ${ir} ${ir} 0 ${lg} 0 ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} Z`;
    return { ...item, d, color: PIE_COLORS[idx % PIE_COLORS.length], pct: (frac * 100).toFixed(1), val };
  });
  const centerLabel = formatter ? formatter(total) : String(total);
  const centerFontSize = formatter ? 9 : 14;
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <div className="flex items-center gap-4 flex-wrap">
        <svg viewBox="0 0 200 200" className="w-36 h-36 flex-shrink-0">
          {slices.map(s => <path key={s.username} d={s.d} fill={s.color} />)}
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize={centerFontSize} fill="#334155" fontWeight="bold">{centerLabel}</text>
          <text x={cx} y={cx + 10} textAnchor="middle" fontSize={9} fill="#94a3b8">total</text>
        </svg>
        <ul className="text-xs space-y-1 min-w-0 flex-1">
          {slices.map(s => (
            <li key={s.username} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate text-slate-600 flex-1">{s.username}</span>
              <span className="font-bold text-slate-700 tabular-nums">{formatter ? formatter(s.val) : s.val} ({s.pct}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const DistributionDonutChart = ({ data, label }: { data: PipelineDistributionItem[]; label: string }) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className="text-center text-xs italic text-slate-400 py-6">No data</p>
    </div>
  );
  const cx = 100, cy = 100, r = 80, ir = 42;
  let angle = -Math.PI / 2;
  const slices = data.filter(d => d.count > 0).map((item, idx) => {
    const frac = item.count / total;
    const sweep = frac * 2 * Math.PI;
    const sa = angle, ea = angle + sweep;
    angle = ea;
    const lg = sweep > Math.PI ? 1 : 0;
    const cos = (a: number) => Math.cos(a), sin = (a: number) => Math.sin(a);
    const path = `M ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} L ${cx + r * cos(sa)} ${cy + r * sin(sa)} A ${r} ${r} 0 ${lg} 1 ${cx + r * cos(ea)} ${cy + r * sin(ea)} L ${cx + ir * cos(ea)} ${cy + ir * sin(ea)} A ${ir} ${ir} 0 ${lg} 0 ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} Z`;
    return { ...item, path, color: PIE_COLORS[idx % PIE_COLORS.length], pct: (frac * 100).toFixed(1) };
  });
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <div className="flex items-center gap-4 flex-wrap">
        <svg viewBox="0 0 200 200" className="w-36 h-36 flex-shrink-0">
          {slices.map(s => <path key={s.label} d={s.path} fill={s.color} />)}
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize={14} fill="#334155" fontWeight="bold">{total}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="#94a3b8">enrolled</text>
        </svg>
        <ul className="text-xs space-y-1 min-w-0 flex-1">
          {slices.map(s => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate text-slate-600 flex-1">{s.label}</span>
              <span className="font-bold text-slate-700 tabular-nums">{s.count} ({s.pct}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ─── Target Achievement Donut ─────────────────────────────────────────────────

const TargetAchievementDonut = ({ paid, target }: { paid: number; target: number }) => {
  if (!target) return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Target Achievement</p>
      <p className="text-center text-xs italic text-slate-400 py-6">No target set by admin</p>
    </div>
  );
  const pct = Math.min(1, paid / target);
  const pctDisplay = Math.round(pct * 100);
  const color = pctDisplay >= 100 ? '#10b981' : pctDisplay >= 75 ? '#3b82f6' : pctDisplay >= 50 ? '#eab308' : '#f87171';
  const remaining = Math.max(0, target - paid);

  const cx = 100, cy = 100, r = 80, ir = 42;
  const sa = -Math.PI / 2;
  const sweep = pct * 2 * Math.PI;
  const ea = sa + sweep;
  const lg = sweep > Math.PI ? 1 : 0;
  const cos = Math.cos, sin = Math.sin;

  const achievedPath = pct > 0 && pct < 1
    ? `M ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} L ${cx + r * cos(sa)} ${cy + r * sin(sa)} A ${r} ${r} 0 ${lg} 1 ${cx + r * cos(ea)} ${cy + r * sin(ea)} L ${cx + ir * cos(ea)} ${cy + ir * sin(ea)} A ${ir} ${ir} 0 ${lg} 0 ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} Z`
    : null;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Target Achievement</p>
      <div className="flex items-center gap-4 flex-wrap">
        <svg viewBox="0 0 200 200" className="w-36 h-36 flex-shrink-0">
          {/* Background ring */}
          <path
            d={`M ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} L ${cx + r * cos(sa)} ${cy + r * sin(sa)} A ${r} ${r} 0 1 1 ${cx + r * cos(sa - 0.001)} ${cy + r * sin(sa - 0.001)} L ${cx + ir * cos(sa - 0.001)} ${cy + ir * sin(sa - 0.001)} A ${ir} ${ir} 0 1 0 ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} Z`}
            fill="#f1f5f9"
          />
          {/* Achievement arc */}
          {pct >= 1 ? (
            <path
              d={`M ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} L ${cx + r * cos(sa)} ${cy + r * sin(sa)} A ${r} ${r} 0 1 1 ${cx + r * cos(sa - 0.001)} ${cy + r * sin(sa - 0.001)} L ${cx + ir * cos(sa - 0.001)} ${cy + ir * sin(sa - 0.001)} A ${ir} ${ir} 0 1 0 ${cx + ir * cos(sa)} ${cy + ir * sin(sa)} Z`}
              fill={color}
            />
          ) : achievedPath ? (
            <path d={achievedPath} fill={color} />
          ) : null}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize={16} fill="#1e293b" fontWeight="bold">{pctDisplay}%</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#94a3b8">achieved</text>
        </svg>
        <ul className="text-xs space-y-2 min-w-0 flex-1">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-slate-600 flex-1">Amount Paid</span>
            <span className="font-bold text-slate-700 tabular-nums">{formatCurrency(paid)}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0 bg-slate-200" />
            <span className="text-slate-600 flex-1">Target</span>
            <span className="font-bold text-slate-700 tabular-nums">{formatCurrency(target)}</span>
          </li>
          {remaining > 0 && (
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0 bg-orange-200" />
              <span className="text-slate-600 flex-1">Remaining</span>
              <span className="font-bold text-orange-600 tabular-nums">{formatCurrency(remaining)}</span>
            </li>
          )}
          {pctDisplay >= 100 && (
            <li className="text-emerald-600 font-black text-[11px] pt-1">Target achieved!</li>
          )}
        </ul>
      </div>
    </div>
  );
};

// ─── Achievement Progress Bar ─────────────────────────────────────────────────

const AchievementBar = ({ paid, target }: { paid: number; target: number }) => {
  if (!target) return <span className="text-xs text-slate-400 italic">No target</span>;
  const pct = Math.min(100, Math.round((paid / target) * 100));
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400';
  const textColor = pct >= 100 ? 'text-emerald-700' : pct >= 75 ? 'text-blue-700' : pct >= 50 ? 'text-yellow-700' : 'text-red-600';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-black tabular-nums ${textColor}`}>{pct}%</span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface DailyReportViewProps {
  currentUser: User | null;
}

const DailyReportView: React.FC<DailyReportViewProps> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const now = new Date();

  // ── View mode ──
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const activeViewMode: 'daily' | 'monthly' = isAdmin ? viewMode : 'monthly';

  // ── Daily state ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [rows, setRows] = useState<DailyUserActivityReportItem[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [expandedReminders, setExpandedReminders] = useState<Record<string, boolean>>({});

  // ── Monthly state ──
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState('');
  const [monthlyRows, setMonthlyRows] = useState<MonthlyReportItem[]>([]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [pipelineBySource, setPipelineBySource] = useState<PipelineDistributionItem[]>([]);
  const [pipelineByCourse, setPipelineByCourse] = useState<PipelineDistributionItem[]>([]);
  const [pipelineQualifiedVsResponded, setPipelineQualifiedVsResponded] = useState<PipelineDistributionItem[]>([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState<string | null>(null);
  const [counsellorPipelineBySource, setCounsellorPipelineBySource] = useState<PipelineDistributionItem[]>([]);
  const [counsellorPipelineByCourse, setCounsellorPipelineByCourse] = useState<PipelineDistributionItem[]>([]);
  const [counsellorPipelineQualifiedVsResponded, setCounsellorPipelineQualifiedVsResponded] = useState<PipelineDistributionItem[]>([]);
  const [counsellorPipelineLoading, setCounsellorPipelineLoading] = useState(false);
  const [counsellorPipelineError, setCounsellorPipelineError] = useState('');

  // ── Target state ──
  const [targets, setTargets] = useState<UserMonthlyTarget[]>([]);
  const [editingTargetUsername, setEditingTargetUsername] = useState<string | null>(null);
  const [editingTargetValue, setEditingTargetValue] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  // ── Data loaders ──
  const loadDailyReport = async (date: string) => {
    try {
      setLoading(true);
      setError('');
      const { year, month } = getYearMonthFromDate(date);
      loadTargets(year, month);
      const data = await apiService.fetchUserActivityReport(date);
      if (!data.success) throw new Error('Unable to load report');
      setReportDate(data.date);
      setRows(data.report || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load daily report');
    } finally {
      setLoading(false);
    }
  };

  const loadTargets = async (year: number, month: number) => {
    try {
      const data = await apiService.fetchUserTargets(year, month);
      if (data.success) setTargets(data.targets || []);
    } catch {
      // non-critical
    }
  };

  const loadMonthlyReport = async (year: number, month: number) => {
    try {
      setMonthlyLoading(true);
      setMonthlyError('');
      if (isAdmin) {
        const [data, sourceData, courseData, qualifiedVsRespondedData] = await Promise.all([
          apiService.fetchMonthlyActivityReport(year, month),
          apiService.fetchMonthlyPipelineBySource(year, month),
          apiService.fetchMonthlyPipelineByCourse(year, month),
          apiService.fetchMonthlyPipelineQualifiedVsResponded(year, month),
        ]);
        if (!data.success) throw new Error('Unable to load monthly report');
        setMonthlyRows(data.report || []);
        setPipelineBySource(sourceData.data || []);
        setPipelineByCourse(courseData.data || []);
        setPipelineQualifiedVsResponded(qualifiedVsRespondedData.data || []);
      } else {
        const data = await apiService.fetchMonthlyActivityReport(year, month);
        if (!data.success) throw new Error('Unable to load monthly report');
        setMonthlyRows(data.report || []);
        setPipelineBySource([]);
        setPipelineByCourse([]);
        setPipelineQualifiedVsResponded([]);
      }
      await loadTargets(year, month);
    } catch (err: any) {
      setMonthlyError(err?.message || 'Failed to load monthly report');
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      loadDailyReport(selectedDate);
    } else {
      loadMonthlyReport(selectedYear, selectedMonth);
    }
  }, []);

  // Counsellor-specific pipeline (admin only)
  useEffect(() => {
    if (!isAdmin || !selectedCounsellor) {
      setCounsellorPipelineBySource([]);
      setCounsellorPipelineByCourse([]);
      setCounsellorPipelineQualifiedVsResponded([]);
      setCounsellorPipelineLoading(false);
      setCounsellorPipelineError('');
      return;
    }
    let isActive = true;
    const fetch = async () => {
      try {
        setCounsellorPipelineLoading(true);
        setCounsellorPipelineError('');
        const [src, crs, qvr] = await Promise.all([
          apiService.fetchMonthlyPipelineBySource(selectedYear, selectedMonth, selectedCounsellor),
          apiService.fetchMonthlyPipelineByCourse(selectedYear, selectedMonth, selectedCounsellor),
          apiService.fetchMonthlyPipelineQualifiedVsResponded(selectedYear, selectedMonth, selectedCounsellor),
        ]);
        if (!isActive) return;
        if (!src.success || !crs.success || !qvr.success) throw new Error('Unable to load counsellor report');
        setCounsellorPipelineBySource(src.data || []);
        setCounsellorPipelineByCourse(crs.data || []);
        setCounsellorPipelineQualifiedVsResponded(qvr.data || []);
      } catch (err: any) {
        if (!isActive) return;
        setCounsellorPipelineError(err?.message || 'Failed');
      } finally {
        if (isActive) setCounsellorPipelineLoading(false);
      }
    };
    fetch();
    return () => { isActive = false; };
  }, [selectedCounsellor, selectedYear, selectedMonth]);

  // ── Handlers ──
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value;
    setSelectedDate(d);
    const { year, month } = getYearMonthFromDate(d);
    loadTargets(year, month);
    loadDailyReport(d);
  };

  const handleViewChange = (mode: 'daily' | 'monthly') => {
    setViewMode(mode);
    if (mode === 'monthly') loadMonthlyReport(selectedYear, selectedMonth);
    else loadDailyReport(selectedDate);
  };

  const handleMonthYearChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedCounsellor(null);
    loadMonthlyReport(year, month);
  };

  const toggleUser = (key: string) => setExpandedUsers(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleReminder = (key: string) => setExpandedReminders(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleCounsellor = (username: string) => setSelectedCounsellor(prev => prev === username ? null : username);
  const isUserExpanded = (key: string) => expandedUsers[key] === true;
  const isReminderExpanded = (key: string) => expandedReminders[key] === true;
  const normalize = (v: string | undefined) => (v || '').trim().toLowerCase();

  // ── Target helpers ──
  const getTarget = (username: string) => targets.find(t => normalize(t.username) === normalize(username))?.target ?? 0;

  const startEditTarget = (username: string) => {
    setEditingTargetUsername(username);
    setEditingTargetValue(String(getTarget(username) || ''));
  };
  const cancelEditTarget = () => { setEditingTargetUsername(null); setEditingTargetValue(''); };
  const saveTarget = async (username: string) => {
    const val = Number(editingTargetValue);
    if (isNaN(val) || val < 0) return;
    try {
      setSavingTarget(true);
      await apiService.setUserTarget(username, selectedYear, selectedMonth, val);
      setTargets(prev => {
        const existing = prev.find(t => t.username === username);
        if (existing) return prev.map(t => t.username === username ? { ...t, target: val } : t);
        return [...prev, { username, year: selectedYear, month: selectedMonth, target: val }];
      });
      setEditingTargetUsername(null);
    } catch { /* keep open */ } finally { setSavingTarget(false); }
  };

  // ── Derived data ──
  const monthlyRowsWithPaid = useMemo(
    () => monthlyRows.map(row => ({ ...row, totalPaid: getMonthlyPaidAmount(row) })),
    [monthlyRows]
  );

  const monthlyTotals = useMemo(() => monthlyRowsWithPaid.reduce(
    (acc, r) => ({ newLeads: acc.newLeads + r.newLeads, remarks: acc.remarks + r.totalRemarks, fees: acc.fees + r.feesUpdated, billed: acc.billed + r.totalBilled, paid: acc.paid + getMonthlyPaidAmount(r) }),
    { newLeads: 0, remarks: 0, fees: 0, billed: 0, paid: 0 }
  ), [monthlyRowsWithPaid]);

  const totals = useMemo(() => rows.reduce(
    (acc, item) => ({ users: acc.users + 1, newLeads: acc.newLeads + item.newLeadsToday, remarks: acc.remarks + item.remarksCount, fees: acc.fees + item.feesUpdatedToday, billed: acc.billed + (item.billedTodayTotal || 0), reminders: acc.reminders + (item.remindersTodayCount || 0) }),
    { users: 0, newLeads: 0, remarks: 0, fees: 0, billed: 0, reminders: 0 }
  ), [rows]);

  const yearOptions = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i);

  const visibleDailyRows = useMemo(
    () => isAdmin ? rows : rows.filter(r => normalize(r.username) === normalize(currentUser?.username)),
    [rows, isAdmin, currentUser]
  );
  const myDailyRow = visibleDailyRows[0] ?? null;
  const myDailyPaid = myDailyRow?.feesUpdatedToday || 0;

  // For non-admin: their row + their target
  const myRow = useMemo(() => monthlyRowsWithPaid.find(r => normalize(r.username) === normalize(currentUser?.username)) ?? null, [monthlyRowsWithPaid, currentUser]);
  const myTarget = currentUser ? getTarget(currentUser.username) : 0;
  const myPaid = myRow ? getMonthlyPaidAmount(myRow) : 0;
  const myDailyAchievement = getAchievementPercent(myDailyPaid, myTarget);
  const myMonthlyAchievement = getAchievementPercent(myPaid, myTarget);

  // ── Month/Year controls ──
  const monthYearControls = (
    <>
      <select value={selectedMonth} onChange={e => handleMonthYearChange(selectedYear, Number(e.target.value))}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
        {MONTH_NAMES.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
      </select>
      <select value={selectedYear} onChange={e => handleMonthYearChange(Number(e.target.value), selectedMonth)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <button onClick={() => loadMonthlyReport(selectedYear, selectedMonth)} disabled={monthlyLoading}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
        <Icons.RefreshCcw className={`h-4 w-4 ${monthlyLoading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </>
  );

  // ── Tab switcher (shared) ──
  const tabSwitcher = (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 gap-1">
      <button onClick={() => handleViewChange('daily')}
        className={`rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${viewMode === 'daily' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
        Daily
      </button>
      <button onClick={() => handleViewChange('monthly')}
        className={`rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${viewMode === 'monthly' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
        Monthly
      </button>
    </div>
  );

  // ── Daily user card (reused for both admin and non-admin) ──
  const renderDailyCard = (item: DailyUserActivityReportItem) => {
    const totalReminderCount = item.remindersTodayDetails?.length > 0 ? item.remindersTodayDetails.length : item.remindersTodayCount || 0;
    const matchedReminderCount = (item.remindersTodayDetails || []).filter(r =>
      item.remarksDetails.some(e => normalize(e.userNumber) === normalize(r.userNumber) || normalize(e.userName) === normalize(r.userName))
    ).length;
    return (
      <div key={item.username} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button type="button" onClick={() => toggleUser(item.username)}
          className="w-full flex flex-col gap-3 border-b border-slate-100 p-4 text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-slate-800">{item.username}</p>
            <p className="text-xs text-slate-500">Daily Snapshot</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-black uppercase sm:justify-end">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">New: {item.newLeadsToday}</span>
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-700">Remarks: {item.remarksCount}</span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-700">Billed: {formatCurrency(item.billedTodayTotal || 0)}</span>
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-700">Paid: {formatCurrency(item.feesUpdatedToday)}</span>
              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-purple-700">Reminders: {totalReminderCount} | Done: {matchedReminderCount}</span>
            </div>
            {isUserExpanded(item.username) ? <Icons.ChevronDown className="h-4 w-4 text-slate-500" /> : <Icons.ChevronRight className="h-4 w-4 text-slate-500" />}
          </div>
        </button>

        {isUserExpanded(item.username) && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">New Leads</p>
                {item.newLeadsDetails.length === 0 ? <p className="text-xs italic text-slate-400">No new leads</p>
                  : <ul className="space-y-2">{item.newLeadsDetails.map((lead, idx) => (
                    <li key={`${lead.userNumber}-${idx}`} className="rounded-lg bg-slate-50 p-2">
                      <p className="text-sm font-bold text-slate-700">{lead.userName}</p>
                      <p className="text-xs text-slate-500">{lead.userNumber}</p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(lead.datecreated)}</p>
                    </li>))}</ul>}
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">New Leads Remarks Today</p>
                {item.newLeadsRemarksToday.length === 0 ? <p className="text-xs italic text-slate-400">No remarks on new leads</p>
                  : <ul className="space-y-2">{item.newLeadsRemarksToday.map((entry, idx) => {
                    const firstRemark = entry.remarks[0];
                    const diff = entry.datecreated && firstRemark ? timeDiffLabel(entry.datecreated, firstRemark.timestamp) : '';
                    return (
                      <li key={`${entry.userNumber}-new-remark-${idx}`} className="rounded-lg bg-slate-50 p-2 flex gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700">{entry.userName}</p>
                          <p className="text-xs text-slate-500">{entry.userNumber}</p>
                          {entry.datecreated && <p className="text-[11px] text-slate-400">Created: {formatDateTime(entry.datecreated)}</p>}
                          {entry.remarks.map(remark => (
                            <div key={remark._id} className="mt-1 border-t border-slate-200 pt-1">
                              <p className="text-xs text-slate-600">{remark.remark}</p>
                              <p className="text-[11px] text-slate-400">{formatDateTime(remark.timestamp)}</p>
                            </div>))}
                        </div>
                        {diff && (
                          <div className="shrink-0 flex flex-col items-center justify-center rounded bg-orange-50 px-2 py-1 text-center min-w-[56px]">
                            <p className="text-[9px] font-semibold text-orange-400 uppercase tracking-wide leading-tight">Time<br/>Missed</p>
                            <p className="text-sm font-black text-orange-600 mt-0.5">{diff}</p>
                          </div>)}
                      </li>);
                  })}</ul>}
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">New Leads Without Remarks</p>
                {item.newLeadsWithoutRemarks.length === 0 ? <p className="text-xs italic text-slate-400">None</p>
                  : <ul className="space-y-2">{item.newLeadsWithoutRemarks.map((lead, idx) => {
                    const waitDiff = timeDiffLabel(lead.datecreated, new Date().toISOString());
                    return (
                      <li key={`${lead.userNumber}-without-remark-${idx}`} className="rounded-lg bg-slate-50 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-700">{lead.userName}</p>
                          {waitDiff && <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-500">{waitDiff} not contacted</span>}
                        </div>
                        <p className="text-xs text-slate-500">{lead.userNumber}</p>
                        <p className="text-[11px] text-slate-400">{formatDateTime(lead.datecreated)}</p>
                      </li>);
                  })}</ul>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 pb-4">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Old Leads Remarks Today</p>
                {item.oldLeadsRemarksToday.length === 0 ? <p className="text-xs italic text-slate-400">No remarks on old leads</p>
                  : <ul className="space-y-2">{item.oldLeadsRemarksToday.map((entry, idx) => (
                    <li key={`${entry.userNumber}-old-remark-${idx}`} className="rounded-lg bg-slate-50 p-2">
                      <p className="text-sm font-bold text-slate-700">{entry.userName}</p>
                      <p className="text-xs text-slate-500">{entry.userNumber}</p>
                      {entry.remarks.map(remark => (
                        <div key={remark._id} className="mt-1">
                          <p className="text-xs text-slate-600">{remark.remark}</p>
                          <p className="text-[11px] text-slate-400">{formatDateTime(remark.timestamp)}</p>
                        </div>))}
                    </li>))}</ul>}
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Remarks Details</p>
                {item.remarksDetails.length === 0 ? <p className="text-xs italic text-slate-400">No remarks today</p>
                  : <ul className="space-y-2">{item.remarksDetails.map((entry, idx) => (
                    <li key={`${entry.userNumber}-${idx}`} className="rounded-lg bg-slate-50 p-2">
                      <p className="text-sm font-bold text-slate-700">{entry.userName}</p>
                      <p className="text-xs text-slate-500">{entry.userNumber}</p>
                      {entry.remarks.map(remark => <p key={remark._id} className="mt-1 text-xs text-slate-600">{remark.remark}</p>)}
                    </li>))}</ul>}
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Fees Billed &amp; Paid Today</p>
                {item.feeDetails.length === 0 ? <p className="text-xs italic text-slate-400">No fee activity today</p>
                  : <ul className="space-y-2">{item.feeDetails.map((fee, idx) => (
                    <li key={`${fee.userNumber}-${idx}`} className="rounded-lg bg-slate-50 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{fee.userName}</p>
                          <p className="text-xs text-slate-500">{fee.userNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          {fee.billedAmount ? <span className="text-xs font-semibold text-indigo-600">Billed: {formatCurrency(fee.billedAmount)}</span> : null}
                          {fee.paidAmount > 0 ? <span className="text-sm font-black text-green-700">Paid: {formatCurrency(fee.paidAmount)}</span> : null}
                        </div>
                      </div>
                      {fee.installments.length > 0 && fee.installments.map((inst: DailyReportFeeInstallment, i: number) => (
                        <div key={i} className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1">
                          <div>
                            <p className="text-[11px] text-slate-500">Installment #{inst.number}</p>
                            {inst.dueDate && <p className="text-[10px] text-slate-400">Due: {new Date(`${inst.dueDate}`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                          </div>
                          <p className="text-[11px] font-semibold text-green-600">{formatCurrency(inst.amount)}</p>
                        </div>))}
                    </li>))}</ul>}
              </div>
            </div>

            <div className="border-t border-slate-100 px-4 pb-4 pt-4">
              <button type="button" onClick={() => toggleReminder(item.username)} className="mb-2 flex w-full items-center justify-between text-left">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Today's Reminders ({totalReminderCount})</p>
                {isReminderExpanded(item.username) ? <Icons.ChevronDown className="h-4 w-4 text-slate-500" /> : <Icons.ChevronRight className="h-4 w-4 text-slate-500" />}
              </button>
              {isReminderExpanded(item.username) && (!item.remindersTodayDetails || item.remindersTodayDetails.length === 0)
                ? <p className="text-xs italic text-slate-400">No reminders today</p>
                : isReminderExpanded(item.username) ? (
                  <ul className="space-y-2">{item.remindersTodayDetails.map((reminder, idx) => (
                    <li key={`${reminder.userNumber}-reminder-${idx}`} className="rounded-lg bg-slate-50 p-2">
                      <p className="text-sm font-bold text-slate-700">{reminder.userName}</p>
                      <p className="text-xs text-slate-500">{reminder.userNumber}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 font-semibold text-purple-700">{reminder.status}</span>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">{reminder.pipeline}</span>
                        <span className="text-slate-500">{formatDateTime(reminder.reminder)}</span>
                        {item.remarksDetails.some(e => normalize(e.userNumber) === normalize(reminder.userNumber) || normalize(e.userName) === normalize(reminder.userName)) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                            <Icons.Check className="h-3 w-3" /> In Remarks
                          </span>)}
                      </div>
                    </li>))}</ul>
                ) : null}
            </div>
          </>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-slate-800">
            {isAdmin ? 'User Activity Report' : 'My Report'}
          </h3>
          <p className="text-sm text-slate-500">
            {activeViewMode === 'daily'
              ? `Report Date: ${reportDate || '-'}`
              : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && tabSwitcher}
          {activeViewMode === 'daily' ? (
            <>
              <input type="date" value={selectedDate} max={todayStr()} onChange={handleDateChange}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => loadDailyReport(selectedDate)} disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                <Icons.RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </>
          ) : monthYearControls}
        </div>
      </div>

      {/* ── DAILY VIEW ──────────────────────────────────────────────────────── */}
      {activeViewMode === 'daily' && (
        <>
          {isAdmin && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <CountCard label="Users In Report" value={totals.users} color="bg-slate-100 text-slate-700" />
              <CountCard label="New Leads" value={totals.newLeads} color="bg-blue-50 text-blue-700" />
              <CountCard label="Remarks Today" value={totals.remarks} color="bg-orange-50 text-orange-700" />
              <CountCard label="Reminders Today" value={totals.reminders} color="bg-purple-50 text-purple-700" />
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-700">
                <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Fees Billed Today</p>
                <p className="mt-1 text-xl font-black">{formatCurrency(totals.billed)}</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Fees Paid Today</p>
                <p className="mt-1 text-xl font-black">{formatCurrency(totals.fees)}</p>
              </div>
            </div>
          )}

          {!loading && !isAdmin && !error && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Today Achievement</p>
                  <p className="mt-2 text-4xl font-black text-slate-900 tabular-nums">{myDailyAchievement}%</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[420px]">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                    <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Amount Paid Today</p>
                    <p className="mt-1 text-xl font-black">{formatCurrency(myDailyPaid)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                    <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Target</p>
                    <p className="mt-1 text-xl font-black">{myTarget > 0 ? formatCurrency(myTarget) : 'Not Set'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <AchievementBar paid={myDailyPaid} target={myTarget} />
              </div>
            </div>
          )}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <div className="space-y-4 pb-8">
            {isAdmin && rows.map(item => renderDailyCard(item))}
            {!loading && isAdmin && rows.length === 0 && !error && (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-slate-500">No report data available for the selected date.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MONTHLY VIEW ────────────────────────────────────────────────────── */}
      {activeViewMode === 'monthly' && (
        <>
          {/* Summary cards */}
          {isAdmin ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <CountCard label="Counsellors" value={monthlyRowsWithPaid.length} color="bg-slate-100 text-slate-700" />
              <CountCard label="New Leads" value={monthlyTotals.newLeads} color="bg-blue-50 text-blue-700" />
              <CountCard label="Total Remarks" value={monthlyTotals.remarks} color="bg-orange-50 text-orange-700" />
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-700">
                <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Fees Billed</p>
                <p className="mt-1 text-xl font-black">{formatCurrency(monthlyTotals.billed)}</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Fees Paid</p>
                <p className="mt-1 text-xl font-black">{formatCurrency(monthlyTotals.paid)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Monthly Achievement</p>
                    <p className="mt-2 text-4xl font-black text-slate-900 tabular-nums">{myMonthlyAchievement}%</p>
                    {!myTarget && <p className="mt-1 text-sm font-semibold text-slate-400">Target not set</p>}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[420px]">
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                      <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Amount Paid</p>
                      <p className="mt-1 text-xl font-black">{formatCurrency(myPaid)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                      <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Target</p>
                      <p className="mt-1 text-xl font-black">{myTarget > 0 ? formatCurrency(myTarget) : 'Not Set'}</p>
                    </div>
                  </div>
                </div>
                <AchievementBar paid={myPaid} target={myTarget} />
              </div>
            </div>
          )}

          {monthlyError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{monthlyError}</div>}

          {monthlyLoading && (
            <div className="flex items-center justify-center py-12">
              <Icons.RefreshCcw className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Loading...</span>
            </div>
          )}

          {/* ── NON-ADMIN MONTHLY CHARTS ────────────────────────────────────── */}
          {/* ── ADMIN MONTHLY CHARTS ────────────────────────────────────────── */}
          {!monthlyLoading && isAdmin && monthlyRows.length > 0 && (
            <>
              {/* Counsellor selector */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">View Counsellor</label>
                <select value={selectedCounsellor || ''} onChange={e => setSelectedCounsellor(e.target.value || null)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Counsellors</option>
                  {monthlyRowsWithPaid.map(r => <option key={r.username} value={r.username}>{r.username}</option>)}
                </select>
              </div>

              {selectedCounsellor ? (() => {
                const row = monthlyRowsWithPaid.find(r => r.username === selectedCounsellor)!;
                const others: MonthlyReportItem = {
                  username: 'Others',
                  newLeads: monthlyTotals.newLeads - row.newLeads,
                  totalRemarks: monthlyTotals.remarks - row.totalRemarks,
                  feesUpdated: monthlyTotals.fees - row.feesUpdated,
                  totalBilled: monthlyTotals.billed - row.totalBilled,
                  totalPaid: monthlyTotals.paid - getMonthlyPaidAmount(row),
                };
                const hasOthers = others.newLeads > 0 || others.totalRemarks > 0 || others.totalBilled > 0 || getMonthlyPaidAmount(others) > 0;
                const spotData: MonthlyReportItem[] = [row, ...(hasOthers ? [others] : [])];
                const rowTarget = getTarget(selectedCounsellor);
                const rowPaid = getMonthlyPaidAmount(row);
                return (
                  <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-black text-slate-800">{selectedCounsellor}</p>
                        <p className="text-sm text-slate-500">Monthly Report — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
                      </div>
                      <button onClick={() => setSelectedCounsellor(null)} className="rounded-full p-1.5 hover:bg-blue-100 text-slate-500">
                        <Icons.X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <CountCard label="New Leads" value={row.newLeads} color="bg-blue-100 text-blue-700" />
                      <CountCard label="Total Remarks" value={row.totalRemarks} color="bg-orange-100 text-orange-700" />
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-700">
                        <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Fees Billed</p>
                        <p className="mt-1 text-xl font-black">{formatCurrency(row.totalBilled)}</p>
                      </div>
                      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                        <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Fees Paid</p>
                        <p className="mt-1 text-xl font-black">{formatCurrency(rowPaid)}</p>
                      </div>
                    </div>
                    {rowTarget > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Target Achievement</p>
                          <span className="text-xs font-bold text-slate-600">Target: {formatCurrency(rowTarget)}</span>
                        </div>
                        <AchievementBar paid={rowPaid} target={rowTarget} />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(['newLeads','totalRemarks','totalBilled','totalPaid'] as PieMetric[]).map((metric, i) => (
                        <div key={metric} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <DonutChart data={spotData} metric={metric}
                            label={['New Leads Share','Remarks Share','Fees Billed Share','Fees Paid Share'][i]}
                            formatter={i >= 2 ? formatCurrency : undefined} />
                        </div>
                      ))}
                    </div>
                    <div>
                      {counsellorPipelineLoading && (
                        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                          <Icons.RefreshCcw className="mr-2 h-4 w-4 animate-spin text-slate-400" /> Loading enrolled breakdown...
                        </div>
                      )}
                      {!counsellorPipelineLoading && counsellorPipelineError && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">{counsellorPipelineError}</div>
                      )}
                      {!counsellorPipelineLoading && !counsellorPipelineError && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <DistributionDonutChart data={counsellorPipelineBySource} label="Enrolled by Lead Source" />
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <DistributionDonutChart data={counsellorPipelineByCourse} label="Enrolled by Course" />
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <DistributionDonutChart data={counsellorPipelineQualifiedVsResponded} label="Enrolled from Qualified vs Responded" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
                      Counsellor Performance — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </p>
                    <GroupedBarChart data={monthlyRowsWithPaid} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(['newLeads','totalRemarks','totalBilled','totalPaid'] as PieMetric[]).map((metric, i) => (
                      <div key={metric} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <DonutChart data={monthlyRowsWithPaid} metric={metric}
                          label={['New Leads Share','Remarks Share','Fees Billed Share','Fees Paid Share'][i]}
                          formatter={i >= 2 ? formatCurrency : undefined} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!selectedCounsellor && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <DistributionDonutChart data={pipelineBySource} label="Enrolled by Lead Source" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <DistributionDonutChart data={pipelineByCourse} label="Enrolled by Course" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <DistributionDonutChart data={pipelineQualifiedVsResponded} label="Enrolled from Qualified vs Responded" />
                  </div>
                </div>
              )}

              {/* Summary table with target editing */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden pb-4">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <p className="text-sm font-black uppercase tracking-widest text-slate-500">Monthly Summary Table</p>
                  <p className="text-xs text-slate-400 italic">Click target cell to edit</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-2.5 text-left">Counsellor</th>
                        <th className="px-4 py-2.5 text-right">New Leads</th>
                        <th className="px-4 py-2.5 text-right">Remarks</th>
                        <th className="px-4 py-2.5 text-right">Monthly Billed</th>
                        <th className="px-4 py-2.5 text-right">Amount Paid</th>
                        <th className="px-4 py-2.5 text-right">Target</th>
                        <th className="px-4 py-2.5 text-right">Achievement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRowsWithPaid.map((row, idx) => {
                        const rowTarget = getTarget(row.username);
                        const rowPaid = getMonthlyPaidAmount(row);
                        const isEditingThisRow = editingTargetUsername === row.username;
                        return (
                          <tr key={row.username} onClick={() => !isEditingThisRow && toggleCounsellor(row.username)}
                            className={`border-b border-slate-50 cursor-pointer transition-colors hover:bg-blue-50/40 ${selectedCounsellor === row.username ? 'bg-blue-50' : idx % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                            <td className="px-4 py-2.5 font-semibold text-slate-800">
                              <span className="flex items-center gap-2">
                                {row.username}
                                {selectedCounsellor === row.username && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-600 uppercase tracking-wide">selected</span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{row.newLeads}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">{row.totalRemarks}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-indigo-700">{formatCurrency(row.totalBilled)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-green-700">{formatCurrency(rowPaid)}</td>
                            <td className="px-4 py-2.5 text-right" onClick={e => { e.stopPropagation(); if (!isEditingThisRow) startEditTarget(row.username); }}>
                              {isEditingThisRow ? (
                                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                  <input autoFocus type="number" min={0} value={editingTargetValue}
                                    onChange={e => setEditingTargetValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveTarget(row.username); if (e.key === 'Escape') cancelEditTarget(); }}
                                    className="w-28 rounded border border-blue-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                  <button onClick={() => saveTarget(row.username)} disabled={savingTarget} className="rounded p-1 text-emerald-600 hover:bg-emerald-50" title="Save">
                                    <Icons.Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={cancelEditTarget} className="rounded p-1 text-slate-400 hover:bg-slate-100" title="Cancel">
                                    <Icons.X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 cursor-pointer group">
                                  <span className="tabular-nums font-semibold text-slate-700">
                                    {rowTarget > 0 ? formatCurrency(rowTarget) : <span className="text-slate-400 italic text-xs">Set target</span>}
                                  </span>
                                  <Icons.Edit className="h-3 w-3 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <AchievementBar paid={rowPaid} target={rowTarget} />
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-slate-800">
                        <td className="px-4 py-2.5">Total</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-blue-700">{monthlyTotals.newLeads}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-orange-700">{monthlyTotals.remarks}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-indigo-700">{formatCurrency(monthlyTotals.billed)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-green-700">{formatCurrency(monthlyTotals.paid)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                          {(() => { const t = targets.reduce((s, x) => s + (x.target || 0), 0); return t > 0 ? formatCurrency(t) : '—'; })()}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {(() => { const t = targets.reduce((s, x) => s + (x.target || 0), 0); return <AchievementBar paid={monthlyTotals.paid} target={t} />; })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!monthlyLoading && isAdmin && monthlyRows.length === 0 && !monthlyError && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-slate-500">No activity data for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyReportView;
