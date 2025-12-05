import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (except for auth endpoints)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Campaigns
export const campaignApi = {
  getAll: () => api.get('/campaigns'),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  duplicate: (id) => api.post(`/campaigns/${id}/duplicate`),
  reset: (id) => api.post(`/campaigns/${id}/reset`),
  getRecipients: (id) => api.get(`/campaigns/${id}/recipients`),
  addRecipients: (id, contactIds) => api.post(`/campaigns/${id}/recipients`, { contact_ids: contactIds }),
  send: (id, emailAccountId) => api.post(`/campaigns/${id}/send`, { email_account_id: emailAccountId }),
  getStats: (id) => api.get(`/campaigns/${id}/stats`),
  getProgress: (id) => api.get(`/campaigns/${id}/progress`),
};

// Contacts
export const contactApi = {
  getAll: (params) => api.get('/contacts', { params }),
  getById: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  bulkDelete: (ids) => api.post('/contacts/bulk-delete', { ids }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  unsubscribe: (id) => api.post(`/contacts/${id}/unsubscribe`),
  getGroups: () => api.get('/contacts/groups'),
  createGroup: (data) => api.post('/contacts/groups', data),
  getCompanies: () => api.get('/contacts/companies'),
};

// Templates
export const templateApi = {
  getAll: () => api.get('/templates'),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
  duplicate: (id) => api.post(`/templates/${id}/duplicate`),
  preview: (id, data) => api.post(`/templates/${id}/preview`, data),
};

// Emails
export const emailApi = {
  getLogs: (params) => api.get('/emails/logs', { params }),
  getStats: () => api.get('/emails/stats'),
  sendTest: (data) => api.post('/emails/test', data),
  verifySMTP: () => api.get('/emails/verify-smtp'),
  send: (data) => api.post('/emails/send', data),
};

// Email Accounts
export const emailAccountApi = {
  getAll: () => api.get('/email-accounts'),
  getById: (id) => api.get(`/email-accounts/${id}`),
  create: (data) => api.post('/email-accounts', data),
  update: (id, data) => api.put(`/email-accounts/${id}`, data),
  delete: (id) => api.delete(`/email-accounts/${id}`),
  test: (id, testEmail) => api.post(`/email-accounts/${id}/test`, { test_email: testEmail }),
  setDefault: (id) => api.post(`/email-accounts/${id}/set-default`),
};

// Email Settings (Header/Footer)
export const emailSettingsApi = {
  getAll: () => api.get('/email-settings'),
  get: (key) => api.get(`/email-settings/${key}`),
  update: (key, value) => api.put(`/email-settings/${key}`, { value }),
  updateMultiple: (settings) => api.put('/email-settings', settings),
  preview: (body, includeHeaderFooter = true) => api.post('/email-settings/preview', { body, includeHeaderFooter }),
  reset: () => api.post('/email-settings/reset'),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
