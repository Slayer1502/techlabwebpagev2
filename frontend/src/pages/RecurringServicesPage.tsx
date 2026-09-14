import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { recurringService, RecurringSchedule } from '../services/recurringService';
import RecurringScheduleModal from '../components/RecurringScheduleModal';
import { Plus, RefreshCw, Calendar, CheckCircle2, Trash2, ClipboardList, IndianRupee, User as UserIcon } from 'lucide-react';
import { formatDateValue, formatCurrencyValue } from '../utils/helpers';

const RecurringServicesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringSchedule | null>(null);
  const [prefill, setPrefill] = useState<Partial<RecurringSchedule> | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['recurring-schedules'],
    queryFn: () => recurringService.list({}),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => recurringService.complete(id, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-schedules'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => recurringService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-schedules'] }),
  });

  const handleComplete = (s: RecurringSchedule) => {
    const date = new Date().toISOString().slice(0, 10);
    completeMutation.mutate({ id: s.id, date });
  };

  const today = new Date().toISOString().slice(0, 10);
  const activeSchedules = schedules.filter(s => s.active);
  const dueNow = schedules.filter(s => s.active && s.next_due_date <= today);
  const totalAmcValue = activeSchedules.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalVisits = schedules.reduce((sum, s) => sum + (Number(s.visits_completed) || 0), 0);

  const frequencyLabel: Record<string, string> = {
    weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', 'half-yearly': 'Half-Yearly', yearly: 'Yearly',
  };

  const statCards = [
    { label: 'Active Contracts', value: String(activeSchedules.length), color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Due Now', value: String(dueNow.length), color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'AMC Value', value: formatCurrencyValue(totalAmcValue), color: 'text-blue', bg: 'bg-blue-50' },
    { label: 'Visits Done', value: String(totalVisits), color: 'text-navy', bg: 'bg-soft' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Recurring Services / AMC</h1>
            <p className="text-text-soft text-sm">Manage AMC contracts and scheduled maintenance visits</p>
          </div>
          <button
            onClick={() => { setEditing(null); setPrefill(undefined); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
          >
            <Plus className="h-5 w-5" />
            Add AMC / Schedule
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(st => (
            <div key={st.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-text-soft uppercase">{st.label}</p>
              <p className={`text-xl font-black mt-1 ${st.color}`}>{st.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center animate-pulse text-text-soft">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-navy">No AMC contracts yet</h3>
            <p className="text-text-soft text-sm mt-1">Add an AMC or recurring service schedule</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((s: RecurringSchedule) => {
              const overdue = s.active && s.next_due_date <= today;
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-navy">{s.customer_name || 'Customer'}</h3>
                      <p className="text-xs text-text-soft">{s.device_type || 'Service'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${s.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active ? 'Active' : 'Paused'}
                      </span>
                      {overdue && <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-red-100 text-red-600">Overdue</span>}
                    </div>
                  </div>

                  {s.description && <p className="text-xs text-text-soft mb-3 line-clamp-2">{s.description}</p>}

                  <div className="space-y-1.5 text-xs text-text-soft mb-4">
                    <div className="flex justify-between">
                      <span>Frequency</span>
                      <span className="font-bold text-navy">{frequencyLabel[s.frequency] || s.frequency}</span>
                    </div>
                    {Number(s.amount) > 0 && (
                      <div className="flex justify-between">
                        <span>AMC Amount</span>
                        <span className="font-bold text-blue flex items-center gap-1"><IndianRupee className="h-3 w-3" />{formatCurrencyValue(Number(s.amount))}</span>
                      </div>
                    )}
                    {s.technician_name && (
                      <div className="flex justify-between">
                        <span>Technician</span>
                        <span className="font-bold text-navy flex items-center gap-1"><UserIcon className="h-3 w-3" />{s.technician_name}</span>
                      </div>
                    )}
                    {s.start_date && (
                      <div className="flex justify-between">
                        <span>Contract Period</span>
                        <span className="font-bold text-navy">{formatDateValue(s.start_date)} → {formatDateValue(s.end_date)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Next Due</span>
                      <span className={`font-bold ${overdue ? 'text-red-600' : 'text-navy'}`}>
                        {formatDateValue(s.next_due_date)}
                      </span>
                    </div>
                    {s.last_completed && (
                      <div className="flex justify-between">
                        <span>Last Completed</span>
                        <span className="font-bold text-green-600">{formatDateValue(s.last_completed)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Visits Done</span>
                      <span className="font-bold text-navy flex items-center gap-1"><ClipboardList className="h-3 w-3" />{s.visits_completed || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t pt-3">
                    <button
                      onClick={() => handleComplete(s)}
                      className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Visit Done
                    </button>
                    <button
                      onClick={() => { setEditing(s); setPrefill(undefined); setIsModalOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-1 bg-soft text-blue px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" /> Edit
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Delete this schedule?')) deleteMutation.mutate(s.id); }}
                      className="p-2 text-text-soft hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <RecurringScheduleModal
          schedule={editing}
          prefill={prefill}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['recurring-schedules'] })}
        />
      )}
    </Layout>
  );
};

export default RecurringServicesPage;
