import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// API base URL - in production, this would be your deployed backend URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Skip auth header for login and verify endpoints
    if (!config.url.includes('/auth/login') && !config.url.includes('/auth/verify')) {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear auth data and redirect to login
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
      
      // In a real app, you'd trigger a navigation to login screen
      // This would be handled by the auth context
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }

    return Promise.reject(error);
  }
);

// API methods
const apiMethods = {
  // Auth
  requestMagicLink: (email) => api.post('/auth/login', { email }),
  verifyMagicLink: (token) => api.post('/auth/verify', { token }),
  logout: () => api.post('/auth/logout'),

  // Check-ins
  createCheckIn: (data) => api.post('/checkins', data),
  getCheckInHistory: (params) => api.get('/checkins/history', { params }),
  getCheckIn: (id) => api.get(`/checkins/${id}`),
  submitInterventionFeedback: (checkinId, data) => 
    api.post(`/checkins/${checkinId}/intervention/feedback`, data),

  // Interventions
  getInterventions: (params) => api.get('/interventions', { params }),
  getIntervention: (id) => api.get(`/interventions/${id}`),
  submitFeedback: (interventionId, data) => 
    api.post(`/interventions/${interventionId}/feedback`, data),
  getInterventionHistory: (params) => 
    api.get('/interventions/history/me', { params }),
  recommendInterventions: (data) => 
    api.post('/interventions/recommend', data),

  // User/Profile
  updateProfile: (data) => api.put('/profile', data),
  updateNotificationSettings: (data) => api.put('/profile/notifications', data),
};

export default api;
export { apiMethods };
