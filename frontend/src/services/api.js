import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Campaigns
export const campaignApi = {
  getAll: () => api.get('/campaigns'),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  getRecipients: (id) => api.get(`/campaigns/${id}/recipients`),
  send: (id) => api.post(`/campaigns/${id}/send`),
  getStats: (id) => api.get(`/campaigns/${id}/stats`),
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

// Health check
export const healthCheck = () => api.get('/health');

export default api;
