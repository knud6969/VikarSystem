import { api } from './client';

export const loenkoerselService = {
  get:       (maaned) => api.get(`/loenkoersel?maaned=${maaned}`),
  getAlle:    ()       => api.get('/loenkoersel'),
  koer:      (maaned) => api.post('/loenkoersel', { maaned }),
  annuller:  (maaned) => api.delete(`/loenkoersel/${maaned}`),
};
