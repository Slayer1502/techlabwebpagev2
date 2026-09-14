import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { settingsService } from '../services/settingsService';
import {
  Settings,
  Users,
  Building2,
  CreditCard,
  Save,
  Plus,
  Trash2,
  Key,
  CheckCircle2,
  Loader2,
  QrCode,
  Star,
  Smartphone,
  Mail,
  ShieldCheck,
  Fuel
} from 'lucide-react';
import { toast } from '../utils/toast';
import StaffModal from '../components/StaffModal';
import BankModal from '../components/BankModal';

const SettingsPage = () => {
  const [activeTab, setTab] = useState<'business' | 'staff' | 'banks'>('business');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Business Settings State
  const { data: businessData, isLoading: bizLoading } = useQuery({
    queryKey: ['settings-biz'],
    queryFn: () => settingsService.getBusiness(),
  });

  const [bizForm, setBizForm] = useState<any>(null);

  React.useEffect(() => {
     if (businessData) setBizForm(businessData.settings);
  }, [businessData]);

  const updateBizMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateBusiness(data),
    onSuccess: () => toast('Business settings updated', 'success'),
  });

  // Staff Settings
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['settings-staff'],
    queryFn: () => settingsService.getStaff(),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteStaff(id),
    onSuccess: () => {
      toast('Staff member removed', 'success');
      queryClient.invalidateQueries({ queryKey: ['settings-staff'] });
    },
  });

  // Bank Settings
  const { data: banks, isLoading: banksLoading } = useQuery({
    queryKey: ['settings-banks'],
    queryFn: () => settingsService.getBankAccounts(),
  });

  const primaryBankMutation = useMutation({
    mutationFn: (id: string) => settingsService.setPrimaryBank(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings-banks'] }),
  });

  const toggleQrMutation = useMutation({
    mutationFn: (id: string) => settingsService.toggleBankQr(id),
    onSuccess: () => {
      toast('QR Code status updated!', 'success');
      queryClient.invalidateQueries({ queryKey: ['settings-banks'] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error || 'Failed to update QR status', 'error');
    }
  });

  const handleStaffReset = async (id: string) => {
    const pw = prompt('Enter new password (min 4 chars):');
    if (!pw || pw.length < 4) return;
    try {
      await settingsService.resetStaffPassword(id, pw);
      toast('Password updated successfully', 'success');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Update failed', 'error');
    }
  };

  const handleBizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBizMutation.mutate(bizForm);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">System Settings</h1>
            <p className="text-text-soft text-sm font-medium">Control business identity, team access, and financial channels</p>
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
             <button
                onClick={() => setTab('business')}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'business' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-50'}`}
             >
                <Building2 className="h-4 w-4" /> Company
             </button>
             <button
                onClick={() => setTab('staff')}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'staff' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-50'}`}
             >
                <Users className="h-4 w-4" /> Team
             </button>
             <button
                onClick={() => setTab('banks')}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'banks' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-50'}`}
             >
                <CreditCard className="h-4 w-4" /> Banking
             </button>
          </div>
        </div>

        {activeTab === 'business' && bizForm && (
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b bg-gray-50/50 flex items-center gap-4">
                 <div className="p-3 bg-blue text-white rounded-2xl shadow-lg shadow-blue/20">
                    <Building2 className="h-6 w-6" />
                 </div>
                 <div>
                    <h2 className="text-lg font-bold text-navy tracking-tight">Company Identity</h2>
                    <p className="text-xs text-text-soft font-bold uppercase tracking-tight">Standard Invoice & Report Header Info</p>
                 </div>
              </div>
              <form onSubmit={handleBizSubmit} className="p-8 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Business Name</label>
                       <input
                        required
                        className="w-full px-5 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all font-bold text-navy"
                        value={bizForm.business_name}
                        onChange={e => setBizForm({ ...bizForm, business_name: e.target.value })}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">GSTIN Number</label>
                       <input
                        className="w-full px-5 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all font-bold text-navy uppercase"
                        value={bizForm.gstin}
                        onChange={e => setBizForm({ ...bizForm, gstin: e.target.value })}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Support Phone</label>
                       <input
                        required
                        className="w-full px-5 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all font-bold text-navy"
                        value={bizForm.business_phone}
                        onChange={e => setBizForm({ ...bizForm, business_phone: e.target.value })}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Support Email (Shop Gmail)</label>
                       <input
                        required
                        type="email"
                        className="w-full px-5 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all font-bold text-navy"
                        value={bizForm.business_email}
                        onChange={e => setBizForm({ ...bizForm, business_email: e.target.value })}
                       />
                    </div>
                 </div>

                 <div className="p-5 bg-blue/5 rounded-3xl border border-blue/10 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-widest">
                       <Mail className="h-4 w-4 text-blue" /> Gmail Dispatch Integration
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Google App Password (16 Characters)</label>
                       <input
                        type="password"
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="w-full px-5 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all font-mono text-sm tracking-widest text-navy"
                        value={bizForm.gmail_app_password || ''}
                        onChange={e => setBizForm({ ...bizForm, gmail_app_password: e.target.value })}
                       />
                       <p className="text-[9px] text-text-soft italic ml-1">* Created in Google Account &gt; Security &gt; App Passwords. Enables 1-click email sending for Bills &amp; Invoices.</p>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-600 uppercase ml-1">⭐ Google Business Review Link / URL (Prints Review QR on Bills)</label>
                    <input
                     type="url"
                     placeholder="https://g.page/r/your-shop/review"
                     className="w-full px-5 py-3 border-2 border-purple-200 bg-white rounded-2xl outline-none focus:border-purple-500 transition-all font-bold text-navy text-sm"
                     value={bizForm.google_review_url || ''}
                     onChange={e => setBizForm({ ...bizForm, google_review_url: e.target.value })}
                    />
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Office Address</label>
                    <textarea
                       required
                       rows={3}
                       className="w-full px-5 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all font-bold text-navy resize-none"
                       value={bizForm.business_address}
                       onChange={e => setBizForm({ ...bizForm, business_address: e.target.value })}
                    />
                 </div>
                 <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-widest">
                       <Fuel className="h-4 w-4 text-orange-600" /> Fuel Price Auto-Fill
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">City for Live Fuel Rates</label>
                       <input
                          className="w-full px-5 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-orange-400/50 transition-all font-bold text-navy"
                          value={bizForm.fuel_city || ''}
                          onChange={e => setBizForm({ ...bizForm, fuel_city: e.target.value })}
                          placeholder="Karur"
                       />
                       <p className="text-[9px] text-text-soft italic ml-1">Live petrol &amp; diesel rates auto-fill the amount when an expense category is set to Fuel.</p>
                    </div>
                 </div>
                 <div className="pt-4 border-t flex justify-end">
                    <button
                       disabled={updateBizMutation.isPending}
                       className="px-10 py-3 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center gap-3 disabled:opacity-50"
                    >
                       {updateBizMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                       Save Settings
                    </button>
                 </div>
              </form>
           </div>
        )}

        {activeTab === 'staff' && (
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-navy text-white rounded-2xl shadow-lg shadow-navy/20">
                       <Users className="h-6 w-6" />
                    </div>
                    <div>
                       <h2 className="text-lg font-bold text-navy tracking-tight">Team Management</h2>
                       <p className="text-xs text-text-soft font-bold uppercase tracking-tight">User roles and access control</p>
                    </div>
                 </div>
                 <button
                  onClick={() => setIsStaffModalOpen(true)}
                  className="flex items-center gap-2 bg-blue text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
                 >
                    <Plus className="h-4 w-4" /> Add Member
                 </button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                       <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                          <th className="px-8 py-5">Staff Member</th>
                          <th className="px-8 py-5">Access Level</th>
                          <th className="px-8 py-5">Contact</th>
                          <th className="px-8 py-5 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {staffLoading ? (
                          [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="px-8 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td></tr>)
                       ) : staff?.map((s: any) => (
                          <tr key={s.id} className="group hover:bg-soft/20 transition-colors">
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                   <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-navy uppercase">
                                      {s.name.charAt(0)}
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold text-navy">{s.name}</p>
                                      <p className="text-[10px] text-text-soft font-medium">ID: {s.id}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-5">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.role === 'admin' ? 'bg-navy text-white' : 'bg-blue/10 text-blue'}`}>
                                   {s.role}
                                </span>
                             </td>
                             <td className="px-8 py-5">
                                <div className="space-y-1">
                                   <p className="text-xs text-navy font-semibold flex items-center gap-2">
                                      <Smartphone className="h-3 w-3 text-text-soft" /> {s.mobile}
                                   </p>
                                   <p className="text-[10px] text-text-soft flex items-center gap-2">
                                      <Mail className="h-3 w-3" /> {s.email}
                                   </p>
                                </div>
                             </td>
                             <td className="px-8 py-5 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button
                                      onClick={() => handleStaffReset(s.id)}
                                      className="p-2 text-text-soft hover:bg-white hover:text-blue rounded-xl border border-transparent shadow-sm transition-all"
                                      title="Reset Password"
                                   >
                                      <Key className="h-4 w-4" />
                                   </button>
                                   <button
                                      onClick={() => { if(window.confirm('Remove staff access?')) deleteStaffMutation.mutate(s.id); }}
                                      className="p-2 text-text-soft hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                   >
                                      <Trash2 className="h-4 w-4" />
                                   </button>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'banks' && (
           <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {banksLoading ? (
                    [1, 2].map(i => <div key={i} className="h-48 bg-white rounded-[2.5rem] animate-pulse"></div>)
                 ) : banks?.map((b: any) => (
                    <div key={b.id} className={`relative p-8 rounded-[2.5rem] border overflow-hidden group transition-all ${b.is_primary ? 'bg-navy text-white border-navy shadow-xl shadow-navy/20' : 'bg-white border-gray-100 shadow-sm'}`}>
                       {b.is_primary && <Star className="absolute -right-4 -top-4 h-24 w-24 text-white/5" />}

                       <div className="flex justify-between items-start mb-6">
                          <div className={`p-3 rounded-2xl ${b.is_primary ? 'bg-white/10' : 'bg-blue/5 text-blue'}`}>
                             <CreditCard className="h-6 w-6" />
                          </div>
                          <div className="flex items-center gap-3">
                             {/* Sliding Toggle Switch Button */}
                             <button
                                type="button"
                                onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   toggleQrMutation.mutate(b.id);
                                }}
                                disabled={toggleQrMutation.isPending}
                                className={`flex items-center gap-2 cursor-pointer px-3.5 py-1.5 rounded-2xl border transition-all ${b.is_primary ? 'bg-white/10 border-white/10' : 'bg-gray-50 border-gray-200'} hover:opacity-90 active:scale-95 disabled:opacity-50`}
                                title="Toggle QR Code printing on invoices"
                             >
                                <QrCode className={`h-4 w-4 ${b.show_qr ? (b.is_primary ? 'text-green-400' : 'text-green-600') : 'text-gray-400'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-wider ${b.is_primary ? 'text-gray-300' : 'text-text-soft'}`}>
                                   QR
                                </span>
                                <div className="relative inline-flex items-center">
                                   <div className={`w-9 h-5 rounded-full transition-colors duration-200 shadow-inner flex items-center px-[2px] ${b.show_qr ? 'bg-green-500 justify-end' : 'bg-gray-300/80 justify-start'}`}>
                                      <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200"></div>
                                   </div>
                                </div>
                             </button>

                             {!b.is_primary && (
                                <button
                                   onClick={() => primaryBankMutation.mutate(b.id)}
                                   className="p-2 bg-gray-100 text-gray-400 hover:text-blue hover:bg-blue/5 rounded-xl transition-all"
                                   title="Set as Primary"
                                >
                                   <Star className="h-4 w-4" />
                                </button>
                             )}
                          </div>
                       </div>

                       <h3 className={`text-lg font-bold mb-1 ${b.is_primary ? 'text-white' : 'text-navy'}`}>{b.bank_name}</h3>
                       <p className={`text-sm font-medium mb-4 ${b.is_primary ? 'text-gray-400' : 'text-text-soft'}`}>{b.account_holder}</p>

                       <div className="space-y-1 border-t border-white/10 pt-4 mt-auto">
                          <p className={`text-[10px] font-bold uppercase ${b.is_primary ? 'text-gray-500' : 'text-text-soft'}`}>Account Number & UPI</p>
                          <p className="font-mono text-sm tracking-widest">{b.account_number}</p>
                          <p className={`text-xs font-bold ${b.is_primary ? 'text-blue-400' : 'text-blue'}`}>{b.upi_id}</p>
                       </div>
                    </div>
                 ))}

                 <button
                  onClick={() => setIsBankModalOpen(true)}
                  className="h-full min-h-[200px] border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-text-soft hover:text-blue hover:border-blue/30 hover:bg-soft/30 transition-all group"
                 >
                    <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-blue group-hover:text-white transition-all">
                       <Plus className="h-8 w-8" />
                    </div>
                    <span className="font-bold uppercase tracking-widest text-xs">Register New Account</span>
                 </button>
              </div>

              <div className="bg-blue/5 border border-blue/10 p-6 rounded-3xl flex items-start gap-4">
                 <ShieldCheck className="h-6 w-6 text-blue shrink-0 mt-1" />
                 <div>
                    <p className="text-sm font-bold text-blue uppercase tracking-tight mb-1">Financial Security Notice</p>
                    <p className="text-xs text-text-soft leading-relaxed">
                       Primary bank accounts are used to generate dynamic UPI QR codes on Invoices and Service Bills. Ensure the UPI ID is correct to avoid payment routing issues.
                    </p>
                 </div>
              </div>
           </div>
        )}
      </div>

      {isStaffModalOpen && (
        <StaffModal
           onClose={() => setIsStaffModalOpen(false)}
           onSuccess={() => queryClient.invalidateQueries({ queryKey: ['settings-staff'] })}
        />
      )}

      {isBankModalOpen && (
        <BankModal
           onClose={() => setIsBankModalOpen(false)}
           onSuccess={() => queryClient.invalidateQueries({ queryKey: ['settings-banks'] })}
        />
      )}
    </Layout>
  );
};

export default SettingsPage;
