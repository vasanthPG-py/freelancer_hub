import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, TOKEN_KEYS } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem(TOKEN_KEYS.USER);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Synchronize user profile on app mount if tokens exist
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEYS.ACCESS);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(userData));
    } catch {
      // If refresh fails, tokens were already cleared by apiFetch
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen for session expiry event dispatched by api.js
    const handleAuthExpired = () => {
      setUser(null);
      setError('Your session has expired. Please sign in again.');
    };

    window.addEventListener('fh:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('fh:auth-expired', handleAuthExpired);
  }, [refreshUser]);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authAPI.login(email, password);
      setUser(res.user);
      return res.user;
    } catch (err) {
      const msg = err.data?.errors?.non_field_errors?.[0] ||
                  err.data?.message ||
                  err.message ||
                  'Login failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (payload) => {
    setError(null);
    try {
      const res = await authAPI.register(payload);
      setUser(res.user);
      return res.user;
    } catch (err) {
      let msg = 'Registration failed.';
      if (err.data?.errors) {
        const firstKey = Object.keys(err.data.errors)[0];
        msg = `${firstKey}: ${err.data.errors[firstKey][0]}`;
      } else if (err.data?.message) {
        msg = err.data.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedFields };
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(next));
      return next;
    });
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isCustomer: user?.role === 'CUSTOMER',
    isFreelancer: user?.role === 'FREELANCER',
    loading,
    error,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
