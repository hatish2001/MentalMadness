import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing auth on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Only allow admin users
        if (parsedUser.isAdmin) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          enqueueSnackbar('Access denied. Admin privileges required.', { variant: 'error' });
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    setLoading(false);
  };

  const requestMagicLink = async (email) => {
    setError(null);
    try {
      const response = await authAPI.requestMagicLink(email);
      enqueueSnackbar(response.data.message, { variant: 'info' });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to send login link';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  };

  const verifyMagicLink = async (token) => {
    setError(null);
    setLoading(true);

    try {
      const response = await authAPI.verifyMagicLink(token);
      const { token: authToken, user: userData } = response.data;

      // Check if user is admin
      if (!userData.isAdmin) {
        throw new Error('Access denied. Admin privileges required.');
      }

      // Store auth data
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      setUser(userData);
      enqueueSnackbar('Successfully logged in!', { variant: 'success' });
      navigate('/dashboard');
      
      return userData;
    } catch (error) {
      const message = error.message || error.response?.data?.error?.message || 'Invalid or expired token';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear local data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    navigate('/login');
    enqueueSnackbar('Successfully logged out', { variant: 'info' });
  };

  const value = {
    user,
    loading,
    error,
    requestMagicLink,
    verifyMagicLink,
    logout,
    isAdmin: user?.isAdmin || false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
