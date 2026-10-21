import React, { useState } from 'react';
import { X, Armchair, Building, Mail, Phone, User, CheckCircle2, ShieldCheck, QrCode, CreditCard, Calendar, Clock } from 'lucide-react';
import { CoworkingSpace, Seat, Booking } from '../types';
import { formatINR } from '../utils/storage';

interface BookingModalProps {
  space: CoworkingSpace;
  selectedSeats: Seat[];
  fromDate: string;
  toDate: string;
  totalDays: number;
  selectedDate?: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalPrice: number;
  initialCompanyName?: string;
  onClose: () => void;
  // Resolves to an error message when the server rejects the booking (e.g. seat already taken).
  onConfirmBooking: (newBooking: Booking) => Promise<string | void>;
  serviceType?: 'seats' | 'meeting_room' | 'private_office' | 'virtual_office' | 'managed_office';
}

export const BookingModal: React.FC<BookingModalProps> = ({
  space,
  selectedSeats,
  fromDate,
  toDate,
  totalDays,
  selectedDate,
  startTime,
  endTime,
  durationHours,
  totalPrice,
  initialCompanyName = '',
  onClose,
  onConfirmBooking,
  serviceType = 'seats',
}) => {
  const effectiveFrom = fromDate || selectedDate || '';
  const effectiveTo = toDate || effectiveFrom;

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi_gpay' | 'credit_card' | 'corporate_account' | 'pay_at_desk'>('upi_gpay');
  // The calculated total is only a suggestion; the price can be adjusted before confirming.
  const [priceInput, setPriceInput] = useState(String(totalPrice));
  const finalPrice = Number(priceInput);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const durationLabel = totalDays === 1 ? '1 Day' : totalDays >= 720 ? `${totalDays} Days (2 Years)` : `${totalDays} Days`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!clientName.trim()) {
      setErrorMsg('Please enter the client name');
      return;
    }
    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      setErrorMsg('Please enter a valid client email address');
      return;
    }
    if (!companyName.trim()) {
      setErrorMsg('Please specify the company or business name');
      return;
    }
    if (priceInput.trim() === '' || !Number.isFinite(finalPrice) || finalPrice < 0) {
      setErrorMsg('Please enter a valid price');
      return;
    }

    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const bookingId = `CBE-${randomNum}`;

    const newBooking: Booking = {
      id: bookingId,
      spaceId: space.id,
      spaceName: space.name,
      branchArea: space.branchArea,
      seatIds: selectedSeats.map((s) => s.id),
      serviceType,
      date: effectiveFrom,
      fromDate: effectiveFrom,
      toDate: effectiveTo,
      totalDays,
      startTime,
      endTime,
      durationHours,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim() || '+91 98422 00000',
      companyName: companyName.trim(),
      notes: notes.trim() || undefined,
      totalPrice: Math.round(finalPrice),
      status: 'confirmed',
      bookedAt: new Date().toISOString(),
      paymentMethod,
      qrCodeData: `${bookingId}|${clientName}|${companyName.trim()}|${effectiveFrom}..${effectiveTo}|${space.branchArea}`,
    };

    setIsSubmitting(true);
    onConfirmBooking(newBooking)
      .then((err) => { if (err) setErrorMsg(err); })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-300 text-sky-700 flex items-center justify-center shadow-xs">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Confirm Booking & Generate Pass</h2>
              <p className="text-xs text-slate-600 font-medium">
                {space.name} ({space.branchArea}, Coimbatore)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Reservation Summary Strip */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wider block text-[10px] font-bold">
                Selected Seats ({selectedSeats.length})
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedSeats.length > 0 ? (
                  selectedSeats.map((s) => (
                    <span
                      key={s.id}
                      className="font-mono text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200 font-bold"
                    >
                      {s.id}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-600 font-medium">Virtual Office Plan</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wider block text-[10px] font-bold">
                Date Range & Timings
              </span>
              <div className="mt-1 font-mono text-slate-800 font-medium">
                <div className="font-bold text-slate-900">
                  {effectiveFrom === effectiveTo ? effectiveFrom : `${effectiveFrom} → ${effectiveTo}`}
                </div>
                <div className="text-sky-800 text-[11px] font-semibold">
                  {durationLabel} · {startTime} - {endTime}
                </div>
              </div>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wider block text-[10px] font-bold">
                Total Payable (INR)
              </span>
              <div className="mt-1 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sky-700">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={priceInput}
                  onChange={(e) => {
                    setPriceInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  aria-label="Total payable (INR)"
                  className="w-full bg-white border border-sky-300 rounded-lg pl-7 pr-2 py-1 font-mono text-base font-bold text-sky-700 focus:outline-none focus:border-sky-500"
                />
              </div>
              {finalPrice !== totalPrice && Number.isFinite(finalPrice) && (
                <button
                  type="button"
                  onClick={() => setPriceInput(String(totalPrice))}
                  className="mt-1 text-[10px] font-semibold text-slate-500 hover:text-sky-700 cursor-pointer"
                >
                  Reset to calculated {formatINR(totalPrice)}
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Client Details Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-600" />
              Client & Company Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Organization Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kovai Tech Solutions Pvt Ltd"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                  <Building className="w-4 h-4 text-sky-600 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person Full Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karthik Subramanian"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email Address <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. karthik@kovaitech.in"
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white font-mono"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (India)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="e.g. +91 98430 12345"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white font-mono"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Booking Purpose / Lease Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 2-Year long term lease agreement for engineering branch, parcel delivery registration..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white resize-none"
              ></textarea>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
              Payment Mode (INR)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <label
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  paymentMethod === 'upi_gpay'
                    ? 'bg-sky-50 border-sky-600 text-sky-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi_gpay"
                  checked={paymentMethod === 'upi_gpay'}
                  onChange={() => setPaymentMethod('upi_gpay')}
                  className="sr-only"
                />
                <QrCode className="w-4 h-4 shrink-0 text-sky-600" />
                <div>
                  <div className="font-bold text-slate-900">UPI / GPay</div>
                  <div className="text-[10px] text-slate-500">Instant QR</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  paymentMethod === 'credit_card'
                    ? 'bg-sky-50 border-sky-600 text-sky-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="credit_card"
                  checked={paymentMethod === 'credit_card'}
                  onChange={() => setPaymentMethod('credit_card')}
                  className="sr-only"
                />
                <CreditCard className="w-4 h-4 shrink-0 text-indigo-600" />
                <div>
                  <div className="font-bold text-slate-900">Card / NetBank</div>
                  <div className="text-[10px] text-slate-500">RuPay / Visa</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  paymentMethod === 'corporate_account'
                    ? 'bg-sky-50 border-sky-600 text-sky-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="corporate_account"
                  checked={paymentMethod === 'corporate_account'}
                  onChange={() => setPaymentMethod('corporate_account')}
                  className="sr-only"
                />
                <Building className="w-4 h-4 shrink-0 text-indigo-600" />
                <div>
                  <div className="font-bold text-slate-900">GST Invoice</div>
                  <div className="text-[10px] text-slate-500">Corporate</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  paymentMethod === 'pay_at_desk'
                    ? 'bg-sky-50 border-sky-600 text-sky-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pay_at_desk"
                  checked={paymentMethod === 'pay_at_desk'}
                  onChange={() => setPaymentMethod('pay_at_desk')}
                  className="sr-only"
                />
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <div>
                  <div className="font-bold text-slate-900">Pay at Desk</div>
                  <div className="text-[10px] text-slate-500">Coimbatore Hub</div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Generate Digital Ticket Pass</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
