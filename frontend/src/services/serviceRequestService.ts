import api from '../utils/api';
import { ServiceRequest } from '../types';

export const serviceRequestService = {
  getRequests: async (role: string) => {
    const res = await api.get(`/${role}/dashboard`);
    return res.data.requests as ServiceRequest[];
  },

  getRequestsForLinking: async (search: string = '') => {
    const res = await api.get('/sales/service-requests/list', { params: { search } });
    return res.data.requests as ServiceRequest[];
  },

  createRequest: async (data: Partial<ServiceRequest>) => {
    const res = await api.post('/sales/service-requests', data);
    return res.data;
  },

  assignTechnician: async (id: string, technicianId: string, technicianName: string) => {
    const res = await api.patch(`/sales/service-requests/${id}/assign`, { technicianId, technicianName });
    return res.data;
  },

  cancelRequest: async (id: string, reason: string) => {
    const res = await api.patch(`/sales/service-requests/${id}/cancel`, { reason });
    return res.data;
  },

  completeJob: async (id: string, data: any) => {
    const res = await api.post(`/technician/service-requests/${id}/complete`, data);
    return res.data;
  },

  updateJobProgress: async (id: string, data: any) => {
    const res = await api.patch(`/technician/service-requests/${id}/job-progress`, data);
    return res.data;
  },

  updateNotes: async (id: string, notes: string) => {
    const res = await api.patch(`/sales/service-requests/${id}/notes`, { notes });
    return res.data;
  },

  getSurvey: async (id: string) => {
    const res = await api.get(`/technician/service-requests/${id}/survey`);
    return res.data.survey;
  },

  getSalesSurvey: async (id: string) => {
    const res = await api.get(`/sales/service-requests/${id}/survey`);
    return res.data.survey;
  },

  getQuotationsForRequest: async (id: string) => {
    const res = await api.get(`/sales/service-requests/${id}/quotations`);
    return res.data;
  },

  submitSurvey: async (id: string, formData: FormData) => {
    const res = await api.post(`/technician/service-requests/${id}/survey`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  requestParts: async (id: string, data: { inventory: any[]; procurement: string }) => {
    const res = await api.patch(`/technician/service-requests/${id}/parts`, data);
    return res.data;
  },

  markPartsCollected: async (id: string) => {
    const res = await api.patch(`/technician/service-requests/${id}/part-collected`);
    return res.data;
  },

  recordChallanReturn: async (id: string, returns: any) => {
    const res = await api.post(`/technician/service-requests/${id}/challan-return`, { returns });
    return res.data;
  },

  markPartsAvailable: async (id: string) => {
    const res = await api.patch(`/sales/service-requests/${id}/part-ready`);
    return res.data;
  }
};
