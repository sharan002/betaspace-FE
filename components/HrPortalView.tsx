import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { Icons } from './Icons';

// ── Types (local — the HR portal is self-contained) ─────────────────────────
interface HrDocument {
  _id: string;
  docType: string;
  label?: string;
  fileName: string;
  contentType?: string;
  size?: number;
  uploadedAt?: string;
}
interface HrEducation {
  qualification?: string;
  institution?: string;
  specialization?: string;
  yearOfPassing?: string;
  percentage?: string;
}
interface HrPreviousOrg {
  organization?: string;
  designation?: string;
  fromDate?: string;
  toDate?: string;
  lastCtc?: string;
  reasonForLeaving?: string;
}
interface HrBankDetails {
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  branch?: string;
  ifsc?: string;
}
interface HrEmployee {
  _id: string;
  name: string;
  dateOfBirth?: string | null;
  designation?: string;
  dateOfJoining?: string | null;
  sex?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  age?: number | null;
  idCardNumber?: string;
  email?: string;
  contactNumber?: string;
  emergencyContactNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  bankDetails?: HrBankDetails;
  previousOrganizations?: HrPreviousOrg[];
  education?: HrEducation[];
  photo?: { key?: string; contentType?: string; uploadedAt?: string | null };
  documents?: HrDocument[];
  notes?: string;
  active?: boolean;
}
interface HrEmployeeListItem {
  _id: string;
  name: string;
  designation?: string;
  email?: string;
  contactNumber?: string;
  dateOfJoining?: string | null;
  idCardNumber?: string;
  active?: boolean;
  hasPhoto?: boolean;
  documentCount?: number;
  updatedAt?: string;
}

// Dedicated document "slots" that get their own paper-clip attach button.
const SLOT = {
  aadhar: 'Aadhar Card',
  pan: 'PAN Card',
  bank: 'Bank Document',
  prevOrg: 'Previous Organization Document',
  education: 'Educational Document',
} as const;
const SLOT_TYPES: string[] = Object.values(SLOT);
const ADDITIONAL_TYPE = 'Additional Document';

const emptyForm = (): Partial<HrEmployee> => ({
  name: '',
  dateOfBirth: '',
  designation: '',
  dateOfJoining: '',
  sex: '',
  maritalStatus: '',
  bloodGroup: '',
  age: null,
  idCardNumber: '',
  email: '',
  contactNumber: '',
  emergencyContactNumber: '',
  aadharNumber: '',
  panNumber: '',
  bankDetails: { accountHolderName: '', accountNumber: '', bankName: '', branch: '', ifsc: '' },
  previousOrganizations: [],
  education: [],
  notes: '',
  active: true,
});

