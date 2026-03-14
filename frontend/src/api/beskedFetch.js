// Delt hjælpefunktion til besked-fetch med JWT
// Bruges i LaererLektionerPage og VikarLektionerPage

const API = import.meta.env.VITE_API_URL ?? '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchLektionerMedBeskeder(ids) {
  if (!ids.length) return [];
  const res = await fetch(
    `${API}/beskeder/lektioner-med-beskeder?ids=${ids.join(',')}`,
    { headers: authHeaders() }
  );
  if (!res.ok) return [];
  return res.json();
}