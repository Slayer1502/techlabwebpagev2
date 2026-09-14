import api from '../utils/api';

export const locationService = {
  report: async (requestId: string, lat: number, lng: number, accuracy?: number, note?: string) => {
    const res = await api.post(`/technician/service-requests/${requestId}/location`, { lat, lng, accuracy, note });
    return res.data;
  },
  get: async (requestId: string) => {
    const res = await api.get(`/sales/service-requests/${requestId}/location`);
    return res.data;
  },
};
