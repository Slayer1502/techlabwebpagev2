import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, User, Smartphone, MapPin, CreditCard, Building2 } from 'lucide-react';
import { Party } from '../types';
import { partyService } from '../services/partyService';

interface PartyModalProps {
  party?: Party | null;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: 'customer' | 'supplier';
}

const PartyModal = ({ party, onClose, onSuccess, defaultType = 'customer' }: PartyModalProps) => {
  const isEdit = !!party;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    gstNumber: '',
    is_customer: defaultType === 'customer',
    is_supplier: defaultType === 'supplier',
  });

  useEffect(() => {
    if (party) {
      setFormData({
        name: party.name,
        mobile: party.mobile,
        email: party.email || '',
        address: party.address || '',
        gstNumber: party.gst_number || party.gstin || '',
        is_customer: !!party.is_customer,
        is_supplier: !!party.is_supplier,
      });
    }
  }, [party]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.is_customer && !formData.is_supplier) {
      setError('Select at least one type (Customer or Supplier)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await partyService.updateParty(party!.id, formData);
      } else {
        await partyService.createParty(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">{isEdit ? 'Edit Party' : 'Add New Party'}</h2>
            <p className="text-xs text-text-soft mt-1 uppercase font-semibold">CRM & Relationship Management</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
             <label className={`flex flex-col items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${formData.is_customer ? 'border-blue bg-blue/5' : 'border-gray-100 hover:border-gray-200'}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.is_customer}
                  onChange={e => setFormData({ ...formData, is_customer: e.target.checked })}
                />
                <User className={`h-6 w-6 ${formData.is_customer ? 'text-blue' : 'text-text-soft'}`} />
                <span className={`text-xs font-bold uppercase ${formData.is_customer ? 'text-blue' : 'text-text-soft'}`}>Customer</span>
             </label>
             <label className={`flex flex-col items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${formData.is_supplier ? 'border-blue bg-blue/5' : 'border-gray-100 hover:border-gray-200'}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.is_supplier}
                  onChange={e => setFormData({ ...formData, is_supplier: e.target.checked })}
                />
                <Building2 className={`h-6 w-6 ${formData.is_supplier ? 'text-blue' : 'text-text-soft'}`} />
                <span className={`text-xs font-bold uppercase ${formData.is_supplier ? 'text-blue' : 'text-text-soft'}`}>Supplier</span>
             </label>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase">Full Name / Business Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                <input
                  required
                  className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue/10"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase">Mobile Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                  <input
                    required
                    className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue/10"
                    value={formData.mobile}
                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase">GSTIN (Optional)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                  <input
                    className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue/10"
                    value={formData.gstNumber}
                    onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase">Email Address</label>
              <input
                type="email"
                className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue/10"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase">Primary Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                <textarea
                  rows={2}
                  className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue/10 resize-none"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-text-soft hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              className="px-6 py-2 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Update Details' : 'Create Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartyModal;
