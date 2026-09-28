import React, { useState } from 'react';
import { X, Loader2, Banknote, Calendar, IndianRupee } from 'lucide-react';
import { purchaseService } from '../services/purchaseService';
import { toast } from '../utils/toast';
import { formatCurrencyValue } from '../utils/helpers';

interface Props {
  po: any;
  onClose: () => void;
  onSuccess: () => void;
}

const PurchaseOrderPaymentModal = ({ po, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: 0,
    paymentMode: 'Cash',
    paymentDate: new Date().toISOString().slice(0, 10)
  });

  const total = Number(po.total_amount) || 0;
  const alreadyPaid = Number(po.amount_paid) || 0;
  const balance = total - alreadyPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(form.amount) || 0;
    if (!(amt > 0)) return toast('Enter a valid amount', 'error');
    if (amt > balance) return toast(`Amount exceeds balance (${formatCurrencyValue(balance)})`, 'error');
    setLoading(true);
    try {
      const res = await purchaseService.recordPurchaseOrderPayment(po.id, form);
      toast(res.payment_status === 'paid' ? 'PO fully paid' : 'PO payment recorded', 'success');
      onSuccess();
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Failed to record payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-navy text-white rounded-2xl">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-navy">PO {po.po_number} · Supplier Payment</h3>
              <p className="text-[10px] text-text-soft font-bold uppercase tracking-wider">{po.supplier_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-soft hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
            <p className="text-[9px] font-black text-text-soft uppercase tracking-wider">Total</p>
            <p className="text-sm font-black text-navy">{formatCurrencyValue(total)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-green-50 border border-green-100 text-center">
            <p className="text-[9px] font-black text-green-600 uppercase tracking-wider">Paid</p>
            <p className="text-sm font-black text-green-600">{formatCurrencyValue(alreadyPaid)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100 text-center">
            <p className="text-[9px] font-black text-orange-600 uppercase tracking-wider">Balance</p>
            <p className="text-sm font-black text-orange-600">{formatCurrencyValue(balance)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-text-soft uppercase tracking-widest mb-1.5 block">Amount (₹)</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-soft" />
              <input
                type="number"
                value={form.amount || ''}
                placeholder={String(balance)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
                onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-text-soft uppercase tracking-widest mb-1.5 block">Mode</label>
              <select
                value={form.paymentMode}
                onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/20 outline-none appearance-none"
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank</option>
                <option>Card</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-text-soft uppercase tracking-widest mb-1.5 block">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-soft" />
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/20 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-text-soft hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-navy text-white py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderPaymentModal;