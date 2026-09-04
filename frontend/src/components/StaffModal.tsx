import React, { useState } from 'react';
import { X, Loader2, Save, User, Mail, Smartphone, ShieldCheck, Lock } from 'lucide-react';
import { settingsService } from '../services/settingsService';
import api from '../utils/api';
import { toast } from '../utils/toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const StaffModal = ({ onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'employee'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/admin/employees', formData);
      toast('Staff member added!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">Add Team Member</h2>
            <p className="text-xs text-text-soft font-bold uppercase mt-0.5 tracking-tight">Access Control</p>
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
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Full Name</label>
             <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input required className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Email (Username)</label>
             <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input type="email" required className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Mobile</label>
             <div className="relative">
                <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input required className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Initial Password</label>
             <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input type="password" required className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">System Role</label>
             <div className="relative">
                <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <select className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all appearance-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                   <option value="employee">Service Coordinator</option>
                   <option value="sales">Sales & Inventory</option>
                   <option value="technician">Service Technician</option>
                   <option value="admin">System Admin</option>
                </select>
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-text-soft hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
             <button disabled={loading} className="px-8 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-navy/20">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Add Member
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffModal;
