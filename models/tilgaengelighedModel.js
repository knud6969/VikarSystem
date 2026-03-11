const pool = require('../config/db');

const TilgaengelighedModel = {
  /**
   * Henter al tilgængelighed for en specifik vikar.
   */
  async getForVikar(vikarId) {
    const result = await pool.query(`
      SELECT * FROM tilgaengelighed
      WHERE substitute_id = $1
        AND date >= CURRENT_DATE
      ORDER BY date, start_time
    `, [vikarId]);
    return result.rows;
  },

  /**
   * Opretter eller opdaterer tilgængelighed for en vikar på en given dag.
   * (User Story 6)
   */
  async saet({ substitute_id, date, start_time, end_time, status }) {
    const result = await pool.query(`
      INSERT INTO tilgaengelighed (substitute_id, date, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (substitute_id, date, start_time)
      DO UPDATE SET end_time = $4, status = $5
      RETURNING *
    `, [substitute_id, date, start_time, end_time, status]);
    return result.rows[0];
  },

  async delete(id, vikarId) {
    const result = await pool.query(
      'DELETE FROM tilgaengelighed WHERE id = $1 AND substitute_id = $2',
      [id, vikarId]
    );
    return result.rowCount > 0;
  },
};

module.exports = TilgaengelighedModel;