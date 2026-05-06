import { createContext, useContext, useEffect, useState } from 'react';
import api, { setAuthToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const t = localStorage.getItem('crms_token');
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    setAuthToken(t);
    try {
      const { data: body } = await api.get('/auth/me');
      setUser(body.data.user);
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function login(token, u) {
    setAuthToken(token);
    setUser(u);
  }

  function logout() {
    setAuthToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
