import React, { useState } from 'react';
import { X, Undo2, Loader2 } from 'lucide-react';
import { formatCurrencyValue } from '../utils/helpers';
import { toast } from '../utils/toast';

interface Props {
  dc: any;
  onClose: () => void;
  onConfirm: (returns: Record<string, number>) => Promise<void>;
}

const ChallanReturnModal = ({ dc, onClose, onConfirm }: Props) => {
  const [returns, setReturns] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const setReturn = (itemId: number, qty: number) => {
    setReturns(prev => ({ ...prev, [itemId]: qty }));
  };

  const isMetered = (name: string) => /mtr|cable|meter/i.test(String(name || ''));

  const usedFor = (it: any) => it.qty - (Math.min(Number(returns[it.id]) || 0, it.qty));

  const returnedTotal = dc.items.reduce((s: number, it: any) =>
    s + (Math.min(Number(returns[it.id]) || 0, it.qty) * it.unit_price), 0);
  const projectedValue = (dc.total_value || 0) - returnedTotal;

  const handleConfirm = async () => {
    const payload: Record<string, number> = {};
    dc.items.forEach((it: any) => {
      const q = Math.min(Number(returns[it.id]) || 0, it.qty);
      if (q > 0) payload[it.id] = q;
    });
    if (!Object.keys(payload).length) return toast('Enter a returned quantity', 'error');

    setSubmitting(true);
    try {
      await onConfirm(payload);
      setReturns({});
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to record return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-navy flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-amber-500" /> Record Return
            </h3>
            <p className="text-xs text-text-soft font-bold uppercase tracking-tight">{dc.challan_number} — unused items picked up from site return to stock</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
            {dc.items.map((it: any) => (
              <div key={it.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy">{it.item_name}</p>
                  <p className="text-[10px] text-text-soft uppercase font-bold">
                    Dispatched {it.qty} · Rs. {it.unit_price} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isMetered(it.item_name) ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={it.qty}
                        value={usedFor(it) || 0}
                        onChange={e => setReturn(it.id, it.qty - Math.max(0, Math.min(it.qty, Number(e.target.value) || 0)))}
                        className="w-20 border-2 border-amber-200 bg-white rounded-xl px-3 py-1.5 text-sm font-bold text-right outline-none focus:border-amber-400 transition-all"
                      />
                      <span className="text-xs text-text-soft font-bold">
                        mtrs used · returns {Math.max(0, it.qty - usedFor(it))} m
                      </span>
                      <span className="text-sm font-black text-blue w-24 text-right">
                        {formatCurrencyValue(usedFor(it) * it.unit_price)}
                      </span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={it.qty}
                        value={returns[it.id] || 0}
                        onChange={e => setReturn(it.id, Number(e.target.value))}
                        className="w-20 border-2 border-amber-200 bg-white rounded-xl px-3 py-1.5 text-sm font-bold text-right outline-none focus:border-amber-400 transition-all"
                      />
                      <span className="text-xs text-text-soft font-bold">of {it.qty} return</span>
                      <span className="text-sm font-black text-blue w-20 text-right">
                        {formatCurrencyValue((it.qty - Math.min(Number(returns[it.id]) || 0, it.qty)) * it.unit_price)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-navy rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">DC Value After Return</p>
              <p className="text-lg font-black text-white">{formatCurrencyValue(projectedValue)}</p>
            </div>
            <p className="text-[10px] text-gray-400 uppercase font-bold text-right leading-relaxed">
              Returning<br />{formatCurrencyValue(returnedTotal)}<br />back to stock
            </p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Undo2 className="h-5 w-5" />}
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallanReturnModal;