import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { expenseService, Expense } from '../services/expenseService';
import ExpenseModal from '../components/ExpenseModal';
import { Plus, Search, Edit2, Trash2, IndianRupee, Receipt } from 'lucide-react';
import { formatCurrencyValue, formatDateValue } from '../utils/helpers';
import { useAuthStore } from '../store/authStore';

const ExpenseModalComponent = ExpenseModal;

const ExpensesPage = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canWrite = ['admin', 'sales'].includes(user?.role || '');

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expenseService.list({}),
  });
  const { data: summary } = useQuery({
    queryKey: ['expense-summary'],
    queryFn: () => expenseService.summary({}),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
    },
  });

  const expenses: Expense[] = data?.expenses || [];
  const filtered = expenses.filter(e => {
    const s = search.toLowerCase();
    const matchSearch = !s || (e.description || '').toLowerCase().includes(s) || (e.paid_to || '').toLowerCase().includes(s) || e.category.toLowerCase().includes(s);
    const matchCat = !category || e.category === category;
    return matchSearch && matchCat;
  });

  const categories = Array.from(new Set(expenses.map(e => e.category)));

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this expense record?')) deleteMutation.mutate(id);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Expenses</h1>
            <p className="text-text-soft text-sm">Track business expenses and spending</p>
          </div>
          {canWrite && (
          <button
            onClick={() => { setEditing(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
          >
            <Plus className="h-5 w-5" />
            Add Expense
          </button>
          )}
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600"><IndianRupee className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-text-soft font-bold uppercase">Total Expenses</p>
                  <p className="text-xl font-bold text-navy">{formatCurrencyValue(summary.total)}</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {summary.byCategory.map((c: any) => (
                  <span key={c.category} className="px-3 py-1.5 bg-soft text-blue text-xs font-bold rounded-lg">
                    {c.category}: {formatCurrencyValue(c.total)} ({c.count})
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-5 w-5 text-text-soft" />
            <input
              type="text"
              placeholder="Search expenses..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/10 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/10 outline-none appearance-none"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center animate-pulse text-text-soft">Loading expenses...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-soft/60 text-left text-xs uppercase tracking-wider text-text-soft">
                    <th className="px-5 py-3 font-bold">Date</th>
                    <th className="px-5 py-3 font-bold">Category</th>
                    <th className="px-5 py-3 font-bold">Description</th>
                    <th className="px-5 py-3 font-bold">Paid To</th>
                    <th className="px-5 py-3 font-bold">Mode</th>
                    <th className="px-5 py-3 font-bold">Amount</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-t border-gray-100 hover:bg-soft/30 transition-colors">
                      <td className="px-5 py-3 text-text-soft whitespace-nowrap">{formatDateValue(e.expense_date)}</td>
                      <td className="px-5 py-3"><span className="px-2 py-0.5 bg-soft text-blue text-[10px] font-bold rounded-lg">{e.category}</span></td>
                      <td className="px-5 py-3 text-navy font-medium">
                        {e.description || '-'}
                        {e.related_service_id && (
                          <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-bold rounded-md align-middle">SR #{String(e.related_service_id).slice(-6)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-text-soft">{e.paid_to || '-'}</td>
                      <td className="px-5 py-3 text-xs text-text-soft">{e.payment_mode}</td>
                      <td className="px-5 py-3 text-navy font-bold">{formatCurrencyValue(e.amount)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {canWrite && (
                          <>
                          <button onClick={() => { setEditing(e); setIsModalOpen(true); }} className="p-2 text-text-soft hover:bg-gray-100 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(e.id)} className="p-2 text-text-soft hover:bg-red-50 hover:text-red-500 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                          </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-text-soft">No expenses recorded yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ExpenseModalComponent
          expense={editing}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
          }}
        />
      )}
    </Layout>
  );
};

export default ExpensesPage;
