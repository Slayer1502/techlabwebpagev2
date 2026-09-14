import api from '../utils/api';

export interface RecurringSchedule {
  id: string;
  service_request_id: string;
  customer_name: string;
  customer_mobile: string;
  device_type: string;
  description: string;
  frequency: string;
  amount: number;
  start_date: string;
  end_date: string;
  technician_id: string;
  technician_name: string;
  visits_completed: number;
  next_due_date: string;
  last_completed: string;
  active: boolean;
  created_at: string;
}

export const recurringService = {
  list: async (params: any = {}) => {
    const res = await api.get('/sales/recurring-schedules', { params });
    return res.data.schedules as RecurringSchedule[];
  },
  getDue: async () => {
    const res = await api.get('/sales/recurring-schedules/due');
    return res.data.schedules as RecurringSchedule[];
  },
  create: async (data: Partial<RecurringSchedule>) => {
    const res = await api.post('/sales/recurring-schedules', data);
    return res.data.schedule as RecurringSchedule;
  },
  update: async (id: string, data: Partial<RecurringSchedule>) => {
    const res = await api.patch(`/sales/recurring-schedules/${id}`, data);
    return res.data.schedule as RecurringSchedule;
  },
  complete: async (id: string, completedDate: string) => {
    const res = await api.post(`/sales/recurring-schedules/${id}/complete`, { completedDate });
    return res.data.schedule as RecurringSchedule;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/sales/recurring-schedules/${id}`);
    return res.data;
  },
};
