import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Icons } from './Icons';

// ── Minimal types for File System Access API (not in standard TS lib) ────────
declare global {
  interface Window {
    showOpenFilePicker?: (opts?: object) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (opts?: object) => Promise<FileSystemFileHandle>;
  }
}
interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
  queryPermission(desc?: { mode?: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission(desc?: { mode?: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>;
}
interface FileSystemWritableFileStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
}

// ── IndexedDB helpers ────────────────────────────────────────────────────────
const DB_NAME = 'crm_notes_db';
const DB_VERSION = 1;
const STORE = 'notes';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<unknown> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Types ────────────────────────────────────────────────────────────────────
interface SheetRow { id: string; cells: string[]; }
interface NotesViewProps { currentUser: { username: string } | null; }

const DEFAULT_HEADERS = ['Name', 'Phone', 'Note', 'Date'];

// Module-level: survives component unmount/remount within the same browser session.
// (FileSystemFileHandle cannot be JSON-serialised, so we keep it here instead of IDB.)
let _moduleHandle: FileSystemFileHandle | null = null;
let _moduleFileName: string | null = null;

const EXCEL_PICKER_OPTS = {
  types: [{ description: 'Excel / CSV', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xls', '.csv'] } }],
  multiple: false,
};
const EXCEL_SAVE_OPTS = (name: string) => ({
  suggestedName: name,
  types: [{ description: 'Excel Workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
});

// ── Component ────────────────────────────────────────────────────────────────
const NotesView: React.FC<NotesViewProps> = ({ currentUser }) => {
  const username = currentUser?.username ?? 'guest';
  const idbKey = `notes_${username}`;

  const [notepad, setNotepad] = useState('');
  const [sheetHeaders, setSheetHeaders] = useState<string[]>(DEFAULT_HEADERS);
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [activeTab, setActiveTab] = useState<'notepad' | 'sheet'>('notepad');
  const [loadedFileName, setLoadedFileName] = useState<string | null>(_moduleFileName);
  const [hasFileHandle, setHasFileHandle] = useState(!!_moduleHandle);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  const isLoadedRef = useRef(false);
  // Ref holds the actual handle object; hasFileHandle state drives re-renders
  const fileHandleRef = useRef<FileSystemFileHandle | null>(_moduleHandle);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStatus = (msg: string, ok = true) => {
    setStatus({ msg, ok });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 3000);
  };

  // ── Load from IndexedDB on mount ──────────────────────────────────────────
  useEffect(() => {
    isLoadedRef.current = false;
    const handleKey = `${idbKey}_handle`;

    Promise.all([idbGet(idbKey), idbGet(handleKey)]).then(([data, storedHandle]: [any, any]) => {
      if (data) {
        setNotepad(data.notepad ?? '');
        setSheetHeaders(Array.isArray(data.sheetHeaders) && data.sheetHeaders.length ? data.sheetHeaders : DEFAULT_HEADERS);
        setSheetRows(data.sheetRows ?? []);
        if (data.loadedFileName) setLoadedFileName(data.loadedFileName);
      }
      // Restore file handle from IDB (survives page refresh)
      if (storedHandle && !fileHandleRef.current) {
        fileHandleRef.current = storedHandle;
        _moduleHandle = storedHandle;
        setHasFileHandle(true);
        // Restore filename from handle if not already set from data
        storedHandle.getFile().then((f: File) => {
          _moduleFileName = f.name;
          setLoadedFileName(prev => prev ?? f.name);
        }).catch(() => {});
      }
      isLoadedRef.current = true;
    }).catch(() => { isLoadedRef.current = true; });
  }, [idbKey]);

  // ── Auto-save to IndexedDB on every change (guarded until load completes) ─
  useEffect(() => {
    if (!isLoadedRef.current) return;
    idbSet(idbKey, { notepad, sheetHeaders, sheetRows, loadedFileName }).catch(() => {});
  }, [notepad, sheetHeaders, sheetRows, loadedFileName, idbKey]);

  // ── Sheet helpers ─────────────────────────────────────────────────────────
  const addRow = () =>
    setSheetRows(p => [...p, { id: `${Date.now()}-${Math.random()}`, cells: sheetHeaders.map(() => '') }]);

  const deleteRow = (id: string) => setSheetRows(p => p.filter(r => r.id !== id));

  const updateCell = (id: string, ci: number, v: string) =>
    setSheetRows(p => p.map(r => r.id === id ? { ...r, cells: r.cells.map((c, i) => i === ci ? v : c) } : r));

  const updateHeader = (idx: number, v: string) =>
    setSheetHeaders(p => p.map((h, i) => i === idx ? v : h));

  const addColumn = () => {
    setSheetHeaders(p => [...p, `Column ${p.length + 1}`]);
    setSheetRows(p => p.map(r => ({ ...r, cells: [...r.cells, ''] })));
  };

  const deleteColumn = (idx: number) => {
    if (sheetHeaders.length <= 1) return;
    setSheetHeaders(p => p.filter((_, i) => i !== idx));
    setSheetRows(p => p.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== idx) })));
  };

  // ── Parse raw ArrayBuffer → sheet state ───────────────────────────────────
  const applyWorkbook = (buf: ArrayBuffer, fileName: string) => {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
    if (!aoa.length) return;
    const headers = aoa[0].map(String);
    const rows: SheetRow[] = aoa.slice(1).map((r, i) => ({
      id: `${Date.now()}-${i}`,
      cells: headers.map((_, ci) => String(r[ci] ?? '')),
    }));
    setSheetHeaders(headers.length ? headers : DEFAULT_HEADERS);
    setSheetRows(rows);
    setLoadedFileName(fileName);
    showStatus(`Loaded "${fileName}"`);
  };

  // ── Build XLSX workbook from current sheet ─────────────────────────────────
  const buildWorkbook = () => {
    const ws = XLSX.utils.aoa_to_sheet([sheetHeaders, ...sheetRows.map(r => r.cells)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notes');
    return wb;
  };

  // ── Load Excel (File System Access API → fallback to <input>) ─────────────
  const handleLoadExcel = async () => {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker(EXCEL_PICKER_OPTS);
        const file = await handle.getFile();
        const buf = await file.arrayBuffer();
        fileHandleRef.current = handle;
        _moduleHandle = handle;
        _moduleFileName = file.name;
        setHasFileHandle(true);
        idbSet(`${idbKey}_handle`, handle).catch(() => {});
        applyWorkbook(buf, file.name);
      } catch (e: any) {
        if (e?.name !== 'AbortError') showStatus('Could not open file', false);
      }
    } else {
      fallbackInputRef.current?.click();
    }
  };

  // Fallback: classic file input (for browsers without File System Access API)
  const handleFallbackInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    fileHandleRef.current = null;
    _moduleHandle = null;
    _moduleFileName = null;
    setHasFileHandle(false);
    applyWorkbook(buf, file.name);
    e.target.value = '';
  };

  // ── Save Excel (write back to same file if handle exists, else Save-As) ───
  const handleSaveExcel = async () => {
    const wb = buildWorkbook();
    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    if (fileHandleRef.current) {
      // After a page refresh the browser requires re-granting write permission
      try {
        const perm = await fileHandleRef.current.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') { showStatus('Write permission denied', false); return; }
        const writable = await fileHandleRef.current.createWritable();
        await writable.write(buf);
        await writable.close();
        showStatus(`Saved to "${loadedFileName}"`);
      } catch (e: any) {
        if (e?.name !== 'AbortError') showStatus('Save failed — try "Save as new"', false);
      }
    } else {
      // No handle yet → open Save-As dialog or fall back to download
      await handleSaveAsNew(wb, buf);
    }
  };

  // ── Save as new file ───────────────────────────────────────────────────────
  const handleSaveAsNew = async (wb?: ReturnType<typeof buildWorkbook>, existingBuf?: ArrayBuffer) => {
    const workbook = wb ?? buildWorkbook();
    const suggestedName = `notes_${username}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker(EXCEL_SAVE_OPTS(suggestedName));
        const arrayBuf: ArrayBuffer = existingBuf ?? XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const writable = await handle.createWritable();
        await writable.write(arrayBuf);
        await writable.close();
        fileHandleRef.current = handle;
        _moduleHandle = handle;
        const savedFile = await handle.getFile();
        _moduleFileName = savedFile.name;
        setHasFileHandle(true);
        idbSet(`${idbKey}_handle`, handle).catch(() => {});
        setLoadedFileName(savedFile.name);
        showStatus(`Saved as "${savedFile.name}"`);
      } catch (e: any) {
        if (e?.name !== 'AbortError') showStatus('Save cancelled', false);
      }
    } else {
      // Browser doesn't support File System Access API — fall back to download
      XLSX.writeFile(workbook, suggestedName);
      showStatus('Downloaded as Excel file');
    }
  };

  // ── Save notepad as .txt ───────────────────────────────────────────────────
  const handleSaveNotepad = async () => {
    const suggestedName = `notes_${username}_${new Date().toISOString().slice(0, 10)}.txt`;
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: 'Text file', accept: { 'text/plain': ['.txt'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(notepad);
        await writable.close();
        showStatus('Notepad saved');
      } catch (e: any) {
        if (e?.name !== 'AbortError') showStatus('Save cancelled', false);
      }
    } else {
      const blob = new Blob([notepad], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = suggestedName; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const hasFileSystemAPI = !!window.showOpenFilePicker;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Notes & Sheet</h3>
            <p className="text-sm text-slate-500">
              Auto-saved locally on this device (IndexedDB).
              {loadedFileName && activeTab === 'sheet' && (
                <span className="ml-2 text-slate-400">
                  Working on: <span className="font-semibold text-slate-600">{loadedFileName}</span>
                </span>
              )}
            </p>
          </div>
          {status && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${status.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {status.ok ? <Icons.Check className="w-3.5 h-3.5" /> : <Icons.X className="w-3.5 h-3.5" />}
              {status.msg}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {(['notepad', 'sheet'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px capitalize transition-colors ${activeTab === tab ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── NOTEPAD ── */}
        {activeTab === 'notepad' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-400">Auto-saved</span>
              <button
                onClick={handleSaveNotepad}
                disabled={!notepad.trim()}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icons.FileText className="w-3.5 h-3.5" />
                {hasFileSystemAPI ? 'Save as .txt' : 'Download .txt'}
              </button>
            </div>
            <textarea
              value={notepad}
              onChange={e => setNotepad(e.target.value)}
              className="w-full h-[520px] resize-y text-sm text-slate-700 placeholder-slate-300 focus:outline-none font-mono leading-relaxed p-4"
              placeholder="Type your notes here...&#10;&#10;Everything you type is saved automatically"
            />
          </div>
        ) : (
          /* ── SHEET ── */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100 bg-slate-50">
              <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors">
                <Icons.Plus className="w-3.5 h-3.5" /> Add Row
              </button>
              <button onClick={addColumn} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors">
                <Icons.Plus className="w-3.5 h-3.5" /> Add Column
              </button>

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Hidden fallback input */}
              <input ref={fallbackInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFallbackInput} />

              <button onClick={handleLoadExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                <Icons.FileText className="w-3.5 h-3.5" /> Load Excel
              </button>

              {/* Save Excel — writes back to same file if handle exists */}
              <button
                onClick={handleSaveExcel}
                disabled={sheetRows.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icons.FileText className="w-3.5 h-3.5" />
                {hasFileHandle ? 'Save Excel' : 'Save as Excel'}
              </button>

              {/* Save as new — always opens file picker */}
              {hasFileHandle && (
                <button
                  onClick={() => handleSaveAsNew()}
                  disabled={sheetRows.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500 text-white text-xs font-bold rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icons.Plus className="w-3.5 h-3.5" /> Save as New
                </button>
              )}

              <span className="text-xs text-slate-400 ml-auto">
                {sheetRows.length} row{sheetRows.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="w-8 px-2 py-2 text-xs text-slate-400 font-bold text-center">#</th>
                    {sheetHeaders.map((h, i) => (
                      <th key={i} className="px-2 py-2 text-left group relative min-w-[110px]">
                        <div className="flex items-center gap-1">
                          <input
                            value={h}
                            onChange={e => updateHeader(i, e.target.value)}
                            className="flex-1 text-xs font-bold text-slate-600 uppercase bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-violet-400 rounded px-1 py-0.5 min-w-0"
                          />
                          {sheetHeaders.length > 1 && (
                            <button onClick={() => deleteColumn(i)} title="Delete column" className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all flex-shrink-0">
                              <Icons.X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sheetRows.length === 0 ? (
                    <tr>
                      <td colSpan={sheetHeaders.length + 2} className="px-4 py-12 text-center text-slate-300 text-sm italic">
                        No rows yet — click "Add Row" or "Load Excel" to get started.
                      </td>
                    </tr>
                  ) : (
                    sheetRows.map((row, rIdx) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 text-xs text-slate-300 text-center font-mono select-none">{rIdx + 1}</td>
                        {row.cells.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1.5">
                            <input
                              value={cell}
                              onChange={e => updateCell(row.id, ci, e.target.value)}
                              className="w-full text-sm text-slate-700 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-violet-400 rounded px-1 py-0.5"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-center">
                          <button onClick={() => deleteRow(row.id)} title="Delete row" className="text-slate-300 hover:text-red-500 transition-colors">
                            <Icons.Trash className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesView;
