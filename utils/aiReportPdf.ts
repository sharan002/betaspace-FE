import { jsPDF } from 'jspdf';
import type { WeeklyReport, MonthlyReport } from '../components/WeeklyAIReportView';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

type ColorKey = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'teal' | 'slate' | 'indigo';

const PALETTE: Record<ColorKey, { text: [number, number, number]; bg: [number, number, number]; border: [number, number, number] }> = {
  blue:   { text: [29, 78, 216],  bg: [239, 246, 255], border: [191, 219, 254] },
  green:  { text: [21, 128, 61],  bg: [240, 253, 244], border: [187, 247, 208] },
  red:    { text: [185, 28, 28],  bg: [254, 242, 242], border: [254, 202, 202] },
  amber:  { text: [180, 83, 9],   bg: [255, 251, 235], border: [253, 230, 138] },
  purple: { text: [126, 34, 206], bg: [250, 245, 255], border: [233, 213, 255] },
  teal:   { text: [15, 118, 110], bg: [240, 253, 250], border: [153, 246, 228] },
  slate:  { text: [51, 65, 85],   bg: [248, 250, 252], border: [226, 232, 240] },
  indigo: { text: [67, 56, 202],  bg: [238, 242, 255], border: [199, 210, 254] },
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// jsPDF's built-in fonts don't cover the ₹ glyph (renders as a broken box with
// mangled spacing), so format as "Rs." which is safe under WinAnsiEncoding.
const currency = (n: number) =>
  `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0)}`;

interface NormalizedReport {
  counsellor: string;
  periodType: 'Weekly' | 'Monthly';
  periodLabel: string;
  generatedAt: string;
  newLeads: number;
  enrolled: number;
  noContactCount: number;
  notContactedPct: number;
  avgResponseMins: number | null;
  avgOffHoursResponseMins: number | null;
  offHoursLeadsCount: number;
  offHoursContactedCount: number;
  slowResponses: number;
  slowBuckets: Record<string, number>;
  billed: number;
  paid: number;
  prevBilled: number;
  prevPaid: number;
  billedPct: number | null;
  paidPct: number | null;
  aiSummary: string;
  likelyLines: string[];
  hotLeads: { userName: string; course: string; status: string; lastRemark: string }[];
  responded: { userName: string; course: string; status: string }[];
  upcomingInstallments: { userName: string; course: string; amount: number; dueDate: string }[];
}

function parseLikelyLines(raw: string): string[] {
  return (raw || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && l !== 'No active leads to analyse.' && l !== 'No strong conversion signals found.')
    .map(l => l.replace(/^\d+[\.\)]\s*/, ''));
}

function box(doc: jsPDF, x: number, y: number, w: number, h: number, color: ColorKey) {
  const c = PALETTE[color];
  doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
  doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN - 10) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function metricCard(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string | number, color: ColorKey, sub?: string) {
  box(doc, x, y, w, h, color);
  const c = PALETTE[color];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(c.text[0], c.text[1], c.text[2]);
  doc.text(label.toUpperCase(), x + 3, y + 5);
  doc.setFontSize(11);
  doc.text(String(value), x + 3, y + 11.5);
  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(sub, x + 3, y + h - 2.2);
  }
}

function feeCard(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, amount: number, pct: number | null, prevAmount: number, vsLabel: string) {
  box(doc, x, y, w, h, 'slate');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x + 4, y + 5.5);
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(currency(amount), x + 4, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  if (pct !== null) {
    const up = pct >= 0;
    doc.setTextColor(up ? 21 : 185, up ? 128 : 28, up ? 61 : 28);
    doc.text(`${up ? '+' : '-'}${Math.abs(pct)}% ${vsLabel}`, x + 4, y + h - 3);
  } else {
    doc.setTextColor(148, 163, 184);
    doc.text('No data', x + 4, y + h - 3);
  }
}

