import React, { useState } from 'react';
import { X, Loader2, Save, Building2, Package, Calendar, FileText, IndianRupee } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { partyService } from '../services/partyService';
import { productService } from '../services/productService';
import { purchaseService } from '../services/purchaseService';
import { toast } from '../utils/toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const StockInModal = ({ onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [formData, setFormData] = useState({
    productName: '',
    productType: 'Accessory',
    gstRate: 18,
    quantity: 1,
    unitCost: 0,
    purchaseDate: new Date().toISOString().slice(0, 10),
    invoiceNumber: '',
    paymentStatus: 'pending' as 'pending' | 'paid',
    paymentMode: 'Cash',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-lookup'],
    queryFn: () => partyService.getParties('supplier'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-lookup'],
    queryFn: () => productService.getPublicProducts(),
  });

  const handleProductChange = (id: string) => {
    setProductId(id);
    if (id) {
      const p = productsData?.products?.find((p: any) => p.id === id);
      if (p) {
        setFormData(prev => ({
          ...prev,
          productName: p.name,
          productType: p.type,
          gstRate: p.gst_rate || 18
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return toast('Select a supplier', 'error');
    if (!formData.productName) return toast('Product name is required', 'error');

    setLoading(true);
    try {
      await purchaseService.recordPurchase(supplierId, {
        ...formData,
        productId: productId || null
      });
      toast('Stock updated successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to record purchase', 'error');
    } finally {
      setLoading(false);
    }
  };

  const total = formData.quantity * formData.unitCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">Direct Stock In</h2>
            <p className="text-xs text-text-soft font-bold uppercase mt-0.5 tracking-tight">Record Instant Purchase</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-text-soft" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Supplier / Vendor</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                <select
                  required
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium appearance-none"
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                >
                  <option value="">Select Vendor</option>
                  {suppliers?.parties?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Purchase Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-text-soft pointer-events-none" />
                <input
                  type="date"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium cursor-pointer"
                  value={formData.purchaseDate}
                  onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-soft/50 rounded-2xl border border-gray-100 space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue" />
                <h3 className="text-xs font-bold text-navy uppercase tracking-wider">Product Information</h3>
             </div>

             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Link to Existing Product (Optional)</label>
                <select
                  className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium appearance-none"
                  value={productId}
                  onChange={e => handleProductChange(e.target.value)}
                >
                  <option value="">-- Create New Product Entry --</option>
                  {productsData?.products?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Item Name</label>
                  <input
                    required
                    placeholder="e.g. 4CH DVR Power Supply"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                    value={formData.productName}
                    onChange={e => setFormData({ ...formData, productName: e.target.value })}
                    disabled={!!productId}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Category</label>
                  <input
                    required
                    placeholder="Laptop, CCTV, etc."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                    value={formData.productType}
                    onChange={e => setFormData({ ...formData, productType: e.target.value })}
                    disabled={!!productId}
                  />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Quantity</label>
              <input
                type="number"
                required
                min="1"
                className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-bold"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Unit Cost (Rs)</label>
              <input
                type="number"
                required
                min="0"
                className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-bold"
                value={formData.unitCost}
                onChange={e => setFormData({ ...formData, unitCost: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Invoice Number</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                <input
                  placeholder="Optional"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium"
                  value={formData.invoiceNumber}
                  onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Payment Status</label>
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                   <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentStatus: 'pending' })}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${formData.paymentStatus === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-text-soft'}`}
                   >
                      Credit (Pending)
                   </button>
                   <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentStatus: 'paid' })}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${formData.paymentStatus === 'paid' ? 'bg-white text-green-600 shadow-sm' : 'text-text-soft'}`}
                   >
                      Paid Now
                   </button>
                </div>
             </div>

             {formData.paymentStatus === 'paid' && (
                <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Payment Mode</label>
                  <select
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium appearance-none"
                    value={formData.paymentMode}
                    onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
             )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Additional Notes</label>
            <textarea
              rows={2}
              className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-medium resize-none"
              placeholder="Any details about the purchase..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </form>

        <div className="px-8 py-6 bg-gray-50 border-t flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-4">
              <div className="bg-navy p-3 px-6 rounded-2xl text-white shadow-lg shadow-navy/10">
                 <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">Total Cost</p>
                 <p className="text-xl font-black">Rs. {total.toLocaleString()}</p>
              </div>
           </div>

           <div className="flex gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 md:flex-none px-8 py-3 text-sm font-bold text-text-soft hover:bg-gray-200 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 md:flex-none px-8 py-3 bg-green-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Record Purchase
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StockInModal;
