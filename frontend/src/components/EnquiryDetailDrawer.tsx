import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Hash,
  Clock,
  Target,
  Trash2,
  Send,
  CheckCircle2,
  Package,
  FileText,
  IndianRupee,
  Calendar,
  AlertTriangle,
  History,
  Truck,
  Receipt,
  Loader2
} from 'lucide-react';
import { Enquiry } from '../types';
import { formatCurrencyValue, formatDateValue, getEnquiryQuoteTotal, getEnquiryMargin } from '../utils/helpers';
import { enquiryService } from '../services/enquiryService';
import { challanService } from '../services/challanService';
import { toast } from '../utils/toast';
import QuotationComposer from './QuotationComposer';
import ConfirmOrderModal from './ConfirmOrderModal';
import DeliverEnquiryModal from './DeliverEnquiryModal';
import RecordEnquiryPaymentModal from './RecordEnquiryPaymentModal';

interface Props {
  enquiry: Enquiry;
  onClose: () => void;
  onUpdate: () => void;
}

const parseQuoteOptions = (raw?: string): any[] => {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parsePoIds = (raw?: string): string[] => {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const EnquiryDetailDrawer = ({ enquiry, onClose, onUpdate }: Props) => {
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [dc, setDc] = useState<any>(null);
  const [dcLoading, setDcLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [billGst, setBillGst] = useState(false);

  const quoteLines = parseQuoteOptions(enquiry.quote_options);
  const poIds = parsePoIds(enquiry.po_ids);
  const paymentPending = enquiry.status === 'delivered' && (Number(enquiry.final_received) || 0) <= 0;

  const quoteMargin = getEnquiryMargin(enquiry.quote_options);
  const dealMargin = quoteMargin.totalQuoted > 0
    ? quoteMargin.totalQuoted - quoteMargin.totalCost
    : ((enquiry.quoted_price || 0) - (enquiry.cost_price || 0)) * (enquiry.quantity || 1);
  const dealMarginClass = dealMargin >= 0 ? 'text-green-400' : 'text-red-400';

  const refreshDc = async () => {
    try {
      const data = await challanService.getChallanForSource('enquiry', enquiry.id);
      setDc(data || null);
    } catch {
      setDc(null);
    } finally {
      setDcLoading(false);
    }
  };

  useEffect(() => {
    refreshDc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry.id]);

  const handleGenerateDc = async () => {
    setGenerating(true);
    try {
      await challanService.createChallan({
        sourceType: 'enquiry',
        sourceId: enquiry.id,
        items: quoteLines.length
          ? quoteLines.map(l => ({ name: l.name, qty: l.quantity, rate: l.quotedPrice }))
          : undefined,
        dispatchDate: new Date().toISOString().slice(0, 10),
        receiverName: enquiry.customer_name,
      });
      toast('D.C. generated for delivery', 'success');
      await refreshDc();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to generate D.C.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleConvertToBill = async () => {
    if (!dc) return;
    setConverting(true);
    try {
      const res = await challanService.consolidateToBill([dc.id], billGst);
      toast('Bill generated — payment pending', 'success');
      await refreshDc();
      if (window.confirm('View the new invoice?')) {
        window.open(`/api/sales/orders/${res.orderId}/invoice.pdf`, '_blank');
      }
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to generate bill', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleAction = async (action: 'quote' | 'deliver' | 'delete') => {
    if (action === 'delete') {
      if (!window.confirm('Delete this lead permanently?')) return;
      try {
        await enquiryService.deleteEnquiry(enquiry.id);
        toast('Lead deleted', 'success');
        onUpdate();
        onClose();
      } catch (err: any) { toast(err.message, 'error'); }
      return;
    }

    if (action === 'deliver') {
      setDeliverModalOpen(true);
      return;
    }
  };

  const statusColors: any = {
    new: 'bg-orange-500',
    quoted: 'bg-blue-500',
    confirmed: 'bg-green-500',
    delivered: 'bg-navy'
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-8 border-b bg-gray-50 flex justify-between items-start">
           <div>
              <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest inline-block mb-3 ${statusColors[enquiry.status]}`}>
                 {enquiry.status}
              </div>
              <h2 className="text-2xl font-black text-navy leading-tight">{enquiry.customer_name}</h2>
              <div className="flex items-center gap-4 mt-2 text-text-soft">
                 <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight">
                    <Smartphone className="h-3.5 w-3.5" /> {enquiry.customer_mobile}
                 </div>
                 <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight">
                    <Hash className="h-3.5 w-3.5" /> {enquiry.id}
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-text-soft">
              <X className="h-6 w-6" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Lead Source</p>
                 <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${enquiry.lead_source?.includes('BNI') ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-text-soft'}`}>
                       {enquiry.lead_source || 'Walk-in'}
                    </span>
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Requirement</p>
                 <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <Target className="h-4 w-4 text-blue" />
                    {enquiry.product_interest || enquiry.type}
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Expected Date</p>
                 <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <Calendar className="h-4 w-4 text-blue" />
                    {formatDateValue(enquiry.preferred_date || '')}
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Value / Budget</p>
                 <div className="flex items-center gap-2 text-sm font-bold text-blue">
                    <IndianRupee className="h-4 w-4" />
                    {getEnquiryQuoteTotal(enquiry.quote_options) ? formatCurrencyValue(getEnquiryQuoteTotal(enquiry.quote_options)) : (enquiry.budget ? formatCurrencyValue(enquiry.budget) : 'N/A')}
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Quantity</p>
                 <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <Package className="h-4 w-4 text-blue" />
                    {enquiry.quantity || 1} Units
                 </div>
              </div>
           </div>

           <div className="space-y-3">
              <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                 <FileText className="h-3.5 w-3.5" /> Timeline & Notes
              </p>
              <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 text-sm text-text-soft leading-relaxed italic">
                 "{enquiry.notes || 'No notes recorded for this lead.'}"
              </div>
              <p className="text-[10px] text-text-soft font-medium pl-1">Created on {new Date(enquiry.created_at).toLocaleString()}</p>
           </div>

           {(enquiry.customer_advance_amount! > 0 || enquiry.supplier_advance_amount! > 0 || enquiry.status === 'delivered') && (
              <div className="space-y-4">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                    <IndianRupee className="h-3.5 w-3.5" /> Payment Settlement
                 </p>
                 <div className="bg-navy p-6 rounded-[2rem] text-white space-y-4 shadow-xl shadow-navy/20 relative overflow-hidden">
                    <History className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5" />

                    <div className="space-y-4 relative z-10">
                       <div className="grid grid-cols-2 gap-4">
                          {enquiry.customer_advance_amount! > 0 && (
                             <div className="space-y-1">
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Cust. Advance</p>
                                <p className="text-lg font-black text-blue-400">{formatCurrencyValue(enquiry.customer_advance_amount || 0)}</p>
                                <p className="text-[8px] text-gray-400 uppercase">{enquiry.customer_advance_mode} • {formatDateValue(enquiry.customer_advance_date || '')}</p>
                             </div>
                          )}
                          {enquiry.status === 'delivered' && (
                             <div className="space-y-1 text-right">
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Final Payment</p>
                                <p className="text-lg font-black text-green-400">{formatCurrencyValue(enquiry.final_received || 0)}</p>
                                <p className="text-[8px] text-gray-400 uppercase">{enquiry.final_mode} • {formatDateValue(enquiry.final_date || '')}</p>
                             </div>
                          )}
                       </div>

                       {enquiry.supplier_advance_amount! > 0 && (
                          <div className="pt-3 border-t border-white/5">
                             <p className="text-[10px] text-red-400 uppercase font-bold">Supplier Advance Paid</p>
                             <div className="flex justify-between items-baseline">
                                <p className="text-lg font-black text-red-400">{formatCurrencyValue(enquiry.supplier_advance_amount || 0)}</p>
                                <p className="text-[8px] text-gray-400 uppercase">{enquiry.supplier_advance_mode} • {formatDateValue(enquiry.supplier_advance_date || '')}</p>
                             </div>
                          </div>
                       )}

                       {enquiry.status === 'delivered' && (
                          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                             <div>
<p className="text-[10px] text-gray-400 uppercase font-bold">Net Margin (Est.)</p>
                                 <p className={`text-sm font-black ${dealMarginClass}`}>
                                    {dealMargin >= 0 ? '+' : ''}{formatCurrencyValue(dealMargin)}
                                 </p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Total Collection</p>
                                <p className="text-xl font-black text-white">{formatCurrencyValue((enquiry.customer_advance_amount || 0) + (enquiry.final_received || 0))}</p>
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           )}

           {quoteLines.length > 0 && (
              <div className="space-y-3">
                 <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                    <Send className="h-3.5 w-3.5" /> Quotation Summary
                 </p>
                 <div className="bg-white rounded-2xl border-2 border-gray-100 divide-y divide-gray-100 overflow-hidden">
                    {quoteLines.map((l, idx) => (
                       <div key={idx} className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                             <p className="text-sm font-bold text-navy truncate">{l.name || 'Item'}</p>
                             <div className="flex items-center gap-1.5 mt-1">
<span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                    l.source === 'procurement'
                                      ? l.sqId
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : Number(l.costPrice) > 0
                                          ? 'bg-gray-50 text-text-soft border border-gray-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-gray-100 text-text-soft'
                                 }`}>
                                    {l.source === 'procurement' ? (l.sqId ? `SQ ${l.sqNumber || ''}` : 'Procure') : 'From Stock'}
                                 </span>
                                {l.source === 'procurement' && !l.sqId && !(Number(l.costPrice) > 0) && (
                                   <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                      Cost pending
                                   </span>
                                )}
                             </div>
                          </div>
                           <div className="text-right shrink-0">
                              <p className="text-sm font-black text-blue">{formatCurrencyValue((l.quotedPrice || 0) * (l.quantity || 1))}</p>
                              <p className="text-[9px] text-text-soft font-bold">{l.quantity || 1} x {formatCurrencyValue(l.quotedPrice || 0)}</p>
                              {Number(l.costPrice) > 0 && (
                                <p className={`text-[9px] font-black mt-0.5 ${((l.quotedPrice || 0) * (l.quantity || 1)) > (l.costPrice || 0) ? 'text-green-600' : 'text-red-500'}`}>
                                  {(((l.quotedPrice || 0) * (l.quantity || 1)) - (l.costPrice || 0)) > 0 ? '+' : ''}{formatCurrencyValue(((l.quotedPrice || 0) * (l.quantity || 1)) - (l.costPrice || 0))}
                                  {' '}({Math.round((((l.quotedPrice || 0) * (l.quantity || 1)) - (l.costPrice || 0)) / (l.costPrice || 1) * 100)}%)
                                </p>
                              )}
                           </div>
                       </div>
                    ))}
                     <div className="p-4 bg-navy flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Quote Total</span>
                        <span className="text-lg font-black text-white">
                           {formatCurrencyValue(quoteLines.reduce((s, l) => s + ((l.quotedPrice || 0) * (l.quantity || 1)), 0))}
                        </span>
                     </div>
                     {(() => {
                       const m = getEnquiryMargin(enquiry.quote_options);
                       if (m.totalCost <= 0) return null;
                       return (
                         <div className="p-3 bg-navy/80 flex justify-between items-center border-t border-white/5">
                           <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Est. Margin</span>
                           <div className="text-right">
                             <span className={`text-sm font-black ${m.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                               {m.margin > 0 ? '+' : ''}{formatCurrencyValue(m.margin)}
                             </span>
                             <span className={`ml-2 text-[10px] font-bold ${m.margin > 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                               ({m.marginPercent}%)
                             </span>
                           </div>
                         </div>
                       );
                     })()}
                 </div>
                 {enquiry.status === 'confirmed' && poIds.length > 0 && (
                    <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest pl-1 pt-2">
                       Purchase order{(poIds.length > 1 ? 's' : '')} created: {poIds.join(', ')}
                    </p>
                 )}
              </div>
           )}

           {enquiry.status === 'confirmed' && (
              <div className="p-6 bg-blue/5 border border-blue/10 rounded-[2rem] flex items-start gap-4">
                 <AlertTriangle className="h-6 w-6 text-blue shrink-0" />
                 <div>
                    <p className="text-sm font-bold text-blue uppercase tracking-tight mb-1">Order Confirmed</p>
                    <p className="text-xs text-text-soft leading-relaxed">
                       This lead has been converted to an order. A Purchase Order has been created to source the items. Mark as delivered once stock is received and handed over.
                    </p>
                 </div>
              </div>
           )}
        </div>

        <div className="p-8 border-t bg-gray-50 flex flex-col gap-3">
           <div className="grid grid-cols-2 gap-3">
              {enquiry.status === 'new' && (
                 <button
                  onClick={() => setQuoteModalOpen(true)}
                  className="px-6 py-3 bg-blue text-white rounded-2xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue/20"
                 >
                   <FileText className="h-4 w-4" /> Prepare Quote
                 </button>
              )}
              {enquiry.status === 'quoted' && (
                 <>
                   <button
                    onClick={() => setConfirmModalOpen(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                   >
                     <CheckCircle2 className="h-4 w-4" /> Confirm Order
                   </button>
                   <button onClick={() => setQuoteModalOpen(true)} className="px-6 py-3 bg-white border border-gray-200 text-navy rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all">
                     Edit Quote
                   </button>
                 </>
              )}
              {enquiry.status === 'confirmed' && (
                 <>
                   <button
                    onClick={() => handleAction('deliver')}
                    className="px-6 py-3 bg-navy text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-navy/20"
                   >
                     <Package className="h-4 w-4" /> Mark as Delivered
                   </button>
                   <button
                    onClick={dc ? () => window.open(`/api/sales/challans/${dc.id}.pdf`, '_blank') : handleGenerateDc}
                    disabled={generating || dcLoading}
                    className="px-6 py-3 bg-blue text-white rounded-2xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                     {dc ? `View / D.C. — ${dc.challan_number}` : 'Generate D.C.'}
                   </button>
                 </>
              )}
{enquiry.status === 'delivered' && (
                 <>
                   {dc ? (
                     <button
                      onClick={() => window.open(`/api/sales/challans/${dc.id}.pdf`, '_blank')}
                      disabled={generating || dcLoading}
                      className="px-6 py-3 bg-white border border-gray-200 text-navy rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                      <Truck className="h-4 w-4" /> View D.C. — {dc.challan_number}
                     </button>
                   ) : !paymentPending ? (
                     <div className="col-span-2 px-6 py-3 bg-gray-50 border border-gray-100 text-text-soft rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                       <Truck className="h-4 w-4" /> Delivery already billed & collected
                     </div>
                   ) : (
                     <button
                      onClick={handleGenerateDc}
                      disabled={generating || dcLoading}
                      className="col-span-2 px-6 py-3 bg-blue text-white rounded-2xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                      Generate D.C.
                     </button>
                   )}
                   {dc && dc.billing_status === 'pending' && (
                     <button
                      onClick={handleConvertToBill}
                      disabled={converting}
                      className="px-6 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 disabled:opacity-50"
                     >
                       {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                       Convert to Bill
                     </button>
                   )}
                   {dc && dc.billing_status === 'billed' && dc.linked_order_id && (
                     <button
                      onClick={() => window.open(`/api/sales/orders/${dc.linked_order_id}/invoice.pdf`, '_blank')}
                      className="px-6 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                     >
                       <Receipt className="h-4 w-4" /> View Invoice — Payment Pending
                     </button>
                   )}
                   {paymentPending && (
                     <button
                      onClick={() => setRecordPaymentOpen(true)}
                      className="px-6 py-3 bg-amber-500 text-white rounded-2xl text-sm font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                     >
                       <IndianRupee className="h-4 w-4" /> Record Payment
                     </button>
                   )}
                 </>
              )}
           </div>

           {enquiry.status === 'delivered' && dc && dc.billing_status === 'pending' && (
              <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2">
                 <span className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Generate GST bill?</span>
                 <button
                   type="button"
                   onClick={() => setBillGst(v => !v)}
                   className={`relative w-11 h-6 rounded-full transition-colors ${billGst ? 'bg-green-500' : 'bg-gray-300'}`}
                 >
                   <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${billGst ? 'left-[22px]' : 'left-0.5'}`}></span>
                 </button>
              </div>
           )}

           {enquiry.status !== 'delivered' && (
              <button
                onClick={() => handleAction('delete')}
                className="w-full py-3 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                 <Trash2 className="h-4 w-4" /> Delete Lead
              </button>
           )}
        </div>
      </div>

      {quoteModalOpen && (
        <QuotationComposer
          context={{ type: 'enquiry', enquiry }}
          initialValidUntil={enquiry.valid_until}
          onClose={() => setQuoteModalOpen(false)}
          onSuccess={onUpdate}
        />
      )}

      {confirmModalOpen && (
        <ConfirmOrderModal
          enquiry={enquiry}
          onClose={() => setConfirmModalOpen(false)}
          onSuccess={onUpdate}
        />
      )}

      {deliverModalOpen && (
        <DeliverEnquiryModal
          enquiry={enquiry}
          onClose={() => setDeliverModalOpen(false)}
          onSuccess={onUpdate}
        />
      )}

      {recordPaymentOpen && (
        <RecordEnquiryPaymentModal
          enquiry={enquiry}
          onClose={() => setRecordPaymentOpen(false)}
          onSuccess={onUpdate}
        />
      )}
    </div>
  );
};

export default EnquiryDetailDrawer;
