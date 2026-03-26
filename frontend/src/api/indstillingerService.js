import { api } from './client';

export const indstillingerService = {
  getTimesatser: ()      => api.get('/indstillinger/timesat'),
  setTimesatser: (body)  => api.put('/indstillinger/timesat', body),
};
