import { api } from './client';

export const timerService = {
  getMine:       (maaned) => api.get(`/timer/mine?maaned=${maaned}`),
  getAlleAdmin:   (maaned) => api.get(`/timer/admin?maaned=${maaned}`),
  getVikarAdmin: (vikarId, maaned) => api.get(`/timer/admin/${vikarId}?maaned=${maaned}`),
};
