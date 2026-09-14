import React, { useState } from 'react';
import { X, IndianRupee, Loader2, HandCoins, CheckCircle2 } from 'lucide-react';
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

const DeliverEnquiryModal = ({ enquiry, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [collectPayment, setCollectPayment] = useState(false);
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState('Cash');

  const quoteTotal = getEnquiryQuoteTotal(enquiry.quote_options);
  const advanceCollected = enquiry.customer_advance_amount || 0;
  const balance = Math.max(0, (quoteTotal || 0) - advanceCollected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const received = collectPayment ? (Number(amount) || 0) : 0;
    if (received < 0) { toast('Enter a valid amount', 'error'); return; }
    setLoading(true);

    try {
      await enquiryService.markDelivered(enquiry.id, {
        received,
        mode,
      });
      toast(received > 0 ? 'Lead marked as delivered and payment recorded' : 'Lead marked as delivered — payment pending', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || err.message || 'Failed to mark delivered', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-navy uppercase text-xs tracking-widest">Mark as Delivered</h3>
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
            <p className="text-[10px] text-gray-400 uppercase">Advance collected: {formatCurrencyValue(advanceCollected)}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setCollectPayment(v => !v)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${collectPayment ? 'border-blue bg-blue/5' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className={`h-6 w-6 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${collectPayment ? 'bg-blue border-blue text-white' : 'border-gray-300'}`}>
                {collectPayment && <CheckCircle2 className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-bold text-navy">Record payment now</p>
                <p className="text-[10px] text-text-soft font-medium">Leave off to mark delivered with payment pending.</p>
              </div>
            </button>

            {collectPayment && (
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
            )}

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
                className="px-6 py-2.5 bg-navy text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : collectPayment ? <HandCoins className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {collectPayment ? 'Mark Delivered & Record Payment' : 'Mark Delivered'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeliverEnquiryModal;