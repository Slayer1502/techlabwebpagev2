import api from '../utils/api';

export const challanService = {
  getChallans: async (filters?: any) => {
    const res = await api.get('/sales/challans', { params: filters });
    return res.data.challans;
  },

  getChallanDetail: async (id: string) => {
    const res = await api.get(`/sales/challans/${id}`);
    return res.data;
  },

  getChallanForSource: async (sourceType: string, sourceId: string) => {
    const res = await api.get('/sales/challans', { params: { sourceType, sourceId } });
    return res.data;
  },

  createChallan: async (data: any) => {
    const res = await api.post('/sales/challans', data);
    return res.data;
  },

  createStandaloneChallan: async (data: any) => {
    const res = await api.post('/sales/challans/standalone', data);
    return res.data;
  },

  consolidateToBill: async (ids: string[], isGst: boolean) => {
    const res = await api.post('/sales/challans/consolidate-to-bill', { ids, isGst });
    return res.data;
  },

  returnItems: async (id: string, returns: any) => {
    const res = await api.post(`/sales/challans/${id}/return-items`, { returns });
    return res.data;
  },

  markDelivered: async (id: string, receivedBy?: string) => {
    const res = await api.post(`/sales/challans/${id}/mark-delivered`, { receivedBy });
    return res.data;
  },

  voidChallan: async (id: string, reason?: string) => {
    const res = await api.post(`/sales/challans/${id}/void`, { reason });
    return res.data;
  }
};
