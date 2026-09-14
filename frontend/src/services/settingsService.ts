import api from '../utils/api';

export const settingsService = {
  getBusiness: async () => {
    const res = await api.get('/settings/business');
    return res.data;
  },

  updateBusiness: async (data: any) => {
    const res = await api.put('/settings/business', data);
    return res.data;
  },

  getBankAccounts: async () => {
    const res = await api.get('/settings/bank-accounts');
    return res.data.accounts;
  },

  addBankAccount: async (data: any) => {
    const res = await api.post('/settings/bank-accounts', data);
    return res.data;
  },

  toggleBankQr: async (id: string) => {
    const res = await api.patch(`/settings/bank-accounts/${id}/toggle-qr`);
    return res.data;
  },

  setPrimaryBank: async (id: string) => {
    const res = await api.patch(`/settings/bank-accounts/${id}/primary`);
    return res.data;
  },

  deleteBank: async (id: string) => {
    const res = await api.delete(`/settings/bank-accounts/${id}`);
    return res.data;
  },

  getStaff: async (page = 1, limit = 50) => {
    const res = await api.get(`/admin/staff?page=${page}&limit=${limit}`);
    return res.data.staff;
  },

  getTechnicians: async () => {
    const res = await api.get('/admin/technicians');
    return res.data.technicians;
  },

  deleteStaff: async (id: string) => {
    const res = await api.delete(`/admin/staff/${id}`);
    return res.data;
  },

  resetStaffPassword: async (id: string, password: string) => {
    const res = await api.patch(`/admin/staff/${id}/reset-password`, { password });
    return res.data;
  }
};
