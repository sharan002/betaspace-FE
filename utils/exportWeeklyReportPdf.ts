import { jsPDF } from 'jspdf';

interface WeeklyReportMetrics {
  newLeads: number;
  enrolledThisWeek: number;
  noContactCount: number;
  notContactedPct: number;
  avgResponseMins: number | null;
  slowResponses: number;
  slowBuckets: Record<string, number>;
  thisWeekFees: { totalBilled: number; totalPaid: number };
  prevWeekFees: { totalBilled: number; totalPaid: number };
  billedPct: number | null;
  paidPct: number | null;
}

interface HotLead {
  userName: string;
  course: string;
  status: string;
  lastRemark: string;
}

interface RespondedLead {
  userName: string;
  course: string;
  status: string;
}

export interface WeeklyReportForPdf {
  counsellor: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  metrics: WeeklyReportMetrics;
  aiSummary: string;
  likelyToConfirm: string;
  hotNotEnrolled: HotLead[];
  respondedAfterFollowUp: RespondedLead[];
}

const COLORS = {
  slate900: [15, 23, 42] as const,
  slate700: [51, 65, 85] as const,
  slate500: [100, 116, 139] as const,
  slate400: [148, 163, 184] as const,
  slate200: [226, 232, 240] as const,
  slate50: [248, 250, 252] as const,
  amber700: [180, 83, 9] as const,
  amber100: [254, 243, 199] as const,
  amber200: [253, 230, 138] as const,
  amber500: [245, 158, 11] as const,
  blue700: [29, 78, 216] as const,
  blue50: [239, 246, 255] as const,
  blue200: [191, 219, 254] as const,
  green700: [21, 128, 61] as const,
  green50: [240, 253, 244] as const,
  green200: [187, 247, 208] as const,
  red700: [185, 28, 28] as const,
  red50: [254, 242, 242] as const,
  red200: [254, 202, 202] as const,
  teal700: [15, 118, 110] as const,
  teal50: [240, 253, 250] as const,
  teal200: [153, 246, 228] as const,
  purple700: [126, 34, 206] as const,
  purple50: [250, 245, 255] as const,
  purple200: [233, 213, 255] as const,
  white: [255, 255, 255] as const,
};

type RGB = readonly [number, number, number];

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const currency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-z0-9\-_]+/gi, '_');
}

