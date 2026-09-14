import api from '../utils/api';

export interface QuotationVersion {
  id: string;
  quote_id: string;
  version_number: number;
  data_snapshot: any;
  created_by: string;
  created_at: string;
}

export const quotationVersionService = {
  list: async (quoteId: string) => {
    const res = await api.get(`/sales/quotations/${quoteId}/versions`);
    return res.data.versions as QuotationVersion[];
  },
  get: async (quoteId: string, version: number) => {
    const res = await api.get(`/sales/quotations/${quoteId}/versions/${version}`);
    return res.data.version as QuotationVersion;
  },
};
