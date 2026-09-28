import React, { useState } from 'react';
import {
  X,
  Loader2,
  Save,
  Search,
  Trash2,
  Plus,
  Package,
  IndianRupee,
  Send,
  CheckCircle2,
  FileText,
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { enquiryService } from '../services/enquiryService';
import { quotationService } from '../services/quotationService';
import { productService } from '../services/productService';
import { formatCurrencyValue } from '../utils/helpers';
import { Enquiry, Product } from '../types';
import { toast } from '../utils/toast';
import MarginEngineBar from './MarginEngineBar';

export interface QuoteLine {
  productId: any;
  name: string;
  source: 'inventory' | 'procurement';
  supplierId: string;
  supplierName: string;
  costPrice: number;
  quotedPrice: number;
  quantity: number;
  sqId: string;
  sqNumber: string;
}

export interface QuoteContextEnquiry {
  type: 'enquiry';
  enquiry: Enquiry;
}

export interface QuoteContextService {
  type: 'service';
  customerName: string;
  customerMobile: string;
  serviceRequestId: string;
  initialLines?: any[];
}

export interface QuoteContextManual {
  type: 'manual';
  editingId?: string;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  initialLines?: any[];
}

export type QuoteContext = QuoteContextEnquiry | QuoteContextService | QuoteContextManual;

interface Props {
  context: QuoteContext;
  initialValidUntil?: string;
  onClose: () => void;
  onSuccess?: (result?: { id?: string; quoteNumber?: string }) => void;
}

const normalizeLine = (o: any): QuoteLine => ({
  productId: o?.productId ?? o?.product_id ?? '',
  name: String(o?.name || o?.product_name || ''),
  source: o?.source === 'procurement' ? 'procurement' : 'inventory',
  supplierId: o?.supplierId || o?.supplier_id || '',
  supplierName: o?.supplierName || '',
  costPrice: (o?.costPrice == null ? (o?.unit_cost == null ? 0 : Number(o.unit_cost)) : Number(o.costPrice) / Math.max(1, Number(o?.quantity) || 1)) || 0,
  quotedPrice: Number(o?.quotedPrice ?? o?.unit_price) || 0,
  quantity: Number(o?.quantity) || 1,
  sqId: o?.sqId || o?.sq_id || '',
  sqNumber: o?.sqNumber || o?.sq_number || ''
});

const isEnquiryContext = (c: QuoteContext): c is QuoteContextEnquiry => c.type === 'enquiry';
const isServiceContext = (c: QuoteContext): c is QuoteContextService => c.type === 'service';
const isManualContext = (c: QuoteContext): c is QuoteContextManual => c.type === 'manual';

const QuotationComposer = ({ context, initialValidUntil = '', onClose, onSuccess }: Props) => {
  const initialLines = isEnquiryContext(context)
    ? parseEnquiryQuoteOptions(context.enquiry.quote_options)
    : (context.initialLines || []);

  const [lines, setLines] = useState<QuoteLine[]>(() =>
    initialLines && initialLines.length ? initialLines.map(normalizeLine) : []
  );
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState(initialValidUntil || '');
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState(isManualContext(context) ? context.customerName || '' : (isEnquiryContext(context) ? context.enquiry.customer_name : context.customerName) || '');
  const [customerMobile, setCustomerMobile] = useState(isManualContext(context) ? context.customerMobile || '' : (isEnquiryContext(context) ? context.enquiry.customer_mobile : context.customerMobile) || '');
  const [customerAddress, setCustomerAddress] = useState(isManualContext(context) ? context.customerAddress || '' : (isEnquiryContext(context) ? context.enquiry.visit_address || '' : '') || '');

  const [sqIndex, setSqIndex] = useState<number | null>(null);
  const [sqSupplierId, setSqSupplierId] = useState('');
  const [sqUnitCost, setSqUnitCost] = useState('');
  const [sqSaving, setSqSaving] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['products-quotation-composer'],
    queryFn: () => productService.getPublicProducts(),
    enabled: search.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-quotation-composer'],
    queryFn: async () => {
      const res = await api.get('/sales/suppliers');
      return res.data.suppliers as any[];
    },
    enabled: lines.some(l => l.source === 'procurement'),
    staleTime: 5 * 60 * 1000,
  });

  const products = productsData?.products || [];

  const editing = isManualContext(context) && Boolean(context.editingId);
  const title = isEnquiryContext(context)
    ? (context.enquiry.status === 'quoted' ? 'Edit Quote' : 'Prepare Quote')
    : (editing ? 'Edit Quotation' : 'Prepare Quotation');

  const subtitle = isEnquiryContext(context)
    ? `${context.enquiry.customer_name} • ${context.enquiry.customer_mobile}`
    : isServiceContext(context)
      ? `${context.customerName} • ${context.customerMobile}`
      : (editing ? `Quotation ${(context as QuoteContextManual).editingId}` : 'New quotation');

  const setLine = (idx: number, patch: Partial<QuoteLine>) => {
    setLines(items => items.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const addProduct = (p: Product) => {
    setLines(items => [
      ...items,
      {
        productId: p.id,
        name: p.name,
        source: 'inventory',
        supplierId: '',
        supplierName: '',
        costPrice: Number((p as any).last_cost) || 0,
        quotedPrice: Number(p.finalPrice) || 0,
        quantity: 1,
        sqId: '',
        sqNumber: ''
      }
    ]);
    setSearch('');
  };

  const addGenericLine = () => {
    setLines(items => [
      ...items,
      { productId: '', name: '', source: 'inventory', supplierId: '', supplierName: '', costPrice: 0, quotedPrice: 0, quantity: 1, sqId: '', sqNumber: '' }
    ]);
  };

  const addServiceChargeItem = (name: string) => {
    if (!name.trim()) return;
    setLines(items => [
      ...items,
      { productId: '', name: name.trim(), source: 'inventory', supplierId: '', supplierName: '', costPrice: 0, quotedPrice: 0, quantity: 1, sqId: '', sqNumber: '' }
    ]);
  };

  const quickCharges = ['Camera Installation Charge', 'Cable Laying Charge', 'Mobile/App Configuration', 'Unit Configuration', 'Setup & Commissioning'];
  const [serviceCharge, setServiceCharge] = useState('');

  const openSqModal = (idx: number) => {
    const line = lines[idx];
    if (!line.supplierId) {
      toast('Pick a supplier before requesting the quote', 'error');
      return;
    }
    setSqSupplierId(line.supplierId);
    setSqUnitCost('');
    setSqIndex(idx);
  };

  const submitSq = async () => {
    const line = lines[sqIndex!];
    if (!line.supplierId) return toast('Select a supplier', 'error');
    setSqSaving(true);
    try {
      const res = await api.post('/sales/quotes', {
        supplierId: line.supplierId,
        enquiryId: isEnquiryContext(context) ? context.enquiry.id : undefined,
        items: [
          {
            productId: line.productId || null,
            productName: line.name,
            quantity: line.quantity,
            unitCost: Number(sqUnitCost) || 0
          }
        ]
      });
      const supplier = suppliers?.find(s => s.id === line.supplierId);
      setLine(sqIndex!, {
        supplierName: supplier?.name || line.supplierName,
        sqId: res.data.id,
        sqNumber: res.data.quoteNumber,
        costPrice: Number(sqUnitCost) || line.costPrice
      });
      toast(`Supplier quote ${res.data.quoteNumber} requested — pending approval`, 'success');
      setSqIndex(null);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to request supplier quote', 'error');
    } finally {
      setSqSaving(false);
    }
  };

  const toSaleItems = (ls: QuoteLine[]) =>
    ls.map(l => ({
      productId: l.productId || null,
      productName: l.name,
      quantity: l.quantity,
      unitPrice: Number(l.quotedPrice) || 0,
      unitCost: Number(l.costPrice) || 0,
      source: l.source,
      supplierId: l.supplierId || null,
      sqId: l.sqId || null,
      sqNumber: l.sqNumber || null
    }));

  const toQuoteOptions = (ls: QuoteLine[]) =>
    ls.map(l => ({
      productId: l.productId || null,
      name: l.name,
      source: l.source,
      supplierId: l.supplierId || null,
      supplierName: l.supplierName || null,
      costPrice: Number(l.costPrice) * (Number(l.quantity) || 1),
      quotedPrice: l.quotedPrice,
      quantity: l.quantity,
      sqId: l.sqId || null,
      sqNumber: l.sqNumber || null,
      costSource: l.sqId ? 'sq' : 'manual'
    }));

  const handleSave = async () => {
    if (!lines.length) return toast('Add at least one line', 'error');
    for (const l of lines) {
      if (!l.name.trim()) return toast('Every line needs a product name', 'error');
      if (!(Number(l.quotedPrice) > 0)) return toast(`Enter a quoted price for ${l.name}`, 'error');
    }

    setSaving(true);
    try {
      if (isEnquiryContext(context)) {
        await enquiryService.sendQuote(context.enquiry.id, {
          status: context.enquiry.status === 'new' ? 'quoted' : undefined,
          quoteOptions: toQuoteOptions(lines),
          notes: notes || undefined,
          validUntil: validUntil || null
        });
        toast('Quote sent — customer marked as quoted', 'success');
        onSuccess?.();
        onClose();
      } else if (isServiceContext(context)) {
        const res = await quotationService.createQuotation({
          customerName: context.customerName,
          customerMobile: context.customerMobile,
          customerAddress: '',
          serviceRequestId: context.serviceRequestId,
          quoteDate: new Date().toISOString().slice(0, 10),
          validUntil: validUntil || null,
          notes: notes || undefined,
          items: toSaleItems(lines)
        });
        toast('Quotation saved!', 'success');
        onSuccess?.(res);
        onClose();
      } else {
        const base = {
          customerName,
          customerMobile,
          customerAddress,
          validUntil: validUntil || null,
          notes: notes || undefined,
          items: toSaleItems(lines)
        };
        if (context.editingId) {
          await quotationService.updateQuotation(context.editingId, { ...base, quoteDate: undefined });
          toast('Quotation updated!', 'success');
          onSuccess?.({ id: context.editingId });
        } else {
          const res = await quotationService.createQuotation(base);
          toast('Quotation saved!', 'success');
          onSuccess?.(res);
        }
        onClose();
      }
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save quotation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((p: Product) => p.name.toLowerCase().includes(search.toLowerCase()));
  const totalQuoted = lines.reduce((s, l) => s + (Number(l.quotedPrice) * Number(l.quantity)), 0);
  const totalCost = lines.reduce((s, l) => s + (Number(l.costPrice) * Number(l.quantity)), 0);

  const sqLine = sqIndex !== null ? lines[sqIndex] : null;
  const saveLabel = isEnquiryContext(context) ? 'Save & Send Quote' : (editing ? 'Update Quotation' : 'Save Quotation');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy flex items-center gap-2">
              {title}
            </h2>
            <p className="text-xs text-text-soft font-bold uppercase mt-0.5 tracking-tight">
              {subtitle}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-text-soft" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 p-8 overflow-y-auto flex-1">
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            <MarginEngineBar items={lines.map(l => ({ name: l.name, quantity: l.quantity, costPrice: l.costPrice, quotedPrice: l.quotedPrice }))} />
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
              <input
                placeholder="Search products to add..."
                className="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-200 rounded-xl outline-none focus:border-blue/40 transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border z-20 max-h-[260px] overflow-y-auto">
                  {filteredProducts.map((p: Product) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full text-left p-3 hover:bg-soft flex justify-between items-center border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-bold text-navy">{p.name}</p>
                        <p className="text-[9px] text-text-soft font-bold uppercase">{p.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-blue">{formatCurrencyValue(p.finalPrice)}</p>
                        {(p as any).last_cost ? (
                          <p className="text-[9px] text-text-soft font-bold">cost {(p as any).last_cost}</p>
                        ) : null}
                      </div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="p-4 text-xs font-bold text-text-soft uppercase tracking-widest">No matching products</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={addGenericLine}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue bg-blue/5 border border-blue/15 rounded-lg hover:bg-blue hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Add item / service line
              </button>
              <div className="flex flex-wrap gap-1.5 items-center">
                {quickCharges.map(qc => (
                  <button
                    key={qc}
                    onClick={() => addServiceChargeItem(qc)}
                    className="px-2.5 py-1 text-[10px] font-bold text-blue bg-blue/5 border border-blue/15 rounded-lg hover:bg-blue hover:text-white transition-all"
                  >
                    + {qc}
                  </button>
                ))}
                <input
                  placeholder="Custom charge..."
                  className="w-40 px-3 py-1.5 bg-white border-2 border-gray-200 rounded-lg text-xs outline-none focus:border-blue/40 transition-all"
                  value={serviceCharge}
                  onChange={e => setServiceCharge(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addServiceChargeItem(serviceCharge);
                      setServiceCharge('');
                    }
                  }}
                />
                <button
                  onClick={() => { addServiceChargeItem(serviceCharge); setServiceCharge(''); }}
                  className="px-3 py-1.5 bg-navy text-white rounded-lg text-xs font-bold hover:bg-blue transition-all"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {lines.map((l, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <input
                        placeholder="Item / product name"
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold text-navy outline-none focus:border-blue/40 transition-all"
                        value={l.name}
                        onChange={e => setLine(idx, { name: e.target.value })}
                      />
                    </div>
                    <button onClick={() => setLines(items => items.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-white rounded-xl p-0.5 border-2 border-gray-200">
                      <button
                        onClick={() => setLine(idx, { source: 'inventory', supplierId: '', supplierName: '', sqId: '', sqNumber: '' })}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${l.source === 'inventory' ? 'bg-blue text-white' : 'text-text-soft'}`}
                      >
                        From Stock
                      </button>
                      <button
                        onClick={() => setLine(idx, { source: 'procurement' })}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${l.source === 'procurement' ? 'bg-navy text-white' : 'text-text-soft'}`}
                      >
                        Buy From Supplier
                      </button>
                    </div>

                    {l.source === 'procurement' && !(Number(l.costPrice) > 0) && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-black text-amber-600 uppercase tracking-wide">
                        <AlertTriangle className="h-3 w-3" /> cost pending — enter after supplier quote
                      </span>
                    )}

                    {l.source === 'procurement' && (
                      <select
                        className="px-3 py-1.5 bg-white border-2 border-gray-200 rounded-xl text-xs font-bold text-navy outline-none focus:border-blue/40 transition-all"
                        value={l.supplierId}
                        onChange={e => {
                          const supplier = suppliers?.find(s => s.id === e.target.value);
                          setLine(idx, { supplierId: e.target.value, supplierName: supplier?.name || '' });
                        }}
                      >
                        <option value="">Select supplier...</option>
                        {suppliers?.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}

                    {l.source === 'procurement' && l.supplierId && (
                      l.sqId ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-[10px] font-black text-green-600 uppercase tracking-wide">
                          <CheckCircle2 className="h-3 w-3" /> SQ {l.sqNumber} requested (pending)
                        </span>
                      ) : (
                        <button
                          onClick={() => openSqModal(idx)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue/20 text-[10px] font-black text-blue uppercase tracking-wide hover:bg-blue hover:text-white transition-all"
                        >
                          <Send className="h-3 w-3" /> Request Supplier Quote
                        </button>
                      )
                    )}

                    {l.sqId && (
                      <button
                        onClick={() => setLine(idx, { sqId: '', sqNumber: '' })}
                        className="text-[9px] font-bold text-text-soft underline"
                      >
                        unlink
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="space-y-0.5">
                      <span className="text-[9px] font-bold text-text-soft uppercase ml-1">{l.source === 'procurement' ? 'Supplier cost (each)' : 'Cost (each)'}</span>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-bold text-navy outline-none focus:border-blue/40 transition-all"
                        value={l.costPrice || ''}
                        placeholder="0"
                        onChange={e => setLine(idx, { costPrice: Number(e.target.value) })}
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[9px] font-bold text-text-soft uppercase ml-1">Quote (each)</span>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-bold text-navy outline-none focus:border-blue/40 transition-all"
                        value={l.quotedPrice || ''}
                        onChange={e => setLine(idx, { quotedPrice: Number(e.target.value) })}
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[9px] font-bold text-text-soft uppercase ml-1">Qty</span>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-bold text-navy outline-none focus:border-blue/40 transition-all"
                        value={l.quantity || ''}
                        onChange={e => setLine(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                      />
                    </label>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-text-soft uppercase ml-1">Line Total</span>
                      <p className="px-3 py-2 text-sm font-black text-blue">{formatCurrencyValue(l.quotedPrice * l.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {lines.length === 0 && (
                <div className="h-40 flex flex-col items-center justify-center text-center opacity-20">
                  <Package className="h-12 w-12 mb-2" />
                  <p className="font-bold uppercase tracking-widest text-xs">No items added</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-[320px] space-y-5">
            {isManualContext(context) && (
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Customer Details
                </p>
                <label className="block">
                  <span className="text-[9px] font-bold text-text-soft uppercase ml-1 mb-1">Name</span>
                  <input
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl text-sm outline-none focus:border-blue/40 transition-all"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] font-bold text-text-soft uppercase ml-1 mb-1">Mobile</span>
                  <input
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl text-sm outline-none focus:border-blue/40 transition-all"
                    value={customerMobile}
                    onChange={e => setCustomerMobile(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] font-bold text-text-soft uppercase ml-1 mb-1">Address (optional)</span>
                  <input
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl text-sm outline-none focus:border-blue/40 transition-all"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-1.5">
                <User className="h-3 w-3" /> Quotation Notes
              </p>
              <label className="block">
                <span className="text-[9px] font-bold text-text-soft uppercase ml-1 mb-1 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Valid Until (optional)
                </span>
                <input
                  type="date"
                  className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-2xl text-sm outline-none focus:border-blue/40 transition-all"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                />
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-2xl text-sm outline-none focus:border-blue/40 transition-all resize-none"
                placeholder="Terms, delivery notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="bg-navy p-6 rounded-3xl text-white shadow-xl shadow-navy/20">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Estimated Margin</span>
                <IndianRupee className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-400 font-bold">Quote Total</span><span className="font-black">{formatCurrencyValue(totalQuoted)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400 font-bold">Est. Cost</span><span className="font-black text-red-400">- {formatCurrencyValue(totalCost)}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-2"><span className="text-gray-400 font-bold">Margin</span><span className={`font-black ${totalQuoted - totalCost >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{formatCurrencyValue(totalQuoted - totalCost)}</span></div>
              </div>
              <button
                disabled={saving || lines.length === 0}
                onClick={handleSave}
                className="w-full mt-6 py-3 bg-blue text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saveLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      {sqLine && sqIndex !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-navy flex items-center gap-2"><Send className="h-4 w-4 text-blue" /> Request Supplier Quote</h3>
                <p className="text-xs text-text-soft font-bold uppercase tracking-tight">{sqLine.name}</p>
              </div>
              <button onClick={() => setSqIndex(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-4 w-4 text-text-soft" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Supplier</label>
                <select
                  className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-bold"
                  value={sqSupplierId}
                  onChange={e => setSqSupplierId(e.target.value)}
                >
                  {suppliers?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Quantity</label>
                  <p className="px-4 py-2.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-navy">{sqLine.quantity}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Unit Cost (optional)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl outline-none focus:border-blue/40 transition-all text-sm font-bold"
                    placeholder="0"
                    value={sqUnitCost}
                    onChange={e => setSqUnitCost(e.target.value)}
                  />
                </div>
              </div>

              {!sqLine.sqId && (
                <p className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-medium text-amber-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Optional — you can also just type the supplier cost directly on the line after you get a verbal price. This quote starts as pending and needs buyer approval before order confirmation.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button onClick={() => setSqIndex(null)} className="px-6 py-2.5 text-sm font-bold text-text-soft hover:bg-gray-100 rounded-2xl transition-colors">Cancel</button>
              <button
                disabled={sqSaving}
                onClick={submitSq}
                className="px-6 py-2.5 bg-blue text-white text-sm font-bold rounded-2xl hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {sqSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Create Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function parseEnquiryQuoteOptions(raw?: string): any[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default QuotationComposer;