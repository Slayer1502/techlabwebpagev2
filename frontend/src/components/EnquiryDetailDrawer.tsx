import React, { useState } from 'react';
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
  History
} from 'lucide-react';
import { Enquiry } from '../types';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { enquiryService } from '../services/enquiryService';
import { toast } from '../utils/toast';

interface Props {
  enquiry: Enquiry;
  onClose: () => void;
  onUpdate: () => void;
}

const EnquiryDetailDrawer = ({ enquiry, onClose, onUpdate }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'quote' | 'confirm' | 'deliver' | 'delete') => {
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
      const finalStr = prompt(`Enter final amount received from customer (Quoted: ${formatCurrencyValue(enquiry.quoted_price || 0)}):`, String(enquiry.quoted_price || 0));
      if (finalStr === null) return;
      const mode = prompt('Payment mode (Cash/UPI/Bank):', 'Cash') || 'Cash';

      setLoading(true);
      try {
        await enquiryService.markDelivered(enquiry.id, { received: Number(finalStr), mode });
        toast('Lead marked as delivered and payment recorded', 'success');
        onUpdate();
        onClose();
      } catch (err: any) { toast(err.message, 'error'); }
      finally { setLoading(false); }
      return;
    }

    if (action === 'confirm') {
       const custAdvStr = prompt('Enter advance amount RECEIVED FROM CUSTOMER:', '0');
       if (custAdvStr === null) return;
       const custMode = prompt('Customer payment mode (Cash/UPI/Bank):', 'Cash') || 'Cash';

       const suppAdvStr = prompt('Enter advance amount PAID TO SUPPLIER:', '0');
       if (suppAdvStr === null) return;
       const suppMode = prompt('Supplier payment mode (Cash/UPI/Bank):', 'Cash') || 'Cash';

       setLoading(true);
       try {
         await enquiryService.confirmOrder(enquiry.id, {
             customerAdvanceAmount: Number(custAdvStr),
             customerAdvanceMode: custMode,
             customerAdvanceDate: new Date().toISOString().slice(0, 10),
             supplierAdvanceAmount: Number(suppAdvStr),
             supplierAdvanceMode: suppMode,
             supplierAdvanceDate: new Date().toISOString().slice(0, 10)
         });
         toast('Order confirmed and PO created', 'success');
         onUpdate();
         onClose();
       } catch (err: any) { toast(err.message, 'error'); }
       finally { setLoading(false); }
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
                    {enquiry.quoted_price ? formatCurrencyValue(enquiry.quoted_price) : (enquiry.budget ? formatCurrencyValue(enquiry.budget) : 'N/A')}
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
                                <p className="text-sm font-black text-yellow-400">
                                   {formatCurrencyValue(((enquiry.customer_advance_amount || 0) + (enquiry.final_received || 0)) - ((enquiry.cost_price || 0) * (enquiry.quantity || 1)))}
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
                  onClick={() => toast('Quotation feature coming soon', 'info')}
                  className="px-6 py-3 bg-blue text-white rounded-2xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue/20"
                 >
                   <Send className="h-4 w-4" /> Send Quote
                 </button>
              )}
              {enquiry.status === 'quoted' && (
                 <>
                   <button
                    onClick={() => handleAction('confirm')}
                    className="px-6 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                   >
                     <CheckCircle2 className="h-4 w-4" /> Confirm Order
                   </button>
                   <button className="px-6 py-3 bg-white border border-gray-200 text-navy rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all">
                     Edit Quote
                   </button>
                 </>
              )}
              {enquiry.status === 'confirmed' && (
                 <button
                  onClick={() => handleAction('deliver')}
                  className="col-span-2 px-6 py-3 bg-navy text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-navy/20"
                 >
                   <Package className="h-4 w-4" /> Mark as Delivered
                 </button>
              )}
           </div>

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
    </div>
  );
};

export default EnquiryDetailDrawer;
