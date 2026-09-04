import api from '../utils/api';
import { Product } from '../types';

export const productService = {
  getPublicProducts: async (page = 1, limit = 1000) => {
    const res = await api.get(`/public/products?page=${page}&limit=${limit}`);
    return res.data;
  },

  getStaffProducts: async (page = 1, limit = 1000) => {
    // Note: In current backend implementation, staff dashboard returns products.
    // We might need a dedicated staff product list endpoint if not already there.
    // For now, we'll use the public one as a base or dashboard data.
    const res = await api.get('/sales/dashboard');
    return res.data.products as Product[];
  },

  createProduct: async (data: Partial<Product>) => {
    const res = await api.post('/staff/products', data);
    return res.data;
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    const res = await api.patch(`/staff/products/${id}`, data);
    return res.data;
  },

  deleteProduct: async (id: string) => {
    const res = await api.delete(`/staff/products/${id}`);
    return res.data;
  },

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/staff/products/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.imageUrl;
  },

  generateAIImage: async (name: string, type: string, description?: string) => {
    const res = await api.post('/staff/products/generate-ai', { name, type, description });
    return res.data.imageUrl;
  }
};