interface ListItem {
  prefix: string;
  lines: string[];
}

function drawListSection(doc: jsPDF, y: number, color: ColorKey, title: string, items: ListItem[]): number {
  const lineH = 4;
  const gap = 1.5;
  const totalLines = items.reduce((s, it) => s + it.lines.length, 0);
  const h = 11 + totalLines * lineH + (items.length - 1) * gap;
  y = ensureSpace(doc, y, h + 6);

  box(doc, MARGIN, y, CONTENT_W, h, color);
  const c = PALETTE[color];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(c.text[0], c.text[1], c.text[2]);
  doc.text(title, MARGIN + 4, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(51, 65, 85);
  let ly = y + 12.5;
  items.forEach(item => {
    doc.text(item.prefix + item.lines[0], MARGIN + 4, ly);
    for (let k = 1; k < item.lines.length; k++) {
      ly += lineH;
      doc.text(item.lines[k], MARGIN + 9, ly);
    }
    ly += lineH + gap;
  });

  return y + h + 6;
}

function buildListItems(doc: jsPDF, texts: string[], numbered: boolean): ListItem[] {
  const maxWidth = CONTENT_W - 13;
  return texts.map((t, i) => {
    const prefix = numbered ? `${i + 1}. ` : '• ';
    const lines = doc.splitTextToSize(t, maxWidth);
    return { prefix, lines };
  });
}

function renderReportPdf(data: NormalizedReport): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const headerFill: [number, number, number] = data.periodType === 'Weekly' ? [217, 119, 6] : [37, 99, 235];

  doc.setFillColor(headerFill[0], headerFill[1], headerFill[2]);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`${data.periodType} AI Performance Report`, MARGIN, 11.5);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.counsellor, MARGIN, 18.5);
  doc.setFontSize(8.5);
  doc.text(data.periodLabel, MARGIN, 24);

  let y = 35;

  // Metrics grid
  const gap = 4;
  const cardW = (CONTENT_W - gap * 2) / 3;
  const cardH = 16;
  const metrics: { label: string; value: string | number; color: ColorKey; sub?: string }[] = [
    { label: 'New Leads', value: data.newLeads, color: 'blue' },
    { label: 'Converted', value: data.enrolled, color: 'green' },
    {
      label: 'Not Contacted',
      value: data.noContactCount,
      sub: `${data.notContactedPct}% of leads`,
      color: data.noContactCount > 0 ? 'red' : 'green',
    },
    {
      label: 'Avg Response (Office Hrs)',
      value: data.avgResponseMins !== null ? `${data.avgResponseMins}m` : 'N/A',
      sub: data.avgResponseMins !== null && data.avgResponseMins > 60 ? 'target <60m' : undefined,
      color: data.avgResponseMins !== null && data.avgResponseMins > 60 ? 'amber' : 'teal',
    },
    { label: 'Slow >1hr', value: data.slowResponses, color: data.slowResponses > 0 ? 'amber' : 'green' },
    { label: 'Billed', value: currency(data.billed), color: 'purple' },
    {
      label: 'Off-Hours Effort',
      value: data.avgOffHoursResponseMins !== null ? `${data.avgOffHoursResponseMins}m` : 'N/A',
      color: 'indigo',
    },
  ];
  metrics.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = MARGIN + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    metricCard(doc, x, cy, cardW, cardH, m.label, m.value, m.color, m.sub);
  });
  const metricRows = Math.ceil(metrics.length / 3);
  y += cardH * metricRows + gap * (metricRows - 1) + 8;

  // Off-hours effort
  if (data.offHoursLeadsCount > 0) {
    const text = data.offHoursContactedCount > 0
      ? `Leads that arrived outside office hours were contacted after an avg of ${data.avgOffHoursResponseMins !== null ? `${data.avgOffHoursResponseMins}m` : 'N/A'} of off-hours time - extra effort beyond scheduled working hours.`
      : `${data.offHoursLeadsCount} lead${data.offHoursLeadsCount !== 1 ? 's' : ''} arrived outside office hours and ${data.offHoursLeadsCount !== 1 ? 'were' : 'was'} not yet contacted.`;
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(text, CONTENT_W - 8);
    const h = 9 + lines.length * 4;
    y = ensureSpace(doc, y, h + 6);
    box(doc, MARGIN, y, CONTENT_W, h, 'indigo');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(67, 56, 202);
    doc.text('OFF-HOURS EFFORT', MARGIN + 4, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(lines, MARGIN + 4, y + 10.5);
    y += h + 6;
  }

  // Fees
  const vsLabel = data.periodType === 'Weekly' ? 'vs last week' : 'vs last month';
  const feeW = (CONTENT_W - gap) / 2;
  const feeH = 20;
  feeCard(doc, MARGIN, y, feeW, feeH, `Fees Billed This ${data.periodType === 'Weekly' ? 'Week' : 'Month'}`, data.billed, data.billedPct, data.prevBilled, vsLabel);
  feeCard(doc, MARGIN + feeW + gap, y, feeW, feeH, `Fees Collected This ${data.periodType === 'Weekly' ? 'Week' : 'Month'}`, data.paid, data.paidPct, data.prevPaid, vsLabel);
  y += feeH + 8;

  // Slow response breakdown
  const bucketEntries = Object.entries(data.slowBuckets).filter(([, v]) => v > 0);
  if (data.slowResponses > 0 && bucketEntries.length > 0) {
    const h = 15;
    y = ensureSpace(doc, y, h + 6);
    box(doc, MARGIN, y, CONTENT_W, h, 'amber');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text('SLOW RESPONSE BREAKDOWN (OFFICE HOURS)', MARGIN + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(bucketEntries.map(([range, count]) => `${range}: ${count}`).join('    '), MARGIN + 4, y + 11.5);
    y += h + 6;
  }

  // AI summary
  if (data.aiSummary && data.aiSummary !== 'AI analysis unavailable.') {
    doc.setFontSize(8.3);
    const lines = doc.splitTextToSize(data.aiSummary, CONTENT_W - 8);
    const h = 11 + lines.length * 4;
    y = ensureSpace(doc, y, h + 6);
    box(doc, MARGIN, y, CONTENT_W, h, 'amber');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(180, 83, 9);
    doc.text('AI Performance Summary', MARGIN + 4, y + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(51, 65, 85);
    doc.text(lines, MARGIN + 4, y + 12.5);
    y += h + 6;
  }

  // Likely to confirm
  if (data.likelyLines.length > 0) {
    const items = buildListItems(doc, data.likelyLines, true);
    y = drawListSection(doc, y, 'green', 'Likely to Confirm', items);
  }

  // Hot leads (pipeline not updated)
  if (data.hotLeads.length > 0) {
    const texts = data.hotLeads.map(l =>
      `[${l.status}] ${l.userName} (${l.course})${l.lastRemark ? ` — "${l.lastRemark}"` : ''}`
    );
    const items = buildListItems(doc, texts, false);
    y = drawListSection(doc, y, 'red', `Pipeline Not Updated (${data.hotLeads.length})`, items);
  }

  // Responded after follow-up
  if (data.responded.length > 0) {
    const texts = data.responded.map(l => `${l.userName}${l.course ? ` (${l.course})` : ''}`);
    const items = buildListItems(doc, texts, false);
    y = drawListSection(doc, y, 'teal', `Responded After Follow-Up (${data.responded.length})`, items);
  }

  // Upcoming payments due next week
  if (data.upcomingInstallments.length > 0) {
    const texts = data.upcomingInstallments.map(i =>
      `${i.userName}${i.course ? ` (${i.course})` : ''} — ${currency(i.amount)} due ${fmtDate(i.dueDate)}`
    );
    const items = buildListItems(doc, texts, false);
    y = drawListSection(doc, y, 'teal', `Upcoming Payments Next Week (${data.upcomingInstallments.length})`, items);
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated ${new Date(data.generatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      MARGIN,
      PAGE_H - 8
    );
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN - 20, PAGE_H - 8);
  }

  const safeName = (s: string) => s.replace(/[^a-z0-9]+/gi, '_');
  const fileName = `${safeName(data.counsellor)}_${data.periodType}_AI_Report_${safeName(data.periodLabel)}.pdf`;
  doc.save(fileName);
}

export function downloadWeeklyReportPdf(report: WeeklyReport): void {
  const m = report.metrics;
  renderReportPdf({
    counsellor: report.counsellor,
    periodType: 'Weekly',
    periodLabel: `${fmtDate(report.weekStart)} - ${fmtDate(report.weekEnd)}`,
    generatedAt: report.generatedAt,
    newLeads: m?.newLeads ?? 0,
    enrolled: m?.enrolledThisWeek ?? 0,
    noContactCount: m?.noContactCount ?? 0,
    notContactedPct: m?.notContactedPct ?? 0,
    avgResponseMins: m?.avgResponseMins ?? null,
    avgOffHoursResponseMins: m?.avgOffHoursResponseMins ?? null,
    offHoursLeadsCount: m?.offHoursLeadsCount ?? 0,
    offHoursContactedCount: m?.offHoursContactedCount ?? 0,
    slowResponses: m?.slowResponses ?? 0,
    slowBuckets: m?.slowBuckets ?? {},
    billed: m?.thisWeekFees?.totalBilled ?? 0,
    paid: m?.thisWeekFees?.totalPaid ?? 0,
    prevBilled: m?.prevWeekFees?.totalBilled ?? 0,
    prevPaid: m?.prevWeekFees?.totalPaid ?? 0,
    billedPct: m?.billedPct ?? null,
    paidPct: m?.paidPct ?? null,
    aiSummary: report.aiSummary,
    likelyLines: parseLikelyLines(report.likelyToConfirm),
    hotLeads: report.hotNotEnrolled ?? [],
    responded: report.respondedAfterFollowUp ?? [],
    upcomingInstallments: report.upcomingInstallments ?? [],
  });
}

export function downloadMonthlyReportPdf(report: MonthlyReport): void {
  const m = report.metrics;
  renderReportPdf({
    counsellor: report.counsellor,
    periodType: 'Monthly',
    periodLabel: `${fmtDate(report.monthStart)} - ${fmtDate(report.monthEnd)}`,
    generatedAt: report.generatedAt,
    newLeads: m?.newLeads ?? 0,
    enrolled: m?.enrolledThisMonth ?? 0,
    noContactCount: m?.noContactCount ?? 0,
    notContactedPct: m?.notContactedPct ?? 0,
    avgResponseMins: m?.avgResponseMins ?? null,
    avgOffHoursResponseMins: m?.avgOffHoursResponseMins ?? null,
    offHoursLeadsCount: m?.offHoursLeadsCount ?? 0,
    offHoursContactedCount: m?.offHoursContactedCount ?? 0,
    slowResponses: m?.slowResponses ?? 0,
    slowBuckets: m?.slowBuckets ?? {},
    billed: m?.thisMonthFees?.totalBilled ?? 0,
    paid: m?.thisMonthFees?.totalPaid ?? 0,
    prevBilled: m?.prevMonthFees?.totalBilled ?? 0,
    prevPaid: m?.prevMonthFees?.totalPaid ?? 0,
    billedPct: m?.billedPct ?? null,
    paidPct: m?.paidPct ?? null,
    aiSummary: report.aiSummary,
    likelyLines: parseLikelyLines(report.likelyToConfirm),
    hotLeads: report.hotNotEnrolled ?? [],
    responded: report.respondedAfterFollowUp ?? [],
    upcomingInstallments: [],
  });
}
