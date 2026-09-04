import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { partyService } from '../services/partyService';
import {
  Users,
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  IndianRupee,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { formatCurrencyValue } from '../utils/helpers';
import PartyModal from '../components/PartyModal';
import { Party } from '../types';
import { toast } from '../utils/toast';

const PartiesPage = () => {
  const [tab, setTab] = useState<'customer' | 'supplier'>('customer');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['parties', tab],
    queryFn: () => partyService.getParties(tab),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partyService.deleteParty(id),
    onSuccess: () => {
      toast('Party removed successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });

  const filteredParties = data?.parties?.filter((p: Party) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mobile.includes(search)
  );

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    setIsModalOpen(true);
  };

  const handleRemove = async (id: string) => {
    if (window.confirm('Delete this party and all associated history?')) {
      deleteMutation.mutate(id);
    }
  };

  const StatBox = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-text-soft uppercase">{label}</p>
        <p className="text-lg font-bold text-navy">{value}</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Party Management</h1>
            <p className="text-text-soft text-sm">Customers, Suppliers, and Relationship tracking</p>
          </div>
          <button
            onClick={() => { setEditingParty(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
          >
            <Plus className="h-5 w-5" />
            Add New {tab === 'customer' ? 'Customer' : 'Supplier'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatBox
             label={tab === 'customer' ? "Total Customers" : "Total Suppliers"}
             value={data?.summary?.[tab === 'customer' ? 'customers' : 'suppliers'] || 0}
             icon={tab === 'customer' ? Users : Building2}
             color="bg-blue"
           />
           <StatBox
             label={tab === 'customer' ? "Customer Dues" : "Supplier Dues"}
             value={formatCurrencyValue(data?.summary?.[tab === 'customer' ? 'dues' : 'outstanding'] || 0)}
             icon={IndianRupee}
             color="bg-red-500"
           />
           <StatBox
             label={tab === 'customer' ? "Total Orders" : "Total Purchases"}
             value={data?.summary?.[tab === 'customer' ? 'total' : 'purchaseCount'] || 0}
             icon={TrendingUp}
             color="bg-green-500"
           />
           <StatBox
             label="Active Attention"
             value={data?.parties?.filter((p: any) => p.dues > 0).length || 0}
             icon={AlertCircle}
             color="bg-orange-500"
           />
        </div>

        {/* Tabs & Search */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
           <div className="flex bg-gray-50 rounded-xl p-1 md:w-fit">
              <button
                onClick={() => { setTab('customer'); setSearch(''); }}
                className={`px-8 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'customer' ? 'bg-white text-blue shadow-sm' : 'text-text-soft hover:bg-gray-100'}`}
              >
                Customers
              </button>
              <button
                onClick={() => { setTab('supplier'); setSearch(''); }}
                className={`px-8 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'supplier' ? 'bg-white text-blue shadow-sm' : 'text-text-soft hover:bg-gray-100'}`}
              >
                Suppliers
              </button>
           </div>
           <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-soft" />
              <input
                placeholder={`Search ${tab}s by name or mobile...`}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-xl text-sm outline-none focus:border-blue/40 transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
        </div>

        {/* Table / List */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b">
                   <tr className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                      <th className="px-6 py-4">Identity</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">{tab === 'customer' ? 'Total Spent' : 'Total Purchases'}</th>
                      <th className="px-6 py-4">Balance / Dues</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {isLoading ? (
                      [1, 2, 3, 4, 5].map(i => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td>
                        </tr>
                      ))
                   ) : filteredParties?.map((p: Party) => (
                      <tr key={p.id} className="group hover:bg-soft/30 transition-colors">
                        <td className="px-6 py-4">
                           <div>
                              <p className="text-sm font-bold text-navy">{p.name}</p>
                              <p className="text-[10px] text-text-soft uppercase font-semibold">{p.gstin ? `GST: ${p.gstin}` : 'Standard Account'}</p>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="space-y-1">
                              <p className="text-xs text-text-soft flex items-center gap-2 font-medium">
                                 <Phone className="h-3 w-3 text-blue" />
                                 {p.mobile}
                              </p>
                              {p.email && (
                                <p className="text-[10px] text-text-soft flex items-center gap-2">
                                   <Mail className="h-3 w-3" />
                                   {p.email}
                                </p>
                              )}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <p className="text-sm font-bold text-navy">
                             {formatCurrencyValue(tab === 'customer' ? (p.customer_spent || 0) : (p.total_purchases || 0))}
                           </p>
                           <p className="text-[10px] text-text-soft">{tab === 'customer' ? p.customer_order_count : p.purchase_count} Transactions</p>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`text-sm font-bold ${p.dues! > 0 ? 'text-red-500' : 'text-green-600'}`}>
                             {formatCurrencyValue(p.dues || 0)}
                           </span>
                           {p.dues! > 0 && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight">Payment Pending</p>}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(p)}
                                className="p-2 text-text-soft hover:bg-white hover:text-blue rounded-lg border border-transparent hover:border-blue/10 shadow-sm transition-all"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRemove(p.id)}
                                className="p-2 text-text-soft hover:bg-white hover:text-red-500 rounded-lg border border-transparent hover:border-red-500/10 shadow-sm transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button className="p-2 text-blue hover:bg-blue hover:text-white rounded-lg shadow-sm border border-blue/10 transition-all">
                                <ChevronRight className="h-4 w-4" />
                              </button>
                           </div>
                        </td>
                      </tr>
                   ))}
                </tbody>
              </table>
           </div>

           {filteredParties?.length === 0 && !isLoading && (
              <div className="text-center py-20">
                 <Users className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-navy">No {tab}s found</h3>
                 <p className="text-text-soft text-sm">Start by adding your first {tab} to the system</p>
              </div>
           )}
        </div>
      </div>

      {isModalOpen && (
        <PartyModal
          party={editingParty}
          defaultType={tab}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['parties'] })}
        />
      )}
    </Layout>
  );
};

export default PartiesPage;