export function downloadWeeklyReportPdf(report: WeeklyReportForPdf) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Header band ────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.amber500);
  doc.rect(0, 0, PAGE_W, 88, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Weekly Report', MARGIN, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(report.counsellor, MARGIN, 58);

  doc.setFontSize(9.5);
  doc.text(`${fmt(report.weekStart)} - ${fmt(report.weekEnd)}`, MARGIN, 74);

  y = 112;

  const m = report.metrics ?? ({} as WeeklyReportMetrics);
  const thisWeekFees = m.thisWeekFees ?? { totalBilled: 0, totalPaid: 0 };
  const prevWeekFees = m.prevWeekFees ?? { totalBilled: 0, totalPaid: 0 };
  const slowBuckets = m.slowBuckets ?? {};

  // ── Metric cards grid (3 columns) ─────────────────────────────────────
  const metricCards: { label: string; value: string; sub?: string; color: RGB; bg: RGB; border: RGB }[] = [
    { label: 'NEW LEADS', value: String(m.newLeads ?? 0), color: COLORS.blue700, bg: COLORS.blue50, border: COLORS.blue200 },
    { label: 'ENROLLED', value: String(m.enrolledThisWeek ?? 0), color: COLORS.green700, bg: COLORS.green50, border: COLORS.green200 },
    {
      label: 'NOT CONTACTED',
      value: String(m.noContactCount ?? 0),
      sub: `${m.notContactedPct ?? 0}% of leads`,
      color: (m.noContactCount ?? 0) > 0 ? COLORS.red700 : COLORS.green700,
      bg: (m.noContactCount ?? 0) > 0 ? COLORS.red50 : COLORS.green50,
      border: (m.noContactCount ?? 0) > 0 ? COLORS.red200 : COLORS.green200,
    },
    {
      label: 'AVG RESPONSE',
      value: (m.avgResponseMins ?? null) !== null ? `${m.avgResponseMins}m` : 'N/A',
      sub: (m.avgResponseMins ?? null) !== null && (m.avgResponseMins ?? 0) > 60 ? 'target <60m' : undefined,
      color: (m.avgResponseMins ?? null) !== null && (m.avgResponseMins ?? 0) > 60 ? COLORS.amber700 : COLORS.teal700,
      bg: (m.avgResponseMins ?? null) !== null && (m.avgResponseMins ?? 0) > 60 ? COLORS.amber100 : COLORS.teal50,
      border: (m.avgResponseMins ?? null) !== null && (m.avgResponseMins ?? 0) > 60 ? COLORS.amber200 : COLORS.teal200,
    },
    {
      label: 'SLOW >1HR',
      value: String(m.slowResponses ?? 0),
      color: (m.slowResponses ?? 0) > 0 ? COLORS.amber700 : COLORS.green700,
      bg: (m.slowResponses ?? 0) > 0 ? COLORS.amber100 : COLORS.green50,
      border: (m.slowResponses ?? 0) > 0 ? COLORS.amber200 : COLORS.green200,
    },
    { label: 'BILLED', value: currency(thisWeekFees.totalBilled), color: COLORS.purple700, bg: COLORS.purple50, border: COLORS.purple200 },
  ];

  const cols = 3;
  const gap = 10;
  const cardW = (CONTENT_W - gap * (cols - 1)) / cols;
  const cardH = 52;

  metricCards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * (cardW + gap);
    const cardY = y + row * (cardH + gap);

    doc.setFillColor(...card.bg);
    doc.setDrawColor(...card.border);
    doc.roundedRect(x, cardY, cardW, cardH, 4, 4, 'FD');

    doc.setTextColor(...card.color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(card.label, x + 8, cardY + 15);

    doc.setFontSize(13);
    doc.text(card.value, x + 8, cardY + 32);

    if (card.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(card.sub, x + 8, cardY + 43);
    }
  });

  const rows = Math.ceil(metricCards.length / cols);
  y += rows * cardH + (rows - 1) * gap + 18;

  // ── Fees billed / collected boxes ──────────────────────────────────────
  ensureSpace(70);
  const feeBoxW = (CONTENT_W - gap) / 2;
  const feeBoxH = 62;

  const drawFeeBox = (x: number, label: string, value: number, prevValue: number, pct: number | null) => {
    doc.setFillColor(...COLORS.slate50);
    doc.setDrawColor(...COLORS.slate200);
    doc.roundedRect(x, y, feeBoxW, feeBoxH, 4, 4, 'FD');

    doc.setTextColor(...COLORS.slate400);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(label.toUpperCase(), x + 10, y + 16);

    doc.setTextColor(...COLORS.slate900);
    doc.setFontSize(15);
    doc.text(currency(value), x + 10, y + 35);

    doc.setFontSize(8.5);
    if (pct !== null) {
      const trendColor: RGB = pct >= 0 ? COLORS.green700 : COLORS.red700;
      doc.setTextColor(...trendColor);
      doc.text(`${pct >= 0 ? 'UP' : 'DOWN'} ${Math.abs(pct)}% vs last week`, x + 10, y + 50);
    } else {
      doc.setTextColor(...COLORS.slate400);
      doc.text('No data', x + 10, y + 50);
    }
    if (prevValue > 0) {
      doc.setTextColor(...COLORS.slate400);
      doc.setFont('helvetica', 'normal');
      doc.text(`(${currency(prevValue)} prev week)`, x + 10, y + 60);
    }
  };

  drawFeeBox(MARGIN, 'Fees Billed This Week', thisWeekFees.totalBilled, prevWeekFees.totalBilled, m.billedPct ?? null);
  drawFeeBox(MARGIN + feeBoxW + gap, 'Fees Collected This Week', thisWeekFees.totalPaid, prevWeekFees.totalPaid, m.paidPct ?? null);
  y += feeBoxH + 16;

  // ── Slow response breakdown ────────────────────────────────────────────
  const slowEntries = Object.entries(slowBuckets).filter(([, v]) => v > 0);
  if ((m.slowResponses ?? 0) > 0 && slowEntries.length > 0) {
    const text = slowEntries.map(([range, count]) => `${range}: ${count}`).join('   |   ');
    ensureSpace(40);
    doc.setFillColor(...COLORS.amber100);
    doc.setDrawColor(...COLORS.amber200);
    doc.roundedRect(MARGIN, y, CONTENT_W, 34, 4, 4, 'FD');
    doc.setTextColor(...COLORS.amber700);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('SLOW RESPONSE BREAKDOWN', MARGIN + 10, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(text, MARGIN + 10, y + 27);
    y += 34 + 14;
  }

  // ── Generic colored section with wrapped body text ────────────────────
  const addTextSection = (title: string, bodyLines: string[], bg: RGB, border: RGB, titleColor: RGB) => {
    if (bodyLines.length === 0) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const wrapped = doc.splitTextToSize(bodyLines.join('\n'), CONTENT_W - 20);
    const lineHeight = 12.5;
    const titleHeight = 24;
    const boxHeight = titleHeight + wrapped.length * lineHeight + 12;

    ensureSpace(boxHeight + 14);
    doc.setFillColor(...bg);
    doc.setDrawColor(...border);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxHeight, 5, 5, 'FD');

    doc.setTextColor(...titleColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(title, MARGIN + 12, y + 18);

    doc.setTextColor(...COLORS.slate700);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(wrapped, MARGIN + 12, y + titleHeight + 10, { lineHeightFactor: 1.25 });

    y += boxHeight + 14;
  };

  if (report.aiSummary && report.aiSummary !== 'AI analysis unavailable.') {
    addTextSection('AI Performance Summary', report.aiSummary.split('\n').filter(Boolean), COLORS.amber100, COLORS.amber200, COLORS.amber700);
  }

  const likelyLines = (report.likelyToConfirm || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && l !== 'No active leads to analyse.' && l !== 'No strong conversion signals found.')
    .map((l, i) => `${i + 1}. ${l.replace(/^\d+[\.\)]\s*/, '')}`);

  if (likelyLines.length > 0) {
    addTextSection('Likely to Confirm', likelyLines, COLORS.green50, COLORS.green200, COLORS.green700);
  }

  const hotLeads = report.hotNotEnrolled ?? [];
  if (hotLeads.length > 0) {
    const lines = hotLeads.map(l => `[${l.status.toUpperCase()}] ${l.userName} (${l.course})${l.lastRemark ? ` - "${l.lastRemark}"` : ''}`);
    addTextSection(`Pipeline Not Updated (${hotLeads.length})`, lines, COLORS.red50, COLORS.red200, COLORS.red700);
  }

  const responded = report.respondedAfterFollowUp ?? [];
  if (responded.length > 0) {
    const lines = responded.map(l => `- ${l.userName}${l.course ? ` (${l.course})` : ''}`);
    addTextSection(`Responded After Follow-Up (${responded.length})`, lines, COLORS.teal50, COLORS.teal200, COLORS.teal700);
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  ensureSpace(20);
  doc.setTextColor(...COLORS.slate400);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const generatedText = `Generated ${new Date(report.generatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  doc.text(generatedText, PAGE_W - MARGIN - doc.getTextWidth(generatedText), y + 10);

  const filename = `Weekly-AI-Report_${sanitizeFilename(report.counsellor)}_${sanitizeFilename(fmt(report.weekStart))}-${sanitizeFilename(fmt(report.weekEnd))}.pdf`;
  doc.save(filename);
}
