import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token && !config.url.includes('/auth/')) {
      config.headers.Authorization = `Bearer ${token}`;
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

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear auth data and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
      
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
export const authAPI = {
  requestMagicLink: (email) => api.post('/auth/login', { email }),
  verifyMagicLink: (token) => api.post('/auth/verify', { token }),
  logout: () => api.post('/auth/logout'),
};

export const dashboardAPI = {
  getDashboard: (period = '7') => api.get('/admin/dashboard', { params: { period } }),
  getHeatmap: (params) => api.get('/admin/heatmap', { params }),
  getAlerts: (params) => api.get('/admin/alerts', { params }),
  updateAlert: (alertId, data) => api.put(`/admin/alerts/${alertId}`, data),
  getInterventionEffectiveness: (params) => api.get('/admin/interventions/effectiveness', { params }),
  getComplianceReport: (params) => api.get('/admin/compliance-report', { params }),
  getEmployeeDetails: (employeeId) => api.get(`/admin/employees/${employeeId}`),
  sendWeeklySummary: () => api.post('/admin/send-weekly-summary'),
};

export const employeesAPI = {
  getEmployees: (params) => api.get('/admin/employees', { params }),
  getEmployeeHistory: (employeeId, params) => api.get(`/admin/employees/${employeeId}/history`, { params }),
  updateEmployee: (employeeId, data) => api.put(`/admin/employees/${employeeId}`, data),
};

export const reportsAPI = {
  generateReport: (type, params) => api.post(`/admin/reports/${type}`, params),
  getScheduledReports: () => api.get('/admin/reports/scheduled'),
  downloadReport: (reportId) => api.get(`/admin/reports/${reportId}/download`, { responseType: 'blob' }),
};

export const settingsAPI = {
  getCompanySettings: () => api.get('/admin/settings/company'),
  updateCompanySettings: (data) => api.put('/admin/settings/company', data),
  getIntegrations: () => api.get('/admin/settings/integrations'),
  testIntegration: (integration) => api.post(`/admin/settings/integrations/${integration}/test`),
};

export default api;
