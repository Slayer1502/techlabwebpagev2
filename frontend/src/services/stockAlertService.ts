import api from '../utils/api';

export interface StockAlert {
  id: string;
  product_id: string;
  product_name: string;
  threshold: number;
  current_stock: number;
  min_stock: number;
  created_at: string;
  dismissed_at: string | null;
}

export const stockAlertService = {
  getAlerts: async (active = true) => {
    const res = await api.get('/admin/stock-alerts', { params: { active } });
    return res.data.alerts as StockAlert[];
  },
  scan: async () => {
    const res = await api.post('/admin/stock-alerts/scan');
    return res.data;
  },
  dismiss: async (id: string) => {
    const res = await api.patch(`/admin/stock-alerts/${id}/dismiss`);
    return res.data;
  },
};