const toDateInput = (v?: string | null): string => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const fmtDate = (v?: string | null): string => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtSize = (n?: number): string => {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

// ── Inline paper-clip icon (Icons.tsx is intentionally left untouched) ──────
const Clip = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

// ── Small field helpers ────────────────────────────────────────────────────
const Field = ({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between gap-2 min-h-[16px]">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {action}
    </div>
    {children}
  </div>
);

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400';

// ═══════════════════════════════════════════════════════════════════════════
const HrPortalView: React.FC<{ currentUser?: { username?: string; role?: string } | null }> = () => {
  const [list, setList] = useState<HrEmployeeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = new
  const [form, setForm] = useState<Partial<HrEmployee>>(emptyForm());
  const [fullRecord, setFullRecord] = useState<HrEmployee | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');

  const [photoUrl, setPhotoUrl] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Additional documents
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docTitle, setDocTitle] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Slot (paper-clip) attachments
  const slotInputRef = useRef<HTMLInputElement>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);

  // In-app preview overlay
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 3000);
  };

  const loadList = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const rows = await apiService.hrListEmployees(q);
      setList(rows);
    } catch (err: any) {
      showToast(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    const t = window.setTimeout(() => loadList(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search, loadList]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFullRecord(null);
    setEditorError('');
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl('');
    setEditorOpen(true);
  };

  const openEdit = async (id: string) => {
    setEditingId(id);
    setEditorError('');
    setEditorOpen(true);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl('');
    try {
      const emp = await apiService.hrGetEmployee(id);
      setFullRecord(emp);
      setForm({
        ...emptyForm(),
        ...emp,
        dateOfBirth: toDateInput(emp.dateOfBirth),
        dateOfJoining: toDateInput(emp.dateOfJoining),
        bankDetails: { ...emptyForm().bankDetails, ...(emp.bankDetails || {}) },
        previousOrganizations: emp.previousOrganizations || [],
        education: emp.education || [],
      });
      if (emp.photo && emp.photo.key) {
        try {
          const url = await apiService.hrFetchFile(`/hr/employees/${id}/photo`);
          setPhotoUrl(url);
        } catch {
          /* ignore photo load errors */
        }
      }
    } catch (err: any) {
      setEditorError(err.message || 'Failed to load employee');
    }
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setFullRecord(null);
    setEditorError('');
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl('');
    closePreview();
  };

  const setField = (k: keyof HrEmployee, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const setBank = (k: keyof HrBankDetails, v: string) =>
    setForm((p) => ({ ...p, bankDetails: { ...(p.bankDetails || {}), [k]: v } }));

  const flagError = (msg: string) => {
    setEditorError(msg);
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildPayload = () => ({
    name: (form.name || '').trim(),
    dateOfBirth: form.dateOfBirth || '',
    designation: form.designation || '',
    dateOfJoining: form.dateOfJoining || '',
    sex: form.sex || '',
    maritalStatus: form.maritalStatus || '',
    bloodGroup: form.bloodGroup || '',
    age: form.age === null || form.age === undefined || (form.age as any) === '' ? '' : Number(form.age),
    idCardNumber: form.idCardNumber || '',
    email: form.email || '',
    contactNumber: form.contactNumber || '',
    emergencyContactNumber: form.emergencyContactNumber || '',
    aadharNumber: form.aadharNumber || '',
    panNumber: form.panNumber || '',
    bankDetails: form.bankDetails || {},
    previousOrganizations: (form.previousOrganizations || []).filter((o) => o.organization || o.designation),
    education: (form.education || []).filter((e) => e.qualification || e.institution),
    notes: form.notes || '',
    active: form.active !== false,
  });

  const handleSave = async () => {
    if (!(form.name || '').trim()) {
      flagError('Name is required');
      return;
    }
    setSaving(true);
    setEditorError('');
    try {
      const payload = buildPayload();
      if (editingId) {
        await apiService.hrUpdateEmployee(editingId, payload);
        showToast('Employee updated');
      } else {
        const created = await apiService.hrCreateEmployee(payload);
        setEditingId(created._id);
        setFullRecord(created);
        showToast('Employee created — you can now attach photo & documents');
      }
      await loadList(search.trim());
    } catch (err: any) {
      flagError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete employee "${name}"? This also removes all their documents.`)) return;
    try {
      await apiService.hrDeleteEmployee(id);
      showToast('Employee deleted');
      if (editingId === id) closeEditor();
      await loadList(search.trim());
    } catch (err: any) {
      showToast(err.message || 'Failed to delete');
    }
  };

  const refreshRecord = async () => {
    if (!editingId) return;
    const emp = await apiService.hrGetEmployee(editingId);
    setFullRecord(emp);
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingId) return;
    setUploadingPhoto(true);
    try {
      await apiService.hrUploadPhoto(editingId, file);
      const url = await apiService.hrFetchFile(`/hr/employees/${editingId}/photo?ts=${Date.now()}`);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(url);
      showToast('Photo updated');
      await loadList(search.trim());
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── document slots ────────────────────────────────────────────────────
  const docsByType = (t: string): HrDocument[] =>
    (fullRecord?.documents || []).filter((d) => d.docType === t);

  const additionalDocs = (): HrDocument[] =>
    (fullRecord?.documents || []).filter((d) => !SLOT_TYPES.includes(d.docType));

  const pickForSlot = (slotType: string) => {
    if (!editingId) {
      flagError('Create the employee first, then attach documents.');
      return;
    }
    setPendingSlot(slotType);
    slotInputRef.current?.click();
  };

  const handleSlotFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const slotType = pendingSlot;
    setPendingSlot(null);
    if (!file || !editingId || !slotType) return;
    setSlotBusy(slotType);
    try {
      // one document per slot: replace any existing
      for (const d of docsByType(slotType)) {
        await apiService.hrDeleteDocument(editingId, d._id);
      }
      await apiService.hrUploadDocument(editingId, file, slotType, slotType);
      await refreshRecord();
      await loadList(search.trim());
      showToast(`${slotType} attached`);
    } catch (err: any) {
      showToast(err.message || 'Failed to attach document');
    } finally {
      setSlotBusy(null);
    }
  };

  const removeDoc = async (doc: HrDocument) => {
    if (!editingId) return;
    if (!window.confirm(`Remove "${doc.label || doc.fileName}"?`)) return;
    try {
      await apiService.hrDeleteDocument(editingId, doc._id);
      await refreshRecord();
      await loadList(search.trim());
      showToast('Document removed');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove document');
    }
  };

  // ── additional documents ─────────────────────────────────────────────
  const handleDocPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingId) return;
    if (!docTitle.trim()) {
      showToast('Enter a title for the document first');
      return;
    }
    setUploadingDoc(true);
    try {
      await apiService.hrUploadDocument(editingId, file, ADDITIONAL_TYPE, docTitle.trim());
      setDocTitle('');
      await refreshRecord();
      await loadList(search.trim());
      showToast('Document uploaded');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  // ── preview ──────────────────────────────────────────────────────────
  const openPreview = async (doc: HrDocument) => {
    if (!editingId) return;
    try {
      const url = await apiService.hrFetchFile(`/hr/employees/${editingId}/documents/${doc._id}?inline=1`);
      setPreview({ url, type: doc.contentType || '', name: doc.label || doc.fileName });
    } catch (err: any) {
      showToast(err.message || 'Failed to load preview');
    }
  };

  const closePreview = () => {
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p.url);
      return null;
    });
  };

  const downloadDoc = async (doc: HrDocument) => {
    if (!editingId) return;
    try {
      const url = await apiService.hrFetchFile(`/hr/employees/${editingId}/documents/${doc._id}`);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err: any) {
      showToast(err.message || 'Failed to download');
    }
  };

  // ── array field editors ──────────────────────────────────────────────
  const addOrg = () =>
    setForm((p) => ({
      ...p,
      previousOrganizations: [...(p.previousOrganizations || []), { organization: '', designation: '' }],
    }));
  const setOrg = (i: number, k: keyof HrPreviousOrg, v: string) =>
    setForm((p) => {
      const arr = [...(p.previousOrganizations || [])];
      arr[i] = { ...arr[i], [k]: v };
      return { ...p, previousOrganizations: arr };
    });
  const rmOrg = (i: number) =>
    setForm((p) => ({
      ...p,
      previousOrganizations: (p.previousOrganizations || []).filter((_, idx) => idx !== i),
    }));

  const addEdu = () =>
    setForm((p) => ({ ...p, education: [...(p.education || []), { qualification: '', institution: '' }] }));
  const setEdu = (i: number, k: keyof HrEducation, v: string) =>
    setForm((p) => {
      const arr = [...(p.education || [])];
      arr[i] = { ...arr[i], [k]: v };
      return { ...p, education: arr };
    });
  const rmEdu = (i: number) =>
    setForm((p) => ({ ...p, education: (p.education || []).filter((_, idx) => idx !== i) }));

  // ── attach-slot button ───────────────────────────────────────────────
  const SlotButton = ({ slotType }: { slotType: string }) => {
    const docs = docsByType(slotType);
    const doc = docs[0];
    const busy = slotBusy === slotType;
    return (
      <span className="flex items-center gap-1">
        {doc ? (
          <>
            <button
              type="button"
              onClick={() => openPreview(doc)}
              title="Preview attached document"
              className="flex items-center gap-1 text-[11px] font-bold text-green-600 hover:text-green-700"
            >
              <Icons.Check className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              type="button"
              onClick={() => pickForSlot(slotType)}
              disabled={busy}
              title="Replace document"
              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            >
              {busy ? <Icons.RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Icons.Upload className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => removeDoc(doc)}
              title="Remove document"
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <Icons.Trash className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => pickForSlot(slotType)}
            disabled={busy}
            title={editingId ? 'Attach a document' : 'Create the employee first'}
            className="flex items-center gap-1 p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {busy ? (
              <Icons.RefreshCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Clip className="w-4 h-4" />
            )}
            <span className="text-[11px] font-bold">Attach</span>
          </button>
        )}
      </span>
    );
  };

  // ═══════════════════════════ RENDER ═══════════════════════════
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[10002] bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Icons.User className="w-6 h-6 text-indigo-600" /> HR Portal
            </h1>
            <p className="text-sm text-slate-500">Employee records &amp; document management.</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            <Icons.Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, designation, phone, ID…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Icons.RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading…
          </div>
        ) : list.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Icons.User className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No employees yet</p>
            <p className="text-sm opacity-70">Click “Add Employee” to create the first record.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((e) => (
              <div
                key={e._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-800 truncate">{e.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{e.designation || '—'}</p>
                  </div>
                  {!e.active && (
                    <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  {e.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Icons.FileText className="w-3.5 h-3.5 flex-shrink-0" /> {e.email}
                    </div>
                  )}
                  {e.contactNumber && (
                    <div className="flex items-center gap-1.5">
                      <Icons.Phone className="w-3.5 h-3.5 flex-shrink-0" /> {e.contactNumber}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Icons.Calendar className="w-3.5 h-3.5 flex-shrink-0" /> Joined {fmtDate(e.dateOfJoining)}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Icons.FileText className="w-3.5 h-3.5" /> {e.documentCount || 0} docs
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(e._id)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      title="Open"
                    >
                      <Icons.Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(e._id, e.name)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Icons.Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Editor modal ──────────────────────────────────────────── */}
      {editorOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/40 flex items-stretch sm:items-center justify-center sm:p-4">
          <div className="bg-slate-50 w-full sm:max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col sm:max-h-[92vh] overflow-hidden">
            {/* modal header (always visible) */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black text-slate-800 truncate pr-3">
                {editingId ? form.name || 'Edit Employee' : 'New Employee'}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? <Icons.RefreshCcw className="w-4 h-4 animate-spin" /> : <Icons.Check className="w-4 h-4" />}
                  {editingId ? 'Save' : 'Create'}
                </button>
                <button onClick={closeEditor} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* error bar (always visible, between header and scrolling body) */}
            {editorError && (
              <div className="shrink-0 bg-red-50 border-b border-red-200 text-red-700 text-sm font-semibold px-5 py-2.5 flex items-center justify-between gap-3">
                <span>{editorError}</span>
                <button onClick={() => setEditorError('')} className="p-1 rounded hover:bg-red-100 shrink-0">
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div ref={bodyRef} className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Photo + basics */}
              <section className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-28 h-28 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                      {photoUrl ? (
                        <img src={photoUrl} alt="employee" className="w-full h-full object-cover" />
                      ) : (
                        <Icons.User className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={!editingId || uploadingPhoto}
                      className="text-xs font-bold text-indigo-600 hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1"
                      title={!editingId ? 'Save the employee first' : ''}
                    >
                      {uploadingPhoto ? (
                        <Icons.RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Icons.Upload className="w-3.5 h-3.5" />
                      )}
                      {photoUrl ? 'Change photo' : 'Upload photo'}
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Name *">
                      <input className={inputCls} value={form.name || ''} onChange={(e) => setField('name', e.target.value)} />
                    </Field>
                    <Field label="Designation">
                      <input
                        className={inputCls}
                        value={form.designation || ''}
                        onChange={(e) => setField('designation', e.target.value)}
                      />
                    </Field>
                    <Field label="Date of Birth">
                      <input
                        type="date"
                        className={inputCls}
                        value={(form.dateOfBirth as string) || ''}
                        onChange={(e) => setField('dateOfBirth', e.target.value)}
                      />
                    </Field>
                    <Field label="Date of Joining">
                      <input
                        type="date"
                        className={inputCls}
                        value={(form.dateOfJoining as string) || ''}
                        onChange={(e) => setField('dateOfJoining', e.target.value)}
                      />
                    </Field>
                    <Field label="Sex">
                      <select className={inputCls} value={form.sex || ''} onChange={(e) => setField('sex', e.target.value)}>
                        <option value="">—</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </Field>
                    <Field label="Age">
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        value={form.age ?? ''}
                        onChange={(e) => setField('age', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Marital Status">
                      <select
                        className={inputCls}
                        value={form.maritalStatus || ''}
                        onChange={(e) => setField('maritalStatus', e.target.value)}
                      >
                        <option value="">—</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </Field>
                    <Field label="Blood Group">
                      <input
                        className={inputCls}
                        value={form.bloodGroup || ''}
                        onChange={(e) => setField('bloodGroup', e.target.value)}
                        placeholder="e.g. O+"
                      />
                    </Field>
                    <Field label="Active">
                      <select
                        className={inputCls}
                        value={form.active === false ? 'no' : 'yes'}
                        onChange={(e) => setField('active', e.target.value === 'yes')}
                      >
                        <option value="yes">Active</option>
                        <option value="no">Inactive</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </section>

              {/* Contact & IDs */}
              <section className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-black text-slate-700 mb-3">Contact &amp; Identification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Email">
                    <input className={inputCls} value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
                  </Field>
                  <Field label="ID Card Number">
                    <input
                      className={inputCls}
                      value={form.idCardNumber || ''}
                      onChange={(e) => setField('idCardNumber', e.target.value)}
                    />
                  </Field>
                  <Field label="Contact Number">
                    <input
                      className={inputCls}
                      value={form.contactNumber || ''}
                      onChange={(e) => setField('contactNumber', e.target.value)}
                    />
                  </Field>
                  <Field label="Emergency Contact Number">
                    <input
                      className={inputCls}
                      value={form.emergencyContactNumber || ''}
                      onChange={(e) => setField('emergencyContactNumber', e.target.value)}
                    />
                  </Field>
                  <Field label="Aadhar Card Number" action={<SlotButton slotType={SLOT.aadhar} />}>
                    <input
                      className={inputCls}
                      value={form.aadharNumber || ''}
                      onChange={(e) => setField('aadharNumber', e.target.value)}
                    />
                  </Field>
                  <Field label="PAN Card Number" action={<SlotButton slotType={SLOT.pan} />}>
                    <input
                      className={inputCls}
                      value={form.panNumber || ''}
                      onChange={(e) => setField('panNumber', e.target.value)}
                    />
                  </Field>
                </div>
              </section>

              {/* Bank details */}
              <section className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h3 className="text-sm font-black text-slate-700">Bank Details</h3>
                  <SlotButton slotType={SLOT.bank} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Account Holder Name">
                    <input
                      className={inputCls}
                      value={form.bankDetails?.accountHolderName || ''}
                      onChange={(e) => setBank('accountHolderName', e.target.value)}
                    />
                  </Field>
                  <Field label="Account Number">
                    <input
                      className={inputCls}
                      value={form.bankDetails?.accountNumber || ''}
                      onChange={(e) => setBank('accountNumber', e.target.value)}
                    />
                  </Field>
                  <Field label="Bank Name">
                    <input
                      className={inputCls}
                      value={form.bankDetails?.bankName || ''}
                      onChange={(e) => setBank('bankName', e.target.value)}
                    />
                  </Field>
                  <Field label="Branch">
                    <input
                      className={inputCls}
                      value={form.bankDetails?.branch || ''}
                      onChange={(e) => setBank('branch', e.target.value)}
                    />
                  </Field>
                  <Field label="IFSC">
                    <input
                      className={inputCls}
                      value={form.bankDetails?.ifsc || ''}
                      onChange={(e) => setBank('ifsc', e.target.value)}
                    />
                  </Field>
                </div>
              </section>

              {/* Previous organizations */}
              <section className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h3 className="text-sm font-black text-slate-700">Previous Organization Details</h3>
                  <div className="flex items-center gap-3">
                    <SlotButton slotType={SLOT.prevOrg} />
                    <button onClick={addOrg} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                      <Icons.Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
                {(form.previousOrganizations || []).length === 0 && (
                  <p className="text-xs text-slate-400">No previous organizations added.</p>
                )}
                <div className="space-y-3">
                  {(form.previousOrganizations || []).map((o, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-3 relative">
                      <button
                        onClick={() => rmOrg(i)}
                        className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Icons.Trash className="w-3.5 h-3.5" />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Organization">
                          <input className={inputCls} value={o.organization || ''} onChange={(e) => setOrg(i, 'organization', e.target.value)} />
                        </Field>
                        <Field label="Designation">
                          <input className={inputCls} value={o.designation || ''} onChange={(e) => setOrg(i, 'designation', e.target.value)} />
                        </Field>
                        <Field label="From">
                          <input className={inputCls} value={o.fromDate || ''} onChange={(e) => setOrg(i, 'fromDate', e.target.value)} placeholder="MM/YYYY" />
                        </Field>
                        <Field label="To">
                          <input className={inputCls} value={o.toDate || ''} onChange={(e) => setOrg(i, 'toDate', e.target.value)} placeholder="MM/YYYY" />
                        </Field>
                        <Field label="Last CTC">
                          <input className={inputCls} value={o.lastCtc || ''} onChange={(e) => setOrg(i, 'lastCtc', e.target.value)} />
                        </Field>
                        <Field label="Reason for Leaving">
                          <input className={inputCls} value={o.reasonForLeaving || ''} onChange={(e) => setOrg(i, 'reasonForLeaving', e.target.value)} />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Education */}
              <section className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h3 className="text-sm font-black text-slate-700">Educational Details</h3>
                  <div className="flex items-center gap-3">
                    <SlotButton slotType={SLOT.education} />
                    <button onClick={addEdu} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                      <Icons.Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
                {(form.education || []).length === 0 && <p className="text-xs text-slate-400">No education records added.</p>}
                <div className="space-y-3">
                  {(form.education || []).map((ed, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-3 relative">
                      <button
                        onClick={() => rmEdu(i)}
                        className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Icons.Trash className="w-3.5 h-3.5" />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Qualification">
                          <input className={inputCls} value={ed.qualification || ''} onChange={(e) => setEdu(i, 'qualification', e.target.value)} placeholder="e.g. B.E CSE" />
                        </Field>
                        <Field label="Institution">
                          <input className={inputCls} value={ed.institution || ''} onChange={(e) => setEdu(i, 'institution', e.target.value)} />
                        </Field>
                        <Field label="Specialization">
                          <input className={inputCls} value={ed.specialization || ''} onChange={(e) => setEdu(i, 'specialization', e.target.value)} />
                        </Field>
                        <Field label="Year of Passing">
                          <input className={inputCls} value={ed.yearOfPassing || ''} onChange={(e) => setEdu(i, 'yearOfPassing', e.target.value)} />
                        </Field>
                        <Field label="Percentage / CGPA">
                          <input className={inputCls} value={ed.percentage || ''} onChange={(e) => setEdu(i, 'percentage', e.target.value)} />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Notes */}
              <section className="bg-white rounded-xl border border-slate-200 p-4">
                <Field label="Notes">
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={form.notes || ''}
                    onChange={(e) => setField('notes', e.target.value)}
                  />
                </Field>
              </section>

              {/* Additional Documents */}
              <section className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-black text-slate-700 mb-3">Additional Documents</h3>
                {!editingId ? (
                  <p className="text-xs text-slate-400">Save the employee first, then attach documents.</p>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-end mb-4 bg-slate-50 rounded-lg p-3">
                      <Field label="Title">
                        <input
                          className={inputCls}
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          placeholder="e.g. 10th Marksheet, Experience Letter"
                        />
                      </Field>
                      <input ref={docInputRef} type="file" className="hidden" onChange={handleDocPick} />
                      <button
                        onClick={() => {
                          if (!docTitle.trim()) {
                            showToast('Enter a title for the document first');
                            return;
                          }
                          docInputRef.current?.click();
                        }}
                        disabled={uploadingDoc}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
                      >
                        {uploadingDoc ? (
                          <Icons.RefreshCcw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Clip className="w-4 h-4" />
                        )}
                        Attach
                      </button>
                    </div>

                    {additionalDocs().length === 0 ? (
                      <p className="text-xs text-slate-400">No additional documents uploaded.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {additionalDocs().map((doc) => (
                          <div key={doc._id} className="flex items-center gap-3 py-2.5">
                            <Icons.FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-700 truncate">{doc.label || doc.fileName}</p>
                              <p className="text-[11px] text-slate-400">
                                {doc.fileName}
                                {doc.size ? ` · ${fmtSize(doc.size)}` : ''} · {fmtDate(doc.uploadedAt)}
                              </p>
                            </div>
                            <button onClick={() => openPreview(doc)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="Preview">
                              <Icons.Search className="w-4 h-4" />
                            </button>
                            <button onClick={() => downloadDoc(doc)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="Download">
                              <Icons.Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeDoc(doc)}
                              className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Icons.Trash className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* All attached documents summary (slots + additional) */}
              {editingId && (fullRecord?.documents || []).length > 0 && (
                <section className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-black text-slate-700 mb-3">All Attached Documents</h3>
                  <div className="divide-y divide-slate-100">
                    {(fullRecord?.documents || []).map((doc) => (
                      <div key={doc._id} className="flex items-center gap-3 py-2">
                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded whitespace-nowrap">
                          {doc.docType}
                        </span>
                        <span className="text-xs text-slate-600 truncate flex-1">{doc.label || doc.fileName}</span>
                        <button onClick={() => openPreview(doc)} className="p-1.5 rounded text-slate-500 hover:bg-slate-100" title="Preview">
                          <Icons.Search className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => downloadDoc(doc)} className="p-1.5 rounded text-slate-500 hover:bg-slate-100" title="Download">
                          <Icons.Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {editingId && (
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDelete(editingId, form.name || 'this employee')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50"
                  >
                    <Icons.Trash className="w-4 h-4" /> Delete Employee
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* shared hidden input for slot uploads */}
          <input ref={slotInputRef} type="file" className="hidden" onChange={handleSlotFile} />
        </div>
      )}

      {/* ── Document preview overlay ──────────────────────────────── */}
      {preview && (
        <div className="fixed inset-0 z-[10001] bg-black/70 flex flex-col" onClick={closePreview}>
          <div className="flex items-center justify-between px-4 py-3 text-white shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="font-bold truncate pr-3">{preview.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg hover:bg-white/10"
                title="Open in new tab"
              >
                <Icons.Upload className="w-5 h-5 rotate-90" />
              </a>
              <button onClick={closePreview} className="p-2 rounded-lg hover:bg-white/10" title="Close">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-4 pt-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {preview.type.startsWith('image/') ? (
              <img src={preview.url} alt={preview.name} className="max-w-full max-h-full object-contain rounded-lg bg-white" />
            ) : preview.type === 'application/pdf' ? (
              <iframe title={preview.name} src={preview.url} className="w-full h-full rounded-lg bg-white" />
            ) : (
              <div className="bg-white rounded-xl p-8 text-center max-w-sm">
                <Icons.FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-600 mb-4">Preview isn’t available for this file type.</p>
                <a
                  href={preview.url}
                  download={preview.name}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold"
                >
                  <Icons.Download className="w-4 h-4" /> Download
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HrPortalView;
