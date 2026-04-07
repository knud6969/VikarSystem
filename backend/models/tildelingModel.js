const pool = require('../config/db');

const TildelingModel = {
  async getAll() {
    const result = await pool.query(`
      SELECT ti.*, v.name AS vikar_navn, v.phone AS vikar_phone,
             bv.email AS vikar_email, bv.personal_email AS vikar_personal_email,
             l.subject, l.start_time, l.end_time,
             b.email AS tildelt_af_email
      FROM tildelinger ti
      JOIN vikarer v   ON v.id  = ti.substitute_id
      JOIN brugere bv  ON bv.id = v.user_id
      JOIN lektioner l ON l.id  = ti.lesson_id
      JOIN brugere b   ON b.id  = ti.tildelt_af
      ORDER BY ti.assigned_at DESC
    `);
    return result.rows;
  },

  /**
   * Tildeler en vikar til en lektion og opdaterer lektionens status til 'dækket'.
   * Kører i transaktion. (User Story 4)
   */
  async tildel({ lesson_id, substitute_id, tildelt_af }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Tjek at lektionen er udækket
      const lektionRes = await client.query(
        "SELECT * FROM lektioner WHERE id = $1 AND status = 'udækket'",
        [lesson_id]
      );
      if (lektionRes.rows.length === 0) {
        throw new Error('Lektionen er ikke udækket eller eksisterer ikke');
      }

      // Opret tildeling
      const tildelingRes = await client.query(`
        INSERT INTO tildelinger (lesson_id, substitute_id, tildelt_af)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [lesson_id, substitute_id, tildelt_af]);

      // Opdater lektionsstatus til 'dækket'
      await client.query(
        "UPDATE lektioner SET status = 'dækket' WHERE id = $1",
        [lesson_id]
      );

      await client.query('COMMIT');
      return tildelingRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Fjerner en tildeling og sætter lektionen tilbage til 'udækket'.
   */
  async fjern(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tildelingRes = await client.query(
        'DELETE FROM tildelinger WHERE id = $1 RETURNING *',
        [id]
      );
      if (tildelingRes.rows.length === 0) throw new Error('Tildeling ikke fundet');

      await client.query(
        "UPDATE lektioner SET status = 'udækket' WHERE id = $1",
        [tildelingRes.rows[0].lesson_id]
      );

      await client.query('COMMIT');
      return tildelingRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = TildelingModel;