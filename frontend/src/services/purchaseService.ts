import api from '../utils/api';
import { SupplierQuote, SupplierQuoteItem } from '../types';

export const purchaseService = {
  getPurchaseOrders: async () => {
    const res = await api.get('/sales/purchase-orders');
    return res.data.purchaseOrders;
  },

  getPurchaseOrderDetail: async (id: string) => {
    const res = await api.get(`/sales/purchase-orders/${id}`);
    return res.data;
  },

  getPurchases: async (status?: string) => {
    const res = await api.get('/sales/purchases', { params: { status } });
    return res.data.purchases;
  },

  recordPurchase: async (supplierId: string, data: any) => {
    const res = await api.post(`/sales/suppliers/${supplierId}/purchases`, data);
    return res.data;
  },

  createPurchaseOrder: async (data: any) => {
    const res = await api.post('/sales/purchase-orders', data);
    return res.data;
  },

  receivePurchaseOrder: async (id: string, data: any) => {
    const res = await api.post(`/sales/purchase-orders/${id}/receive`, data);
    return res.data;
  },

  getQuotes: async (status?: string): Promise<SupplierQuote[]> => {
    const res = await api.get('/sales/quotes', { params: { status } });
    return res.data.quotes as SupplierQuote[];
  },

  getQuoteDetail: async (id: string): Promise<{ quote: SupplierQuote; items: SupplierQuoteItem[] }> => {
    const res = await api.get(`/sales/quotes/${id}`);
    return res.data as { quote: SupplierQuote; items: SupplierQuoteItem[] };
  },

  approveQuote: async (id: string) => {
    const res = await api.post(`/sales/quotes/${id}/approve`);
    return res.data;
  },

  rejectQuote: async (id: string) => {
    const res = await api.post(`/sales/quotes/${id}/reject`);
    return res.data;
  },

  uploadQuote: async (formData: FormData) => {
    const res = await api.post('/sales/quotes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  getSupplierQuotesForService: async (serviceRequestId: string): Promise<SupplierQuote[]> => {
    const res = await api.get(`/sales/service-requests/${serviceRequestId}/supplier-quotes`);
    return res.data.quotes as SupplierQuote[];
  },

  createSupplierQuoteForService: async (serviceRequestId: string, data: any) => {
    const res = await api.post(`/sales/service-requests/${serviceRequestId}/supplier-quote`, data);
    return res.data;
  },

  attachQuotePdf: async (id: string, formData: FormData) => {
    const res = await api.post(`/sales/quotes/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};
