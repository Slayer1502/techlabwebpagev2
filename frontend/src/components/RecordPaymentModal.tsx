import React, { useState } from 'react';
import { X, IndianRupee, Loader2, Save, CreditCard, Calendar } from 'lucide-react';
import api from '../utils/api';
import { toast } from '../utils/toast';
import { formatCurrencyValue } from '../utils/helpers';

interface Props {
  requestId: string;
  remaining: number;
  onClose: () => void;
  onSuccess: () => void;
}

const RecordPaymentModal = ({ requestId, remaining, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    amount: remaining,
    discount: 0,
    paymentMode: 'Cash',
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`/sales/service-requests/${requestId}/payment`, formData);
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
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
           <h3 className="font-bold text-navy uppercase text-xs tracking-widest">Receive Payment</h3>
           <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div className="space-y-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Collection Amount</label>
                 <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                    <input
                      type="number"
                      required
                      max={remaining}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all font-bold"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    />
                 </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Payment Mode</label>
                 <div className="flex bg-gray-50 p-1 rounded-xl">
                    {['Cash', 'UPI', 'Bank'].map(mode => (
                       <button
                        key={mode}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMode: mode })}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.paymentMode === mode ? 'bg-white text-blue shadow-sm' : 'text-text-soft'}`}
                       >
                          {mode}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Discount (if any)</label>
                 <input
                   type="number"
                   className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all"
                   value={formData.discount}
                   onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })}
                 />
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Payment Date</label>
                 <input
                   type="date"
                   className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all"
                   value={formData.paymentDate}
                   onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
                 />
              </div>
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
