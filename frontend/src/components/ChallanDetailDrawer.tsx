import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Truck,
  Package,
  Calendar,
  User,
  Download,
  FileText,
  CheckCircle2,
  Undo2,
  Ban,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import { challanService } from '../services/challanService';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { toast } from '../utils/toast';
import { useAuthStore } from '../store/authStore';

interface Props {
  challanId: string;
  onClose: () => void;
}

const ChallanDetailDrawer = ({ challanId, onClose }: Props) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canWrite = ['admin', 'sales'].includes(user?.role || '');
  const { data: challan, isLoading } = useQuery({
    queryKey: ['challan-detail', challanId],
    queryFn: () => challanService.getChallanDetail(challanId),
  });

  const [busy, setBusy] = useState(false);
  const [isGst, setIsGst] = useState(true);
  const [confirmBillOpen, setConfirmBillOpen] = useState(false);
  const [selectedGst, setSelectedGst] = useState(true);
  const [receivedBy, setReceivedBy] = useState('');
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returns, setReturns] = useState<Record<number, number>>({});

  const isPending = challan?.billing_status === 'pending';
  const isBilled = challan?.billing_status === 'billed';
  const isCancelled = challan?.billing_status === 'cancelled';
  const isDelivered = !!challan?.delivered_at;

  const challanTotal = challan?.items?.length
    ? challan.items.reduce((s: number, it: any) => s + (Number(it.total_price) || (Number(it.qty) * Number(it.unit_price)) || 0), 0)
    : Number(challan?.total_value) || 0;
  const challanTaxable = Math.round(challanTotal / 1.18);
  const challanGst = challanTotal - challanTaxable;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['challan-detail', challanId] });
    queryClient.invalidateQueries({ queryKey: ['challans'] });
  };

  const handleMarkDelivered = async () => {
    setBusy(true);
    try {
      await challanService.markDelivered(challanId, receivedBy);
      toast('Challan marked as delivered', 'success');
      setReceivedBy('');
      refresh();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to mark delivered', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleConvertToBill = async () => {
    setBusy(true);
    try {
      const res = await challanService.consolidateToBill([challanId], selectedGst);
      toast('Converted to final bill!', 'success');
      setConfirmBillOpen(false);
      refresh();
      if (window.confirm('View the new invoice?')) {
        window.open(`/api/sales/orders/${res.orderId}/invoice.pdf`, '_blank');
      }
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to convert to bill', 'error');
    } finally {
      setBusy(false);
    }
  };

  const setReturn = (itemId: number, qty: number) => {
    setReturns(prev => ({ ...prev, [itemId]: qty }));
  };

  const handleReturnItems = async () => {
    const payload: Record<string, number> = {};
    Object.entries(returns).forEach(([id, qty]) => {
      if (Number(qty) > 0) payload[id] = Number(qty);
    });
    if (!Object.keys(payload).length) return toast('Enter a returned quantity', 'error');

    setBusy(true);
    try {
      await challanService.returnItems(challanId, payload);
      toast('Items returned and stock updated', 'success');
      setIsReturnMode(false);
      setReturns({});
      refresh();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to return items', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleVoidChallan = async () => {
    const reason = window.prompt('Reason for voiding this challan?', '');
    if (reason === null) return;
    if (!window.confirm('Void this challan? Any deducted stock will be returned.')) return;

    setBusy(true);
    try {
      await challanService.voidChallan(challanId, reason);
      toast('Challan voided', 'success');
      refresh();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to void challan', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <Truck className="h-5 w-5 text-blue" />
                 <span className="text-[10px] font-black text-blue uppercase tracking-widest bg-blue/5 px-2 py-0.5 rounded-full border border-blue/10">Delivery Challan</span>
              </div>
              <h2 className="text-xl font-black text-navy uppercase tracking-tight">{challan?.challan_number || 'Loading...'}</h2>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-text-soft">
              <X className="h-6 w-6" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
           {isLoading ? (
              <div className="space-y-6 animate-pulse">
                 <div className="h-20 bg-gray-50 rounded-2xl"></div>
                 <div className="h-40 bg-gray-50 rounded-2xl"></div>
              </div>
           ) : (
              <>
                 <div className="flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isCancelled ? 'bg-red-100 text-red-500' : isBilled ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {challan.billing_status}
                    </span>
                    {isDelivered && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Delivered
                      </span>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Dispatch Date</p>
                       <p className="text-sm font-bold text-navy flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue" />
                          {formatDateValue(challan.dispatch_date)}
                       </p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Transport</p>
                       <p className="text-sm font-bold text-navy flex items-center gap-2">
                          <Truck className="h-4 w-4 text-blue" />
                          {challan.transport || 'Self Delivery'}
                       </p>
                    </div>
                 </div>

                 {isDelivered && (
                    <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-100 space-y-2">
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
                       </p>
                       <p className="text-sm font-bold text-navy">{challan.received_by || challan.customer_name} accepted</p>
                       <p className="text-xs text-text-soft font-medium">
                          {challan.delivered_at ? new Date(challan.delivered_at).toLocaleString('en-IN') : '-'}
                       </p>
                    </div>
                 )}

                 {isCancelled && (
                    <div className="p-5 bg-red-50 rounded-2xl border-2 border-red-100 space-y-2">
                       <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                          <Ban className="h-3.5 w-3.5" /> Voided
                       </p>
                       {challan.void_reason && <p className="text-sm font-bold text-navy">Reason: {challan.void_reason}</p>}
                       {challan.voided_at && <p className="text-xs text-text-soft font-medium">{new Date(challan.voided_at).toLocaleString('en-IN')}</p>}
                    </div>
                 )}

                 {isBilled && challan.linked_order_id && (
                    <div className="p-5 bg-green-50 rounded-2xl border-2 border-green-100 space-y-2">
                       <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Billed into order #{challan.linked_order_id}</p>
                       <button
                         onClick={() => window.open(`/api/sales/orders/${challan.linked_order_id}/invoice.pdf`, '_blank')}
                         className="text-xs font-bold text-green-700 underline underline-offset-4 inline-flex items-center gap-1"
                       >
                          Open invoice <ArrowUpRight className="h-3.5 w-3.5" />
                       </button>
                    </div>
                 )}

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-text-soft uppercase tracking-widest flex items-center gap-2">
                       <Package className="h-3.5 w-3.5" /> {isReturnMode ? 'Return Quantities' : 'Dispatched Items'}
                    </p>
                    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden divide-y shadow-sm">
                       {challan.items?.map((item: any, idx: number) => (
                          <div key={idx} className={`p-6 flex justify-between items-center gap-4 ${isReturnMode ? 'bg-amber-50/40' : 'bg-gray-50/30'}`}>
                             <div>
                                <p className="text-sm font-bold text-navy">{item.item_name}</p>
                                <p className="text-[10px] text-text-soft font-bold uppercase tracking-tight">{item.qty} Units</p>
                             </div>
                             <div className="flex items-center gap-4">
                                {isReturnMode && (
                                  <div className="flex items-center gap-2">
                                     <input
                                       type="number"
                                       min={0}
                                       max={item.qty}
                                       value={returns[item.id] ?? ''}
                                       onChange={e => setReturn(item.id, Number(e.target.value))}
                                       placeholder="0"
                                       className="w-20 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-amber-400"
                                     />
                                     <span className="text-[10px] text-text-soft font-bold uppercase">return</span>
                                  </div>
                                )}
                                <p className="text-sm font-bold text-blue">{formatCurrencyValue(item.total_price)}</p>
                             </div>
                          </div>
                       ))}
                    </div>

                    {isReturnMode && (
                      <div className="flex items-center justify-between gap-3">
                         <button
                           onClick={() => { setIsReturnMode(false); setReturns({}); }}
                           className="text-xs font-bold text-text-soft hover:text-navy transition-colors"
                         >
                            Cancel
                         </button>
                         <button
                           onClick={handleReturnItems}
                           disabled={busy}
                           className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all disabled:opacity-60"
                         >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Confirm Return
                         </button>
                      </div>
                    )}
                 </div>

                 {challan.notes && (
                    <div className="space-y-3">
                       <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Dispatch Notes</p>
                       <div className="p-5 bg-blue/5 rounded-2xl border-2 border-blue/10 text-sm text-navy leading-relaxed italic">
                          "{challan.notes}"
                       </div>
                    </div>
                 )}
              </>
           )}
        </div>

        <div className="p-8 border-t bg-gray-50 flex flex-col gap-3">
           <button
              onClick={() => window.open(`/api/sales/challans/${challanId}.pdf`, '_blank')}
              className="w-full py-4 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-3"
           >
              <Download className="h-5 w-5" /> Download Challan PDF
           </button>

           {canWrite && (
           <>
           {isPending && !isReturnMode && (
              <button
                onClick={() => setIsReturnMode(true)}
                className="w-full py-3.5 border-2 border-amber-500 text-amber-600 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-50 transition-all flex items-center justify-center gap-3"
              >
                 <Undo2 className="h-5 w-5" /> Return Items
              </button>
           )}

           {isPending && !isDelivered && (
              <div className="p-5 bg-white rounded-2xl border border-gray-100 space-y-3">
                 <p className="text-[10px] font-black text-text-soft uppercase tracking-widest flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> Mark Delivered
                 </p>
                 <div className="flex gap-2">
                    <input
                      value={receivedBy}
                      onChange={e => setReceivedBy(e.target.value)}
                      placeholder="Received by (name)"
                      className="flex-1 px-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-emerald-500/30 transition-all"
                    />
                    <button
                      onClick={handleMarkDelivered}
                      disabled={busy}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all disabled:opacity-60"
                    >
                       {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Done
                    </button>
                 </div>
              </div>
           )}

           {isPending && challan?.source_type === 'service' && (
              <div className="p-5 bg-white rounded-2xl border border-gray-100 space-y-2">
                 <p className="text-[10px] font-black text-text-soft uppercase tracking-widest flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5" /> Dispatch-only DC (Service Job)
                 </p>
                 <p className="text-xs text-text-soft font-medium leading-relaxed">
                    This DC tracks goods dispatched for Service Request <span className="font-bold text-navy">{challan.source_id}</span>. The final invoice is generated from the service bill flow (Generate Bill) so the materials + service charge are billed exactly once.
                 </p>
              </div>
           )}

           {isPending && challan?.source_type !== 'service' && (
              <div className="p-5 bg-white rounded-2xl border border-gray-100 space-y-3">
                 <label className="flex items-center gap-2 text-xs font-bold text-navy cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isGst}
                      onChange={e => setIsGst(e.target.checked)}
                      className="rounded accent-blue"
                    />
                    Generate as GST bill
                 </label>
                 <button
                   onClick={() => { setSelectedGst(isGst); setConfirmBillOpen(true); }}
                   disabled={busy}
                   className="w-full py-4 bg-blue text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue/20 flex items-center justify-center gap-3 disabled:opacity-60"
                 >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />} Convert to Final Bill
                 </button>
              </div>
           )}

           {isPending && (
              <button
                onClick={handleVoidChallan}
                disabled={busy}
                className="w-full py-3.5 border-2 border-red-200 text-red-500 rounded-2xl font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                 <Ban className="h-5 w-5" /> Void Challan
              </button>
           )}
           </>
           )}
        </div>
      </div>

      {confirmBillOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-navy uppercase text-xs tracking-widest">Generate Bill</h3>
              <button onClick={() => setConfirmBillOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-navy p-5 rounded-2xl text-white flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Bill Value</p>
                  <p className="text-2xl font-black">{formatCurrencyValue(challanTotal)}</p>
                </div>
                <FileText className="h-8 w-8 text-white/10" />
              </div>

              <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-black text-navy">{selectedGst ? 'GST Tax Invoice (18%)' : 'Non-GST Bill'}</p>
                  <p className="text-[10px] text-text-soft font-semibold mt-0.5">
                    {selectedGst ? 'CGST + SGST will be charged' : 'No tax components'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGst(v => !v)}
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${selectedGst ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${selectedGst ? 'left-[22px]' : 'left-0.5'}`}></span>
                </button>
              </div>

              {selectedGst ? (
                <div className="space-y-2 bg-soft border border-blue/10 rounded-2xl p-4 animate-in fade-in duration-200">
                  <div className="flex justify-between text-xs font-bold text-navy">
                    <span className="text-text-soft">Taxable base</span>
                    <span>{formatCurrencyValue(challanTaxable)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-navy">
                    <span className="text-text-soft">CGST @ 9%</span>
                    <span>{formatCurrencyValue(Math.round(challanGst / 2))}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-navy">
                    <span className="text-text-soft">SGST @ 9%</span>
                    <span>{formatCurrencyValue(challanGst - Math.round(challanGst / 2))}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-green-600 border-t border-gray-200 pt-2">
                    <span>Grand Total</span>
                    <span>{formatCurrencyValue(challanTotal)}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-soft p-4 rounded-2xl border border-blue/10 animate-in fade-in duration-200">
                  <p className="text-xs text-blue font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Non-GST Bill
                  </p>
                  <p className="text-[10px] text-text-soft mt-1">This will generate a standard bill without tax components.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmBillOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 text-navy rounded-xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvertToBill}
                  disabled={busy}
                  className="flex-1 py-3.5 bg-blue text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Confirm & Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallanDetailDrawer;