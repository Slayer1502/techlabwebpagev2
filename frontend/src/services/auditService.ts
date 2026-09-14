import api from '../utils/api';

export const auditService = {
  getLogs: async (params: any = {}) => {
    const res = await api.get('/admin/audit-logs', { params });
    return res.data;
  },
};
