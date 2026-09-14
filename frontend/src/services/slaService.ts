import api from '../utils/api';

export const slaService = {
  getStatus: async (params: any = {}) => {
    const res = await api.get('/admin/sla-status', { params });
    return res.data;
  },
  getDefinitions: async () => {
    const res = await api.get('/admin/sla-definitions');
    return res.data.definitions;
  },
  upsertDefinition: async (data: any) => {
    const res = await api.post('/admin/sla-definitions', data);
    return res.data.definition;
  },
};
