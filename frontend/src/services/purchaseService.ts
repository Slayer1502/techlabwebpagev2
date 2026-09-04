import api from '../utils/api';

export const purchaseService = {
  getPurchaseOrders: async () => {
    const res = await api.get('/sales/purchase-orders');
    return res.data.purchaseOrders;
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

  getQuotes: async (status?: string) => {
    const res = await api.get('/sales/quotes', { params: { status } });
    return res.data.quotes;
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
  }
};
