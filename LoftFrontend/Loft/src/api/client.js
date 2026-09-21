import axios from 'axios';

/* Single source of truth for the backend URL — set in .env */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const client = axios.create({ 
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ── Token helpers ───────────────────────────────────────────────────────── */
const getAccess  = () => localStorage.getItem('access');
const getRefresh = () => localStorage.getItem('refresh');

export const setTokens = (access, refresh) => {
  if (access) localStorage.setItem('access', access);
  if (refresh) localStorage.setItem('refresh', refresh);
};

export const clearTokens = () => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
};

/* ── Request interceptor — attach Bearer token ───────────────────────────── */
client.interceptors.request.use(
  config => {
    const token = getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

/* ── Response interceptor — silent refresh on 401 ───────────────────────── */
let isRefreshing = false;
let pendingQueue = [];

const flushQueue = (newToken, error = null) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  );
  pendingQueue = [];
};

client.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;

    /* Only attempt refresh on 401 errors */
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    // Check if the request explicitly opted out of auto-redirection (e.g. public endpoints)
    const skipRedirect = original.skipAuthRedirect || false;
    const refresh = getRefresh();

    /* If there's no refresh token available */
    if (!refresh) {
      clearTokens();
      if (!skipRedirect && !window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
      return Promise.reject(err);
    }

    original._retry = true;

    /* If already refreshing, queue this request until the new token arrives */
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        })
        .catch(queueErr => Promise.reject(queueErr));
    }

    isRefreshing = true;

    try {
      /* Use plain axios to prevent interceptor loops during token refresh */
      const { data } = await axios.post(`${BASE_URL}/auth/jwt/refresh/`, { refresh });
      
      setTokens(data.access, data.refresh ?? null);
      flushQueue(data.access);
      
      original.headers.Authorization = `Bearer ${data.access}`;
      return client(original);
    } catch (refreshErr) {
      flushQueue(null, refreshErr);
      clearTokens();
      
      if (!skipRedirect && !window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export { getAccess };
export default client;