import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Building2,
  Calendar,
  IndianRupee,
  Package,
  History,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { purchaseService } from '../services/purchaseService';

interface Props {
  poId: string;
  onClose: () => void;
}

const PurchaseOrderDetailDrawer = ({ poId, onClose }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-order-detail', poId],
    queryFn: () => purchaseService.getPurchaseOrderById(poId),
  });

  const po = data?.purchaseOrder;
  const items = data?.items || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b bg-gray-50 flex justify-between items-start">
          <div>
            <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest inline-block mb-3 ${
              po?.status === 'received' ? 'bg-green-500' : po?.status === 'cancelled' ? 'bg-red-500' : 'bg-blue'
            }`}>
              {po?.status || 'Loading...'}
            </div>
            <h2 className="text-2xl font-black text-navy leading-tight">{po?.po_number || '...'}</h2>
            <div className="flex items-center gap-4 mt-2 text-text-soft">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight">
                <Building2 className="h-3.5 w-3.5" /> {po?.supplier_name || 'Unknown Supplier'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-text-soft">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-100 rounded-xl"></div>
              <div className="h-40 bg-gray-100 rounded-xl"></div>
            </div>
          ) : (
            <>
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">PO Date</p>
                  <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <Calendar className="h-4 w-4 text-blue" />
                    {formatDateValue(po?.po_date)}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Expected Date</p>
                  <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    {po?.expected_date ? formatDateValue(po.expected_date) : '-'}
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Total Amount</p>
                  <div className="flex items-center gap-2 text-lg font-black text-green-600">
                    <IndianRupee className="h-5 w-5" />
                    {formatCurrencyValue(po?.total_amount || 0)}
                  </div>
                </div>
              </div>

              {po?.notes && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Notes</p>
                  <p className="text-sm text-navy bg-yellow-50 p-4 rounded-xl border border-yellow-100 italic">
                    {po.notes}
                  </p>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest flex items-center gap-2">
                  <Package className="h-4 w-4" /> Ordered Items ({items.length})
                </p>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y">
                  {items.map((it: any) => (
                    <div key={it.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-navy">{it.product_name}</p>
                        <p className="text-[10px] text-text-soft uppercase font-bold mt-1">
                          {it.quantity} x {formatCurrencyValue(it.unit_cost)}
                        </p>
                      </div>
                      <p className="text-sm font-black text-blue">
                        {formatCurrencyValue(it.quantity * it.unit_cost)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 opacity-50">
                 <p className="text-[10px] text-text-soft font-medium flex items-center gap-2">
                    <History className="h-3 w-3" />
                    Created at {new Date(po?.created_at || '').toLocaleString()}
                 </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailDrawer;