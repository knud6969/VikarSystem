import { api } from './client';

/**
 * Auth-service: indkapsler alle kald til /auth endpoints.
 */
export const authService = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  me: () =>
    api.get('/auth/me'),
};
