import React, { useState } from 'react';
import { X, Search, Plus, Minus, Trash2, Loader2, Truck, User, Smartphone, Save, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { partyService } from '../services/partyService';
import { challanService } from '../services/challanService';
import { formatCurrencyValue } from '../utils/helpers';
import { Product } from '../types';
import { toast } from '../utils/toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const StandaloneChallanModal = ({ onClose, onSuccess }: Props) => {
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [transport, setTransport] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const queryClient = useQueryClient();

  const { data: productsData } = useQuery({
    queryKey: ['products-challan'],
    queryFn: () => productService.getPublicProducts(),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: () => partyService.getCustomers(),
  });

  const addToChallan = (p: Product) => {
    const existing = items.find(i => i.productId === p.id);
    if (existing) {
      setItems(items.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItems([...items, { productId: p.id, name: p.name, qty: 1, customPrice: p.finalPrice }]);
    }
    setSearch('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) return toast('Add at least one item', 'error');
    if (!customerMobile || !customerName) return toast('Customer info required', 'error');

    setLoading(true);
    try {
      await challanService.createStandaloneChallan({
        customerName,
        mobile: customerMobile,
        items,
        dispatchDate,
        transport,
        vehicleNo,
        notes
      });
      toast('Standalone DC created!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to create DC', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">New Delivery Challan</h2>
            <p className="text-xs text-text-soft font-bold uppercase mt-0.5 tracking-tight">Standalone Goods Dispatch</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-text-soft" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
           {/* Left: Item Selection */}
           <div className="flex-1 p-8 border-r flex flex-col gap-6 overflow-hidden">
              <div className="relative">
                 <Search className="absolute left-4 top-3 h-5 w-5 text-text-soft" />
                 <input
                    placeholder="Search products to dispatch..."
                    className="w-full pl-12 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl text-sm outline-none focus:border-blue/40 transition-all"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                 />
                 {search && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-10 max-h-[300px] overflow-y-auto">
                       {productsData?.products?.filter((p:Product) => p.name.toLowerCase().includes(search.toLowerCase())).map((p: Product) => (
                          <button
                            key={p.id}
                            onClick={() => addToChallan(p)}
                            className="w-full text-left p-4 hover:bg-soft border-b last:border-0 flex justify-between items-center group"
                          >
                             <div>
                                <p className="text-sm font-bold text-navy group-hover:text-blue transition-colors">{p.name}</p>
                                <p className="text-[10px] text-text-soft uppercase font-bold">Stock: {p.stock}</p>
                             </div>
                             <Plus className="h-4 w-4 text-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                       ))}
                    </div>
                 )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                 <h3 className="text-xs font-black text-navy uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue" /> Dispatched Items
                 </h3>
                 {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in slide-in-from-left-2 duration-200">
                       <div className="flex-1">
                          <p className="text-sm font-bold text-navy">{item.name}</p>
                          <p className="text-[10px] text-text-soft font-bold uppercase tracking-tight">Manual Selection</p>
                       </div>
                       <div className="flex items-center gap-3 bg-white border rounded-xl px-2 py-1">
                          <button
                            onClick={() => setItems(items.map((i, ix) => ix === idx ? { ...i, qty: Math.max(1, i.qty - 1) } : i))}
                            className="p-1 hover:bg-gray-100 rounded-lg text-text-soft"
                          >
                             <Minus className="h-4 w-4" />
                          </button>
                          <span className="font-bold text-navy w-6 text-center">{item.qty}</span>
                          <button
                            onClick={() => setItems(items.map((i, ix) => ix === idx ? { ...i, qty: i.qty + 1 } : i))}
                            className="p-1 hover:bg-gray-100 rounded-lg text-blue"
                          >
                             <Plus className="h-4 w-4" />
                          </button>
                       </div>
                       <button
                        onClick={() => setItems(items.filter((_, ix) => ix !== idx))}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                       >
                          <Trash2 className="h-4 w-4" />
                       </button>
                    </div>
                 ))}
                 {items.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                       <Package className="h-16 w-16 mb-4" />
                       <p className="font-black text-navy">CART IS EMPTY</p>
                    </div>
                 )}
              </div>
           </div>

           {/* Right: Dispatch Details */}
           <div className="w-full lg:w-[400px] bg-gray-50/50 p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              <h3 className="text-xs font-black text-navy uppercase tracking-widest mb-2">Consignee & Logistics</h3>

              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Customer Mobile</label>
                    <div className="relative">
                       <Smartphone className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                       <input
                        required
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium"
                        placeholder="10-digit number"
                        value={customerMobile}
                        onChange={e => setCustomerMobile(e.target.value)}
                       />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Customer Name</label>
                    <div className="relative">
                       <User className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                       <input
                        required
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium"
                        placeholder="Consignee name"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Dispatch Date</label>
                       <input
                        type="date"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium"
                        value={dispatchDate}
                        onChange={e => setDispatchDate(e.target.value)}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Vehicle No</label>
                       <input
                        className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium uppercase"
                        placeholder="e.g. TN33..."
                        value={vehicleNo}
                        onChange={e => setVehicleNo(e.target.value)}
                       />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Transport / Courier</label>
                    <div className="relative">
                       <Truck className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                       <input
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium"
                        placeholder="Transport name"
                        value={transport}
                        onChange={e => setTransport(e.target.value)}
                       />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Dispatch Notes</label>
                    <textarea
                       rows={2}
                       className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/20 transition-all text-sm font-medium resize-none"
                       placeholder="Special instructions..."
                       value={notes}
                       onChange={e => setNotes(e.target.value)}
                    />
                 </div>
              </div>

              <div className="pt-6 border-t mt-auto">
                 <button
                  disabled={loading || items.length === 0}
                  onClick={handleCreate}
                  className="w-full py-4 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex justify-center items-center gap-3 disabled:opacity-50"
                 >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Save & Generate DC
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StandaloneChallanModal;
