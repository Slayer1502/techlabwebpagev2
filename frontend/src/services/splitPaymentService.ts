import api from '../utils/api';

export interface SplitEntry {
  amount: number;
  paymentMode: string;
  paymentDate: string;
}

export const splitPaymentService = {
  splitService: async (id: string, entries: SplitEntry[]) => {
    const res = await api.post(`/sales/service-requests/${id}/split-payment`, { entries });
    return res.data;
  },
  splitOrder: async (id: string, entries: SplitEntry[]) => {
    const res = await api.post(`/sales/orders/${id}/split-payment`, { entries });
    return res.data;
  },
};
