import { api } from './client';

/**
 * Lærer-service: indkapsler alle kald til /laerere endpoints.
 */
export const laererService = {
  getAll:    ()              => api.get('/laerere'),
  getById:   (id)            => api.get(`/laerere/${id}`),
  create:    (data)          => api.post('/laerere', data),
  update:    (id, data)      => api.put(`/laerere/${id}`, data),
  delete:    (id)            => api.delete(`/laerere/${id}`),
};
