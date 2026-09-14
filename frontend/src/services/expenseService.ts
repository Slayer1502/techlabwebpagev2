import api from '../utils/api';

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  paid_to: string;
  payment_mode: string;
  receipt_url: string;
  related_service_id: string;
  related_order_id: string;
  recorded_by: string;
  recorded_by_name: string;
  expense_date: string;
  created_at: string;
}

export const expenseService = {
  list: async (params: any = {}) => {
    const res = await api.get('/admin/expenses', { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/admin/expenses/${id}`);
    return res.data.expense as Expense;
  },
  create: async (data: Partial<Expense>) => {
    const res = await api.post('/admin/expenses', data);
    return res.data.expense as Expense;
  },
  update: async (id: string, data: Partial<Expense>) => {
    const res = await api.patch(`/admin/expenses/${id}`, data);
    return res.data.expense as Expense;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/admin/expenses/${id}`);
    return res.data;
  },
  summary: async (params: any = {}) => {
    const res = await api.get('/admin/expenses/summary', { params });
    return res.data;
  },
};
