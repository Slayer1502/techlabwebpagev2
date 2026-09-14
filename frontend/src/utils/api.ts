import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const publicPaths = ['/', '/login', '/products', '/services'];

const getCsrfToken = (): string | null => {
  const match = document.cookie.match(/(?:^|;\s*)techlab_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

api.interceptors.request.use((config) => {
  if (config.method && !['get', 'head', 'options'].includes(config.method)) {
    const token = getCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<(ok: boolean) => void> = [];

const flushQueue = (ok: boolean) => {
  pendingQueue.forEach((resolve) => resolve(ok));
  pendingQueue = [];
};

// Silently renew the session (via the 30-day refresh cookie) instead of
// immediately booting the user to the login screen on a 401.
const refreshSession = async (): Promise<boolean> => {
  try {
    await api.post('/auth/refresh');
    return true;
  } catch {
    return false;
  }
};

// Response interceptor for global error handling: attempt a silent token
// refresh on 401, retry the failed request once, and only redirect to login
// when the session is truly gone (refresh cookie invalid too).
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const currentPath = window.location.pathname;

    if (
      error.response?.status === 401 &&
      original &&
      !original.url?.includes('/auth/refresh')
    ) {
      if (!publicPaths.includes(currentPath)) {
        if (original._retry) {
          // Already refreshed once and still unauthenticated - session is dead.
          window.location.href = '/login';
        } else {
          original._retry = true;

          if (isRefreshing) {
            // Another request is already refreshing; queue behind it.
            const ok = await new Promise<boolean>((resolve) => pendingQueue.push(resolve));
            if (ok) return api(original);
          } else {
            isRefreshing = true;
            const ok = await refreshSession();
            flushQueue(ok);
            isRefreshing = false;

            if (ok) return api(original);
            window.location.href = '/login';
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;