import React, { useState } from 'react';
import { X, FileText, Loader2, Save, IndianRupee, Calendar, Percent, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import { toast } from '../utils/toast';
import { formatCurrencyValue } from '../utils/helpers';

interface Props {
  request: any;
  onClose: () => void;
  onSuccess: () => void;
}

const GenerateBillModal = ({ request, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [isGstEnabled, setIsGstEnabled] = useState(false); // Default to OFF as requested for this case

  const used = (() => {
    try { return JSON.parse(request.used_items || '[]'); } catch { return []; }
  })();

  const subtotal = used.reduce((sum: number, i: any) => sum + (i.price * i.qty), 0);

  const [formData, setFormData] = useState({
    taxableAmount: subtotal,
    gstRate: 18,
    billDate: new Date().toISOString().slice(0, 10),
  });

  // Effect to sync taxable amount when total or GST toggle changes
  React.useEffect(() => {
    if (!isGstEnabled) {
      setFormData(prev => ({ ...prev, taxableAmount: subtotal, gstRate: 0 }));
    } else {
      setFormData(prev => ({ ...prev, taxableAmount: subtotal / 1.18, gstRate: 18 }));
    }
  }, [isGstEnabled, subtotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(`/sales/service-requests/${request.id}/bill`, {
        ...formData,
        amount: subtotal,
        items: used.map((i: any) => ({ desc: i.name, qty: i.qty, rate: i.price, amount: i.price * i.qty }))
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
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
           <h3 className="font-bold text-navy uppercase text-xs tracking-widest">Generate Bill</h3>
           <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div className="bg-navy p-6 rounded-2xl text-white shadow-xl shadow-navy/20 flex justify-between items-end">
              <div>
                 <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Final Service Value</p>
                 <p className="text-3xl font-black">{formatCurrencyValue(subtotal)}</p>
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

           <button
             disabled={loading}
             className="w-full py-4 bg-green-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex justify-center items-center gap-2"
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
