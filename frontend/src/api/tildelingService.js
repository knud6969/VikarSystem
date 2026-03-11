import { api } from './client';

/**
 * Tildeling-service: indkapsler alle kald til /tildelinger endpoints.
 */
export const tildelingService = {
  getAll: ()                           => api.get('/tildelinger'),
  tildel: (lesson_id, substitute_id)   =>
    api.post('/tildelinger', { lesson_id, substitute_id }),
  fjern:  (id)                         => api.delete(`/tildelinger/${id}`),
};
