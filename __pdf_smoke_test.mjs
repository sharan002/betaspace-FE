import { jsPDF } from 'jspdf';
import fs from 'node:fs';

const originalSave = jsPDF.prototype.save;
jsPDF.prototype.save = function (filename) {
  const blob = this.output('arraybuffer');
  fs.writeFileSync('C:/Users/DS/AppData/Local/Temp/claude/c--Users-DS-showdemocrmFE/09f301a9-a573-42a1-813e-245eb40510a1/scratchpad/' + filename, Buffer.from(blob));
  console.log('SAVED:', filename, blob.byteLength, 'bytes');
};

const { downloadWeeklyReportPdf } = await import('./utils/exportWeeklyReportPdf.ts');

const sampleReport = {
  counsellor: 'Priya Sharma',
  weekStart: '2026-06-29T00:00:00.000Z',
  weekEnd: '2026-07-05T00:00:00.000Z',
  generatedAt: '2026-07-06T03:30:00.000Z',
  metrics: {
    newLeads: 24,
    enrolledThisWeek: 5,
    noContactCount: 3,
    notContactedPct: 12,
    avgResponseMins: 75,
    slowResponses: 4,
    slowBuckets: { '1-2hr': 2, '2-4hr': 1, '4hr+': 1 },
    thisWeekFees: { totalBilled: 125000, totalPaid: 98000 },
    prevWeekFees: { totalBilled: 100000, totalPaid: 80000 },
    billedPct: 25,
    paidPct: 22.5,
  },
  aiSummary: 'Strong week overall with a 25% increase in billing.\nResponse times need improvement for 4 leads that took over an hour.',
  likelyToConfirm: '1. Rahul Verma - showed strong interest in Data Science course\n2. Anjali Nair - requested fee structure twice',
  hotNotEnrolled: [
    { userName: 'Karthik Iyer', course: 'Full Stack Dev', status: 'Hot', lastRemark: 'Will confirm by Friday' },
    { userName: 'Divya Menon', course: 'UI/UX', status: 'Warm', lastRemark: '' },
  ],
  respondedAfterFollowUp: [
    { userName: 'Sanjay Gupta', course: 'Cloud Computing', status: 'Warm' },
  ],
};

downloadWeeklyReportPdf(sampleReport);

const emptyReport = {
  counsellor: 'Test User With A Fairly Long Name',
  weekStart: '2026-06-29T00:00:00.000Z',
  weekEnd: '2026-07-05T00:00:00.000Z',
  generatedAt: '2026-07-06T03:30:00.000Z',
  metrics: {
    newLeads: 0,
    enrolledThisWeek: 0,
    noContactCount: 0,
    notContactedPct: 0,
    avgResponseMins: null,
    slowResponses: 0,
    slowBuckets: {},
    thisWeekFees: { totalBilled: 0, totalPaid: 0 },
    prevWeekFees: { totalBilled: 0, totalPaid: 0 },
    billedPct: null,
    paidPct: null,
  },
  aiSummary: 'AI analysis unavailable.',
  likelyToConfirm: 'No active leads to analyse.',
  hotNotEnrolled: [],
  respondedAfterFollowUp: [],
};

downloadWeeklyReportPdf(emptyReport);

console.log('DONE - no exceptions thrown');
