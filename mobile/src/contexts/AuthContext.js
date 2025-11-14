import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing token on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        // Set token in API client
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestMagicLink = async (email) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to send login link');
      throw error;
    }
  };

  const verifyMagicLink = async (token) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await api.post('/auth/verify', { token });
      const { token: authToken, user: userData } = response.data;
      
      // Store auth data securely
      await SecureStore.setItemAsync('authToken', authToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      
      // Set token in API client
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      setUser(userData);
      return userData;
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Invalid or expired token');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      // Call logout endpoint
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear local data
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userData');
    delete api.defaults.headers.common['Authorization'];
    
    setUser(null);
    setLoading(false);
  };

  const updateUserData = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    error,
    requestMagicLink,
    verifyMagicLink,
    logout,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
