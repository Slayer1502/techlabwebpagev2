import api from '../utils/api';
import { Enquiry, EnquiryStatus } from '../types';

export const enquiryService = {
  getEnquiries: async () => {
    const res = await api.get('/sales/enquiries');
    return res.data.enquiries as Enquiry[];
  },

  createEnquiry: async (data: Partial<Enquiry>) => {
    const res = await api.post('/sales/enquiries', data);
    return res.data;
  },

  updateEnquiry: async (id: string, data: Partial<Enquiry>) => {
    const res = await api.patch(`/sales/enquiries/${id}`, data);
    return res.data;
  },

  deleteEnquiry: async (id: string) => {
    const res = await api.delete(`/sales/enquiries/${id}`);
    return res.data;
  },

  sendQuote: async (id: string, quoteData: any) => {
    const res = await api.post(`/sales/enquiries/${id}/quote`, quoteData);
    return res.data;
  },

  confirmOrder: async (id: string, advanceData: {
    customerAdvanceAmount: number,
    customerAdvanceMode: string,
    customerAdvanceDate: string,
    supplierAdvanceAmount: number,
    supplierAdvanceMode: string,
    supplierAdvanceDate: string
  }) => {
    const res = await api.post(`/sales/enquiries/${id}/confirm`, advanceData);
    return res.data;
  },

  markDelivered: async (id: string, paymentData?: any) => {
    const res = await api.post(`/sales/enquiries/${id}/deliver`, paymentData);
    return res.data;
  }
};
