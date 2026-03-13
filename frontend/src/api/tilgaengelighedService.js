import { api } from './client';

export const tilgaengelighedService = {
  getMin:   ()       => api.get('/tilgaengelighed/min'),
  getAlle:   ()       => api.get('/tilgaengelighed/alle'),
  saet:     (data)   => api.post('/tilgaengelighed', data),
  delete:   (id)     => api.delete(`/tilgaengelighed/${id}`),
};