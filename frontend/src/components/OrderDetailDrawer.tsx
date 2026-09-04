import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Smartphone,
  Hash,
  ShoppingCart,
  Calendar,
  IndianRupee,
  Package,
  FileText,
  Download,
  History,
  CreditCard,
  User,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { orderService } from '../services/orderService';
import { Product } from '../types';

interface Props {
  orderId: string;
  onClose: () => void;
}

const OrderDetailDrawer = ({ orderId, onClose }: Props) => {
  const { data: items, isLoading } = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: () => orderService.getOrderItems(orderId),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <ShoppingCart className="h-5 w-5 text-blue" />
                 <span className="text-[10px] font-black text-blue uppercase tracking-widest bg-blue/5 px-2 py-0.5 rounded-full border border-blue/10">Order Detail</span>
              </div>
              <h2 className="text-xl font-black text-navy uppercase tracking-tight flex items-center gap-2">
                 Ref: #{orderId.slice(-8)}
              </h2>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-text-soft">
              <X className="h-6 w-6" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
           {isLoading ? (
              <div className="space-y-6 animate-pulse">
                 <div className="h-20 bg-gray-50 rounded-2xl"></div>
                 <div className="h-40 bg-gray-50 rounded-2xl"></div>
              </div>
           ) : (
              <>
                 {/* Items List */}
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-text-soft uppercase tracking-widest flex items-center gap-2">
                       <Package className="h-3.5 w-3.5" /> Items in this Order
                    </p>
                    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden divide-y shadow-sm">
                       {items?.map((item: any, idx: number) => (
                          <div key={idx} className="p-6 flex justify-between items-center group hover:bg-soft/20 transition-colors">
                             <div className="space-y-1">
                                <p className="text-sm font-bold text-navy">{item.product_name}</p>
                                <div className="flex items-center gap-3">
                                   <span className="text-[10px] font-bold text-text-soft bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase">Qty: {item.qty}</span>
                                   {item.hsn_code && <span className="text-[10px] font-bold text-text-soft uppercase">HSN: {item.hsn_code}</span>}
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-black text-blue">{formatCurrencyValue(item.price * item.qty)}</p>
                                <p className="text-[10px] text-text-soft font-bold uppercase">{formatCurrencyValue(item.price)} / unit</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Financial Stats */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-navy p-6 rounded-[2rem] text-white shadow-xl shadow-navy/10 relative overflow-hidden">
                       <IndianRupee className="absolute -right-2 -bottom-2 h-16 w-16 text-white/5 rotate-12" />
                       <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Taxable</p>
                       <p className="text-lg font-bold">{formatCurrencyValue(items?.reduce((s:number, i:any) => s + (i.taxable_amount || 0), 0))}</p>
                    </div>
                    <div className="bg-blue p-6 rounded-[2rem] text-white shadow-xl shadow-blue/10 relative overflow-hidden">
                       <FileText className="absolute -right-2 -bottom-2 h-16 w-16 text-white/5 -rotate-12" />
                       <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest mb-1">GST Total</p>
                       <p className="text-lg font-bold">{formatCurrencyValue(items?.reduce((s:number, i:any) => s + (i.cgst_amount + i.sgst_amount || 0), 0))}</p>
                    </div>
                 </div>

                 {/* Order Lifecycle */}
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-text-soft uppercase tracking-widest flex items-center gap-2">
                       <History className="h-3.5 w-3.5" /> Order Timeline
                    </p>
                    <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                       <div className="relative">
                          <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100"></div>
                          <p className="text-xs font-bold text-navy">Order Generated</p>
                          <p className="text-[10px] text-text-soft">Transaction recorded in main ledger</p>
                       </div>
                       <div className="relative opacity-40">
                          <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-gray-200 ring-4 ring-gray-50"></div>
                          <p className="text-xs font-bold text-navy">Dispatch Prepared</p>
                          <p className="text-[10px] text-text-soft">Goods identification and packing</p>
                       </div>
                    </div>
                 </div>
              </>
           )}
        </div>

        <div className="p-8 border-t bg-gray-50 flex flex-col gap-3">
           <button
              onClick={() => window.open(`/api/sales/orders/${orderId}/invoice.pdf`, '_blank')}
              className="w-full py-4 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-3"
           >
              <Download className="h-5 w-5" /> Download Tax Invoice
           </button>
           <div className="grid grid-cols-2 gap-3">
              <button className="py-3 bg-white border border-gray-200 rounded-xl text-xs font-black text-navy uppercase hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                 <CreditCard className="h-4 w-4" /> Edit Order
              </button>
              <button className="py-3 bg-white border border-gray-200 rounded-xl text-xs font-black text-red-500 uppercase hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                 <Trash2 className="h-4 w-4" /> Void Sale
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailDrawer;
