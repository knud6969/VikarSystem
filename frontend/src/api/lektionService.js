import { api } from './client';

/**
 * Lektion-service: indkapsler alle kald til /lektioner endpoints.
 */
export const lektionService = {
  getAll:       ()       => api.get('/lektioner'),
  getById:      (id)     => api.get(`/lektioner/${id}`),
  getForVikar:  (id)     => api.get(`/lektioner/vikar/${id}`),
  create:       (data)   => api.post('/lektioner', data),
  delete:       (id)     => api.delete(`/lektioner/${id}`),
};
