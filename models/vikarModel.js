const pool = require('../config/db');

const VikarModel = {
  async getAll() {
    const result = await pool.query(`
      SELECT v.*, b.email, b.rolle
      FROM vikarer v
      JOIN brugere b ON b.id = v.user_id
      ORDER BY v.name
    `);
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(`
      SELECT v.*, b.email
      FROM vikarer v
      JOIN brugere b ON b.id = v.user_id
      WHERE v.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async getByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM vikarer WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Finder ledige vikarer i et givent tidsrum (User Story 3).
   * En vikar er ledig hvis:
   * - De har en tilgaengelighed-post der dækker tidsrummet med status 'ledig'
   * - De IKKE allerede er tildelt en lektion i det tidsrum
   */
  async getLedigI({ dato, startTid, slutTid }) {
    const result = await pool.query(`
      SELECT DISTINCT v.id, v.name, v.phone, b.email
      FROM vikarer v
      JOIN brugere b ON b.id = v.user_id
      JOIN tilgaengelighed t ON t.substitute_id = v.id
      WHERE t.date = $1
        AND t.start_time <= $2
        AND t.end_time   >= $3
        AND t.status = 'ledig'
        AND v.id NOT IN (
          SELECT ti.substitute_id
          FROM tildelinger ti
          JOIN lektioner l ON l.id = ti.lesson_id
          WHERE l.start_time < ($1::date + $3::time)::timestamp
            AND l.end_time   > ($1::date + $2::time)::timestamp
        )
      ORDER BY v.name
    `, [dato, startTid, slutTid]);
    return result.rows;
  },
};

module.exports = VikarModel;