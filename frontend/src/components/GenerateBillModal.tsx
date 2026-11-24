import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2, Save, IndianRupee, Calendar, Percent, CheckCircle2, Package } from 'lucide-react';
import { challanService } from '../services/challanService';
import { serviceRequestService } from '../services/serviceRequestService';
import api from '../utils/api';
import { toast } from '../utils/toast';
import { formatCurrencyValue } from '../utils/helpers';

interface Props {
  request: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface LineItem {
  desc: string;
  qty: number;
  rate: number;
  amount: number;
}

const norm = (s: string) => String(s || '').trim().toLowerCase();

const GenerateBillModal = ({ request, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(true);
  const [isGstEnabled, setIsGstEnabled] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [subTotal, setSubTotal] = useState(0);

  const [formData, setFormData] = useState({
    taxableAmount: 0,
    gstRate: 18,
    billDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    let cancelled = false;
    const build = async () => {
      setComposing(true);
      try {
        let dc: any = null;
        let quoteItems: any[] = [];
        try { dc = await challanService.getChallanForSource('service', request.id); } catch {}
        try {
          const qres = await serviceRequestService.getQuotationsForRequest(request.id);
          quoteItems = qres?.quotation?.items || [];
        } catch {}

        const dcItemNames = new Set((dc?.items || []).map((i: any) => norm(i.item_name)));

        let items: LineItem[] = [];
        if (dc?.items?.length) {
          items = dc.items.map((it: any) => ({
            desc: it.item_name,
            qty: it.qty,
            rate: it.unit_price,
            amount: it.total_price || it.qty * it.unit_price,
          }));

          const labourItems = quoteItems
            .filter((qi: any) => !dcItemNames.has(norm(qi.product_name)))
            .map((qi: any) => ({
              desc: qi.product_name,
              qty: Number(qi.quantity) || 1,
              rate: Number(qi.unit_price) || 0,
              amount: (Number(qi.quantity) || 1) * (Number(qi.unit_price) || 0),
            }));
          items = [...items, ...labourItems];
        } else if (quoteItems.length) {
          items = quoteItems.map((qi: any) => ({
            desc: qi.product_name,
            qty: Number(qi.quantity) || 1,
            rate: Number(qi.unit_price) || 0,
            amount: (Number(qi.quantity) || 1) * (Number(qi.unit_price) || 0),
          }));
        } else {
          const used = (() => { try { return JSON.parse(request.used_items || '[]'); } catch { return []; } })();
          items = used.map((i: any) => ({ desc: i.name, qty: i.qty, rate: i.price, amount: i.price * i.qty }));
        }

        // Always merge any remaining used_items (service charges, labor, extra parts)
        const usedAll = (() => { try { return JSON.parse(request.used_items || '[]'); } catch { return []; } })();
        const existingNames = new Set(items.map(i => norm(i.desc)));
        const extraUsed = usedAll
          .filter((u: any) => !existingNames.has(norm(u.name)))
          .map((u: any) => ({
            desc: u.name,
            qty: Number(u.qty) || 1,
            rate: Number(u.price) || 0,
            amount: (Number(u.qty) || 1) * (Number(u.price) || 0)
          }));
        items = [...items, ...extraUsed];

        if (!cancelled) {
          setLineItems(items);
          const total = items.reduce((s: number, l: LineItem) => s + l.amount, 0);
          setSubTotal(total);
          setFormData(prev => ({ ...prev, taxableAmount: isGstEnabled ? total / 1.18 : total }));
        }
      } catch {
        const used = (() => { try { return JSON.parse(request.used_items || '[]'); } catch { return []; } })();
        const items = used.map((i: any) => ({ desc: i.name, qty: i.qty, rate: i.price, amount: i.price * i.qty }));
        if (!cancelled) {
          setLineItems(items);
          setSubTotal(items.reduce((s: number, l: LineItem) => s + l.amount, 0));
        }
      } finally {
        if (!cancelled) setComposing(false);
      }
    };
    build();
    return () => { cancelled = true; };
  }, [request.id, request.used_items, isGstEnabled]);

  React.useEffect(() => {
    if (!isGstEnabled) {
      setFormData(prev => ({ ...prev, taxableAmount: subTotal, gstRate: 0 }));
    } else {
      setFormData(prev => ({ ...prev, taxableAmount: Math.round(subTotal / 1.18), gstRate: 18 }));
    }
  }, [isGstEnabled, subTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/sales/service-requests/${request.id}/bill`, {
        ...formData,
        amount: subTotal,
        items: lineItems.map(i => ({ desc: i.desc, qty: i.qty, rate: i.rate, amount: i.amount })),
      });
      toast('Bill generated successfully!', 'success');
      onSuccess();
      onClose();
      if (window.confirm('Bill generated! Would you like to open/download the PDF invoice now?')) {
        window.open(`/api/sales/service-requests/${request.id}/bill.pdf`, '_blank');
      }
    } catch (err: any) {
      toast(err.response?.data?.error || 'Billing failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
           <h3 className="font-bold text-navy uppercase text-xs tracking-widest">Generate Bill</h3>
           <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div className="bg-navy p-6 rounded-2xl text-white shadow-xl shadow-navy/20 flex justify-between items-end">
              <div>
                 <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Final Service Value</p>
                 {composing ? (
                    <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-xs">Composing…</span></div>
                 ) : (
                    <p className="text-3xl font-black">{formatCurrencyValue(subTotal)}</p>
                 )}
              </div>
              <div className="flex flex-col items-end gap-2">
                 <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-[10px] font-bold uppercase text-gray-300">GST Invoice</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" className="sr-only peer" checked={isGstEnabled} onChange={e => setIsGstEnabled(e.target.checked)} />
                       <div className="w-8 h-4 bg-white/20 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue"></div>
                    </label>
                 </div>
                 <FileText className="h-6 w-6 text-white/10" />
              </div>
           </div>

           <div className="space-y-4">
              {isGstEnabled && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Taxable Base (Net)</label>
                       <div className="relative">
                          <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                          <input
                            type="number"
                            required
                            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all font-bold"
                            value={formData.taxableAmount}
                            onChange={e => setFormData({ ...formData, taxableAmount: Number(e.target.value) })}
                          />
                       </div>
                       <p className="text-[9px] text-text-soft italic ml-1">* Adjusted for GST inclusive pricing</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-soft uppercase ml-1">GST Rate (%)</label>
                          <div className="relative">
                             <Percent className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                             <select
                               className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none appearance-none font-bold focus:border-blue/40 transition-all"
                               value={formData.gstRate}
                               onChange={e => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                             >
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                             </select>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Bill Date</label>
                          <div className="relative">
                             <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                             <input
                               type="date"
                               required
                               className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none font-bold focus:border-blue/40 transition-all"
                               value={formData.billDate}
                               onChange={e => setFormData({ ...formData, billDate: e.target.value })}
                             />
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {!isGstEnabled && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Bill Date</label>
                       <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                          <input
                            type="date"
                            required
                            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none font-bold focus:border-blue/40 transition-all"
                            value={formData.billDate}
                            onChange={e => setFormData({ ...formData, billDate: e.target.value })}
                          />
                       </div>
                    </div>
                    <div className="bg-soft p-4 rounded-2xl border border-blue/10">
                       <p className="text-xs text-blue font-bold flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Non-GST Service Bill
                       </p>
                       <p className="text-[10px] text-text-soft mt-1">This will generate a standard estimate/bill without tax components.</p>
                    </div>
                 </div>
              )}
           </div>

           {!composing && lineItems.length > 0 && (
              <div className="space-y-2 animate-in fade-in duration-200">
                 <div className="flex items-center gap-2 mb-1">
                    <Package className="h-3.5 w-3.5 text-text-soft" />
                    <span className="text-[10px] font-black text-text-soft uppercase tracking-widest">Billed items</span>
                 </div>
                 <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 border-b border-gray-100">
                          <tr className="text-[9px] font-black text-text-soft uppercase tracking-widest">
                             <th className="px-4 py-2">Item</th>
                             <th className="px-3 py-2 text-right">Qty</th>
                             <th className="px-3 py-2 text-right">Rate</th>
                             <th className="px-4 py-2 text-right">Amount</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {lineItems.map((it, idx) => (
                             <tr key={idx} className="text-xs font-bold text-navy">
                                <td className="px-4 py-2 truncate max-w-[200px]">{it.desc}</td>
                                <td className="px-3 py-2 text-right">{it.qty}</td>
                                <td className="px-3 py-2 text-right">₹{Number(it.rate).toLocaleString()}</td>
                                <td className="px-4 py-2 text-right text-blue">{formatCurrencyValue(it.amount)}</td>
                             </tr>
                          ))}
                       </tbody>
                       <tfoot className="bg-gray-50 border-t border-gray-200">
                          <tr className="text-[10px] font-black text-navy">
                             <td colSpan={3} className="px-4 py-2 uppercase tracking-widest">Total</td>
                             <td className="px-4 py-2 text-right text-blue">{formatCurrencyValue(subTotal)}</td>
                          </tr>
                       </tfoot>
                    </table>
                 </div>
              </div>
           )}

           <button
             disabled={loading || composing}
             className="w-full py-4 bg-green-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex justify-center items-center gap-2 disabled:opacity-50"
           >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Finalize & Generate Invoice
           </button>
        </form>
      </div>
    </div>
  );
};

export default GenerateBillModal;