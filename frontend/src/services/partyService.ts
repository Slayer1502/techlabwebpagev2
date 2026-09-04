import api from '../utils/api';
import { Party } from '../types';

export const partyService = {
  getParties: async (type?: 'customer' | 'supplier') => {
    const url = type ? `/parties?type=${type}` : '/parties';
    const res = await api.get(url);
    return res.data; // returns { parties, summary }
  },

  getPartyDetail: async (id: string) => {
    const res = await api.get(`/parties/${id}`);
    return res.data;
  },

  createParty: async (data: Partial<Party>) => {
    const res = await api.post('/parties', data);
    return res.data;
  },

  updateParty: async (id: string, data: Partial<Party>) => {
    const res = await api.patch(`/parties/${id}`, data);
    return res.data;
  },

  deleteParty: async (id: string) => {
    const res = await api.delete(`/parties/${id}`);
    return res.data;
  },

  getCustomers: async () => {
    const res = await api.get('/sales/customers');
    return res.data.customers;
  }
};
