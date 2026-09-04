import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { reportService } from '../services/reportService';
import {
  FileText,
  Download,
  Trash2,
  Calendar,
  Filter,
  Archive,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart,
  HardDrive
} from 'lucide-react';
import { formatDateValue } from '../utils/helpers';
import { toast } from '../utils/toast';

const ReportsPage = () => {
  const [activeTab, setTab] = useState<'generate' | 'archive'>('generate');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [year, month] = val.split('-').map(Number);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setDateRange({ start, end });
  };

  const currentYear = new Date().getFullYear();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const queryClient = useQueryClient();

  const { data: meta } = useQuery({
    queryKey: ['reports-meta'],
    queryFn: () => reportService.getMeta(),
  });

  const { data: archive, isLoading: archiveLoading } = useQuery({
    queryKey: ['reports-archive'],
    queryFn: () => reportService.getArchive(),
    enabled: activeTab === 'archive'
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => reportService.batchDelete(ids),
    onSuccess: () => {
      toast('Archive cleaned', 'success');
      queryClient.invalidateQueries({ queryKey: ['reports-archive'] });
    },
  });

  const handleGenerate = (scope: string) => {
    reportService.generatePdf(scope, dateRange.start, dateRange.end);
    // Invalidate archive after a short delay to allow background archiving
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['reports-archive'] }), 2000);
  };

  const filteredReports = meta?.reports?.filter((r: any) =>
    selectedGroup === 'all' || r.group === selectedGroup
  );

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Reporting Engine</h1>
            <p className="text-text-soft text-sm font-medium">Generate financial statements and operational logs</p>
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
             <button
                onClick={() => setTab('generate')}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'generate' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-50'}`}
             >
                <Plus className="h-4 w-4" /> Generate
             </button>
             <button
                onClick={() => setTab('archive')}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'archive' ? 'bg-navy text-white shadow-md' : 'text-text-soft hover:bg-gray-50'}`}
             >
                <Archive className="h-4 w-4" /> Archive
             </button>
          </div>
        </div>

        {activeTab === 'generate' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Quick Month</label>
                      <select
                        className="w-full px-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all font-bold"
                        onChange={handleMonthSelect}
                        defaultValue=""
                      >
                         <option value="" disabled>Select Month</option>
                         {[0, 1, 2, 3, 4, 5].map(i => {
                            const d = new Date();
                            d.setMonth(d.getMonth() - i);
                            const m = d.getMonth() + 1;
                            const y = d.getFullYear();
                            return (
                               <option key={`${y}-${m}`} value={`${y}-${m}`}>
                                  {months[m-1]} {y}
                               </option>
                            );
                         })}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Period Start</label>
                      <div className="relative">
                         <Calendar className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                         <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all"
                            value={dateRange.start}
                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                         />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Period End</label>
                      <div className="relative">
                         <Calendar className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                         <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all"
                            value={dateRange.end}
                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                         />
                      </div>
                   </div>
                </div>
                <div className="flex gap-2 bg-gray-50 p-1 rounded-xl w-full md:w-fit overflow-x-auto">
                   <button
                    onClick={() => setSelectedGroup('all')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap ${selectedGroup === 'all' ? 'bg-white shadow-sm text-blue' : 'text-text-soft'}`}
                   >
                     All Groups
                   </button>
                   {meta?.groups?.map((g: any) => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGroup(g.id)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap ${selectedGroup === g.id ? 'bg-white shadow-sm text-blue' : 'text-text-soft'}`}
                      >
                        {g.label}
                      </button>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReports?.map((r: any) => (
                   <div key={r.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-48">
                      <div>
                         <div className="flex justify-between items-start mb-3">
                            <div className="p-2.5 bg-soft rounded-xl text-blue">
                               <FileText className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-bold text-text-soft uppercase bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{r.group}</span>
                         </div>
                         <h3 className="font-bold text-navy">{r.title}</h3>
                         <p className="text-xs text-text-soft mt-1 line-clamp-2 leading-relaxed">{r.desc}</p>
                      </div>
                      <button
                        onClick={() => handleGenerate(r.id)}
                        className="w-full mt-4 flex items-center justify-between text-blue font-bold text-sm bg-soft/50 py-2 px-4 rounded-xl hover:bg-blue hover:text-white transition-all group/btn"
                      >
                        <span>Generate PDF</span>
                        <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                   </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-gray-50/50 border-b">
                      <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                         <th className="px-8 py-5">Report Package</th>
                         <th className="px-8 py-5">Coverage</th>
                         <th className="px-8 py-5">Metadata</th>
                         <th className="px-8 py-5">Created</th>
                         <th className="px-8 py-5 text-right">Download</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y">
                      {archiveLoading ? (
                         [1, 2, 3, 4, 5].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-8 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td></tr>)
                      ) : archive?.map((a: any) => (
                         <tr key={a.id} className="group hover:bg-soft/20 transition-colors">
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-4">
                                  <div className="p-2 bg-gray-50 rounded-lg text-text-soft group-hover:bg-blue/5 group-hover:text-blue transition-colors">
                                     <FileText className="h-5 w-5" />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-navy">{a.title}</p>
                                     <p className="text-[10px] text-text-soft font-medium uppercase tracking-tight">{a.scope.replace('_', ' ')} • PDF</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-text-soft" />
                                  <span className="text-xs font-semibold text-navy">{a.range}</span>
                               </div>
                            </td>
                            <td className="px-8 py-5">
                               <div className="space-y-1">
                                  <p className="text-[10px] text-text-soft font-bold uppercase">Generated By</p>
                                  <p className="text-xs font-medium text-navy">{a.generated_by}</p>
                               </div>
                            </td>
                            <td className="px-8 py-5 text-xs text-text-soft font-medium">
                               {formatDateValue(a.created_at)}
                            </td>
                            <td className="px-8 py-5 text-right">
                               <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => reportService.downloadArchive(a.id)}
                                    className="p-2 bg-soft text-blue rounded-xl hover:bg-blue hover:text-white transition-all shadow-sm"
                                  >
                                     <Download className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => { if(window.confirm('Delete archived report?')) deleteMutation.mutate([a.id]); }}
                                    className="p-2 text-text-soft hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
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

             {archive?.length === 0 && !archiveLoading && (
                <div className="text-center py-24">
                   <Archive className="h-16 w-16 text-gray-100 mx-auto mb-4" />
                   <h3 className="text-xl font-bold text-navy">Archive is empty</h3>
                   <p className="text-text-soft text-sm max-w-xs mx-auto">Reports you generate will automatically be saved here for future reference.</p>
                </div>
             )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReportsPage;
