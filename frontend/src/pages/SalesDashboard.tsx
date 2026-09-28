import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  TrendingUp,
  Package,
  ClipboardList,
  AlertCircle,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  ShoppingCart,
  Wrench,
  HelpCircle,
  Zap,
  Calendar,
  FileText,
  Plus,
  ArrowRight,
  Sparkles,
  ChevronRight,
  PackageCheck,
  Truck
} from 'lucide-react';
import { formatCurrencyValue } from '../utils/helpers';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import POSComponent from '../components/POSComponent';
import ServiceRequestModal from '../components/ServiceRequestModal';
import EnquiryModal from '../components/EnquiryModal';

import { useAuthStore } from '../store/authStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SalesDashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();

  const [feedTab, setFeedTab] = useState<'services' | 'leads' | 'orders'>('services');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sales-dashboard'],
    queryFn: async () => {
      const res = await api.get('/sales/dashboard');
      return res.data;
    },
  });

  if (isLoading) return (
    <Layout>
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-xl"></div>)}
        </div>
        <div className="h-96 bg-white rounded-xl"></div>
      </div>
    </Layout>
  );

  const { summary, requests, recentOrders, recentEnquiries } = data;

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        {/* Today's Stats Strip (Thin Bar) */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-navy px-6 py-2.5 rounded-2xl shadow-sm text-white overflow-hidden">
          <div className="flex items-center gap-2 border-r border-white/10 pr-4 py-1">
            <IndianRupee className="h-4 w-4 text-green-400" />
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Today Total:</p>
            <p className="text-sm font-black text-green-400">{formatCurrencyValue(summary.todayTotal)}</p>
            <p className="text-sm font-black text-emerald-300 ml-3">Profit: {formatCurrencyValue(summary.todayProfit || 0)}</p>
          </div>

          <div className="flex gap-6 flex-1 px-4 text-[11px] font-medium overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-gray-400 uppercase text-[9px]">Cash:</span>
              <span className="text-green-400 font-bold">{formatCurrencyValue(summary.todayCash)}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-gray-400 uppercase text-[9px]">UPI:</span>
              <span className="text-blue-400 font-bold">{formatCurrencyValue(summary.todayUpi)}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-gray-400 uppercase text-[9px]">Bank:</span>
              <span className="text-purple-400 font-bold">{formatCurrencyValue(summary.todayBank || 0)}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-gray-400 uppercase text-[9px]">Monthly Revenue:</span>
              <span className="text-yellow-400 font-bold">{formatCurrencyValue(summary.monthlyRevenue)}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-gray-400 uppercase text-[9px]">Supplier Dues:</span>
              <span className="text-red-400 font-bold">{formatCurrencyValue(summary.supplierDues)}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-white/10 py-1">
             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Sales Engine Active</span>
          </div>
        </div>

        {/* ⚡ Quick Action Dock (Useful Shortcuts) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
           <button
             onClick={() => {
               const posEl = document.getElementById('quick-pos-section');
               if (posEl) posEl.scrollIntoView({ behavior: 'smooth' });
             }}
             className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue/30 transition-all flex items-center gap-3 group text-left"
           >
              <div className="p-2.5 bg-blue/10 text-blue rounded-xl group-hover:bg-blue group-hover:text-white transition-all shrink-0">
                 <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                 <p className="text-[11px] font-black text-navy uppercase tracking-tight truncate">New POS Bill</p>
                 <p className="text-[9px] text-text-soft font-bold truncate">Direct Checkout</p>
              </div>
           </button>

           <button
             onClick={() => setIsServiceModalOpen(true)}
             className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all flex items-center gap-3 group text-left"
           >
              <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                 <Wrench className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                 <p className="text-[11px] font-black text-navy uppercase tracking-tight truncate">Service Ticket</p>
                 <p className="text-[9px] text-text-soft font-bold truncate">Repair / Survey</p>
              </div>
           </button>

           <button
             onClick={() => setIsEnquiryModalOpen(true)}
             className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all flex items-center gap-3 group text-left"
           >
              <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
                 <HelpCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                 <p className="text-[11px] font-black text-navy uppercase tracking-tight truncate">New Lead</p>
                 <p className="text-[9px] text-text-soft font-bold truncate">Pipeline Entry</p>
              </div>
           </button>

           <button
             onClick={() => navigate('/quotations')}
             className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-500/30 transition-all flex items-center gap-3 group text-left"
           >
              <div className="p-2.5 bg-green-500/10 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-all shrink-0">
                 <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                 <p className="text-[11px] font-black text-navy uppercase tracking-tight truncate">Quotation</p>
                 <p className="text-[9px] text-text-soft font-bold truncate">Price Proposal</p>
              </div>
           </button>

           <button
             onClick={() => navigate('/purchases')}
             className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-500/30 transition-all flex items-center gap-3 group text-left"
           >
              <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-all shrink-0">
                 <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                 <p className="text-[11px] font-black text-navy uppercase tracking-tight truncate">Stock In</p>
                 <p className="text-[9px] text-text-soft font-bold truncate">Record Purchase</p>
              </div>
           </button>

           <button
             onClick={() => navigate('/challans')}
             className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-cyan-500/30 transition-all flex items-center gap-3 group text-left"
           >
              <div className="p-2.5 bg-cyan-500/10 text-cyan-600 rounded-xl group-hover:bg-cyan-600 group-hover:text-white transition-all shrink-0">
                 <Truck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                 <p className="text-[11px] font-black text-navy uppercase tracking-tight truncate">D.C. / Dispatch</p>
                 <p className="text-[9px] text-text-soft font-bold truncate">Delivery Challan</p>
              </div>
           </button>
        </div>

        {/* Main Grid: POS & P&L */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
           {/* Left Column: POS Integration */}
           <div className="xl:col-span-2 space-y-6">
              <div id="quick-pos-section" className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                       <Zap className="h-5 w-5 text-blue" />
                       Quick POS
                    </h2>
                 </div>
                 <POSComponent isCompact={true} />
              </div>

              {/* 🔄 Unified Activity Feed Switcher */}
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
                   <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                      <button
                         onClick={() => setFeedTab('services')}
                         className={cn(
                            "px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                            feedTab === 'services' ? "bg-navy text-white shadow-md" : "text-text-soft hover:bg-gray-100"
                         )}
                      >
                         <Wrench className="h-3.5 w-3.5" /> Service Requests ({requests?.length || 0})
                      </button>
                      <button
                         onClick={() => setFeedTab('leads')}
                         className={cn(
                            "px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                            feedTab === 'leads' ? "bg-navy text-white shadow-md" : "text-text-soft hover:bg-gray-100"
                         )}
                      >
                         <HelpCircle className="h-3.5 w-3.5" /> Leads & BNI ({recentEnquiries?.length || 0})
                      </button>
                      <button
                         onClick={() => setFeedTab('orders')}
                         className={cn(
                            "px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                            feedTab === 'orders' ? "bg-navy text-white shadow-md" : "text-text-soft hover:bg-gray-100"
                         )}
                      >
                         <ShoppingCart className="h-3.5 w-3.5" /> Direct Orders ({recentOrders?.length || 0})
                      </button>
                   </div>

                   <button
                      onClick={() => navigate(feedTab === 'services' ? '/tickets' : feedTab === 'leads' ? '/enquiry' : '/orders')}
                      className="text-xs font-bold text-blue hover:underline flex items-center gap-1 self-end md:self-auto"
                   >
                      Manage All <ChevronRight className="h-4 w-4" />
                   </button>
                </div>

                {/* Tab 1: Service Requests */}
                {feedTab === 'services' && (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead className="bg-gray-50/50">
                         <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider border-b">
                           <th className="px-4 py-3">Customer</th>
                           <th className="px-4 py-3">Device / Problem</th>
                           <th className="px-4 py-3">Status</th>
                           <th className="px-4 py-3">Parts</th>
                           <th className="px-4 py-3 text-right">Action</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y">
                         {requests?.slice(0, 5).map((req: any) => (
                           <tr key={req.id} className="text-sm group hover:bg-soft/30 transition-colors">
                             <td className="px-4 py-4 font-bold text-navy">
                               {req.customer_name}
                               <p className="text-[10px] font-normal text-text-soft">{req.customer_mobile}</p>
                             </td>
                             <td className="px-4 py-4 text-xs text-navy font-semibold">{req.device_type}</td>
                             <td className="px-4 py-4">
                               <span className={cn(
                                 "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                 req.status === 'Pending' ? 'bg-orange-100 text-orange-600' :
                                 req.status === 'Scheduled' ? 'bg-blue-100 text-blue-600' :
                                 'bg-green-100 text-green-600'
                               )}>
                                 {req.status}
                               </span>
                             </td>
                             <td className="px-4 py-4">
                               {req.part_request_status === 'requested' && (
                                 <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                                   <AlertTriangle className="h-3 w-3" /> Parts Needed
                                 </span>
                               )}
                               {req.part_request_status === 'available' && (
                                 <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                                   <PackageCheck className="h-3 w-3" /> Ready
                                 </span>
                               )}
                               {(!req.part_request_status || req.part_request_status === 'none' || req.part_request_status === 'collected') && (
                                 <span className="text-[10px] text-text-soft">—</span>
                               )}
                             </td>
                             <td className="px-4 py-4 text-right">
                               <button onClick={() => navigate('/tickets')} className="p-2 text-blue hover:bg-blue/10 rounded-lg">
                                  <ChevronRight className="h-4 w-4" />
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                )}

                {/* Tab 2: Leads & BNI */}
                {feedTab === 'leads' && (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead className="bg-gray-50/50">
                         <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider border-b">
                           <th className="px-4 py-3">Customer</th>
                           <th className="px-4 py-3">Requirement</th>
                           <th className="px-4 py-3">Source</th>
                           <th className="px-4 py-3 text-right">Action</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y">
                         {recentEnquiries?.map((enq: any) => (
                           <tr key={enq.id} className="text-sm hover:bg-soft/30 transition-colors">
                             <td className="px-4 py-4 font-bold text-navy">
                               {enq.customer_name}
                             </td>
                             <td className="px-4 py-4 text-xs font-semibold text-text-soft">{enq.product_interest || enq.type}</td>
                             <td className="px-4 py-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${enq.lead_source?.includes('BNI') ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-text-soft'}`}>
                                   {enq.lead_source || 'Walk-in'}
                                </span>
                             </td>
                             <td className="px-4 py-4 text-right">
                               <button onClick={() => navigate('/enquiry')} className="p-2 text-blue hover:bg-blue/10 rounded-lg">
                                  <ChevronRight className="h-4 w-4" />
                               </button>
                             </td>
                           </tr>
                         ))}
                         {(!recentEnquiries || recentEnquiries.length === 0) && (
                           <tr>
                             <td colSpan={4} className="px-4 py-8 text-center text-text-soft italic">No new leads</td>
                           </tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                )}

                {/* Tab 3: Direct Orders */}
                {feedTab === 'orders' && (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead className="bg-gray-50/50">
                         <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider border-b">
                           <th className="px-4 py-3">Customer</th>
                           <th className="px-4 py-3">Amount</th>
                           <th className="px-4 py-3">Payment</th>
                           <th className="px-4 py-3 text-right">Action</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y">
                         {recentOrders?.map((order: any) => (
                           <tr key={order.id} className="text-sm group hover:bg-soft/30 transition-colors">
                             <td className="px-4 py-4 font-bold text-navy">
                               {order.customer_name}
                               <p className="text-[10px] font-normal text-text-soft">{new Date(order.created_at).toLocaleDateString()}</p>
                             </td>
                             <td className="px-4 py-4 font-black text-navy">{formatCurrencyValue(order.total_amount)}</td>
                             <td className="px-4 py-4">
                               <span className={cn(
                                 "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                 order.payment_status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                               )}>
                                 {order.payment_status}
                               </span>
                             </td>
                             <td className="px-4 py-4 text-right">
                               <button onClick={() => navigate('/orders')} className="p-2 text-blue hover:bg-blue/10 rounded-lg">
                                  <ChevronRight className="h-4 w-4" />
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                )}
              </div>
           </div>

           {/* Right Column: Financial Performance & Operations */}
           <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                   <TrendingUp className="h-32 w-32 text-navy" />
                </div>

                <h2 className="text-lg font-black text-navy uppercase tracking-widest mb-6">Financial Performance</h2>

                <div className="space-y-6 flex-1">
                  <div>
                    <p className="text-[10px] text-text-soft font-black uppercase tracking-widest mb-1">Net Profit / Loss</p>
                    <div className="flex items-baseline gap-2">
                       <p className={cn(
                         "text-3xl font-black",
                         summary.financials.netProfit >= 0 ? "text-green-600" : "text-red-600"
                       )}>
                         {formatCurrencyValue(summary.financials.netProfit)}
                       </p>
                       <span className={cn(
                         "text-xs font-bold px-2 py-0.5 rounded-full",
                         summary.financials.netProfit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                       )}>
                         {summary.financials.totalIncome > 0
                           ? Math.round((summary.financials.netProfit / summary.financials.totalIncome) * 100)
                           : 0}% Margin
                       </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-dashed border-gray-100">
                    <div className="space-y-1">
                       <p className="text-[9px] text-text-soft font-bold uppercase">Total Income</p>
                       <p className="text-sm font-black text-navy">{formatCurrencyValue(summary.financials.totalIncome)}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] text-text-soft font-bold uppercase">Total Expense</p>
                       <p className="text-sm font-black text-red-500">{formatCurrencyValue(summary.financials.totalExpense)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-text-soft uppercase">Income vs Expense</span>
                       <span className="text-[10px] font-bold text-navy">{Math.round((summary.financials.totalExpense / summary.financials.totalIncome) * 100) || 0}% Burn</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                       <div
                         className="h-full bg-green-500"
                         style={{ width: `${Math.max(0, Math.min(100, (summary.financials.netProfit / (summary.financials.totalIncome || 1)) * 100))}%` }}
                       />
                       <div
                         className="h-full bg-red-400"
                         style={{ width: `${Math.min(100, (summary.financials.totalExpense / (summary.financials.totalIncome || 1)) * 100)}%` }}
                       />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/reports')}
                  className="w-full bg-navy text-white font-black uppercase text-[10px] tracking-[0.2em] py-4 rounded-2xl hover:opacity-90 transition-all mt-8 shadow-xl shadow-navy/20 flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Detailed P&L Report
                </button>
              </div>

              {/* Operational Stats */}
              <div className="bg-white rounded-[2.5rem] shadow-sm border p-6">
                 <h2 className="text-lg font-bold text-navy mb-6">Operations & Action Items</h2>
                 <div className="space-y-3">
                    <div onClick={() => navigate('/tickets?status=Pending')} className="flex items-center justify-between p-3.5 bg-orange-50/80 rounded-2xl cursor-pointer hover:bg-orange-100 transition-colors border border-orange-100">
                       <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <span className="text-xs font-bold text-orange-900">Pending Requests</span>
                       </div>
                       <span className="font-black text-orange-600">{summary.pendingServices}</span>
                    </div>
                    <div onClick={() => navigate('/tickets?status=Scheduled')} className="flex items-center justify-between p-3.5 bg-blue-50/80 rounded-2xl cursor-pointer hover:bg-blue-100 transition-colors border border-blue-100">
                       <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <span className="text-xs font-bold text-blue-900">Scheduled Jobs</span>
                       </div>
                       <span className="font-black text-blue-600">{summary.scheduledServices}</span>
                    </div>
                    <div onClick={() => navigate('/tickets?filter=parts')} className="flex items-center justify-between p-3.5 bg-purple-50/80 rounded-2xl cursor-pointer hover:bg-purple-100 transition-colors border border-purple-100">
                       <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-purple-600" />
                          <span className="text-xs font-bold text-purple-900">Parts Requested</span>
                       </div>
                       <span className="font-black text-purple-600">{summary.pendingPartCount}</span>
                    </div>
                    <div onClick={() => navigate('/tickets?status=Completed&bill=pending')} className="flex items-center justify-between p-3.5 bg-green-50/80 rounded-2xl cursor-pointer hover:bg-green-100 transition-colors border border-green-100">
                       <div className="flex items-center gap-3">
                          <ClipboardList className="h-5 w-5 text-green-600" />
                          <span className="text-xs font-bold text-green-900">Ready for Bill</span>
                       </div>
                       <span className="font-black text-green-600">{summary.needsBillingCount}</span>
                    </div>
                    <div onClick={() => navigate('/orders')} className="flex items-center justify-between p-3.5 bg-red-50/80 rounded-2xl cursor-pointer hover:bg-red-100 transition-colors border border-red-100">
                       <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <span className="text-xs font-bold text-red-900">Unpaid Bills</span>
                       </div>
                       <span className="font-black text-red-600">{summary.unpaidBilledCount}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Modals for Quick Actions */}
      {isServiceModalOpen && (
        <ServiceRequestModal
           onClose={() => setIsServiceModalOpen(false)}
           onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
              queryClient.invalidateQueries({ queryKey: ['service-requests'] });
           }}
        />
      )}

      {isEnquiryModalOpen && (
        <EnquiryModal
           onClose={() => setIsEnquiryModalOpen(false)}
           onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
              queryClient.invalidateQueries({ queryKey: ['enquiries'] });
           }}
        />
      )}
    </Layout>
  );
};

export default SalesDashboard;
