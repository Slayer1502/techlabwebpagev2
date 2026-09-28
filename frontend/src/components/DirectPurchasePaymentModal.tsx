import React, { useState } from 'react';
import { X, Loader2, Banknote, Calendar, IndianRupee } from 'lucide-react';
import { purchaseService } from '../services/purchaseService';
import { toast } from '../utils/toast';
import { formatCurrencyValue } from '../utils/helpers';

interface Props {
  purchase: any;
  onClose: () => void;
  onSuccess: () => void;
}

const DirectPurchasePaymentModal = ({ purchase, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: 0,
    paymentMode: 'Cash',
    paymentDate: new Date().toISOString().slice(0, 10)
  });

  const total = Number(purchase.total_cost) || 0;
  const alreadyPaid = Number(purchase.amount_paid) || 0;
  const balance = total - alreadyPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(form.amount) || 0;
    if (!(amt > 0)) return toast('Enter a valid amount', 'error');
    if (amt > balance) return toast(`Amount exceeds balance (${formatCurrencyValue(balance)})`, 'error');
    setLoading(true);
    try {
      const res = await purchaseService.recordPurchasePayment(purchase.id, form);
      toast(res.payment_status === 'paid' ? 'Purchase fully paid' : 'Payment recorded', 'success');
      onSuccess();
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Failed to record payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div>
            <h3 className="text-base font-black text-navy">Direct Purchase Payment</h3>
            <p className="text-[10px] text-text-soft font-bold uppercase tracking-wider">{purchase.supplier_name || 'Supplier Payment'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div>
               <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Pending Balance</p>
               <p className="text-lg font-black text-navy">{formatCurrencyValue(balance)}</p>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Total Value</p>
               <p className="text-sm font-bold text-text-soft">{formatCurrencyValue(total)}</p>
            </div>
          </div>

          <form id="pay-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest ml-1">Payment Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-soft" />
                <input
                  type="number"
                  required
                  min={1}
                  max={balance}
                  value={form.amount || ''}
                  onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 bg-white rounded-2xl text-sm font-bold outline-none focus:border-blue/40 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest ml-1">Payment Mode</label>
                 <div className="relative">
                   <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-soft" />
                   <select
                     value={form.paymentMode}
                     onChange={e => setForm({ ...form, paymentMode: e.target.value })}
                     className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 bg-white rounded-2xl text-sm font-bold outline-none focus:border-blue/40 transition-all appearance-none"
                   >
                     <option value="Cash">Cash</option>
                     <option value="UPI">UPI</option>
                     <option value="Bank Transfer">Bank Transfer</option>
                     <option value="Card">Card</option>
                     <option value="Cheque">Cheque</option>
                     <option value="Adjustment">Adjustment</option>
                   </select>
                 </div>
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest ml-1">Payment Date</label>
                 <div className="relative">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-soft" />
                   <input
                     type="date"
                     required
                     value={form.paymentDate}
                     onChange={e => setForm({ ...form, paymentDate: e.target.value })}
                     className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 bg-white rounded-2xl text-sm font-bold outline-none focus:border-blue/40 transition-all"
                   />
                 </div>
               </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-white border border-gray-200 text-text-soft rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-50 transition-all text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="pay-form"
            disabled={loading}
            className="flex-[2] py-3.5 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-2 text-xs disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <IndianRupee className="h-4 w-4" />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectPurchasePaymentModal;
