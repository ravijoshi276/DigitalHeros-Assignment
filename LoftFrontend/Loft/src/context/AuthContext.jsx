import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import client, { clearTokens, setTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(false);  

  /* Fetch current user from /auth/users/me/ */
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await client.get('/auth/users/me/');
      setUser(data);
    } catch {
      setUser(null);
      clearTokens(); // Best practice: Clear bad tokens if user fetch fails
    }
  }, []);

  /* On mount — if a token exists, restore the session */
  useEffect(() => {
    const token = localStorage.getItem('access');
    if (token) {
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  /* Login — POST /auth/jwt/create/ */
  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/auth/jwt/create/', { email, password });
    setTokens(data.access, data.refresh);
    await fetchUser();
  }, [fetchUser]);

  /* Register — POST /auth/users/ then auto-login */
  const register = useCallback(async (payload) => {
    await client.post('/auth/users/', payload);
    await login(payload.email, payload.password);
  }, [login]);

  /* Logout — clear tokens + user state */
  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const isAdmin = user?.is_staff ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, fetchUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

/* eslint-disable react-refresh/only-export-components */
export const useAuth = () => useContext(AuthContext);
