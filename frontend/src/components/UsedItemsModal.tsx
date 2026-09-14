import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Minus, Trash2, Loader2, CheckCircle2, Package, MessageSquare, Truck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { formatCurrencyValue } from '../utils/helpers';
import { Product } from '../types';
import api from '../utils/api';
import { toast } from '../utils/toast';

interface UsedItem {
  type: 'product' | 'service';
  name: string;
  qty: number;
  price: number;
  product_id: string | null;
  key: string;
}

interface Props {
  initialItems?: string | null;
  initialConveyance?: number;
  initialNotes?: string | null;
  requestId?: string;
  challan?: any;
  onClose: () => void;
  onConfirm: (items: UsedItem[], conveyance: number, notes: string) => void;
  loading?: boolean;
  mode?: 'complete' | 'update';
}

const UsedItemsModal = ({ initialItems, initialConveyance = 0, initialNotes = '', requestId, challan, onClose, onConfirm, loading, mode = 'complete' }: Props) => {
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<UsedItem[]>([]);
  const [conveyance, setConveyance] = useState(initialConveyance);
  const [statusNotes, setStatusNotes] = useState(initialNotes || '');
  const [procurementNotes, setProcurementNotes] = useState('');
  const [submittingParts, setSubmittingParts] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'parts'>('items');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialNotes) setStatusNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    if (initialItems) {
      try {
        const parsed = JSON.parse(initialItems);
        if (Array.isArray(parsed)) {
          setSelectedItems(parsed.map((it: any) => ({
            ...it,
            key: it.product_id ? `product-${it.product_id}` : `manual-${it.name}-${Math.random()}`
          })));
        }
      } catch (e) {}
    }
  }, [initialItems]);

  const { data: products } = useQuery({
    queryKey: ['products-public'],
    queryFn: () => productService.getPublicProducts(),
  });

  const filteredProducts = products?.products?.filter((p: Product) =>
    p.name.toLowerCase().includes(search.toLowerCase()) && p.type !== 'Service'
  );

  const serviceItems = products?.products?.filter((p: Product) => p.type === 'Service') || [];

  const addItem = (p: Product) => {
    const key = `product-${p.id}`;
    const existing = selectedItems.find(item => item.key === key);
    if (existing) {
      updateQty(key, existing.qty + 1);
    } else {
      setSelectedItems([...selectedItems, {
        type: p.type === 'Service' ? 'service' : 'product',
        name: p.name,
        qty: 1,
        price: p.finalPrice,
        product_id: p.id,
        key
      }]);
    }
  };

  const addManualService = (name: string, price: number = 0) => {
    const key = `manual-${name}-${Date.now()}`;
    setSelectedItems([...selectedItems, {
      type: 'service',
      name,
      qty: 1,
      price,
      product_id: null,
      key
    }]);
  };

  const updateQty = (key: string, newQty: number) => {
    if (newQty < 1) return;
    setSelectedItems(selectedItems.map(item =>
      item.key === key ? { ...item, qty: newQty } : item
    ));
  };

  const updatePrice = (key: string, newPrice: number) => {
    setSelectedItems(selectedItems.map(item =>
      item.key === key ? { ...item, price: newPrice } : item
    ));
  };

  const removeItem = (key: string) => {
    setSelectedItems(selectedItems.filter(item => item.key !== key));
  };

  const handleRequestParts = async () => {
    if (!requestId) return;
    if (selectedItems.length === 0 && !procurementNotes.trim()) {
      return toast('Add parts or procurement notes', 'error');
    }

    setSubmittingParts(true);
    try {
      await api.patch(`/technician/service-requests/${requestId}/parts`, {
        inventory: selectedItems.filter(p => p.type === 'product').map(p => ({
          productId: p.product_id,
          name: p.name,
          qty: p.qty
        })),
        procurement: procurementNotes.trim()
      });
      toast('Parts requested — sales has been notified', 'success');
      queryClient.invalidateQueries({ queryKey: ['tech-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to request parts', 'error');
    } finally {
      setSubmittingParts(false);
    }
  };

  const total = selectedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        <div className="px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 gap-4">
          <div>
            <h2 className="text-xl font-bold text-navy">Job Completion & Parts</h2>
            <p className="text-xs text-text-soft font-bold uppercase mt-0.5">Record parts used or request new ones</p>
          </div>

          <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('items')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'items' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-100'}`}
            >
              Log Items Used
            </button>
            <button
              onClick={() => setActiveTab('parts')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'parts' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-100'}`}
            >
              Request Parts
            </button>
          </div>

          <button onClick={onClose} className="absolute sm:static right-6 top-6 p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-text-soft" />
          </button>
        </div>

        {challan?.items?.length > 0 && (
          <div className="px-6 pt-4">
            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5 gap-3">
                <p className="text-[10px] font-black text-blue uppercase tracking-widest flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" /> DC Dispatch (updated) — {challan.challan_number}
                </p>
                <span className="text-[10px] font-black text-blue">{formatCurrencyValue(challan.total_value)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {challan.items.map((it: any) => (
                  <span key={it.id} className="text-[10px] font-bold bg-white border border-blue-100 rounded-lg px-2 py-0.5">
                    {it.item_name} · {it.qty} × Rs. {it.unit_price}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left: Product Selection */}
          <div className="flex-1 p-6 border-r flex flex-col gap-6 overflow-hidden">
             <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                <input
                  placeholder="Search parts/inventory..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl outline-none focus:border-blue/40 transition-all"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
             </div>

             <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                <p className="text-[10px] font-bold text-text-soft uppercase mb-2">Common Services</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {serviceItems.length > 0 ? (
                    serviceItems.map((s: Product) => (
                      <button
                        key={s.id}
                        onClick={() => addItem(s)}
                        className="px-3 py-1.5 bg-soft text-blue text-xs font-bold rounded-lg border border-blue/10 hover:bg-blue/10 transition-colors"
                      >
                        + {s.name}
                      </button>
                    ))
                  ) : (
                    ['Standard Installation', 'Repair Visit', 'Site Maintenance'].map(s => (
                      <button
                        key={s}
                        onClick={() => addManualService(s, 0)}
                        className="px-3 py-1.5 bg-soft text-blue text-xs font-bold rounded-lg border border-blue/10 hover:bg-blue/10 transition-colors"
                      >
                        + {s}
                      </button>
                    ))
                  )}
                </div>

                <p className="text-[10px] font-bold text-text-soft uppercase mb-2">Inventory Items</p>
                {filteredProducts?.map((p: Product) => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-blue/30 hover:bg-soft/30 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-bold text-navy">{p.name}</p>
                      <p className="text-[10px] text-text-soft">{p.type} • Stock: {p.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue">{formatCurrencyValue(p.finalPrice)}</p>
                      <Plus className="h-4 w-4 text-blue ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
             </div>
          </div>

          {/* Right: Selected Items & Summary */}
          <div className="w-full lg:w-[400px] bg-gray-50/50 p-6 flex flex-col gap-6">
             <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-navy">{activeTab === 'items' ? 'Summary' : 'Requested Parts'}</h3>
                  <span className="text-[10px] font-bold text-text-soft uppercase bg-white px-2 py-1 rounded-md border">{selectedItems.length} items</span>
                </div>

                {selectedItems.map((item) => (
                  <div key={item.key} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold text-navy leading-tight flex-1 pr-4">{item.name}</p>
                      <button onClick={() => removeItem(item.key)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      {activeTab === 'items' ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-text-soft">Rs.</span>
                          <input
                            type="number"
                            className="w-20 bg-white border-2 border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-blue/40 transition-all"
                            value={item.price}
                            onChange={e => updatePrice(item.key, Number(e.target.value))}
                          />
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-blue uppercase">Inventory</div>
                      )}
<div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1 py-1">
  <button onClick={() => updateQty(item.key, item.qty - 1)} className="p-0.5 hover:bg-gray-200 rounded text-text-soft"><Minus className="h-3 w-3" /></button>
  <input
    type="number"
    min={1}
    value={item.qty}
    onChange={e => updateQty(item.key, Math.max(1, Number(e.target.value) || 1))}
    className="w-14 text-xs font-bold text-center outline-none bg-transparent"
  />
  <button onClick={() => updateQty(item.key, item.qty + 1)} className="p-0.5 hover:bg-gray-200 rounded text-blue"><Plus className="h-3 w-3" /></button>
</div>
                    </div>
                  </div>
                ))}

                {selectedItems.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl text-text-soft bg-white/50">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">Select items from the left to build the {activeTab === 'items' ? 'job summary' : 'parts request'}</p>
                  </div>
                )}
             </div>

             <div className="space-y-4 pt-4 border-t">
                {activeTab === 'items' ? (
                  <>
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-text-soft uppercase ml-1">Follow-up / Status Notes</p>
                       <textarea
                         rows={2}
                         className="w-full bg-white border-2 border-gray-200 rounded-xl p-2.5 text-xs text-navy outline-none focus:border-blue/40 transition-all resize-none font-medium"
                         placeholder="Add follow-up or job notes for Sales/Admin..."
                         value={statusNotes}
                         onChange={e => setStatusNotes(e.target.value)}
                       />
                    </div>

                    <div className="flex items-center justify-between px-1">
                       <p className="text-xs font-bold text-text-soft uppercase">Conveyance / Expense</p>
                       <div className="flex items-center gap-1">
                          <span className="text-xs font-bold">Rs.</span>
                          <input
                            type="number"
                            className="w-24 bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-right outline-none focus:border-blue/40 transition-all"
                            value={conveyance}
                            onChange={e => setConveyance(Number(e.target.value))}
                          />
                       </div>
                    </div>

                    <div className="bg-navy p-4 rounded-2xl text-white shadow-lg shadow-navy/20">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-400 uppercase font-medium">Grand Total</span>
                          <span className="text-xs text-gray-400 font-medium">Settlement</span>
                       </div>
                       <p className="text-2xl font-bold">{formatCurrencyValue(total)}</p>
                    </div>

                    <button
                      disabled={loading}
                      onClick={() => onConfirm(selectedItems, conveyance, statusNotes)}
                      className={`w-full py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${mode === 'complete' ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20' : 'bg-blue text-white hover:bg-blue-600 shadow-blue/20'}`}
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                      {mode === 'complete' ? 'Mark Job as Complete' : 'Save Progress Update'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-soft uppercase ml-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Can't find it in inventory? Ask Sales to procure it (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={procurementNotes}
                        onChange={e => setProcurementNotes(e.target.value)}
                        placeholder="Type the exact name, specifications, or model of the parts you need procured..."
                        className="w-full bg-white border-2 border-gray-200 rounded-xl p-2.5 text-xs text-navy outline-none focus:border-blue/40 transition-all resize-none font-medium"
                      />
                    </div>

                    <button
                      onClick={handleRequestParts}
                      disabled={submittingParts || (selectedItems.length === 0 && !procurementNotes.trim())}
                      className="w-full py-3 bg-navy text-white rounded-2xl font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingParts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                      Request Parts from Sales
                    </button>
                  </>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsedItemsModal;
