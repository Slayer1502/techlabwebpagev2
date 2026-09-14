import React, { useState } from 'react';
import { X, Search, Plus, Minus, Trash2, Loader2, Package, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { formatCurrencyValue } from '../utils/helpers';
import { Product } from '../types';
import api from '../utils/api';
import { toast } from '../utils/toast';

interface SelectedPart {
  productId: string;
  name: string;
  qty: number;
  stock: number;
  key: string;
}

interface Props {
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RequestPartsModal = ({ requestId, onClose, onSuccess }: Props) => {
  const [search, setSearch] = useState('');
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [procurementNotes, setProcurementNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['products-public'],
    queryFn: () => productService.getPublicProducts(),
  });

  const filteredProducts = products?.products?.filter((p: Product | any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    p.type !== 'Service' &&
    p.active !== 0
  ) || [];

  const addPart = (product: Product) => {
    if (selectedParts.some(p => p.productId === product.id)) return;
    setSelectedParts(prev => [...prev, {
      productId: product.id,
      name: product.name,
      qty: 1,
      stock: product.stock || 0,
      key: product.id
    }]);
    setSearch('');
  };

  const removePart = (key: string) => {
    setSelectedParts(prev => prev.filter(p => p.key !== key));
  };

  const updateQty = (key: string, delta: number) => {
    setSelectedParts(prev => prev.map(p =>
      p.key === key ? { ...p, qty: Math.max(1, p.qty + delta) } : p
    ));
  };

  const handleSubmit = async () => {
    if (selectedParts.length === 0 && !procurementNotes.trim()) {
      return toast('Add parts or procurement notes', 'error');
    }

    setSubmitting(true);
    try {
      await api.patch(`/technician/service-requests/${requestId}/parts`, {
        inventory: selectedParts.map(p => ({
          productId: p.productId,
          name: p.name,
          qty: p.qty
        })),
        procurement: procurementNotes.trim()
      });
      toast('Parts requested — sales has been notified', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to request parts', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-black text-navy flex items-center gap-2">
              <Package className="h-5 w-5 text-blue" /> Request Parts
            </h3>
            <p className="text-xs text-text-soft font-bold uppercase tracking-tight">Sales will be notified for procurement</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Inventory Search */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Search Inventory</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-soft" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Type to search products..."
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-blue/20 transition-all"
              />
            </div>
            {search && filteredProducts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto divide-y">
                {filteredProducts.slice(0, 8).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => addPart(p)}
                    disabled={selectedParts.some(sp => sp.productId === p.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue/5 transition-all text-left disabled:opacity-40"
                  >
                    <div>
                      <p className="text-sm font-bold text-navy">{p.name}</p>
                      <p className="text-[10px] text-text-soft">Stock: {p.stock || 0} | {formatCurrencyValue(p.price)}</p>
                    </div>
                    {selectedParts.some(sp => sp.productId === p.id) ? (
                      <span className="text-[10px] font-bold text-green-600">Added</span>
                    ) : (
                      <Plus className="h-4 w-4 text-blue" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Parts */}
          {selectedParts.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Requested Parts</label>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
                {selectedParts.map(part => (
                  <div key={part.key} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-navy truncate">{part.name}</p>
                      <p className="text-[10px] text-text-soft">Stock: {part.stock}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
                        <button onClick={() => updateQty(part.key, -1)} className="p-0.5 hover:bg-gray-200 rounded text-text-soft">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-bold text-navy w-8 text-center text-sm">{part.qty}</span>
                        <button onClick={() => updateQty(part.key, 1)} className="p-0.5 hover:bg-gray-200 rounded text-blue">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button onClick={() => removePart(part.key)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Procurement Notes */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" /> Notes for Sales (optional)
            </label>
            <textarea
              rows={3}
              value={procurementNotes}
              onChange={e => setProcurementNotes(e.target.value)}
              placeholder="Items not in inventory, special requirements, urgency notes..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-blue/20 transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={submitting || (selectedParts.length === 0 && !procurementNotes.trim())}
            className="w-full py-3.5 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
            Request Parts from Sales
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestPartsModal;
