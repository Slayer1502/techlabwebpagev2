import React, { useState } from 'react';
import { X, Loader2, Save, CreditCard, User, Hash, Zap } from 'lucide-react';
import { settingsService } from '../services/settingsService';
import { toast } from '../utils/toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const BankModal = ({ onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await settingsService.addBankAccount(formData);
      toast('Bank account registered!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">Register Bank Account</h2>
            <p className="text-xs text-text-soft font-bold uppercase mt-0.5 tracking-tight">Financial Channels</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-text-soft" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-bold uppercase tracking-tight">
              {error}
            </div>
          )}

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Bank Name</label>
             <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input required className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all font-bold text-navy" placeholder="e.g. HDFC Bank" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Account Holder</label>
             <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input required className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all" placeholder="Legal Name" value={formData.accountHolder} onChange={e => setFormData({ ...formData, accountHolder: e.target.value })} />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Account Number</label>
             <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input required className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all font-mono tracking-wider" value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">IFSC Code</label>
             <input required className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all uppercase" placeholder="ABCD0123456" value={formData.ifsc} onChange={e => setFormData({ ...formData, ifsc: e.target.value })} />
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-blue uppercase ml-1">UPI ID (For Dynamic QR)</label>
             <div className="relative">
                <Zap className="absolute left-3 top-2.5 h-4 w-4 text-blue" />
                <input required className="w-full pl-10 pr-4 py-2 bg-white border-2 border-blue-200 rounded-xl text-sm outline-none focus:border-blue/40 transition-all font-bold text-blue" placeholder="username@bank" value={formData.upiId} onChange={e => setFormData({ ...formData, upiId: e.target.value })} />
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-text-soft hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
             <button disabled={loading} className="px-8 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-navy/20">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Add Account
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankModal;
