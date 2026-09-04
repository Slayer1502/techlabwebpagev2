import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { orderService } from '../services/orderService';
import {
  ClipboardList,
  Search,
  Filter,
  FileText,
  Eye,
  Trash2,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { toast } from '../utils/toast';
import OrderDetailDrawer from '../components/OrderDetailDrawer';

const OrdersPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => orderService.getOrders({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orderService.deleteOrder(id),
    onSuccess: () => {
      toast('Order deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const filteredOrders = orders?.filter((o: any) =>
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_mobile.includes(search) ||
    o.id.includes(search)
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
      'Ordered': "bg-blue-100 text-blue-600",
      'Completed': "bg-green-100 text-green-600",
      'Cancelled': "bg-red-100 text-red-600",
      'Payment Pending': "bg-orange-100 text-orange-600"
    };
    return (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Sales History</h1>
            <p className="text-text-soft text-sm">Review and manage all customer product orders</p>
          </div>
          <button
            onClick={() => window.location.href = '/pos'}
            className="flex items-center justify-center gap-2 bg-navy text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-navy/20"
          >
            <FileText className="h-5 w-5" />
            New POS Bill
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-5 w-5 text-text-soft" />
            <input
              type="text"
              placeholder="Search by ID, Customer name or mobile..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-5 w-5 text-text-soft" />
            <select
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/20 outline-none appearance-none transition-all"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Payment Pending">Pending Payment</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b">
                   <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                      <th className="px-6 py-4">Order Ref</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Total Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {isLoading ? (
                      [1, 2, 3, 4, 5].map(i => (
                        <tr key={i} className="animate-pulse"><td colSpan={6} className="px-6 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td></tr>
                      ))
                   ) : filteredOrders?.map((o: any) => (
                      <tr key={o.id} className="group hover:bg-soft/30 transition-colors">
                        <td className="px-6 py-4">
                           <p className="text-xs font-bold text-navy uppercase">#{o.id.slice(-8)}</p>
                           {o.is_gst_bill === 1 && <span className="text-[8px] font-black text-blue bg-blue/10 px-1 rounded">GST</span>}
                        </td>
                        <td className="px-6 py-4">
                           <div>
                              <p className="text-sm font-bold text-navy">{o.customer_name}</p>
                              <p className="text-[10px] text-text-soft">{o.customer_mobile}</p>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <p className="text-sm font-bold text-navy">{formatCurrencyValue(o.total_amount)}</p>
                           <p className={`text-[10px] font-bold uppercase ${o.payment_status === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>{o.payment_status}</p>
                        </td>
                        <td className="px-6 py-4">
                           <StatusBadge status={o.status} />
                        </td>
                        <td className="px-6 py-4 text-xs text-text-soft font-medium">
                           {formatDateValue(o.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2">
                              <button
                                onClick={() => window.open(`/api/sales/orders/${o.id}/invoice.pdf`, '_blank')}
                                className="p-2 text-blue hover:bg-blue/10 rounded-lg transition-all"
                                title="Download Invoice"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setSelectedOrderId(o.id)}
                                className="p-2 text-text-soft hover:bg-gray-100 rounded-lg"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { if(window.confirm('Cancel order?')) deleteMutation.mutate(o.id); }}
                                className="p-2 text-text-soft hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                           </div>
                        </td>
                      </tr>
                   ))}
                </tbody>
              </table>
           </div>

           {filteredOrders?.length === 0 && !isLoading && (
              <div className="text-center py-20">
                 <ClipboardList className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-navy">No orders found</h3>
                 <p className="text-text-soft text-sm">Start making sales through the POS dashboard</p>
              </div>
           )}
        </div>
      </div>

      {selectedOrderId && (
        <OrderDetailDrawer
           orderId={selectedOrderId}
           onClose={() => setSelectedOrderId(null)}
        />
      )}
    </Layout>
  );
};

export default OrdersPage;
