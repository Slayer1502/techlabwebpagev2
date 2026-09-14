import api from '../utils/api';

export interface CommunicationEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  channel: string;
  direction: string;
  subject: string;
  body: string;
  sent_by: string;
  sent_by_name: string;
  created_at: string;
}

export const communicationService = {
  listForEntity: async (entityType: string, entityId: string) => {
    const res = await api.get(`/admin/communications/${entityType}/${entityId}`);
    return res.data.communications as CommunicationEntry[];
  },
  create: async (data: Partial<CommunicationEntry>) => {
    const res = await api.post('/admin/communications', data);
    return res.data.communication as CommunicationEntry;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/admin/communications/${id}`);
    return res.data;
  },
};
