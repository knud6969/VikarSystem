const pool = require('../config/db');

const LoenkoerselModel = {
  async getForMaaned(maaned) {
    const result = await pool.query(`
      SELECT lk.*, b.email AS koert_af_email
      FROM loenkoersel lk
      JOIN brugere b ON b.id = lk.koert_af
      WHERE lk.maaned = $1
    `, [maaned]);
    return result.rows[0] ?? null;
  },

  async getAlle() {
    const result = await pool.query(`
      SELECT lk.*, b.email AS koert_af_email
      FROM loenkoersel lk
      JOIN brugere b ON b.id = lk.koert_af
      ORDER BY lk.maaned DESC
    `);
    return result.rows;
  },

  async annuller(maaned) {
    const result = await pool.query(
      'DELETE FROM loenkoersel WHERE maaned = $1 RETURNING *',
      [maaned]
    );
    return result.rowCount > 0;
  },

  async koer(maaned, adminId) {
    const result = await pool.query(`
      INSERT INTO loenkoersel (maaned, koert_af)
      VALUES ($1, $2)
      ON CONFLICT (maaned) DO NOTHING
      RETURNING *
    `, [maaned, adminId]);
    return result.rows[0] ?? null;
  },
};

module.exports = LoenkoerselModel;
