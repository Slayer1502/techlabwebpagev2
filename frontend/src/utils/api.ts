import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handle global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const publicPaths = ['/', '/login', '/products', '/services'];
    const currentPath = window.location.pathname;

    if (error.response?.status === 401 && !publicPaths.includes(currentPath)) {
      // Auto logout only if we are NOT on a public page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
