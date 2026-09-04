import React, { useState } from 'react';
import { X, Search, Plus, Minus, Trash2, Loader2, Building2, Package, Save, IndianRupee } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { partyService } from '../services/partyService';
import { purchaseService } from '../services/purchaseService';
import { formatCurrencyValue } from '../utils/helpers';
import { Product } from '../types';
import { toast } from '../utils/toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const PurchaseOrderModal = ({ onClose, onSuccess }: Props) => {
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();

  const { data: productsData } = useQuery({
    queryKey: ['products-purchase'],
    queryFn: () => productService.getPublicProducts(),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-lookup'],
    queryFn: () => partyService.getParties('supplier'),
  });

  const addToPO = (p: Product) => {
    const existing = items.find(i => i.productId === p.id);
    if (existing) {
      setItems(items.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItems([...items, { productId: p.id, name: p.name, qty: 1, costPrice: 0 }]);
    }
    setSearch('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return toast('Select a supplier', 'error');
    if (!items.length) return toast('Add at least one item', 'error');

    setLoading(true);
    try {
      await purchaseService.createPurchaseOrder({
        supplierId,
        items,
        notes
      });
      toast('Purchase Order created!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to create PO', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalValue = items.reduce((sum, i) => sum + (i.costPrice * i.qty), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">New Purchase Order</h2>
            <p className="text-xs text-text-soft font-bold uppercase mt-0.5 tracking-tight">Inventory Sourcing</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-text-soft" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
           <div className="flex-1 p-8 border-r flex flex-col gap-6 overflow-hidden">
              <div className="relative">
                 <Search className="absolute left-4 top-3 h-5 w-5 text-text-soft" />
                 <input
                    placeholder="Search products to purchase..."
                    className="w-full pl-12 pr-4 py-2.5 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue/10 outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                 />
                 {search && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-10 max-h-[300px] overflow-y-auto">
                       {productsData?.products?.filter((p:Product) => p.name.toLowerCase().includes(search.toLowerCase())).map((p: Product) => (
                          <button
                            key={p.id}
                            onClick={() => addToPO(p)}
                            className="w-full text-left p-4 hover:bg-soft border-b last:border-0 flex justify-between items-center group"
                          >
                             <div>
                                <p className="text-sm font-bold text-navy group-hover:text-blue transition-colors">{p.name}</p>
                                <p className="text-[10px] text-text-soft uppercase font-bold">Category: {p.type}</p>
                             </div>
                             <Plus className="h-4 w-4 text-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                       ))}
                    </div>
                 )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                 {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                       <div className="flex-1">
                          <p className="text-sm font-bold text-navy">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] font-bold text-text-soft uppercase">Unit Cost:</span>
                             <div className="flex items-center gap-1 bg-white px-2 rounded-lg border border-gray-200">
                                <span className="text-[10px] font-bold">Rs.</span>
                                <input
                                   type="number"
                                   className="w-20 py-0.5 text-xs font-bold outline-none"
                                   value={item.costPrice}
                                   onChange={e => setItems(items.map((it, ix) => ix === idx ? { ...it, costPrice: Number(e.target.value) } : it))}
                                />
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-3 bg-white border rounded-xl px-2 py-1">
                          <button onClick={() => setItems(items.map((it, ix) => ix === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it))} className="p-1 hover:bg-gray-100 rounded-lg"><Minus className="h-4 w-4" /></button>
                          <span className="font-bold text-navy w-6 text-center">{item.qty}</span>
                          <button onClick={() => setItems(items.map((it, ix) => ix === idx ? { ...it, qty: it.qty + 1 } : it))} className="p-1 hover:bg-gray-100 rounded-lg"><Plus className="h-4 w-4" /></button>
                       </div>
                       <div className="w-24 text-right">
                          <p className="text-xs font-bold text-blue">{formatCurrencyValue(item.costPrice * item.qty)}</p>
                       </div>
                       <button onClick={() => setItems(items.filter((_, ix) => ix !== idx))} className="p-2 text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                 ))}
              </div>
           </div>

           <div className="w-full lg:w-[400px] bg-gray-50/50 p-8 flex flex-col gap-6">
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Target Supplier</label>
                    <div className="relative">
                       <Building2 className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                       <select
                        required
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-100 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium appearance-none"
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
                    <label className="text-[10px] font-bold text-text-soft uppercase ml-1">PO Notes</label>
                    <textarea
                       rows={3}
                       className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium resize-none"
                       placeholder="Instructions for the supplier..."
                       value={notes}
                       onChange={e => setNotes(e.target.value)}
                    />
                 </div>
              </div>

              <div className="mt-auto space-y-4">
                 <div className="bg-navy p-6 rounded-[2rem] text-white shadow-xl shadow-navy/20">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Est. Order Total</span>
                       <IndianRupee className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-3xl font-black">{formatCurrencyValue(totalValue)}</p>
                 </div>

                 <button
                  disabled={loading || items.length === 0}
                  onClick={handleCreate}
                  className="w-full py-4 bg-blue text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue/20 flex justify-center items-center gap-3 disabled:opacity-50"
                 >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Create Purchase Order
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
