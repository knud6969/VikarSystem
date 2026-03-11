import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../api/authService';

const AuthContext = createContext(null);

/**
 * AuthProvider: holder styr på indlogget bruger og JWT-token.
 * Eksponerer login(), logout() og bruger-objekt til hele appen.
 */
export function AuthProvider({ children }) {
  const [bruger, setBruger]     = useState(null);
  const [loading, setLoading]   = useState(true);

  // Gendan session fra localStorage ved reload
  useEffect(() => {
    const token = localStorage.getItem('token');
    const gemt  = localStorage.getItem('bruger');
    if (token && gemt) {
      setBruger(JSON.parse(gemt));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('token',  data.token);
    localStorage.setItem('bruger', JSON.stringify(data.bruger));
    setBruger(data.bruger);
    return data.bruger;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('bruger');
    setBruger(null);
  }, []);

  return (
    <AuthContext.Provider value={{ bruger, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook til nem adgang til auth-context.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth skal bruges inden i AuthProvider');
  return ctx;
}
