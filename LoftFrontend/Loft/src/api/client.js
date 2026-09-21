import axios from 'axios';

/* Single source of truth for the backend URL — set in .env */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const client = axios.create({ baseURL: BASE_URL });

/* ── Token helpers ───────────────────────────────────────────────────────── */
const getAccess  = () => localStorage.getItem('access');
const getRefresh = () => localStorage.getItem('refresh');
const setTokens  = (access, refresh) => {
  localStorage.setItem('access', access);
  if (refresh) localStorage.setItem('refresh', refresh);
};
const clearTokens = () => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
};

/* ── Request interceptor — attach Bearer token ───────────────────────────── */
client.interceptors.request.use(config => {
  const token = getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ── Response interceptor — silent refresh on 401 ───────────────────────── */
let isRefreshing = false;
let pendingQueue = [];   // requests waiting while token refreshes

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

    /* Only attempt refresh on 401 — and not on the refresh endpoint itself */
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    original._retry = true;

    /* If already refreshing, queue this request until the new token arrives */
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      });
    }

    isRefreshing = true;
    const refresh = getRefresh();

    if (!refresh) {
      clearTokens();
      window.location.replace('/login');
      return Promise.reject(err);
    }

    try {
      /* Use a plain axios call — not the client — to avoid interceptor loop */
      const { data } = await axios.post(`${BASE_URL}/auth/jwt/refresh/`, { refresh });
      setTokens(data.access, data.refresh ?? null);
      flushQueue(data.access);
      original.headers.Authorization = `Bearer ${data.access}`;
      return client(original);
    } catch (refreshErr) {
      flushQueue(null, refreshErr);
      clearTokens();
      window.location.replace('/login');
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export { setTokens, clearTokens, getAccess };
export default client;