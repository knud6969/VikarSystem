import { api } from './client';

/**
 * Vikar-service: indkapsler alle kald til /vikarer endpoints.
 */
export const vikarService = {
  getAll:    ()                           => api.get('/vikarer'),
  getById:   (id)                         => api.get(`/vikarer/${id}`),
  getLedige: (dato, start, slut)          =>
    api.get(`/vikarer/ledige?dato=${dato}&start=${start}&slut=${slut}`),
};
