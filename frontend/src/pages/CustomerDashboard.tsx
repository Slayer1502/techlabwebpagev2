import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Package,
  Wrench,
  Clock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  AlertCircle,
  FileText
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';

const CustomerDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: async () => {
      const res = await api.get('/customer/dashboard');
      return res.data;
    },
  });

  if (isLoading) return (
    <Layout>
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => <div key={i} className="h-32 bg-white rounded-3xl"></div>)}
        </div>
        <div className="h-96 bg-white rounded-3xl"></div>
      </div>
    </Layout>
  );

  const { orders, requests } = data;

  const StatCard = ({ title, count, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
      <div className={`p-4 rounded-2xl ${color}`}>
        <Icon className="h-8 w-8 text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-text-soft uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-navy">{count}</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        <div>
           <h1 className="text-2xl font-bold text-navy tracking-tight">Your Activity</h1>
           <p className="text-text-soft text-sm font-medium">Track your orders and service history</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <StatCard
             title="Active Orders"
             count={orders.filter((o:any) => o.status !== 'Completed' && o.status !== 'Cancelled').length}
             icon={Package}
             color="bg-blue"
           />
           <StatCard
             title="Open Requests"
             count={requests.filter((r:any) => r.status !== 'Completed' && r.status !== 'Canceled').length}
             icon={Wrench}
             color="bg-orange-500"
           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Recent Orders */}
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                 <h2 className="font-bold text-navy flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue" /> Recent Orders
                 </h2>
                 <span className="text-[10px] font-bold text-text-soft uppercase">Latest {orders.length} items</span>
              </div>
              <div className="divide-y">
                 {orders.map((o: any) => (
                    <div key={o.id} className="p-5 hover:bg-soft/20 transition-colors flex items-center justify-between">
                       <div>
                          <p className="text-sm font-bold text-navy">Order #{o.id.slice(-8)}</p>
                          <p className="text-[10px] text-text-soft font-medium uppercase tracking-tight">{formatDateValue(o.created_at)} • {formatCurrencyValue(o.total_amount)}</p>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${o.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                             {o.status}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                       </div>
                    </div>
                 ))}
                 {orders.length === 0 && (
                    <div className="p-10 text-center text-text-soft italic text-sm">No orders found</div>
                 )}
              </div>
           </div>

           {/* Recent Requests */}
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                 <h2 className="font-bold text-navy flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-orange-500" /> Service History
                 </h2>
                 <span className="text-[10px] font-bold text-text-soft uppercase">{requests.length} Requests</span>
              </div>
              <div className="divide-y">
                 {requests.map((r: any) => (
                    <div key={r.id} className="p-5 hover:bg-soft/20 transition-colors flex items-center justify-between">
                       <div className="flex-1 pr-4">
                          <p className="text-sm font-bold text-navy">{r.device_type}</p>
                          <p className="text-xs text-text-soft line-clamp-1 italic">"{r.issue}"</p>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${r.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                             {r.status}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                       </div>
                    </div>
                 ))}
                 {requests.length === 0 && (
                    <div className="p-10 text-center text-text-soft italic text-sm">No service requests found</div>
                 )}
              </div>
           </div>
        </div>

        <div className="bg-navy p-10 rounded-[3rem] text-white shadow-2xl shadow-navy/30 relative overflow-hidden">
           <FileText className="absolute -right-6 -bottom-6 h-48 w-48 text-white/5" />
           <div className="max-w-xl">
              <h2 className="text-3xl font-black mb-4">Need further assistance?</h2>
              <p className="text-gray-400 font-medium mb-8 leading-relaxed">
                 Our technicians are ready to help with your computer, CCTV, and network issues.
                 Schedule a new visit or track your current hardware health.
              </p>
              <button className="px-8 py-4 bg-blue text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue/20">
                 Request New Service
              </button>
           </div>
        </div>
      </div>
    </Layout>
  );
};

export default CustomerDashboard;
