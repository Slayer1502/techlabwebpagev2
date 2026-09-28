import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { orderService } from '../services/orderService';
import {
  ClipboardList,
  Search,
  FileText,
  Eye,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Share2
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { toast } from '../utils/toast';
import OrderDetailDrawer from '../components/OrderDetailDrawer';
import { useAuthStore } from '../store/authStore';

const OrdersPage = () => {
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; sourceType?: string; billNumber?: string } | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canWrite = ['admin', 'sales'].includes(user?.role || '');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getOrders({}),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orderService.deleteOrder(id),
    onSuccess: () => {
      toast('Bill deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const filteredOrders = orders?.filter((o: any) =>
    (o.customer_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (o.customer_mobile || '').includes(search) ||
    (o.id || '').includes(search) ||
    (o.bill_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const unpaid = filteredOrders?.filter((o: any) => o.payment_status !== 'paid') || [];
  const archive = filteredOrders?.filter((o: any) => o.payment_status === 'paid') || [];
  const sumOf = (rows: any[]) => rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

  const shareWhatsApp = (o: any) => {
    const mobile = String(o.customer_mobile || '').replace(/[^0-9]/g, '');
    if (!mobile) return toast('No customer mobile number available', 'error');

    const msg = [
      `Dear ${o.customer_name || 'Customer'},`,
      ``,
      `Thank you for choosing TECHLAB. Here are your bill details:`,
      ``,
      `*Bill No:* ${o.bill_number || o.id}`,
      `*Bill Type:* ${o.source_type === 'service' ? 'Service' : 'Product'}`,
      `*Bill Date:* ${formatDateValue(o.created_at)}`,
      `*Total Amount:* ${formatCurrencyValue(o.total_amount)}`,
      `*Payment Status:* ${(o.payment_status || 'PENDING').toUpperCase()}`,
      ``,
      `If you have any questions, feel free to contact us.`,
      `~ TECHLAB Team`
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

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

  const renderTable = (rows: any[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b">
          <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
            <th className="px-6 py-4">Bill Ref</th>
            <th className="px-6 py-4">Customer</th>
            <th className="px-6 py-4">Total Amount</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((o: any) => (
            <tr key={`${o.source_type}-${o.id}`} className="group hover:bg-soft/30 transition-colors">
              <td className="px-6 py-4">
                <p className="text-xs font-bold text-navy uppercase">#{o.bill_number || (o.source_type === 'service' ? 'SR-' : '') + o.id.slice(-8)}</p>
                {o.source_type === 'service'
                  ? <span className="text-[8px] font-black text-purple-600 bg-purple-50 px-1 rounded ml-1">SERVICE</span>
                  : <span className="text-[8px] font-black text-blue bg-blue/10 px-1 rounded ml-1">ORDER</span>}
                {o.is_gst_bill === 1 && <span className="text-[8px] font-black text-blue bg-blue/10 px-1 rounded ml-1">GST</span>}
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
                    onClick={() => window.open(o.source_type === 'service'
                      ? `/api/sales/service-requests/${o.id}/bill.pdf`
                      : `/api/sales/orders/${o.id}/invoice.pdf`, '_blank')}
                    className="p-2 text-blue hover:bg-blue/10 rounded-lg transition-all"
                    title="Download Bill"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => shareWhatsApp(o)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                    title="Share via WhatsApp"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedOrder({ id: o.id, sourceType: o.source_type, billNumber: o.bill_number })}
                    className="p-2 text-text-soft hover:bg-gray-100 rounded-lg"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {canWrite && o.source_type !== 'service' && (
                    <button
                      onClick={() => { if (window.confirm('Cancel this bill?')) deleteMutation.mutate(o.id); }}
                      className="p-2 text-text-soft hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const SectionHeader = ({ icon, title, count, total, tone }: {
    icon: React.ReactNode;
    title: string;
    count: number;
    total: number;
    tone: 'unpaid' | 'archive';
  }) => (
    <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/50">
      <div className="flex items-center gap-3">
        <span className={`p-2 rounded-xl ${tone === 'unpaid' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-black text-navy uppercase tracking-widest">{title}</h3>
          <p className="text-[10px] text-text-soft font-bold">{count} bill{count === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-black ${tone === 'unpaid' ? 'text-orange-600' : 'text-green-600'}`}>{formatCurrencyValue(total)}</p>
        <p className="text-[10px] text-text-soft font-bold uppercase">{tone === 'unpaid' ? 'Total Dues' : 'Collected'}</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Bills</h1>
            <p className="text-text-soft text-sm">All customer bills — unpaid and archived</p>
          </div>
          {canWrite && (
            <button
              onClick={() => window.location.href = '/pos'}
              className="flex items-center justify-center gap-2 bg-navy text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-navy/20"
            >
              <FileText className="h-5 w-5" />
              New POS Bill
            </button>
          )}
        </div>

        <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-text-soft" />
          <input
            type="text"
            placeholder="Search by bill no, customer name or mobile..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/20 outline-none transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Unpaid bills */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={<AlertCircle className="h-4 w-4" />} title="Unpaid Bills" count={unpaid.length} total={sumOf(unpaid)} tone="unpaid" />
          {isLoading ? (
            <div className="p-8 animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl w-full"></div>)}
            </div>
          ) : unpaid.length ? renderTable(unpaid) : (
            <div className="text-center py-16">
              <CheckCircle2 className="h-10 w-10 text-green-200 mx-auto mb-3" />
              <h3 className="text-base font-bold text-navy">All caught up</h3>
              <p className="text-text-soft text-sm">No unpaid bills right now</p>
            </div>
          )}
        </div>

        {/* Archived (paid) bills */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={<CheckCircle2 className="h-4 w-4" />} title="Archive — Paid Bills" count={archive.length} total={sumOf(archive)} tone="archive" />
          {isLoading ? (
            <div className="p-8 animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl w-full"></div>)}
            </div>
          ) : archive.length ? renderTable(archive) : (
            <div className="text-center py-16">
              <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <h3 className="text-base font-bold text-navy">Nothing archived yet</h3>
              <p className="text-text-soft text-sm">Paid bills will appear here</p>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailDrawer
          orderId={selectedOrder.id}
          sourceType={selectedOrder.sourceType || 'order'}
          billNumber={selectedOrder.billNumber}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </Layout>
  );
};

export default OrdersPage;