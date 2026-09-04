import api from '../utils/api';

export const reportService = {
  getMeta: async () => {
    const res = await api.get('/admin/reports/meta');
    return res.data;
  },

  getArchive: async () => {
    const res = await api.get('/admin/reports/archive');
    return res.data.files;
  },

  generatePdf: (scope: string, start?: string, end?: string) => {
    const params = new URLSearchParams();
    params.append('scope', scope);
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    window.open(`/api/admin/reports.pdf?${params.toString()}`, '_blank');
  },

  downloadArchive: (id: string) => {
    window.open(`/api/admin/reports/archive/${id}/download`, '_blank');
  },

  batchDelete: async (ids: string[]) => {
    const res = await api.post('/admin/reports/archive/batch-delete', { ids });
    return res.data;
  },

  getDayEnd: async (date?: string) => {
    const res = await api.get('/sales/reports/day-end', { params: { date } });
    return res.data;
  }
};
