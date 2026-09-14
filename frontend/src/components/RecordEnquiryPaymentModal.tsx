import React, { useState } from 'react';
import { X, IndianRupee, Loader2, HandCoins } from 'lucide-react';
import { Enquiry } from '../types';
import { formatCurrencyValue, getEnquiryQuoteTotal } from '../utils/helpers';
import { enquiryService } from '../services/enquiryService';
import { toast } from '../utils/toast';

interface Props {
  enquiry: Enquiry;
  onClose: () => void;
  onSuccess: () => void;
}

const MODES = ['Cash', 'UPI', 'Bank'];

const RecordEnquiryPaymentModal = ({ enquiry, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState('Cash');

  const quoteTotal = getEnquiryQuoteTotal(enquiry.quote_options);
  const advanceCollected = enquiry.customer_advance_amount || 0;
  const alreadyPaid = Number(enquiry.final_received) || 0;
  const balance = Math.max(0, quoteTotal - advanceCollected - alreadyPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(amount) < 0) { toast('Enter a valid amount', 'error'); return; }
    setLoading(true);

    try {
      await enquiryService.recordPayment(enquiry.id, {
        received: Number(amount) || 0,
        mode,
      });
      toast('Payment recorded', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || err.message || 'Failed to record payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-navy uppercase text-xs tracking-widest">Record Payment</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6">
          <div className="bg-navy rounded-2xl p-4 text-white mb-5 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">{enquiry.customer_name}</p>
                <p className="text-lg font-black mt-0.5">{formatCurrencyValue(quoteTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Balance Due</p>
                <p className={`text-lg font-black mt-0.5 ${balance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{formatCurrencyValue(balance)}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 uppercase">
              Already collected: {formatCurrencyValue(advanceCollected + alreadyPaid)} (advance + final)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 rounded-2xl border-2 border-gray-100">
              <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest block mb-3">
                Final Amount Received from Customer
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-blue/40"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value) || 0)}
                />
              </div>

              <div className="mt-3">
                <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest block mb-2">Payment Mode</label>
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  {MODES.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === m ? 'bg-white text-blue shadow-sm' : 'text-text-soft'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-bold text-text-soft hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                className="px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                Record Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecordEnquiryPaymentModal;