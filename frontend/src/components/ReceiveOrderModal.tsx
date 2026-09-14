import React, { useState } from 'react';
import { X, Loader2, PackageCheck, Building2, Calendar, Wallet, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { purchaseService } from '../services/purchaseService';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { toast } from '../utils/toast';

interface Props {
  poId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReceiveOrderModal = ({ poId, onClose, onSuccess }: Props) => {
  const [paymentStatus, setPaymentStatus] = useState<'credit' | 'paid'>('credit');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceMode, setAdvanceMode] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['po-detail', poId],
    queryFn: () => purchaseService.getPurchaseOrderDetail(poId),
  });

  const po = data?.purchaseOrder;
  const items = data?.items || [];

  const handleReceive = async () => {
    setSubmitting(true);
    try {
      const payload: any = {};
      if (paymentStatus === 'paid') {
        payload.advanceAmount = total;
        payload.advanceMode = advanceMode;
      } else if (advanceAmount !== '' && Number(advanceAmount) > 0) {
        payload.advanceAmount = Number(advanceAmount);
        payload.advanceMode = advanceMode;
      }
      await purchaseService.receivePurchaseOrder(poId, payload);
      toast(po?.service_request_id ? 'PO received — parts added to the service ticket' : 'PO received, stock updated', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to receive purchase order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const total = items.reduce((s: number, it: any) => s + (Number(it.quantity) * (Number(it.unit_cost) || 0)), 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-black text-navy flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-green-600" /> Receive Purchase Order
            </h3>
            <p className="text-xs text-text-soft font-bold uppercase tracking-tight">{po?.po_number || poId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading || !po ? (
            <div className="flex items-center gap-2 text-sm text-text-soft font-medium py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading purchase order...
            </div>
          ) : (
            <>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                <Building2 className="h-4 w-4 text-blue shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy">{po.supplier_name}</p>
                  <p className="text-[10px] text-text-soft uppercase font-bold">
                    {formatDateValue(po.po_date)}{po.service_request_id ? ` · linked to service request` : ''}
                  </p>
                </div>
                <p className="ml-auto text-sm font-black text-navy">{formatCurrencyValue(po.total_amount)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Items to Receive</label>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
                  {items.map((it: any) => (
                    <div key={it.id} className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-navy truncate">{it.product_name}</p>
                        <p className="text-[10px] text-text-soft">Unit cost {formatCurrencyValue(it.unit_cost)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-text-soft">Qty</span>
                        <span className="font-black text-navy text-sm">{it.quantity}</span>
                        <span className="text-xs font-bold text-navy w-24 text-right">{formatCurrencyValue(it.quantity * it.unit_cost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {po.service_request_id && (
                  <div className="p-4 bg-green-50/60 rounded-2xl border border-green-100 text-xs text-navy font-medium">
                    <Truck className="h-3.5 w-3.5 inline mr-1 text-green-600" />
                    These items will be added to the service ticket's parts automatically, and sales can mark them ready for the technician to collect.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5" /> Payment
                </label>
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('credit')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${paymentStatus === 'credit' ? 'bg-white text-orange-600 shadow-sm' : 'text-text-soft'}`}
                  >
                    Credit (Pending)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('paid')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${paymentStatus === 'paid' ? 'bg-white text-green-600 shadow-sm' : 'text-text-soft'}`}
                  >
                    Paid Now
                  </button>
                </div>

                {paymentStatus === 'paid' ? (
                  <div className="p-4 bg-green-50/60 rounded-2xl border border-green-100 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-navy">{formatCurrencyValue(total)}</p>
                      <p className="text-[10px] text-text-soft uppercase font-bold">Full payment recorded on receipt</p>
                    </div>
                    <select
                      value={advanceMode}
                      onChange={e => setAdvanceMode(e.target.value)}
                      className="px-3 py-2.5 border-2 border-green-200 rounded-xl text-sm font-medium outline-none focus:border-green-500/40 transition-all bg-white appearance-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / Digital</option>
                      <option value="Bank">Bank Transfer</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Advance Paid to Supplier (optional)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        min={0}
                        value={advanceAmount}
                        onChange={e => setAdvanceAmount(e.target.value)}
                        placeholder="Advance amount"
                        className="px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-blue/20 transition-all"
                      />
                      <select
                        value={advanceMode}
                        onChange={e => setAdvanceMode(e.target.value)}
                        className="px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-blue/20 transition-all bg-white appearance-none"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI / Digital</option>
                        <option value="Bank">Bank Transfer</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={handleReceive}
            disabled={submitting || !po}
            className="w-full py-3.5 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackageCheck className="h-5 w-5" />}
            Receive & Add to Stock
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveOrderModal;