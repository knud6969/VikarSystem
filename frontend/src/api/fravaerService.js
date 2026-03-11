import { api } from './client';

/**
 * Fravær-service: indkapsler alle kald til /fravaer endpoints.
 */
export const fravaerService = {
  getAll: ()           => api.get('/fravaer'),
  opret:  (data)       => api.post('/fravaer', data),
  afslut: (id, body)   => api.patch(`/fravaer/${id}/afslut`, body),
};
