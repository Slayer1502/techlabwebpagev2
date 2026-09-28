import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { purchaseService } from '../services/purchaseService';
import {
  ShoppingBag,
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Download,
  Building2,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { toast } from '../utils/toast';
import { useAuthStore } from '../store/authStore';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import StockInModal from '../components/StockInModal';
import UploadQuoteModal from '../components/UploadQuoteModal';
import ReceiveOrderModal from '../components/ReceiveOrderModal';
import PurchaseOrderPaymentModal from '../components/PurchaseOrderPaymentModal';
import PurchaseOrderDetailDrawer from '../components/PurchaseOrderDetailDrawer';

import DirectPurchasePaymentModal from '../components/DirectPurchasePaymentModal';

const PurchasesPage = () => {
  const [activeTab, setTab] = useState<'orders' | 'quotes' | 'history'>('orders');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isUploadQuoteModalOpen, setIsUploadQuoteModalOpen] = useState(false);
  const [receivePoId, setReceivePoId] = useState<string | null>(null);
  const [payPoId, setPayPoId] = useState<string | null>(null);
  const [viewingPoId, setViewingPoId] = useState<string | null>(null);
  const [payPurchaseId, setPayPurchaseId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseService.getPurchaseOrders(),
    enabled: activeTab === 'orders'
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => purchaseService.getQuotes(),
    enabled: activeTab === 'quotes'
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['direct-purchases'],
    queryFn: () => purchaseService.getPurchases(),
    enabled: activeTab === 'history'
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => purchaseService.approveQuote(id),
    onSuccess: () => {
      toast('Quote approved', 'success');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => purchaseService.rejectQuote(id),
    onSuccess: () => {
      toast('Quote rejected', 'success');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
      pending: "bg-orange-100 text-orange-600",
      ordered: "bg-cyan-100 text-cyan-600",
      approved: "bg-green-100 text-green-600",
      received: "bg-green-100 text-green-600",
      rejected: "bg-red-100 text-red-600",
      cancelled: "bg-gray-100 text-gray-600"
    };
    return (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Procurement & Sourcing</h1>
            <p className="text-text-soft text-sm font-medium">Manage purchase orders and supplier quotations</p>
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
             <button
                onClick={() => setTab('orders')}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'orders' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-50'}`}
             >
                <ShoppingBag className="h-4 w-4" /> Orders
             </button>
             <button
                onClick={() => setTab('quotes')}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'quotes' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-50'}`}
             >
                <FileText className="h-4 w-4" /> Quotes
             </button>
             <button
                onClick={() => setTab('history')}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'history' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-50'}`}
             >
                <TrendingUp className="h-4 w-4" /> Stock In
             </button>
          </div>
        </div>

        {activeTab === 'orders' ? (
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue text-white rounded-2xl shadow-lg shadow-blue/20">
                       <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div>
                       <h2 className="text-lg font-bold text-navy tracking-tight">Purchase Orders</h2>
                       <p className="text-xs text-text-soft font-bold uppercase tracking-tight">Incoming Inventory Tracking</p>
                    </div>
                 </div>
                 <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 bg-blue text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
                 >
                    <Plus className="h-4 w-4" /> New PO
                 </button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                       <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                          <th className="px-8 py-5">PO Reference</th>
                          <th className="px-8 py-5">Supplier</th>
                          <th className="px-8 py-5">Total Value</th>
                          <th className="px-8 py-5">Payment</th>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {ordersLoading ? (
                          [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="px-8 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td></tr>)
                       ) : orders?.map((o: any) => (
                          <tr key={o.id} className="group hover:bg-soft/20 transition-colors">
<td className="px-8 py-5">
                                 <p className="text-sm font-bold text-navy uppercase">#{o.id.slice(-8)}</p>
                                 <div className="flex items-center gap-1.5 mt-1">
                                    {o.service_request_id && (
                                       <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-600 text-[9px] font-bold uppercase tracking-wide">Service</span>
                                    )}
                                 </div>
                                 <p className="text-[10px] text-text-soft">{formatDateValue(o.created_at)}</p>
                              </td>
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                   <Building2 className="h-4 w-4 text-blue" />
                                   <span className="text-sm font-semibold text-navy">{o.supplier_name}</span>
                                </div>
                             </td>
<td className="px-8 py-5 text-sm font-bold text-navy">
                                 {formatCurrencyValue(o.total_amount)}
                              </td>
                              <td className="px-8 py-5">
                                 {o.status === 'cancelled' ? (
                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">—</span>
                                 ) : (
                                 <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${o.payment_status === 'paid' ? 'bg-green-100 text-green-600' : o.payment_status === 'partial' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                    {o.payment_status || 'pending'}
                                 </span>
                                 )}
                                 {Number(o.amount_paid) > 0 && o.payment_status !== 'paid' && (
                                    <p className="text-[10px] text-text-soft font-bold mt-1">{formatCurrencyValue(o.amount_paid)} paid · {formatCurrencyValue((o.total_amount || 0) - (o.amount_paid || 0))} left</p>
                                 )}
                                 {o.status === 'received' && o.payment_status !== 'paid' && (
                                    <button
                                       onClick={() => setPayPoId(o.id)}
                                       className="mt-1.5 block px-3 py-1.5 bg-navy text-white text-[10px] font-bold uppercase rounded-lg hover:opacity-90 transition-all"
                                    >
                                       Record Payment
                                    </button>
                                 )}
                              </td>
                              <td className="px-8 py-5">
                                 <StatusBadge status={o.status} />
                              </td>
                             <td className="px-8 py-5 text-right">
                                 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {['ordered', 'pending'].includes(o.status) && (
                                       <button
                                         onClick={(e) => { e.stopPropagation(); setReceivePoId(o.id); }}
                                         className="px-4 py-1.5 bg-blue text-white text-[10px] font-bold uppercase rounded-lg hover:bg-blue-600 transition-colors"
                                       >
                                          Receive Goods
                                       </button>
                                    )}
                                    <button
                                      onClick={() => setViewingPoId(o.id)}
                                      className="p-2 text-text-soft hover:bg-white hover:text-blue rounded-lg border border-transparent shadow-sm transition-all"
                                    >
                                       <ChevronRight className="h-4 w-4" />
                                    </button>
                                 </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        ) : activeTab === 'quotes' ? (
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-navy text-white rounded-2xl shadow-lg shadow-navy/20">
                       <FileText className="h-6 w-6" />
                    </div>
                    <div>
                       <h2 className="text-lg font-bold text-navy tracking-tight">Supplier Quotations</h2>
                       <p className="text-xs text-text-soft font-bold uppercase tracking-tight">Pricing Review & Approval</p>
                    </div>
                 </div>
                 <button onClick={() => setIsUploadQuoteModalOpen(true)} className="flex items-center gap-2 bg-navy text-white px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-navy/20">
                    <Upload className="h-4 w-4" /> Upload Quote
                 </button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                       <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                          <th className="px-8 py-5">Quote Info</th>
                          <th className="px-8 py-5">Supplier</th>
                          <th className="px-8 py-5">Items</th>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5 text-right">Approval</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {quotesLoading ? (
                          [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-8 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td></tr>)
) : quotes?.map((q: any) => (
                           <tr key={q.id} className="group hover:bg-soft/20 transition-colors">
                              <td className="px-8 py-5">
                                 <p className="text-sm font-bold text-navy">Ref: {q.id.slice(-6)}</p>
                                 <div className="flex items-center gap-1.5 mt-1">
                                    {q.service_request_id ? (
                                       <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-600 text-[9px] font-bold uppercase tracking-wide">Service</span>
                                    ) : q.for_enquiry_id ? (
                                       <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-600 text-[9px] font-bold uppercase tracking-wide">Enquiry</span>
                                    ) : (
                                       <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[9px] font-bold uppercase tracking-wide">Direct</span>
                                    )}
                                    {q.po_number && (
                                       <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-600 text-[9px] font-bold uppercase tracking-wide">PO {q.po_number}</span>
                                    )}
                                 </div>
                                 <button
                                    onClick={() => window.open(`/api/sales/quotes/${q.id}/pdf`, '_blank')}
                                    className="text-[10px] text-blue font-bold uppercase flex items-center gap-1 mt-1 hover:underline"
                                 >
                                    <Download className="h-3 w-3" /> View Document
                                 </button>
                              </td>
                              <td className="px-8 py-5 text-sm font-semibold text-navy">
                                 {q.supplier_name}
                              </td>
                              <td className="px-8 py-5">
                                 <p className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-text-soft">
                                    {q.item_count || 0} Products
                                 </p>
                                 {q.total_amount > 0 && (
                                    <p className="text-[11px] font-bold text-navy mt-1">{formatCurrencyValue(q.total_amount)}</p>
                                 )}
                              </td>
                              <td className="px-8 py-5">
                                 <StatusBadge status={q.status} />
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <div className="flex justify-end gap-2">
                                    {q.status === 'pending' ? (
                                       <>
                                          {((q.service_request_id && user?.role === 'admin') || !q.service_request_id) && (
                                             <button
                                                onClick={() => { if(window.confirm('Approve this quote?')) approveMutation.mutate(q.id); }}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                title="Approve"
                                             >
                                                <CheckCircle2 className="h-5 w-5" />
                                             </button>
                                          )}
                                          {(!q.service_request_id || user?.role === 'admin') && (
                                             <button
                                                onClick={() => { if(window.confirm('Reject this quote?')) rejectMutation.mutate(q.id); }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Reject"
                                             >
                                                <XCircle className="h-5 w-5" />
                                             </button>
                                          )}
                                       </>
                                    ) : (
                                       <CheckCircle2 className={`h-5 w-5 ${q.status === 'approved' ? 'text-green-600' : 'text-gray-200'}`} />
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))}
                    </tbody>
                 </table>
              </div>
           </div>
        ) : (
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-600 text-white rounded-2xl shadow-lg shadow-green-600/20">
                       <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                       <h2 className="text-lg font-bold text-navy tracking-tight">Direct Stock In</h2>
                       <p className="text-xs text-text-soft font-bold uppercase tracking-tight">Inventory Purchase History</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button
                      onClick={() => setIsStockInModalOpen(true)}
                      className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                    >
                       <Plus className="h-4 w-4" /> Stock In
                    </button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                       <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Item Name</th>
                          <th className="px-8 py-5">Qty</th>
                          <th className="px-8 py-5">Total Cost</th>
                          <th className="px-8 py-5">Payment</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {purchasesLoading ? (
                          [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-8 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td></tr>)
                       ) : purchases?.map((p: any) => (
                          <tr key={p.id} className="group hover:bg-soft/20 transition-colors">
                             <td className="px-8 py-5">
                                <p className="text-sm font-bold text-navy">{new Date(p.purchase_date).toLocaleDateString()}</p>
                                <p className="text-[10px] text-text-soft">{p.invoice_number || 'No Invoice'}</p>
                             </td>
                             <td className="px-8 py-5">
                                <p className="text-sm font-semibold text-navy">{p.product_name}</p>
                                <p className="text-[10px] text-text-soft">{p.supplier_name || 'Direct Addition'}</p>
                             </td>
                             <td className="px-8 py-5 text-sm font-bold text-navy">
                                {p.quantity}
                             </td>
                             <td className="px-8 py-5 text-sm font-bold text-navy">
                                {formatCurrencyValue(p.total_cost)}
                             </td>
<td className="px-8 py-5">
                                 <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${p.payment_status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {p.payment_status}
                                 </span>
                                 {Number(p.amount_paid) > 0 && p.payment_status !== 'paid' && (
                                    <p className="text-[10px] text-text-soft font-bold mt-1">{formatCurrencyValue(p.amount_paid)} paid · {formatCurrencyValue((p.total_cost || 0) - (p.amount_paid || 0))} left</p>
                                 )}
                                 {p.payment_status !== 'paid' && (
                                    <button
                                       onClick={() => setPayPurchaseId(p.id)}
                                       className="mt-1.5 block px-3 py-1.5 bg-navy text-white text-[10px] font-bold uppercase rounded-lg hover:opacity-90 transition-all"
                                    >
                                       Record Payment
                                    </button>
                                 )}
                              </td>
                          </tr>
                       ))}
                       {(!purchases || purchases.length === 0) && !purchasesLoading && (
                          <tr><td colSpan={5} className="px-8 py-20 text-center text-text-soft italic">No purchase history found</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </div>

      {isCreateModalOpen && (
        <PurchaseOrderModal
           onClose={() => setIsCreateModalOpen(false)}
           onSuccess={() => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })}
        />
      )}
      {isStockInModalOpen && (
        <StockInModal
           onClose={() => setIsStockInModalOpen(false)}
           onSuccess={() => queryClient.invalidateQueries({ queryKey: ['direct-purchases'] })}
        />
      )}
      {isUploadQuoteModalOpen && (
        <UploadQuoteModal
           onClose={() => setIsUploadQuoteModalOpen(false)}
           onSuccess={() => {
             queryClient.invalidateQueries({ queryKey: ['quotes'] });
             queryClient.invalidateQueries({ queryKey: ['quotes-pending'] });
           }}
        />
      )}
      {receivePoId && (
        <ReceiveOrderModal
           poId={receivePoId}
           onClose={() => setReceivePoId(null)}
           onSuccess={() => {
             setReceivePoId(null);
             queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
           }}
        />
      )}
      {payPoId && (
        <PurchaseOrderPaymentModal
           po={orders?.find((o: any) => o.id === payPoId)}
           onClose={() => setPayPoId(null)}
           onSuccess={() => {
             setPayPoId(null);
             queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
             queryClient.invalidateQueries({ queryKey: ['direct-purchases'] });
           }}
        />
      )}
      {payPurchaseId && (
        <DirectPurchasePaymentModal
           purchase={purchases?.find((p: any) => p.id === payPurchaseId)}
           onClose={() => setPayPurchaseId(null)}
           onSuccess={() => {
             setPayPurchaseId(null);
             queryClient.invalidateQueries({ queryKey: ['direct-purchases'] });
           }}
        />
      )}
      {viewingPoId && (
        <PurchaseOrderDetailDrawer
          poId={viewingPoId}
          onClose={() => setViewingPoId(null)}
        />
      )}
    </Layout>
  );
};

export default PurchasesPage;
