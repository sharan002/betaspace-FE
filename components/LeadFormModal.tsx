
import React, { useState, useLayoutEffect } from 'react';
import { Icons } from './Icons';
import { SPACE_TYPES } from './FilterPanel';
import { Lead } from '../types';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (lead: Partial<Lead>) => void;
  initialData?: Lead | null;
  title: string;
  currentUserRole?: string;
}

const LeadFormModal: React.FC<LeadFormModalProps> = ({ isOpen, onClose, onSubmit, initialData, title, currentUserRole }) => {
  // Non-admins cannot change the program type once it has already been set on this lead.
  const isProgramTypeLocked = currentUserRole !== 'admin' && !!initialData?.programType;
  // Lead Status is set automatically by AI; manual edits are disabled once a lead already exists.
  const isStatusLocked = !!initialData;
  const [formData, setFormData] = useState<Partial<Lead>>(() =>
    initialData
      ? { ...initialData }
      : { userName: '', userNumber: '', course: '', location: '', leadfrom: '', profession: '', status: '', programType: '', pipeline: '' }
  );

  useLayoutEffect(() => {
    if (initialData) {
      const statusOptions = ['Hot', 'Warm', 'Cold'];
      const leadfromOptions = ['WhatsApp', 'Meta Ads','Google ads', 'Website', 'Walk-in', 'Call', 'Referral','metaads','BulkMessage'];
      const normalizeToOption = (value: string | null | undefined, options: string[]) => {
        if (!value) return value ?? '';
        return options.find(o => o.toLowerCase() === value.toLowerCase()) ?? value;
      };
      setFormData({
        ...initialData,
        status: normalizeToOption(initialData.status, statusOptions),
        leadfrom: normalizeToOption(initialData.leadfrom, leadfromOptions),
      });
    } else {
      setFormData({
        userName: '',
        userNumber: '',
        course: '',
        location: '',
        leadfrom: '',
        profession: '',
        status: '',
        programType: '',
        pipeline: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <Icons.X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Student Name</label>
              <input
                type="text"
                name="userName"
                value={formData.userName || ''}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Phone Number</label>
              <input
                type="text"
                name="userNumber"
                value={formData.userNumber || ''}
                onChange={handleChange}
                required
                // pattern="\d{10}"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 9876543210"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Space Type</label>
              <select
                name="course"
                value={formData.course || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Space Type</option>
                {formData.course && !SPACE_TYPES.includes(formData.course) && (
                  <option value={formData.course}>{formData.course}</option>
                )}
                {SPACE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Program Type</label>
              <select
                name="programType"
                value={formData.programType || ''}
                onChange={handleChange}
                disabled={isProgramTypeLocked}
                title={isProgramTypeLocked ? 'Only admins can change the program type once it has been set' : undefined}
                className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isProgramTypeLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="">Select</option>
                <option value="8 Hours">8 Hours</option>
                <option value="2 Hours">2 Hours</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Profession</label>
              <select
                name="profession"
                value={formData.profession || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                 <option value="">Select</option>
                <option value="Job Seeker">Job Seeker</option>
                <option value="Student">Student</option>
                <option value="Working Professional">Working Professional</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Lead Source</label>
              <select
                name="leadfrom"
                value={formData.leadfrom || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Source</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Meta Ads">Meta Ads</option>
                <option value="Google ads">Google ads</option>
                <option value="Website">Website</option>
                <option value="Walk-in"> Walk-in</option>
                <option value="Call"> Call</option>
                <option value="Referral">Referral</option>
                <option value="metaads">metaads</option>
                <option value="BulkMessage">BulkMessage</option>         
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Lead Status</label>
              <select
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
                disabled={isStatusLocked}
                title={isStatusLocked ? 'Lead Status is set automatically by AI and cannot be changed manually' : undefined}
                className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isStatusLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Status</option>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Pipeline Stage</label>
              <select
                name="pipeline"
                value={formData.pipeline || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Stage</option>
                <option value="New">New</option>
                <option value="RNR">RNR</option>
                <option value="Contacted">Contacted</option>
                <option value="Asked Time">Asked Time</option>
                <option value="Demo Scheduled">Demo Scheduled</option>
                <option value="Pre-Enrollment">Pre-Enrollment</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Looking for job">Looking for job</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Irrelevant">Irrelevant</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City / Region"
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-shadow shadow-md hover:shadow-lg active:scale-95"
          >
            {initialData ? 'Save Changes' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadFormModal;
