import React, { useState } from 'react';
import { X, Loader2, Save, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { recurringService, RecurringSchedule } from '../services/recurringService';
import { settingsService } from '../services/settingsService';
import { toast } from '../utils/toast';

interface Props {
  schedule: RecurringSchedule | null;
  prefill?: Partial<RecurringSchedule>;
  onClose: () => void;
  onSuccess: () => void;
}

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const RecurringScheduleModal = ({ schedule, prefill, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: prefill?.customer_name ?? schedule?.customer_name ?? '',
    customerMobile: prefill?.customer_mobile ?? schedule?.customer_mobile ?? '',
    deviceType: prefill?.device_type ?? schedule?.device_type ?? '',
    description: prefill?.description ?? schedule?.description ?? '',
    frequency: schedule?.frequency || 'quarterly',
    amount: schedule?.amount != null ? String(schedule.amount) : '',
    startDate: prefill?.start_date ?? schedule?.start_date ?? '',
    endDate: schedule?.end_date ?? '',
    technicianId: schedule?.technician_id || '',
    nextDueDate: prefill?.next_due_date ?? schedule?.next_due_date ?? new Date().toISOString().slice(0, 10),
    active: schedule?.active ?? true,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => settingsService.getTechnicians(),
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        customerName: form.customerName,
        customerMobile: form.customerMobile,
        deviceType: form.deviceType,
        description: form.description,
        frequency: form.frequency,
        amount: form.amount ? Number(form.amount) : 0,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        technicianId: form.technicianId || undefined,
        nextDueDate: form.nextDueDate,
        active: form.active,
      };
      if (schedule) {
        await recurringService.update(schedule.id, payload);
        toast('Schedule updated', 'success');
      } else {
        await recurringService.create(payload);
        toast('Schedule created', 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-navy uppercase text-xs tracking-widest">{schedule ? 'Edit Schedule' : 'New Schedule'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Customer Name</label>
              <input
                required
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
                value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Mobile</label>
              <input
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
                value={form.customerMobile}
                onChange={e => setForm({ ...form, customerMobile: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Device Type</label>
            <input
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
              value={form.deviceType}
              onChange={e => setForm({ ...form, deviceType: e.target.value })}
              placeholder="e.g. CCTV, Laptop, Printer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Description / Work Scope</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">AMC Amount (₹)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 12000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Assign Technician</label>
              <select
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40 appearance-none"
                value={form.technicianId}
                onChange={e => setForm({ ...form, technicianId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {technicians.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}{t.mobile ? ` (${t.mobile})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Frequency</label>
              <select
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40 appearance-none"
                value={form.frequency}
                onChange={e => setForm({ ...form, frequency: e.target.value })}
              >
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Next Due Date</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
                value={form.nextDueDate}
                onChange={e => setForm({ ...form, nextDueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Contract Start</label>
              <input
                type="date"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-soft uppercase ml-1">Contract End</label>
              <input
                type="date"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue/40"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-navy font-medium">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 accent-blue"
            />
            Active
          </label>

          <button
            disabled={loading}
            className="w-full py-3 bg-blue text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue/20 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {schedule ? 'Save Changes' : 'Create Schedule'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecurringScheduleModal;
