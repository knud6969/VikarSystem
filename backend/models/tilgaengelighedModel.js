const pool = require('../config/db');

const TilgaengelighedModel = {
  /**
   * Henter al tilgængelighed for en specifik vikar.
   * Returnerer ALLE (ledig + optaget) så vikarsiden kan vise utilgængeligheder.
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
   * Opretter eller opdaterer tilgængelighed/utilgængelighed for en vikar.
   * Understøtter kommentar-felt til utilgængeligheder.
   * (User Story 6)
   */
  async saet({ substitute_id, date, start_time, end_time, status, kommentar = null }) {
    const result = await pool.query(`
      INSERT INTO tilgaengelighed (substitute_id, date, start_time, end_time, status, kommentar)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (substitute_id, date, start_time)
      DO UPDATE SET
        end_time  = $4,
        status    = $5,
        kommentar = $6
      RETURNING *
    `, [substitute_id, date, start_time, end_time, status, kommentar]);
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