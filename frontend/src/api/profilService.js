import { api } from './client';

export const profilService = {
  opdaterVikar:   (data) => api.put('/vikarer/mig', data),
  opdaterLaerer:  (data) => api.put('/laerere/mig', data),
  skiftKode:      (data) => api.put('/auth/skift-kode', data),
};
