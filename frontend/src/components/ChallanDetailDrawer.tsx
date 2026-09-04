import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Truck,
  Hash,
  Package,
  Calendar,
  User,
  Clock,
  IndianRupee,
  Download,
  FileText,
  History
} from 'lucide-react';
import { challanService } from '../services/challanService';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';

interface Props {
  challanId: string;
  onClose: () => void;
}

const ChallanDetailDrawer = ({ challanId, onClose }: Props) => {
  const { data: challan, isLoading } = useQuery({
    queryKey: ['challan-detail', challanId],
    queryFn: () => challanService.getChallanDetail(challanId),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <Truck className="h-5 w-5 text-blue" />
                 <span className="text-[10px] font-black text-blue uppercase tracking-widest bg-blue/5 px-2 py-0.5 rounded-full border border-blue/10">Delivery Challan</span>
              </div>
              <h2 className="text-xl font-black text-navy uppercase tracking-tight">{challan?.challan_number || 'Loading...'}</h2>
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
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Dispatch Date</p>
                       <p className="text-sm font-bold text-navy flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue" />
                          {formatDateValue(challan.dispatch_date)}
                       </p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Transport</p>
                       <p className="text-sm font-bold text-navy flex items-center gap-2">
                          <Truck className="h-4 w-4 text-blue" />
                          {challan.transport || 'Self Delivery'}
                       </p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-text-soft uppercase tracking-widest flex items-center gap-2">
                       <Package className="h-3.5 w-3.5" /> Dispatched Items
                    </p>
                    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden divide-y shadow-sm">
                       {challan.items?.map((item: any, idx: number) => (
                          <div key={idx} className="p-6 flex justify-between items-center bg-gray-50/30">
                             <div>
                                <p className="text-sm font-bold text-navy">{item.item_name}</p>
                                <p className="text-[10px] text-text-soft font-bold uppercase tracking-tight">{item.qty} Units</p>
                             </div>
                             <p className="text-sm font-bold text-blue">{formatCurrencyValue(item.total_price)}</p>
                          </div>
                       ))}
                    </div>
                 </div>

                 {challan.notes && (
                    <div className="space-y-3">
                       <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Dispatch Notes</p>
                       <div className="p-5 bg-blue/5 rounded-2xl border-2 border-blue/10 text-sm text-navy leading-relaxed italic">
                          "{challan.notes}"
                       </div>
                    </div>
                 )}
              </>
           )}
        </div>

        <div className="p-8 border-t bg-gray-50 flex flex-col gap-3">
           <button
              onClick={() => window.open(`/api/sales/challans/${challanId}.pdf`, '_blank')}
              className="w-full py-4 bg-navy text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-3"
           >
              <Download className="h-5 w-5" /> Download Challan PDF
           </button>
           {challan?.billing_status === 'pending' && (
              <button className="py-4 bg-blue text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue/20 flex items-center justify-center gap-3">
                 <FileText className="h-5 w-5" /> Convert to Final Bill
              </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default ChallanDetailDrawer;
