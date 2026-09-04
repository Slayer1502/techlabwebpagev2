import api from '../utils/api';

export const orderService = {
  getOrders: async (filters?: any) => {
    const res = await api.get('/sales/orders', { params: filters });
    return res.data.orders;
  },

  getOrderItems: async (id: string) => {
    const res = await api.get(`/sales/orders/${id}/items`);
    return res.data.items;
  },

  createOrder: async (data: any) => {
    const res = await api.post('/sales/orders', data);
    return res.data;
  },

  updateOrderStatus: async (id: string, status: string) => {
    const res = await api.patch(`/sales/orders/${id}/status`, { status });
    return res.data;
  },

  recordPayment: async (id: string, data: any) => {
    const res = await api.patch(`/sales/orders/${id}/payment`, data);
    return res.data;
  },

  deleteOrder: async (id: string) => {
    const res = await api.delete(`/sales/orders/${id}`);
    return res.data;
  }
};
