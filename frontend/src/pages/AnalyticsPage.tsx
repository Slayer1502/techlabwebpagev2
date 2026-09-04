import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  LineChart as LineIcon,
  CheckCircle2
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { formatCurrencyValue } from '../utils/helpers';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-full'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics');
      return res.data;
    },
  });

  if (isLoading) return (
    <Layout>
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-3xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-3xl"></div>
          <div className="h-80 bg-white rounded-3xl"></div>
        </div>
      </div>
    </Layout>
  );

  const revenueData = {
    labels: data.revenue.map((r: any) => {
       const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
       const parts = r.month.split('-');
       return months[parseInt(parts[1]) - 1];
    }),
    datasets: [
      {
        label: 'Sales Revenue',
        data: data.revenue.map((r: any) => r.sales),
        borderColor: '#1663ff',
        backgroundColor: 'rgba(22, 99, 255, 0.05)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Service Revenue',
        data: data.revenue.map((r: any) => r.services),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: true,
        tension: 0.4,
      }
    ],
  };

  const techData = {
    labels: data.techPerf.map((t: any) => t.name.split(' ')[0]),
    datasets: [{
      label: 'Jobs Completed',
      data: data.techPerf.map((t: any) => t.count),
      backgroundColor: '#10284f',
      borderRadius: 8,
    }],
  };

  const invData = {
    labels: data.inventory.map((i: any) => i.type),
    datasets: [{
      data: data.inventory.map((i: any) => i.stock),
      backgroundColor: ['#10284f', '#1663ff', '#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 4
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: { size: 11, weight: '600' as any }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.02)' }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center">
           <div>
              <h1 className="text-2xl font-bold text-navy tracking-tight">Business Intelligence</h1>
              <p className="text-text-soft text-sm font-medium">Performance metrics and growth trends</p>
           </div>
           <div className="flex gap-2">
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                 <ArrowUpRight className="h-3 w-3" /> Live Engine
              </span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[450px]">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-blue/5 rounded-xl text-blue"><LineIcon className="h-5 w-5" /></div>
                 <h2 className="text-lg font-bold text-navy">Revenue Growth</h2>
              </div>
              <div className="flex-1">
                 <Line data={revenueData} options={chartOptions} />
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[450px]">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-navy/5 rounded-xl text-navy"><BarChart3 className="h-5 w-5" /></div>
                 <h2 className="text-lg font-bold text-navy">Technician Productivity</h2>
              </div>
              <div className="flex-1">
                 <Bar data={techData} options={chartOptions} />
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[400px]">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><PieIcon className="h-5 w-5" /></div>
                 <h2 className="text-lg font-bold text-navy">Inventory Composition</h2>
              </div>
              <div className="flex-1 relative">
                 <Doughnut
                    data={invData}
                    options={{
                        ...chartOptions,
                        cutout: '75%',
                    }}
                 />
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-10">
                    <p className="text-[10px] font-bold text-text-soft uppercase">Total Stock</p>
                    <p className="text-3xl font-black text-navy">{data.inventory.reduce((s:any, i:any) => s+i.stock, 0)}</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 gap-6">
              <div className="bg-navy p-8 rounded-[2.5rem] text-white shadow-xl shadow-navy/20 relative overflow-hidden">
                 <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 text-white/5" />
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Net Sales (6 Months)</p>
                 <h3 className="text-4xl font-black mb-4">
                    {formatCurrencyValue(data.revenue.reduce((s:any, r:any) => s+r.sales, 0))}
                 </h3>
                 <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>+12.4% from last period</span>
                 </div>
              </div>

              <div className="bg-blue p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue/20 relative overflow-hidden">
                 <Users className="absolute -right-4 -bottom-4 h-32 w-32 text-white/5" />
                 <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">Service Revenue (6 Months)</p>
                 <h3 className="text-4xl font-black mb-4">
                    {formatCurrencyValue(data.revenue.reduce((s:any, r:any) => s+r.services, 0))}
                 </h3>
                 <div className="flex items-center gap-2 text-blue-100 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Quality assured service delivery</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;
