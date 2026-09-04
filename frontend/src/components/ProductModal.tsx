import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Package, Settings, Camera, Image as ImageIcon, Zap } from 'lucide-react';
import { Product } from '../types';
import { productService } from '../services/productService';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { toast } from '../utils/toast';

interface ProductModalProps {
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ProductModal = ({ product, onClose, onSuccess }: ProductModalProps) => {
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'CCTV',
    price: 0,
    discountPercent: 0,
    description: '',
    stock: 0,
    supplierId: '',
    costPrice: 0,
    hsnCode: '',
    gstRate: 18,
    unitType: 'standard' as 'standard' | 'measurement',
    baseUnit: 'Box',
    subUnit: 'Mtrs',
    conversionFactor: 305,
    imageUrl: '' as string | null
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/sales/suppliers');
      return res.data.suppliers;
    }
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        type: product.type,
        price: product.originalPrice || product.price,
        discountPercent: product.discountPercent,
        description: product.description,
        stock: product.stock,
        supplierId: product.supplier_id || '',
        costPrice: 0,
        hsnCode: product.hsn_code || '',
        gstRate: product.gst_rate || 18,
        unitType: product.unit_type || 'standard',
        baseUnit: product.base_unit || 'Box',
        subUnit: product.sub_unit || 'Mtrs',
        conversionFactor: product.conversion_factor || 305,
        imageUrl: product.imageUrl || ''
      });
    }
  }, [product]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await productService.uploadImage(file);
      setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (err: any) {
      setError('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!formData.name || !formData.type) {
      setError('Please enter Product Name and Category first');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const url = await productService.generateAIImage(formData.name, formData.type, formData.description);
      setFormData(prev => ({ ...prev, imageUrl: url }));
      toast('AI Image generated successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await productService.updateProduct(product!.id, formData);
      } else {
        await productService.createProduct(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-xs text-text-soft mt-1 uppercase font-semibold">Inventory Management</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8">
            {/* Image Preview / Upload */}
            <div className="w-full md:w-48 space-y-3">
               <label className="text-[10px] font-bold text-text-soft uppercase block ml-1">Product Media</label>
               <div className="relative aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden group">
                  {formData.imageUrl ? (
                     <>
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Camera className="h-8 w-8 text-white" />
                        </div>
                     </>
                  ) : (
                     <div className="text-center p-4">
                        {uploading ? <Loader2 className="h-8 w-8 text-blue animate-spin mx-auto" /> : <ImageIcon className="h-8 w-8 text-gray-300 mx-auto" />}
                        <p className="text-[10px] text-text-soft font-bold mt-2 uppercase">Upload Photo</p>
                     </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImageUpload}
                    disabled={uploading || generating}
                  />
               </div>

               <button
                  type="button"
                  disabled={generating || uploading || !formData.name}
                  onClick={handleGenerateAI}
                  className="w-full py-2.5 bg-blue/5 text-blue border border-blue/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-30"
               >
                  {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                  {generating ? 'Generating...' : 'Magic AI Generate'}
               </button>

               <p className="text-[9px] text-text-soft italic leading-tight px-1 text-center">Clear, high-res photos improve storefront sales.</p>
            </div>

            <div className="flex-1 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-soft uppercase">Product Name</label>
                    <input
                      required
                      className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-soft uppercase">Category / Type</label>
                    <select
                      required
                      className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all appearance-none bg-white cursor-pointer"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="CCTV">CCTV</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Desktop">Desktop</option>
                      <option value="Accessory">Accessory</option>
                      <option value="Printer">Printer</option>
                      <option value="Networking">Networking</option>
                      <option value="Service">Service</option>
                    </select>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-soft uppercase">Selling Price (Rs)</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all font-bold"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-soft uppercase">Discount (%)</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
                      value={formData.discountPercent}
                      onChange={e => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-soft uppercase">GST Rate (%)</label>
                    <select
                      className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
                      value={formData.gstRate}
                      onChange={e => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    >
                      <option value={0}>Exempt (0%)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
               </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-soft uppercase">Description</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all resize-none font-medium text-sm"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-blue" />
              <h3 className="font-bold text-navy">Stock & Sourcing</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-soft uppercase">Stock Level</label>
                <div className="flex gap-2 items-center">
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all font-bold"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                  />
                  <span className="text-xs font-bold text-text-soft min-w-[50px] uppercase">{formData.unitType === 'standard' ? 'Units' : formData.baseUnit}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-soft uppercase">Supplier</label>
                <select
                  className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
                  value={formData.supplierId}
                  onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                >
                  <option value="">Select Supplier</option>
                  {suppliersData?.parties?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.supplierId && (
              <div className="mt-4 p-4 bg-blue/5 rounded-xl border border-blue/10 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue uppercase">Purchase Unit Cost (Rs)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border-2 border-gray-200 bg-white border rounded-xl focus:ring-2 focus:ring-blue/40 outline-none transition-all font-bold"
                      placeholder="Cost per box/unit"
                      value={formData.costPrice}
                      onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-soft uppercase">HSN Code</label>
                    <input
                      className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
                      value={formData.hsnCode}
                      onChange={e => setFormData({ ...formData, hsnCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-text-soft" />
                <h3 className="font-bold text-navy">Measurement Settings</h3>
              </div>
              <label className="flex items-center cursor-pointer gap-2">
                 <input
                  type="checkbox"
                  className="hidden peer"
                  checked={formData.unitType === 'measurement'}
                  onChange={e => setFormData({ ...formData, unitType: e.target.checked ? 'measurement' : 'standard'})}
                 />
                 <div className="w-10 h-6 bg-gray-200 peer-checked:bg-blue rounded-full relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4 shadow-inner"></div>
                 <span className="text-xs font-bold text-text-soft uppercase">Enable Cable/Length Mode</span>
              </label>
            </div>

            {formData.unitType === 'measurement' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-soft uppercase">Base Unit</label>
                  <input
                    className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
                    value={formData.baseUnit}
                    onChange={e => setFormData({ ...formData, baseUnit: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-soft uppercase">Sub Unit</label>
                  <input
                    className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
                    value={formData.subUnit}
                    onChange={e => setFormData({ ...formData, subUnit: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-soft uppercase">Factor (Sub/Base)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
                    value={formData.conversionFactor}
                    onChange={e => setFormData({ ...formData, conversionFactor: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-text-soft hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="px-6 py-2 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Update Product' : 'Add to Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
