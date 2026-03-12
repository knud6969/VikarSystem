const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Centralt HTTP-klient-lag.
 * Tilføjer automatisk Authorization-header fra localStorage.
 * Kaster fejl med besked fra API'et hvis status >= 400.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Ukendt fejl fra server');
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  get:    (endpoint)         => request(endpoint, { method: 'GET' }),
  post:   (endpoint, body)   => request(endpoint, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (endpoint, body)   => request(endpoint, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    (endpoint, body)   => request(endpoint, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (endpoint)         => request(endpoint, { method: 'DELETE' }),
};
