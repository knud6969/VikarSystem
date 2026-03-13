import { api } from './client';

export const vikarService = {
  getAll:    ()                           => api.get('/vikarer'),
  getMig:    ()                           => api.get('/vikarer/mig'),
  getById:   (id)                         => api.get(`/vikarer/${id}`),
  getLedige: (dato, start, slut)          =>
    api.get(`/vikarer/ledige?dato=${dato}&start=${start}&slut=${slut}`),
};