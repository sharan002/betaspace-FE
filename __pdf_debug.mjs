import { jsPDF } from 'jspdf';
console.log('patching, jsPDF.prototype.save typeof =', typeof jsPDF.prototype.save);
jsPDF.prototype.save = function (fn) {
  console.log('PATCHED SAVE CALLED', fn);
};
const mod = await import('./utils/exportWeeklyReportPdf.ts');
console.log('module keys', Object.keys(mod));
try {
  mod.downloadWeeklyReportPdf({
    counsellor: 'X', weekStart: '2026-06-29', weekEnd: '2026-07-05', generatedAt: '2026-07-06',
    metrics: { newLeads:1, enrolledThisWeek:1, noContactCount:0, notContactedPct:0, avgResponseMins:1, slowResponses:0, slowBuckets:{}, thisWeekFees:{totalBilled:1,totalPaid:1}, prevWeekFees:{totalBilled:1,totalPaid:1}, billedPct:1, paidPct:1 },
    aiSummary: 'x', likelyToConfirm: 'x', hotNotEnrolled: [], respondedAfterFollowUp: [],
  });
  console.log('call completed');
} catch (e) {
  console.log('THREW', e);
}
