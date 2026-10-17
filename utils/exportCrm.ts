import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import type { FilterState } from '../App';
import { isConvertedStage } from './pipeline';

const EXPORT_CHUNK = 500;

function parseDate(val: any): string {
  if (!val) return '';
  try {
    const s = typeof val === 'string' ? val : (val.$date || '');
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

function getField(lead: any, ...keys: string[]): string {
  for (const k of keys) {
    if (lead[k] !== undefined && lead[k] !== null && lead[k] !== '') return String(lead[k]);
  }
  return '';
}

function getLastRemark(lead: any): string {
  const remarks: any[] = Array.isArray(lead.remarks) ? lead.remarks : [];
  if (!remarks.length) return '';
  const sorted = [...remarks].sort((a, b) => {
    const ta = typeof a.timestamp === 'string' ? a.timestamp : (a.timestamp?.$date || '');
    const tb = typeof b.timestamp === 'string' ? b.timestamp : (b.timestamp?.$date || '');
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  return sorted[0]?.remark || '';
}

function getAllRemarks(lead: any): string {
  const remarks: any[] = Array.isArray(lead.remarks) ? lead.remarks : [];
  if (!remarks.length) return '';
  return remarks
    .map((r: any) => {
      const ts = parseDate(r.timestamp);
      const by = r.addedBy || r.username || r.createdBy || r.by || '';
      return `${ts}${by ? ` [${by}]` : ''}: ${r.remark || ''}`;
    })
    .join(' | ');
}

async function fetchAllForView(
  view: string,
  mode: 'summary' | 'full',
  searchQuery: string = '',
  filters: Record<string, any> = {},
): Promise<any[]> {
  let page = 1;
  let total = Infinity;
  const all: any[] = [];

  while (all.length < total) {
    const res = await apiService.queryLeads({
      view,
      page,
      limit: EXPORT_CHUNK,
      includeStats: page === 1,
      mode,
      searchQuery,
      filters,
    });

    if (!res?.success) break;
    if (page === 1) total = typeof res.total === 'number' ? res.total : Infinity;

    const chunk: any[] = res.leads || [];
    all.push(...chunk);

    if (chunk.length < EXPORT_CHUNK) break;
    page++;
    if (page > 500) break; // safety guard
  }

  return all;
}

function addSheetToWorkbook(wb: XLSX.WorkBook, name: string, aoa: any[][]): void {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ─── Sheet builders ────────────────────────────────────────────────────────────

function buildDashboardRows(leads: any[]): any[][] {
  const headers = [
    'Name', 'Phone', 'Course', 'Program Type', 'Source', 'Status', 'Pipeline',
    'Assigned To', 'Profession', 'Location', 'Date Created', 'Last Interacted',
    'Reminder', 'Follow-ups', 'Last Remark', 'All Remarks',
  ];
  return [
    headers,
    ...leads.map(l => [
      getField(l, 'userName', 'username') || 'Unknown',
      getField(l, 'userNumber') || '',
      getField(l, 'course', 'courseofintrest', 'courseTitle') || '',
      getField(l, 'programType', 'program_type') || '',
      getField(l, 'leadfrom', 'source') || '',
      getField(l, 'status') || '',
      getField(l, 'pipeline') || '',
      getField(l, 'assignedto') || '',
      getField(l, 'profession') || '',
      getField(l, 'location', 'city') || '',
      parseDate(l.datecreated),
      parseDate(l.lastInteracted),
      l.reminder ? parseDate(l.reminder) : '',
      l.followUpCount || 0,
      getLastRemark(l),
      getAllRemarks(l),
    ]),
  ];
}

function buildRemindersRows(leads: any[]): any[][] {
  const headers = [
    'Name', 'Phone', 'Course', 'Source', 'Status', 'Pipeline',
    'Assigned To', 'Reminder Date', 'Follow-ups', 'Last Remark', 'Date Created',
  ];
  return [
    headers,
    ...leads.map(l => [
      getField(l, 'userName', 'username') || 'Unknown',
      getField(l, 'userNumber') || '',
      getField(l, 'course', 'courseofintrest', 'courseTitle') || '',
      getField(l, 'leadfrom', 'source') || '',
      getField(l, 'status') || '',
      getField(l, 'pipeline') || '',
      getField(l, 'assignedto') || '',
      l.reminder ? parseDate(l.reminder) : '',
      l.followUpCount || 0,
      getLastRemark(l),
      parseDate(l.datecreated),
    ]),
  ];
}

function buildFeesRows(leads: any[]): any[][] {
  // Only enrolled leads (same filter as FeesView)
  const enrolled = leads.filter(l => isConvertedStage(l.pipeline));

  // Determine max installments across all enrolled leads
  let maxInst = 0;
  for (const l of enrolled) {
    const fees = l.fees || l.feeStructure;
    const n = Array.isArray(fees?.installments) ? fees.installments.length : 0;
    if (n > maxInst) maxInst = n;
  }

  const instHeaders: string[] = [];
  for (let i = 1; i <= maxInst; i++) {
    instHeaders.push(`Inst.${i} Amount`, `Inst.${i} Due Date`, `Inst.${i} Status`, `Inst.${i} Paid At`);
  }

  const headers = [
    'Name', 'Phone', 'Course', 'Program Type',
    'Billed Amount', 'Total Paid', 'Total Pending',
    'Assigned To', 'Last Remark',
    ...instHeaders,
  ];

  const rows = enrolled.map(l => {
    const fees = l.fees || l.feeStructure;
    const installs: any[] = Array.isArray(fees?.installments) ? fees.installments : [];
    const paid = installs.filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const pending = installs.filter((i: any) => i.status === 'Pending').reduce((s: number, i: any) => s + (i.amount || 0), 0);

    const base = [
      getField(l, 'userName', 'username') || 'Unknown',
      getField(l, 'userNumber') || '',
      getField(l, 'course', 'courseofintrest', 'courseTitle') || '',
      getField(l, 'programType', 'program_type') || '',
      fees?.billedAmount || 0,
      paid,
      pending,
      getField(l, 'assignedto') || '',
      getLastRemark(l),
    ];

    const instCells: any[] = [];
    for (let i = 0; i < maxInst; i++) {
      const inst = installs[i];
      if (inst) {
        instCells.push(
          inst.amount || 0,
          parseDate(inst.dueDate),
          inst.status || '',
          inst.paidAt ? parseDate(inst.paidAt) : '',
        );
      } else {
        instCells.push('', '', '', '');
      }
    }

    return [...base, ...instCells];
  });

  return [headers, ...rows];
}

function buildNotInterestedRows(leads: any[]): any[][] {
  const headers = [
    'Name', 'Phone', 'Course', 'Source', 'Status', 'Pipeline',
    'Assigned To', 'Last Remark', 'Date Created', 'Last Interacted',
  ];
  return [
    headers,
    ...leads.map(l => [
      getField(l, 'userName', 'username') || 'Unknown',
      getField(l, 'userNumber') || '',
      getField(l, 'course', 'courseofintrest', 'courseTitle') || '',
      getField(l, 'leadfrom', 'source') || '',
      getField(l, 'status') || '',
      getField(l, 'pipeline') || '',
      getField(l, 'assignedto') || '',
      getLastRemark(l),
      parseDate(l.datecreated),
      parseDate(l.lastInteracted),
    ]),
  ];
}

// ─── Per-view export config (shared by the full export and the single-view export) ────

type ExportStep = {
  view: string;
  label: string;
  sheetName: string;
  mode: 'summary' | 'full';
  build: (leads: any[]) => any[][];
};

const EXPORT_STEPS: Record<string, ExportStep> = {
  dashboard:             { view: 'dashboard',           label: 'Dashboard',           sheetName: 'Dashboard',           mode: 'summary', build: buildDashboardRows     },
  transferred:           { view: 'transferred',         label: 'Transferred',         sheetName: 'Transferred',         mode: 'summary', build: buildDashboardRows     },
  reminders:             { view: 'reminders',           label: 'Reminders',           sheetName: 'Reminders',           mode: 'summary', build: buildRemindersRows     },
  fees:                  { view: 'fees',                label: 'Fees',                sheetName: 'Fees',                mode: 'full',    build: buildFeesRows          },
  converted:             { view: 'converted',           label: 'Converted',           sheetName: 'Converted',           mode: 'summary', build: buildNotInterestedRows },
  'not-interested':      { view: 'not-interested',      label: 'Not Interested',      sheetName: 'Not Interested',      mode: 'summary', build: buildNotInterestedRows },
};

// Tabs whose data App.tsx's global FilterPanel actually narrows — Reminders
// and Fees manage their own local filtering
// and only share the top search box with the rest of the app.
const FILTERABLE_VIEWS = new Set(['dashboard', 'transferred', 'converted', 'not-interested']);

// Reminders intentionally ignores the search box too (mirrors fetchLeadsForCurrentView in App.tsx).
const SEARCHABLE_VIEWS = new Set(['dashboard', 'transferred', 'converted', 'not-interested', 'fees']);

function isFilterStateActive(filters: FilterState): boolean {
  const {
    courses, programTypes, professions, sources, statuses, pipelines,
    assignedUsers, campaigns, fromDate, toDate, statusFilter,
  } = filters;
  const arrayFiltersActive =
    courses.length > 0 || programTypes.length > 0 || professions.length > 0 ||
    sources.length > 0 || statuses.length > 0 || pipelines.length > 0 ||
    assignedUsers.length > 0 || campaigns.length > 0;
  return arrayFiltersActive || fromDate !== '' || toDate !== '' || statusFilter !== null;
}

async function exportSingleView(
  step: ExportStep,
  searchQuery: string,
  filters: Record<string, any>,
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.(`Fetching ${step.label}...`);
  const leads = await fetchAllForView(step.view, step.mode, searchQuery, filters);
  const wb = XLSX.utils.book_new();
  addSheetToWorkbook(wb, step.sheetName, step.build(leads));
  const safeName = step.sheetName.replace(/[^a-z0-9]+/gi, '_');
  XLSX.writeFile(wb, `CRM_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Main export entry points ──────────────────────────────────────────────────

export async function exportAllCrmData(onProgress?: (msg: string) => void): Promise<void> {
  const wb = XLSX.utils.book_new();

  const steps = [
    EXPORT_STEPS.dashboard,
    EXPORT_STEPS.reminders,
    EXPORT_STEPS.fees,
    EXPORT_STEPS.converted,
    EXPORT_STEPS['not-interested'],
  ];

  for (const step of steps) {
    onProgress?.(`Fetching ${step.label}...`);
    const leads = await fetchAllForView(step.view, step.mode);
    const aoa = step.build(leads);
    addSheetToWorkbook(wb, step.sheetName, aoa);
  }

  const filename = `CRM_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Sidebar "Export CRM" button: a specific tab exports just that tab, the Dashboard
// with an active filter/search exports just the filtered subset, otherwise exports everything.
export async function exportCrmData(
  currentView: string,
  filters: FilterState,
  searchQuery: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const step = EXPORT_STEPS[currentView];
  const trimmedSearch = (searchQuery || '').trim();

  if (step && currentView !== 'dashboard') {
    const effectiveSearch = SEARCHABLE_VIEWS.has(currentView) ? trimmedSearch : '';
    const effectiveFilters = FILTERABLE_VIEWS.has(currentView) ? filters : {};
    await exportSingleView(step, effectiveSearch, effectiveFilters, onProgress);
    return;
  }

  if (trimmedSearch.length > 0 || isFilterStateActive(filters)) {
    await exportSingleView(EXPORT_STEPS.dashboard, trimmedSearch, filters, onProgress);
    return;
  }

  await exportAllCrmData(onProgress);
}
