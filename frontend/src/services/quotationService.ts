import api from '../utils/api';
import { Quotation } from '../types';

export const quotationService = {
  getQuotations: async () => {
    const res = await api.get('/sales/quotations');
    return res.data.quotations as Quotation[];
  },

  getQuotationDetail: async (id: string) => {
    const res = await api.get(`/sales/quotations/${id}`);
    return res.data;
  },

  createQuotation: async (data: any) => {
    const res = await api.post('/sales/quotations', data);
    return res.data;
  },

  updateQuotation: async (id: string, data: any) => {
    const res = await api.patch(`/sales/quotations/${id}`, data);
    return res.data;
  },

  convertToSale: async (id: string) => {
    const res = await api.post(`/sales/quotations/${id}/convert`);
    return res.data;
  },

  deleteQuotation: async (id: string) => {
    const res = await api.delete(`/sales/quotations/${id}`);
    return res.data;
  }
};
