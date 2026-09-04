import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { partyService } from '../services/partyService';
import { orderService } from '../services/orderService';
import api from '../utils/api';
import {
  Search,
  ShoppingCart,
  User,
  Smartphone,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Loader2,
  Zap,
  IndianRupee
} from 'lucide-react';
import { formatCurrencyValue } from '../utils/helpers';
import { Product } from '../types';
import { toast } from '../utils/toast';

interface CartItem extends Product {
  qty: number;
  customPrice?: number;
}

const POSComponent = ({ isCompact = false }: { isCompact?: boolean }) => {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isGst, setIsGst] = useState(false);
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generateDc, setGenerateDc] = useState(false);
  const [dcData, setDcData] = useState({
    dispatchDate: new Date().toISOString().slice(0, 10),
    receiverName: '',
    transport: '',
    vehicleNo: '',
    notes: ''
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-pos'],
    queryFn: () => productService.getPublicProducts(),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: () => partyService.getCustomers(),
  });

  useEffect(() => {
    if (customerMobile.length === 10) {
      const found = customers?.find((c: any) => c.mobile === customerMobile);
      if (found) {
        setCustomerName(found.name);
        setCustomerAddress(found.address || '');
      }
    }
  }, [customerMobile, customers]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    setSearch('');
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const filteredProducts = productsData?.products?.filter((p: Product) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.hsn_code?.includes(search)
  ).slice(0, 8);

  const nameSuggestions = customers?.filter((c: any) =>
    (c.name && c.name.toLowerCase().includes(nameSearch.toLowerCase())) ||
    (c.mobile && c.mobile.includes(nameSearch))
  ).slice(0, 5) || [];

  const handleSelectCustomer = (c: any) => {
    setCustomerMobile(c.mobile);
    setCustomerName(c.name);
    setCustomerAddress(c.address || '');
    setNameSearch(c.name);
    setShowNameSuggestions(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.qty), 0);
  const taxable = isGst ? subtotal / 1.18 : subtotal;
  const gst = isGst ? subtotal - taxable : 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart.length) return toast('Cart is empty', 'error');
    if (!customerMobile || !customerName) return toast('Customer details required', 'error');

    setLoading(true);
    try {
      const res = await orderService.createOrder({
        customerName,
        mobile: customerMobile,
        address: customerAddress,
        items: cart.map(item => ({
          productId: item.id,
          qty: item.qty,
          customPrice: item.finalPrice
        })),
        isGstBill: isGst ? 1 : 0,
        paymentStatus: isPaid ? 'paid' : 'pending',
        paymentMode: isPaid ? paymentMode : null,
        status: isPaid ? 'Completed' : 'Payment Pending'
      });

      if (generateDc) {
        try {
          await api.post('/sales/challans', {
            sourceType: 'order',
            sourceId: res.orderId,
            ...dcData,
            receiverName: dcData.receiverName || customerName
          });
          toast('Order & DC created!', 'success');
        } catch (dcErr) {
          toast('Order created, but DC failed', 'error');
        }
      } else {
        toast('Order created successfully!', 'success');
      }

      setCart([]);
      setCustomerMobile('');
      setCustomerName('');
      setCustomerAddress('');
      setGenerateDc(false);

      if (window.confirm('Would you like to view the invoice?')) {
          window.open(`/api/sales/orders/${res.orderId}/invoice.pdf`, '_blank');
      }
    } catch (err: any) {
      toast(err.response?.data?.error || 'Checkout failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col ${isCompact ? 'lg:flex-row' : 'lg:flex-row'} gap-6`}>
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Zap className="absolute left-3 top-2.5 h-4 w-4 text-blue animate-pulse" />
            <input
              type="text"
              placeholder="Lightning Search: Start typing..."
              className="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue/10 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && filteredProducts?.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-10 overflow-hidden animate-in fade-in slide-in-from-top-2">
                 {filteredProducts.map((p: Product) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full text-left p-3 hover:bg-soft flex items-center justify-between group border-b last:border-0"
                    >
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-navy uppercase text-[9px]">
                             {p.type.slice(0, 3)}
                          </div>
                          <div>
                             <p className="text-sm font-bold text-navy">{p.name}</p>
                             <p className="text-[9px] text-text-soft font-semibold uppercase">{p.type} • Stock: {p.stock}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-bold text-blue">{formatCurrencyValue(p.finalPrice)}</p>
                       </div>
                    </button>
                 ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-soft rounded-xl border border-blue/10">
             <span className="text-[9px] font-bold text-text-soft uppercase">GST</span>
             <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isGst} onChange={e => setIsGst(e.target.checked)} />
                <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue"></div>
             </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
           <div className="px-5 py-3 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                 <ShoppingCart className="h-4 w-4 text-navy" />
                 <h2 className="text-xs font-bold text-navy uppercase tracking-tight">Cart Items</h2>
              </div>
              <span className="bg-navy text-white text-[9px] font-bold px-2 py-0.5 rounded-md">{cart.length}</span>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
              {cart.map(item => (
                 <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-navy truncate">{item.name}</p>
                       <p className="text-[9px] text-text-soft font-bold uppercase">{isGst ? 'GST Included' : 'No GST'}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-0.5 border border-gray-100">
                       <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-gray-200 rounded text-text-soft"><Minus className="h-3 w-3" /></button>
                       <span className="text-xs font-bold text-navy w-4 text-center">{item.qty}</span>
                       <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-gray-200 rounded text-blue"><Plus className="h-3 w-3" /></button>
                    </div>
                    <div className="w-20 text-right">
                       <p className="text-sm font-bold text-blue">{formatCurrencyValue(item.finalPrice * item.qty)}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                 </div>
              ))}
              {cart.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30">
                    <ShoppingCart className="h-10 w-10 mb-2" />
                    <p className="text-xs font-bold text-navy uppercase">Cart Empty</p>
                 </div>
              )}
           </div>
           <div className="p-4 bg-gray-50/50 border-t flex justify-between items-center">
              <div>
                 <p className="text-[9px] font-bold text-text-soft uppercase">Net Total</p>
                 <p className="text-lg font-black text-navy">{formatCurrencyValue(subtotal)}</p>
              </div>
              <div className="text-right">
                 <p className="text-[9px] font-bold text-text-soft uppercase">Taxable: {formatCurrencyValue(taxable)}</p>
                 <p className="text-[9px] font-bold text-text-soft uppercase">GST: {formatCurrencyValue(gst)}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="w-full lg:w-[320px] space-y-4">
         <div className="bg-navy p-5 rounded-2xl text-white shadow-lg flex flex-col gap-4">
            <div className="flex justify-between items-center">
               <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Checkout</h3>
               <button
                  onClick={() => { setCustomerMobile('9999999999'); setCustomerName('Walk-in Customer'); }}
                  className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded-md text-[8px] font-black uppercase"
               >
                 Walk-in
               </button>
            </div>
            <div className="space-y-3">
               <input
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue/50"
                placeholder="Mobile"
                value={customerMobile}
                onChange={e => setCustomerMobile(e.target.value)}
               />
               <div className="relative">
                   <input
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue/50"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={e => {
                        setCustomerName(e.target.value);
                        setNameSearch(e.target.value);
                        setShowNameSuggestions(true);
                    }}
                    onFocus={() => setShowNameSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                   />
                   {showNameSuggestions && nameSearch.length > 0 && nameSuggestions.length > 0 && (
                       <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-[70] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                           {nameSuggestions.map((c: any) => (
                               <button
                                   key={c.mobile}
                                   type="button"
                                   onClick={() => handleSelectCustomer(c)}
                                   className="w-full text-left p-3 hover:bg-soft border-b last:border-0 flex justify-between items-center group"
                               >
                                   <div>
                                       <p className="text-xs font-bold text-navy group-hover:text-blue transition-colors">{c.name}</p>
                                       <p className="text-[9px] text-text-soft font-bold">{c.mobile}</p>
                                   </div>
                                   <Search className="h-3 w-3 text-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                               </button>
                           ))}
                       </div>
                   )}
               </div>
               <div className="pt-2 flex justify-between items-center border-t border-white/10">
                  <span className="text-[9px] font-bold uppercase text-gray-400">Status</span>
                  <label className="flex items-center cursor-pointer gap-2">
                     <span className={`text-[9px] font-bold uppercase ${!isPaid ? 'text-blue' : 'text-gray-500'}`}>Credit</span>
                     <input type="checkbox" className="sr-only peer" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                     <div className="w-8 h-4 bg-white/10 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
                     <span className={`text-[9px] font-bold uppercase ${isPaid ? 'text-green-400' : 'text-gray-500'}`}>Paid</span>
                  </label>
               </div>
               {isPaid && (
                  <div className="grid grid-cols-3 gap-1.5 pt-1 animate-in zoom-in-95 duration-200">
                     {['Cash', 'UPI', 'Bank'].map(mode => (
                        <button
                           key={mode}
                           type="button"
                           onClick={() => setPaymentMode(mode as any)}
                           className={`py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${paymentMode === mode ? 'bg-white text-navy' : 'border-white/10 text-gray-400'}`}
                        >
                           {mode}
                        </button>
                     ))}
                  </div>
               )}

               <div className="pt-2 flex flex-col gap-2 border-t border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3 h-3 accent-blue"
                      checked={generateDc}
                      onChange={e => setGenerateDc(e.target.checked)}
                    />
                    <span className="text-[9px] font-bold uppercase text-gray-400">Generate Delivery Challan</span>
                  </label>

                  {generateDc && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <input
                        type="date"
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] outline-none cursor-pointer"
                        value={dcData.dispatchDate}
                        onChange={e => setDcData({ ...dcData, dispatchDate: e.target.value })}
                      />
                      <input
                        placeholder="Receiver Name (Optional)"
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] outline-none"
                        value={dcData.receiverName}
                        onChange={e => setDcData({ ...dcData, receiverName: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Transport"
                          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] outline-none"
                          value={dcData.transport}
                          onChange={e => setDcData({ ...dcData, transport: e.target.value })}
                        />
                        <input
                          placeholder="Vehicle No"
                          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] outline-none"
                          value={dcData.vehicleNo}
                          onChange={e => setDcData({ ...dcData, vehicleNo: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
               </div>
            </div>
            <button
               disabled={loading || cart.length === 0}
               onClick={handleCheckout}
               className="w-full py-3 bg-blue text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex justify-center items-center gap-2 disabled:opacity-50 mt-2"
            >
               {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
               Finalize Sale
            </button>
         </div>
      </div>
    </div>
  );
};

export default POSComponent;
