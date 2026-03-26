import { api } from './client';

export const notifikationService = {
  getForMig:    ()   => api.get('/notifikationer'),
  markerLaest:  (id) => api.patch(`/notifikationer/${id}/laest`, {}),
};
