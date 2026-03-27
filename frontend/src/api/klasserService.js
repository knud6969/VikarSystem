import { api } from './client';
export const klasserService = {
  getAll: () => api.get('/klasser'),
};
