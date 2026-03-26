import { api } from './client';

/**
 * Fravær-service: indkapsler alle kald til /fravaer endpoints.
 */
export const fravaerService = {
  getAll:          ()           => api.get('/fravaer'),
  getForLaerer:    (teacher_id) => api.get(`/fravaer?teacher_id=${teacher_id}`),
  opret:           (data)       => api.post('/fravaer', data),
  afslut:          (id, body)   => api.patch(`/fravaer/${id}/afslut`, body),
};
