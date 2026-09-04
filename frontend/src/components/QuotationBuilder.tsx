import React, { useState } from 'react';
import { Search, Plus, Minus, Trash2, Loader2, Save, FileText, Smartphone, User, IndianRupee, MapPin, Calendar, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { quotationService } from '../services/quotationService';
import { formatCurrencyValue } from '../utils/helpers';
import { Product } from '../types';
import { toast } from '../utils/toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialCustomerName?: string;
  initialCustomerMobile?: string;
  initialCustomerAddress?: string;
  initialItems?: any[];
  initialServiceRequestId?: string;
  editingId?: string;
  initialQuoteDate?: string;
  initialValidUntil?: string;
}

const QuotationBuilder = ({ onClose, onSuccess, initialCustomerName = '', initialCustomerMobile = '', initialCustomerAddress = '', initialItems = [], initialServiceRequestId = '', editingId = '', initialQuoteDate = '', initialValidUntil = '' }: Props) => {
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerMobile, setCustomerMobile] = useState(initialCustomerMobile);
  const [customerAddress, setCustomerAddress] = useState(initialCustomerAddress);
  const [validUntil, setValidUntil] = useState(initialValidUntil);
  const [items, setItems] = useState<any[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [serviceCharge, setServiceCharge] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products-quote'],
    queryFn: () => productService.getPublicProducts(),
  });

  const addToQuote = (p: Product) => {
    const existing = items.find(i => i.productId === p.id);
    if (existing) {
      setItems(items.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { productId: p.id, product_name: p.name, quantity: 1, unit_price: p.finalPrice }]);
    }
    setSearch('');
  };

  const addServiceChargeItem = (name: string) => {
    setItems([...items, { productId: '', product_name: name, quantity: 1, unit_price: 0 }]);
    setServiceCharge('');
  };

  const quickCharges = ['Camera Installation Charge', 'Cable Laying Charge', 'Mobile/App Configuration', 'Unit Configuration', 'Setup & Commissioning'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) return toast('Add at least one item', 'error');
    if (!customerName || !customerMobile) return toast('Customer details required', 'error');

    setLoading(true);
    try {
      const payload = {
        customerName,
        customerMobile,
        customerAddress,
        quoteDate: initialQuoteDate,
        validUntil,
        serviceRequestId: initialServiceRequestId,
        items
      };
      if (editingId) {
        await quotationService.updateQuotation(editingId, payload);
        toast('Quotation updated!', 'success');
      } else {
        await quotationService.createQuotation(payload);
        toast('Quotation saved!', 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save quotation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in zoom-in-95 duration-300">
       <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-4 border border-gray-100">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                <input
                  placeholder="Search products to add..."
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-200 rounded-xl outline-none focus:border-blue/40 transition-all"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                   <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border z-20 max-h-[300px] overflow-y-auto">
                      {productsData?.products?.filter((p:Product) => p.name.toLowerCase().includes(search.toLowerCase())).map((p: Product) => (
                         <button
                           key={p.id}
                           onClick={() => addToQuote(p)}
                           className="w-full text-left p-4 hover:bg-soft flex justify-between items-center border-b last:border-0"
                         >
                            <div>
                               <p className="text-sm font-bold text-navy">{p.name}</p>
                               <p className="text-[10px] text-text-soft font-bold uppercase">{p.type}</p>
                            </div>
                            <p className="text-xs font-bold text-blue">{formatCurrencyValue(p.finalPrice)}</p>
                         </button>
                      ))}
                   </div>
                )}
           </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-2">
           <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-1.5">
              <Wrench className="h-3 w-3" /> Add Service / Installation Charge
           </p>
           <div className="flex flex-wrap gap-2">
              {quickCharges.map(qc => (
                 <button
                   key={qc}
                   type="button"
                   onClick={() => addServiceChargeItem(qc)}
                   className="px-2.5 py-1 text-[10px] font-bold text-blue bg-blue/5 border border-blue/15 rounded-lg hover:bg-blue hover:text-white transition-all"
                 >
                    + {qc}
                 </button>
              ))}
           </div>
           <div className="flex gap-2">
              <input
                placeholder="Custom charge (e.g. Extra Camera Point)..."
                className="flex-1 px-3 py-1.5 bg-white border-2 border-gray-200 rounded-lg text-xs outline-none focus:border-blue/40 transition-all"
                value={serviceCharge}
                onChange={e => setServiceCharge(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (serviceCharge.trim()) addServiceChargeItem(serviceCharge.trim()); } }}
              />
              <button
                type="button"
                onClick={() => { if (serviceCharge.trim()) addServiceChargeItem(serviceCharge.trim()); }}
                className="px-3 py-1.5 bg-navy text-white rounded-lg text-xs font-bold hover:bg-blue transition-all"
              >
                 Add
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
             {items.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                   <div className="flex-1">
                      <p className="text-sm font-bold text-navy">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-bold text-text-soft uppercase">Price:</span>
                         <input
                            type="number"
                            className="w-24 bg-white border-2 border-gray-200 rounded px-2 py-0.5 text-xs font-bold outline-none focus:border-blue/40 transition-all"
                            value={item.unit_price}
                            onChange={e => setItems(items.map((it, ix) => ix === idx ? { ...it, unit_price: Number(e.target.value) } : it))}
                         />
                      </div>
                   </div>
                   <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-2 py-1">
                      <button onClick={() => setItems(items.map((it, ix) => ix === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))} className="p-1"><Minus className="h-3 w-3" /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => setItems(items.map((it, ix) => ix === idx ? { ...it, quantity: it.quantity + 1 } : it))} className="p-1"><Plus className="h-3 w-3" /></button>
                   </div>
                   <div className="w-24 text-right">
                      <p className="text-sm font-bold text-blue">{formatCurrencyValue(item.unit_price * item.quantity)}</p>
                   </div>
                   <button onClick={() => setItems(items.filter((_, ix) => ix !== idx))} className="text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
             ))}
             {items.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                   <FileText className="h-16 w-16 mb-4" />
                   <p className="font-bold uppercase tracking-widest text-xs">No items added</p>
                </div>
             )}
          </div>
       </div>

       <div className="w-full lg:w-[350px] space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Client Name</label>
                <div className="relative">
                   <User className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                   <input required className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Mobile</label>
                <div className="relative">
                   <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                   <input required className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} />
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Valid Until</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
                   <input type="date" className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                </div>
             </div>
          </div>

          <div className="bg-navy p-6 rounded-3xl text-white shadow-xl shadow-navy/20">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Total Estimate</span>
                <IndianRupee className="h-4 w-4 text-gray-400" />
             </div>
             <p className="text-2xl font-black">{formatCurrencyValue(total)}</p>
             <button
               disabled={loading || items.length === 0}
               onClick={handleSave}
               className="w-full mt-6 py-3 bg-blue text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
             >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Update Quotation' : 'Save Quotation'}
             </button>
          </div>
       </div>
    </div>
  );
};

export default QuotationBuilder;
