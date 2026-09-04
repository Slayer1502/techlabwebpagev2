import React, { useState } from 'react';
import { X, Loader2, Save, User, Smartphone, Package, Target, Calendar, IndianRupee, Search } from 'lucide-react';
import { enquiryService } from '../services/enquiryService';
import { partyService } from '../services/partyService';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const EnquiryModal = ({ onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    mobile: '',
    type: 'Sales Enquiry',
    productInterest: '',
    visitAddress: '',
    preferredDate: '',
    budget: 0,
    notes: '',
    supplierId: '',
    quantity: 1,
    costPrice: 0,
    leadSource: 'BNI Referral'
  });

  const [nameSearch, setNameSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-lookup'],
    queryFn: async () => {
      const res = await api.get('/sales/suppliers');
      return res.data.suppliers;
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: () => partyService.getCustomers(),
  });

  const suggestions = customers?.filter((c: any) =>
    (c.name && c.name.toLowerCase().includes(nameSearch.toLowerCase())) ||
    (c.mobile && c.mobile.includes(nameSearch))
  ).slice(0, 5) || [];

  const handleSelectCustomer = (c: any) => {
    setFormData({ ...formData, customerName: c.name, mobile: c.mobile });
    setNameSearch(c.name);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await enquiryService.createEnquiry(formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">Record New Lead</h2>
            <p className="text-xs text-text-soft font-bold uppercase mt-0.5 tracking-tight">Sales Pipeline Entry</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-text-soft" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 font-medium animate-shake">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Customer Name</label>
                <div className="relative">
                   <User className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                   <input
                    required
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                    placeholder="Enter full name"
                    value={formData.customerName}
                    onChange={e => {
                        setFormData({ ...formData, customerName: e.target.value });
                        setNameSearch(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                   />
                   {showSuggestions && nameSearch.length > 0 && suggestions.length > 0 && (
                       <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2">
                           {suggestions.map((c: any) => (
                               <button
                                   key={c.mobile}
                                   type="button"
                                   onClick={() => handleSelectCustomer(c)}
                                   className="w-full text-left p-4 hover:bg-soft border-b last:border-0 flex justify-between items-center group"
                               >
                                   <div>
                                       <p className="text-sm font-bold text-navy group-hover:text-blue transition-colors">{c.name}</p>
                                       <p className="text-[10px] text-text-soft font-bold">{c.mobile}</p>
                                   </div>
                                   <Search className="h-4 w-4 text-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                               </button>
                           ))}
                       </div>
                   )}
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Mobile Number</label>
                <div className="relative">
                   <Smartphone className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                   <input
                    required
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                    placeholder="10-digit number"
                    value={formData.mobile}
                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                   />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Lead Source</label>
                <select
                  className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                  value={formData.leadSource}
                  onChange={e => setFormData({ ...formData, leadSource: e.target.value })}
                >
                   <option value="BNI Referral">BNI Referral</option>
                   <option value="Walk-in / Direct">Walk-in / Direct</option>
                   <option value="Phone Call / WhatsApp">Phone Call / WhatsApp</option>
                   <option value="Customer Referral">Customer Referral</option>
                   <option value="Social Media / Web">Social Media / Web</option>
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Requirement / Product Interest</label>
                <div className="relative">
                   <Target className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                   <input
                    required
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                    placeholder="e.g. 8CH CCTV System for home"
                    value={formData.productInterest}
                    onChange={e => setFormData({ ...formData, productInterest: e.target.value })}
                   />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Target Budget</label>
                <div className="relative">
                   <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                   <input
                    type="number"
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                    placeholder="Approx budget"
                    value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })}
                   />
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Preferred Date</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                   <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                    value={formData.preferredDate}
                    onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                   />
                </div>
             </div>
          </div>

          <div className="pt-4 border-t">
             <h3 className="text-xs font-bold text-navy uppercase tracking-widest mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue" /> Supplier Linkage (Optional)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Target Supplier</label>
                   <select
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                    value={formData.supplierId}
                    onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                   >
                      <option value="">No specific supplier</option>
                      {suppliers?.map((s: any) => (
                         <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Purchase Unit Cost</label>
                   <input
                    type="number"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                    placeholder="Est. cost from supplier"
                    value={formData.costPrice}
                    onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                   />
                </div>
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Timeline & Observations</label>
             <textarea
               rows={3}
               className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium resize-none"
               placeholder="Additional context or customer notes..."
               value={formData.notes}
               onChange={e => setFormData({ ...formData, notes: e.target.value })}
             />
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
             <button
               type="button"
               onClick={onClose}
               className="px-8 py-3 text-sm font-bold text-text-soft hover:bg-gray-100 rounded-2xl transition-colors"
             >
               Cancel
             </button>
             <button
               disabled={loading}
               className="px-10 py-3 bg-blue text-white text-sm font-bold rounded-2xl hover:bg-blue-600 transition-all flex items-center gap-3 shadow-xl shadow-blue/20 disabled:opacity-50"
             >
               {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
               Record Lead
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnquiryModal;
