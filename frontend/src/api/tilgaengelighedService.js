import { api } from './client';

/**
 * Tilgængelighed-service: indkapsler alle kald til /tilgaengelighed endpoints.
 */
export const tilgaengelighedService = {
  getMin: ()       => api.get('/tilgaengelighed/min'),
  saet:   (data)   => api.post('/tilgaengelighed', data),  // data kan inkl. kommentar
  delete: (id)     => api.delete(`/tilgaengelighed/${id}`),
};