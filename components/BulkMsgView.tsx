import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { User, TempLead } from '../types';
import { apiService } from '../services/api';
import { Icons } from './Icons';

interface Props {
  currentUser: User | null;
}

interface ParsedContact {
  userName?: string;
  userNumber: string;
}

function parseContactsFromWorkbook(buf: ArrayBuffer): ParsedContact[] {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
  if (!aoa.length) return [];

  const headerRow = aoa[0].map(h => String(h).trim().toLowerCase());
  const phoneColIdx = headerRow.findIndex(h => /phone|number|mobile/.test(h));
  const nameColIdx = headerRow.findIndex(h => /name/.test(h));
  const hasHeader = phoneColIdx !== -1;

  const dataRows = hasHeader ? aoa.slice(1) : aoa;
  const effectivePhoneCol = hasHeader ? phoneColIdx : 0;
  const effectiveNameCol = hasHeader ? nameColIdx : (dataRows[0]?.length > 1 ? 1 : -1);

  const contacts: ParsedContact[] = [];
  for (const row of dataRows) {
    const rawNumber = String(row[effectivePhoneCol] ?? '').trim();
    const digits = rawNumber.replace(/\D/g, '');
    if (!digits) continue;
    const userName = effectiveNameCol !== -1 ? String(row[effectiveNameCol] ?? '').trim() : '';
    contacts.push({ userNumber: digits, userName: userName || undefined });
  }
  return contacts;
}

function formatDate(v: string | { $date: string } | undefined | null) {
  if (!v) return '-';
  const raw = typeof v === 'string' ? v : v.$date;
  return new Date(raw).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const BulkMsgView: React.FC<Props> = ({ currentUser }) => {
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [fileName, setFileName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [campaignNames, setCampaignNames] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [tempLeads, setTempLeads] = useState<TempLead[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProspects = async () => {
    setIsLoadingProspects(true);
    try {
      setTempLeads(await apiService.getTempCampaignLeads());
    } finally {
      setIsLoadingProspects(false);
    }
  };

  useEffect(() => {
    apiService.getCampaignNames().then(setCampaignNames);
    loadProspects();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseContactsFromWorkbook(buf);
      setContacts(parsed);
      setFileName(file.name);
    } catch (err) {
      console.error('Failed to parse Excel file', err);
      alert('Could not read that file. Please upload a valid .xlsx, .xls or .csv file.');
    } finally {
      e.target.value = '';
    }
  };

  const clearUpload = () => {
    setContacts([]);
    setFileName('');
  };

  const handleSend = async () => {
    if (!contacts.length || !message.trim() || !campaignName.trim()) return;
    setIsSending(true);
    try {
      const result = await apiService.sendBulkCampaign(contacts, message.trim(), campaignName.trim());
      alert(
        `Campaign "${campaignName.trim()}"\n\n` +
        `Sent: ${result.sent}\nFailed: ${result.failed}\nSkipped (already a lead): ${result.skippedExisting}\nTotal uploaded: ${result.total}`
      );
      clearUpload();
      setMessage('');
      setCampaignName('');
      apiService.getCampaignNames().then(setCampaignNames);
      loadProspects();
    } catch (err) {
      console.error('Bulk campaign send failed', err);
      alert('Failed to send bulk campaign. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Bulk WhatsApp Campaign</h3>
        <p className="text-sm text-slate-500">Upload an Excel of new contacts, send a WhatsApp campaign, and they'll automatically become leads once they reply.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">1. Upload Excel</label>
          <p className="text-[11px] text-slate-400 mb-2">A "Phone"/"Number" column is required; a "Name" column is optional.</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-sm transition-all border border-emerald-200"
            >
              <Icons.Upload className="w-4 h-4" />
              <span>Choose File</span>
            </button>
            {fileName && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Icons.FileText className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{fileName}</span>
                <span className="text-slate-400">({contacts.length} contact{contacts.length === 1 ? '' : 's'})</span>
                <button onClick={clearUpload} className="text-slate-400 hover:text-red-500"><Icons.X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Name</th>
                    <th className="text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Number</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.slice(0, 50).map((c, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-slate-600">{c.userName || <span className="text-slate-300">-</span>}</td>
                      <td className="px-3 py-1.5 text-slate-800 font-semibold">{c.userNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {contacts.length > 50 && (
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] text-slate-400 border-t border-slate-100">…and {contacts.length - 50} more</div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">2. Campaign Name</label>
          <input
            list="bulk-campaign-name-options"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. August Cold Outreach"
            disabled={isSending}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
          <datalist id="bulk-campaign-name-options">
            {campaignNames.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">3. Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your campaign message here..."
            disabled={isSending}
            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!contacts.length || !message.trim() || !campaignName.trim() || isSending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {isSending && <Icons.RefreshCcw className="w-4 h-4 animate-spin" />}
          <span>{isSending ? 'Sending...' : `Send to ${contacts.length} Contact${contacts.length === 1 ? '' : 's'}`}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-black text-slate-800">Prospects Awaiting Reply</h4>
            <p className="text-xs text-slate-400">Contacts sent a campaign message but not yet replied. Once they reply, they become a lead and drop off this list.</p>
          </div>
          <button onClick={loadProspects} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700" title="Refresh">
            <Icons.RefreshCcw className={`w-4 h-4 ${isLoadingProspects ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {tempLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Icons.Chat className="w-12 h-12 opacity-10 mb-3" />
            <p className="text-sm font-bold">No prospects waiting</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Name</th>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Number</th>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Campaign</th>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Sent</th>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {tempLeads.map(t => (
                  <tr key={t._id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700 font-semibold">{t.userName}</td>
                    <td className="px-4 py-2 text-slate-600">{t.userNumber}</td>
                    <td className="px-4 py-2 text-slate-600">{t.campaignName}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{formatDate(t.sentAt)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${t.status === 'sent' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkMsgView;
