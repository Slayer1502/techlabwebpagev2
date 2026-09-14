import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { challanService } from '../services/challanService';
import {
  Truck,
  Package,
  Plus,
  Search,
  Download,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Box,
  X,
  Loader2
} from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { toast } from '../utils/toast';
import StandaloneChallanModal from '../components/StandaloneChallanModal';
import ChallanDetailDrawer from '../components/ChallanDetailDrawer';
import { useAuthStore } from '../store/authStore';

const ChallansPage = () => {
  const [search, setSearch] = useState('');
  const [billingFilter, setBillingFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedChallanId, setSelectedChallanId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [consolidateGst, setConsolidateGst] = useState(true);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canWrite = ['admin', 'sales'].includes(user?.role || '');

  const { data: challans, isLoading } = useQuery({
    queryKey: ['challans', billingFilter],
    queryFn: () => challanService.getChallans({ billingStatus: billingFilter === 'all' ? undefined : billingFilter }),
  });

  const consolidateMutation = useMutation({
    mutationFn: ({ ids, isGst }: { ids: string[], isGst: boolean }) => challanService.consolidateToBill(ids, isGst),
    onSuccess: (res) => {
      toast('Challan(s) converted to final bill!', 'success');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      if (window.confirm('View the new invoice?')) {
          window.open(`/api/sales/orders/${res.orderId}/invoice.pdf`, '_blank');
      }
    },
  });

  const filteredChallans = challans?.filter((c: any) =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.challan_number.includes(search)
  );

  const selectable = (c: any) => c.billing_status === 'pending';
  const pendingFiltered = filteredChallans?.filter(selectable) || [];
  const allSelected = pendingFiltered.length > 0 && pendingFiltered.every((c: any) => selectedIds.includes(c.id));
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pendingFiltered.some((c: any) => c.id === id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pendingFiltered.map((c: any) => c.id)])]);
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Unbilled' },
    { key: 'billed', label: 'Billed' },
    { key: 'cancelled', label: 'Voided' },
  ];

  const handleConsolidate = () => {
    if (!selectedIds.length) return toast('Select at least one challan', 'error');
    consolidateMutation.mutate({ ids: selectedIds, isGst: consolidateGst });
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Delivery Challans (DC)</h1>
            <p className="text-text-soft text-sm font-medium">Track goods dispatched and consolidate into final bills</p>
          </div>
          {canWrite && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-navy text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-navy/20 text-sm"
            >
              <Plus className="h-4 w-4" /> Standalone DC
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-5 w-5 text-text-soft" />
            <input
              type="text"
              placeholder="Search by DC number or customer name..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue/10 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-gray-50 rounded-xl p-1">
             {filterTabs.map(tab => (
               <button
                 key={tab.key}
                 onClick={() => { setBillingFilter(tab.key); setSelectedIds([]); }}
                 className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${billingFilter === tab.key
                   ? tab.key === 'pending' ? 'bg-white text-orange-600 shadow-sm'
                     : tab.key === 'billed' ? 'bg-white text-green-600 shadow-sm'
                     : tab.key === 'cancelled' ? 'bg-white text-red-500 shadow-sm'
                     : 'bg-white text-navy shadow-sm'
                   : 'text-text-soft'}`}
               >
                 {tab.label}
               </button>
             ))}
          </div>
        </div>

        {canWrite && selectedIds.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-blue p-4 rounded-2xl shadow-lg shadow-blue/10 border border-blue/10">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-white" />
              <p className="text-white text-sm font-bold">{selectedIds.length} challan{selectedIds.length > 1 ? 's' : ''} selected</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-white text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={consolidateGst}
                  onChange={e => setConsolidateGst(e.target.checked)}
                  className="rounded"
                />
                GST Bill
              </label>
              <button
                onClick={handleConsolidate}
                disabled={consolidateMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue rounded-xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-md disabled:opacity-60"
              >
                {consolidateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Convert to Final Bill
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="p-2 text-white/70 hover:text-white transition-colors"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b">
                   <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                      <th className="px-8 py-5 w-10">
                         {canWrite && (
                         <input
                           type="checkbox"
                           checked={allSelected}
                           onChange={toggleAll}
                           onClick={(e) => e.stopPropagation()}
                           className="rounded accent-blue"
                         />
                         )}
                      </th>
                      <th className="px-8 py-5">DC Info</th>
                      <th className="px-8 py-5">Consignee</th>
                      <th className="px-8 py-5">Value</th>
                      <th className="px-8 py-5">Dispatch Details</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {isLoading ? (
                      [1, 2, 3, 4].map(i => <tr key={i} className="animate-pulse"><td colSpan={7} className="px-8 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td></tr>)
                   ) : filteredChallans?.map((c: any) => (
                      <tr key={c.id} onClick={() => setSelectedChallanId(c.id)} className={`group cursor-pointer hover:bg-soft/20 transition-colors ${c.billing_status === 'cancelled' ? 'opacity-50' : ''}`}>
                        <td className="px-8 py-5">
                           {canWrite && selectable(c) ? (
                             <input
                               type="checkbox"
                               checked={selectedIds.includes(c.id)}
                               onChange={() => toggleSelect(c.id)}
                               onClick={(e) => e.stopPropagation()}
                               className="rounded accent-blue"
                             />
                           ) : <span className="inline-block w-4" />}
                        </td>
                        <td className="px-8 py-5">
                           <p className="text-sm font-bold text-navy uppercase">{c.challan_number}</p>
                           <p className="text-[10px] text-text-soft uppercase font-bold tracking-tight">{c.source_type} Source</p>
                        </td>
                        <td className="px-8 py-5">
                           <div>
                              <p className="text-sm font-bold text-navy">{c.customer_name}</p>
                              <p className="text-[10px] text-text-soft">{c.customer_mobile}</p>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-navy">
                           {formatCurrencyValue(c.total_value)}
                        </td>
                        <td className="px-8 py-5">
                           <div className="space-y-1">
                              <p className="text-xs text-navy font-semibold flex items-center gap-2">
                                 <Truck className="h-3 w-3 text-text-soft" /> {c.transport || 'Self'}
                              </p>
                              <p className="text-[10px] text-text-soft font-medium flex items-center gap-2">
                                 <Clock className="h-3 w-3" /> {formatDateValue(c.dispatch_date)}
                              </p>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex flex-col gap-1.5 items-start">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${c.billing_status === 'billed' ? 'bg-green-100 text-green-600' : c.billing_status === 'cancelled' ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-600'}`}>
                                {c.billing_status}
                              </span>
                              {c.delivered_at && (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Delivered
                                </span>
                              )}
                           </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(`/api/sales/challans/${c.id}.pdf`, '_blank'); }}
                                className="p-2 text-blue hover:bg-blue/5 rounded-xl transition-all"
                                title="Download PDF"
                              >
                                 <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setSelectedChallanId(c.id)}
                                className="p-2 text-text-soft hover:bg-white hover:text-navy rounded-xl border border-transparent shadow-sm transition-all"
                              >
                                 <Box className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setSelectedChallanId(c.id)}
                                className="p-2 text-text-soft hover:bg-gray-100 rounded-lg"
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

           {filteredChallans?.length === 0 && !isLoading && (
              <div className="text-center py-24">
                 <Truck className="h-16 w-16 text-gray-100 mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-navy">No challans found</h3>
                 <p className="text-text-soft text-sm">Create challans from orders or service requests to track dispatches.</p>
              </div>
           )}
        </div>
      </div>

      {isCreateModalOpen && (
        <StandaloneChallanModal
           onClose={() => setIsCreateModalOpen(false)}
           onSuccess={() => queryClient.invalidateQueries({ queryKey: ['challans'] })}
        />
      )}

      {selectedChallanId && (
        <ChallanDetailDrawer
           challanId={selectedChallanId}
           onClose={() => setSelectedChallanId(null)}
        />
      )}
    </Layout>
  );
};

export default ChallansPage;
