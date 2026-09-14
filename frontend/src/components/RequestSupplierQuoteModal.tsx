import React, { useState, useEffect } from 'react';
import { X, Loader2, Truck, Plus, Minus, Trash2, Hash, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { partyService } from '../services/partyService';
import { purchaseService } from '../services/purchaseService';
import { toast } from '../utils/toast';
import { ServiceRequest } from '../types';

interface LineItem {
  key: string;
  name: string;
  brand: string;
  model: string;
  qty: number;
}

interface Props {
  request: ServiceRequest;
  onClose: () => void;
  onSuccess: () => void;
}

const RequestSupplierQuoteModal = ({ request, onClose, onSuccess }: Props) => {
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: partiesData, isLoading: partiesLoading } = useQuery({
    queryKey: ['parties', 'supplier'],
    queryFn: () => partyService.getParties('supplier'),
  });

  useEffect(() => {
    let intake: any = {};
    try {
      intake = typeof request.device_intake === 'string' ? JSON.parse(request.device_intake) : request.device_intake || {};
    } catch { intake = {}; }

    const brand = intake.brand || '';
    const model = intake.model || '';
    const baseName = request.request_subject_name || request.device_type || 'Part';
    const initial: LineItem[] = [];

    if (brand || model) {
      initial.push({ key: 'device', name: baseName, brand, model, qty: 1 });
    } else {
      initial.push({ key: 'device', name: baseName, brand: '', model: '', qty: 1 });
    }

    const parts = getRequestedParts();
    if (parts && parts.length > 0) {
      parts.forEach((p, i) => {
        initial.push({
          key: `part-${i}-${Date.now()}`,
          name: String(p.name || p.product_name || 'Part'),
          brand: String(p.brand || intake.brand || ''),
          model: String(p.model || intake.model || ''),
          qty: Number(p.qty || p.quantity) || 1,
        });
      });
    }
    setItems(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  const getRequestedParts = (): any[] => {
    let parts: any[] = [];
    try {
      const parsed = typeof request.requested_parts === 'string' ? JSON.parse(request.requested_parts) : request.requested_parts;
      if (parsed && parsed.inventory) parts = parsed.inventory;
    } catch { parts = []; }
    return parts.filter((p: any) => p && !p.consumable);
  };

  const suppliers = partiesData?.parties || [];

  const updateItem = (key: string, patch: Partial<LineItem>) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it));
  };

  const addItem = () => {
    setItems(prev => [...prev, { key: `new-${Date.now()}`, name: '', brand: '', model: '', qty: 1 }]);
  };

  const removeItem = (key: string) => {
    setItems(prev => prev.filter(it => it.key !== key));
  };

  const handleSubmit = async () => {
    if (!supplierId) return toast('Select a supplier to request the quote', 'error');
    const clean = items
      .filter(it => it.name.trim())
      .map(it => ({ name: it.name.trim(), brand: it.brand.trim(), model: it.model.trim(), qty: it.qty || 1 }));
    if (clean.length === 0) return toast('Add at least one part to request', 'error');

    setSubmitting(true);
    try {
      await purchaseService.createSupplierQuoteForService(request.id, {
        supplierId,
        items: clean,
        notes: notes.trim() || undefined,
      });
      toast('Quote requested from supplier', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to request supplier quote', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-black text-navy flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue" /> Request Supplier Quote
            </h3>
            <p className="text-xs text-text-soft font-bold uppercase tracking-tight">Parts for {request.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-text-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="p-4 bg-blue/5 rounded-2xl border border-blue-100 flex gap-3">
            <Info className="h-4 w-4 text-blue shrink-0 mt-0.5" />
            <p className="text-xs text-navy font-medium">
              An RFQ document will be generated for the selected supplier. Once the supplier reverts with prices, you can
              upload their quote PDF in Purchases for admin approval.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Supplier (required)</label>
            {partiesLoading ? (
              <div className="flex items-center gap-2 text-sm text-text-soft font-medium py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading suppliers...
              </div>
            ) : (
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-blue/20 transition-all bg-white"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}{s.mobile ? ` (${s.mobile})` : ''}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Parts to Quote</label>
              <button
                onClick={addItem}
                className="text-[10px] font-bold text-blue hover:text-blue-600 transition-all uppercase tracking-widest flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Part
              </button>
            </div>
            {items.length === 0 && (
              <p className="text-xs text-text-soft italic">No parts added yet.</p>
            )}
            {items.map(item => (
              <div key={item.key} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={item.name}
                    onChange={e => updateItem(item.key, { name: e.target.value })}
                    placeholder="Part / service name"
                    className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue/20 transition-all"
                  />
                  <button onClick={() => removeItem(item.key)} className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={item.brand}
                    onChange={e => updateItem(item.key, { brand: e.target.value })}
                    placeholder="Brand"
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue/20 transition-all"
                  />
                  <input
                    value={item.model}
                    onChange={e => updateItem(item.key, { model: e.target.value })}
                    placeholder="Model"
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue/20 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-text-soft" />
                  <span className="text-xs font-bold text-text-soft uppercase tracking-widest">Qty</span>
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1">
                    <button onClick={() => updateItem(item.key, { qty: Math.max(1, (item.qty || 1) - 1) })} className="p-0.5 hover:bg-gray-200 rounded text-text-soft">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-bold text-navy w-8 text-center text-sm">{item.qty}</span>
                    <button onClick={() => updateItem(item.key, { qty: (item.qty || 1) + 1 })} className="p-0.5 hover:bg-gray-200 rounded text-blue">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Notes for Supplier (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Urgency, exact part numbers, delivery expectations..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-blue/20 transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={submitting || !supplierId}
            className="w-full py-3.5 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Truck className="h-5 w-5" />}
            Request Quote from Supplier
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestSupplierQuoteModal;