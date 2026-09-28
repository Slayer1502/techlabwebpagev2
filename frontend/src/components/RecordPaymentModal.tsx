import React, { useState } from 'react';
import { X, IndianRupee, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { toast } from '../utils/toast';
import { formatCurrencyValue } from '../utils/helpers';

interface Props {
  requestId: string;
  entityType?: 'service' | 'order';
  remaining: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface SplitRow {
  id: number;
  amount: number;
  paymentMode: string;
  paymentDate: string;
}

const MODES = ['Cash', 'UPI', 'Bank'];

const RecordPaymentModal = ({ requestId, entityType = 'service', remaining, onClose, onSuccess }: Props) => {
  const isOrder = entityType === 'order';
  const [loading, setLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [rows, setRows] = useState<SplitRow[]>([
    { id: 1, amount: remaining, paymentMode: 'Cash', paymentDate: new Date().toISOString().slice(0, 10) },
  ]);

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const remainingAfter = remaining - total - (Number(discount) || 0);

  const updateRow = (id: number, field: keyof SplitRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    if (rows.length >= MODES.length) { toast('Maximum split rows', 'info'); return; }
    const newId = Date.now();
    setRows([...rows, { id: newId, amount: Math.max(0, Math.round((remaining - total) * 100) / 100), paymentMode: 'UPI', paymentDate: new Date().toISOString().slice(0, 10) }]);
  };

  const removeRow = (id: number) => {
    if (rows.length === 1) { toast('Keep at least one payment row', 'info'); return; }
    setRows(rows.filter(r => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total <= 0) { toast('Enter a payment amount', 'error'); return; }
    if (total > remaining) { toast(`Amount exceeds remaining ${formatCurrencyValue(remaining)}`, 'error'); return; }
    setLoading(true);

    try {
      if (isOrder) {
        await api.post(`/sales/orders/${requestId}/split-payment`, {
          entries: rows.map(r => ({ amount: r.amount, paymentMode: r.paymentMode, paymentDate: r.paymentDate })),
        });
      } else if (rows.length === 1 && discount === 0) {
        // Single simple payment - use existing endpoint
        await api.patch(`/sales/service-requests/${requestId}/payment`, {
          amount: rows[0].amount,
          discount: 0,
          paymentMode: rows[0].paymentMode,
          paymentDate: rows[0].paymentDate,
        });
      } else {
        // Split payment or discount - use split endpoint
        await api.post(`/sales/service-requests/${requestId}/split-payment`, {
          entries: rows.map(r => ({ amount: r.amount, paymentMode: r.paymentMode, paymentDate: r.paymentDate })),
          discount,
        });
      }
      toast('Payment recorded!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Payment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-navy uppercase text-xs tracking-widest">Receive Payment</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="bg-soft rounded-xl p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-text-soft uppercase">Amount Remaining</span>
            <span className="text-lg font-black text-navy">{formatCurrencyValue(remaining)}</span>
          </div>

          {/* Split rows */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-text-soft uppercase">Payment Split</label>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 text-xs font-bold text-blue hover:underline"
              >
                <Plus className="h-3 w-3" /> Add mode
              </button>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="space-y-2 p-3 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40 font-bold"
                      value={row.amount}
                      onChange={e => updateRow(row.id, 'amount', Number(e.target.value))}
                      placeholder="Amount"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="p-2 text-text-soft hover:bg-red-50 hover:text-red-500 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex bg-gray-50 p-1 rounded-xl flex-1">
                    {MODES.map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateRow(row.id, 'paymentMode', mode)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${row.paymentMode === mode ? 'bg-white text-blue shadow-sm' : 'text-text-soft'}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    className="w-32 px-2 py-1.5 border-2 border-gray-200 rounded-xl text-xs outline-none focus:border-blue/40"
                    value={row.paymentDate}
                    onChange={e => updateRow(row.id, 'paymentDate', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          {!isOrder && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Discount (optional)</label>
              <input
                type="number"
                min="0"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
                value={discount}
                onChange={e => setDiscount(Number(e.target.value))}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-text-soft font-medium">Total being collected</span>
            <span className="font-black text-navy">{formatCurrencyValue(total)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-soft font-medium">Balance after</span>
            <span className={`font-black ${remainingAfter > 0 ? 'text-orange-600' : 'text-green-600'}`}>{formatCurrencyValue(Math.max(0, remainingAfter))}</span>
          </div>

          <button
            disabled={loading}
            className="w-full py-3 bg-blue text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue/20 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Record Collection
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
