const pool = require('../config/db');

const NotifikationModel = {
  /**
   * Opretter én notifikation.
   */
  async opret({ bruger_id, type, titel, besked, link }) {
    const result = await pool.query(`
      INSERT INTO notifikationer (bruger_id, type, titel, besked, link)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [bruger_id, type, titel, besked ?? null, link ?? null]);
    return result.rows[0];
  },

  /**
   * Henter notifikationer for én bruger (max 30 dage gamle).
   * Ulæste øverst, derefter nyeste.
   */
  async getForBruger(bruger_id) {
    const result = await pool.query(`
      SELECT *
      FROM notifikationer
      WHERE bruger_id   = $1
        AND oprettet_at >= NOW() - INTERVAL '30 days'
      ORDER BY laest ASC, oprettet_at DESC
      LIMIT 100
    `, [bruger_id]);
    return result.rows;
  },

  /**
   * Markerer én notifikation som læst (tjekker ejerskab).
   */
  async markerLaest(id, bruger_id) {
    const result = await pool.query(`
      UPDATE notifikationer
      SET laest = TRUE
      WHERE id = $1 AND bruger_id = $2
      RETURNING *
    `, [id, bruger_id]);
    return result.rows[0] ?? null;
  },
};

module.exports = NotifikationModel;
