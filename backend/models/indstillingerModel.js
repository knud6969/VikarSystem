const pool = require('../config/db');

const IndstillingerModel = {
  async get(key) {
    const result = await pool.query('SELECT value FROM indstillinger WHERE key = $1', [key]);
    return result.rows[0]?.value ?? null;
  },

  async getAlle() {
    const result = await pool.query('SELECT key, value FROM indstillinger ORDER BY key');
    return result.rows;
  },

  async set(key, value) {
    await pool.query(`
      INSERT INTO indstillinger (key, value) VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [key, String(value)]);
  },
};

module.exports = IndstillingerModel;
