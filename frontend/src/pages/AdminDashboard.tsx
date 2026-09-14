import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  ShieldCheck,
  Users,
  TrendingUp,
  Package,
  ClipboardList,
  IndianRupee,
  AlertCircle,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Settings,
  BarChart3,
  FileText,
  UserCheck
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard');
      return res.data;
    },
  });

  const { data: slaData } = useQuery({
    queryKey: ['sla-status'],
    queryFn: async () => {
      const res = await api.get('/admin/sla-status');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white rounded-3xl"></div>
            ))}
          </div>
          <div className="h-96 bg-white rounded-3xl"></div>
        </div>
      </Layout>
    );
  }

  const { summary, staff, orders, requests } = data;

  return (
    <Layout>
      <div className="space-y-8 pb-20">
        {/* Executive Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-navy p-8 rounded-[2.5rem] text-white shadow-xl shadow-navy/20 relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Executive Command Center
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Admin Overview</h1>
            <p className="text-xs text-gray-300">
              High-level business health, team activity, and financial metrics
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/analytics')}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
            >
              <BarChart3 className="h-4 w-4" /> BI Analytics
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="px-5 py-3 bg-blue text-white rounded-2xl text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue/30"
            >
              <FileText className="h-4 w-4" /> Financial Reports
            </button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
            <div className="p-4 bg-green-500/10 text-green-600 rounded-2xl">
              <IndianRupee className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                Total Revenue
              </p>
              <p className="text-2xl font-black text-navy">{formatCurrencyValue(summary.revenue)}</p>
              <p className="text-[10px] text-green-600 font-bold mt-0.5">Lifetime Billed Sales</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
            <div className="p-4 bg-blue/10 text-blue rounded-2xl">
              <TrendingUp className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                Today Collections
              </p>
              <p className="text-2xl font-black text-navy">
                {formatCurrencyValue((summary.todayCash || 0) + (summary.todayUpi || 0))}
              </p>
              <p className="text-[10px] text-text-soft font-bold mt-0.5">
                Cash: {formatCurrencyValue(summary.todayCash || 0)} | UPI: {formatCurrencyValue(summary.todayUpi || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
            <div className="p-4 bg-purple-500/10 text-purple-600 rounded-2xl">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                Catalog Valuation
              </p>
              <p className="text-2xl font-black text-navy">{formatCurrencyValue(summary.productValue)}</p>
              <p className="text-[10px] text-text-soft font-bold mt-0.5">
                {summary.products} Active Products
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
            <div className="p-4 bg-red-500/10 text-red-600 rounded-2xl">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                Total System Dues
              </p>
              <p className="text-2xl font-black text-red-600">{formatCurrencyValue(summary.totalDues)}</p>
              <p className="text-[10px] text-red-400 font-bold mt-0.5">Customer & Supplier Dues</p>
            </div>
          </div>
        </div>

        {/* SLA Health Cards */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue" />
                Service Level Agreement Health
              </h2>
              <p className="text-xs text-text-soft font-medium">
                Live SLA compliance across open service requests
              </p>
            </div>
            <button
              onClick={() => navigate('/tickets')}
              className="text-xs font-bold text-blue hover:underline flex items-center gap-1"
            >
              Open Tickets <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">On Track</p>
              <p className="text-3xl font-black text-green-700 mt-1">{slaData?.summary?.onTrack ?? 0}</p>
              <p className="text-[10px] text-green-600 font-semibold mt-0.5">Within resolution deadline</p>
            </div>
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">At Risk</p>
              <p className="text-3xl font-black text-amber-700 mt-1">{slaData?.summary?.atRisk ?? 0}</p>
              <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Due within next 24h</p>
            </div>
            <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Breached</p>
              <p className="text-3xl font-black text-red-700 mt-1">{slaData?.summary?.breached ?? 0}</p>
              <p className="text-[10px] text-red-600 font-semibold mt-0.5">Past resolution deadline</p>
            </div>
            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Open Requests</p>
              <p className="text-3xl font-black text-blue-700 mt-1">{slaData?.summary?.open ?? 0}</p>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Total active service requests</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area: Staff & Activity */}
          <div className="lg:col-span-2 space-y-8">
            {/* Staff Directory Summary */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue" />
                    Staff Directory & Roles
                  </h2>
                  <p className="text-xs text-text-soft font-medium">Active team members and access levels</p>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-xs font-bold text-blue hover:underline flex items-center gap-1"
                >
                  Manage Staff <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staff?.slice(0, 6).map((member: any) => (
                  <div
                    key={member.id}
                    className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-navy text-white flex items-center justify-center font-bold text-sm uppercase">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-navy">{member.name}</p>
                        <p className="text-[10px] text-text-soft font-semibold">{member.mobile || member.email}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${member.role === 'admin' ? 'bg-navy text-white' : 'bg-blue/10 text-blue'}`}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b">
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-green-600" />
                  Recent High-Value Orders
                </h2>
                <button
                  onClick={() => navigate('/orders')}
                  className="text-xs font-bold text-blue hover:underline flex items-center gap-1"
                >
                  View All Orders <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider border-b">
                      <th className="px-4 py-3">Order Ref</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders?.slice(0, 5).map((o: any) => (
                      <tr key={o.id} className="text-sm hover:bg-soft/30 transition-colors">
                        <td className="px-4 py-4 font-bold text-navy">#{o.bill_number || String(o.id).slice(-6)}</td>
                        <td className="px-4 py-4 font-semibold text-navy">{o.customer_name}</td>
                        <td className="px-4 py-4 font-black text-navy">{formatCurrencyValue(o.total_amount)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${o.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-text-soft">{formatDateValue(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Operations Summary & Quick Controls */}
          <div className="space-y-8">
            {/* Quick System Controls */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
              <h2 className="text-lg font-bold text-navy">Quick Admin Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full p-4 bg-gray-50 hover:bg-soft rounded-2xl border border-gray-100 flex items-center justify-between text-navy font-bold text-xs transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 text-blue" />
                    <span>Company & Staff Settings</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-soft group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => navigate('/parties')}
                  className="w-full p-4 bg-gray-50 hover:bg-soft rounded-2xl border border-gray-100 flex items-center justify-between text-navy font-bold text-xs transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span>Parties & Ledger Directory</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-soft group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => navigate('/reports')}
                  className="w-full p-4 bg-gray-50 hover:bg-soft rounded-2xl border border-gray-100 flex items-center justify-between text-navy font-bold text-xs transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span>Financial Reporting Engine</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-soft group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Service & Operational Load */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
              <h2 className="text-lg font-bold text-navy">Service Operations</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-orange-50/80 rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="text-xs font-bold text-orange-900">Pending Scheduling</span>
                  </div>
                  <span className="font-black text-orange-600">{summary.pendingScheduling}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-green-50/80 rounded-2xl border border-green-100">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <span className="text-xs font-bold text-green-900">Completed Site Visits</span>
                  </div>
                  <span className="font-black text-green-600">{summary.completedVisits}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-blue-50/80 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-bold text-blue-900">Active Customer Base</span>
                  </div>
                  <span className="font-black text-blue-600">{summary.activeCustomers}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
