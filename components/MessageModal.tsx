import React, { useState } from 'react';
import { Icons } from './Icons';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientCount: number;
  onSend: (msg: string, campaignName: string) => void | Promise<void>;
  isSending: boolean;
  campaignNames?: string[];
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, recipientCount, onSend, isSending, campaignNames = [] }) => {
  const [msg, setMsg] = useState('');
  const [campaignName, setCampaignName] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Customized Message</h2>
          <button onClick={onClose} disabled={isSending} className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"><Icons.X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Recipients</p>
            <p className="text-sm font-black text-blue-900">{recipientCount} leads selected</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Campaign Name (optional)</label>
            <input
              list="campaign-name-options"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Diwali Offer, Hot Desk Promo..."
              disabled={isSending}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <datalist id="campaign-name-options">
              {campaignNames.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <p className="text-[11px] text-slate-400">Tag this send with a campaign so you can filter replies later.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Message Content</label>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Enter your customized message here..."
              disabled={isSending}
              className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSending} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
          <button
            onClick={() => onSend(msg, campaignName.trim())}
            disabled={!msg.trim() || isSending}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isSending && <Icons.RefreshCcw className="w-4 h-4 animate-spin" />}
            <span>{isSending ? 'Sending...' : 'Send Message'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
