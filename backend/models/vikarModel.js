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
   *
   * En vikar er ledig hvis:
   *   1. De har tilgængelighed der dækker tidsrummet med status 'ledig'
   *   2. De IKKE allerede har en tildelt lektion der overlapper tidsrummet
   *
   * Overlap-logik: To intervaller [A_start, A_slut] og [B_start, B_slut] overlapper hvis:
   *   A_start < B_slut OG A_slut > B_start
   *
   * Parametre: dato='2026-03-13', startTid='08:00', slutTid='08:45'
   */
  async getLedigI({ dato, startTid, slutTid }) {
    const result = await pool.query(`
      SELECT DISTINCT v.id, v.name, v.phone, b.email
      FROM vikarer v
      JOIN brugere b         ON b.id = v.user_id
      JOIN tilgaengelighed t ON t.substitute_id = v.id
      WHERE t.date       = $1
        AND t.start_time <= $2::time
        AND t.end_time   >= $3::time
        AND t.status     = 'ledig'
        -- Ikke allerede tildelt en lektion der overlapper tidsrummet
        AND v.id NOT IN (
          SELECT ti.substitute_id
          FROM tildelinger ti
          JOIN lektioner l ON l.id = ti.lesson_id
          WHERE DATE(l.start_time) = $1
            AND l.start_time::time < $3::time
            AND l.end_time::time   > $2::time
        )
        -- Ikke markeret utilgængelig i et overlappende tidsrum
        AND v.id NOT IN (
          SELECT opt.substitute_id
          FROM tilgaengelighed opt
          WHERE opt.date       = $1
            AND opt.status     = 'optaget'
            AND opt.start_time < $3::time
            AND opt.end_time   > $2::time
        )
      ORDER BY v.name
    `, [dato, startTid, slutTid]);
    return result.rows;
  },
};

module.exports = VikarModel;