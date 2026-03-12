const pool = require('../config/db');

const FravaerModel = {
  async getAll() {
    const result = await pool.query(`
      SELECT f.*, la.name AS laerer_navn, b.email AS oprettet_af_email
      FROM fravaer f
      JOIN laerere la ON la.id = f.teacher_id
      JOIN brugere b  ON b.id  = f.oprettet_af
      ORDER BY f.created_at DESC
    `);
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(`
      SELECT f.*, la.name AS laerer_navn
      FROM fravaer f
      JOIN laerere la ON la.id = f.teacher_id
      WHERE f.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async opretMedLektioner({ teacher_id, type, start_date, end_date, oprettet_af }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fravaerRes = await client.query(`
        INSERT INTO fravaer (teacher_id, type, start_date, end_date, oprettet_af)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [teacher_id, type, start_date, end_date, oprettet_af]);

      const fravaer = fravaerRes.rows[0];

      await client.query(
        'UPDATE laerere SET status = $1 WHERE id = $2',
        [type === 'syg' ? 'syg' : 'fraværende', teacher_id]
      );

      const lektionerRes = await client.query(`
        UPDATE lektioner
        SET status = 'udækket'
        WHERE teacher_id        = $1
          AND DATE(start_time) >= $2
          AND DATE(start_time) <= $3
          AND status            = 'normal'
        RETURNING id
      `, [teacher_id, start_date, end_date]);

      await client.query('COMMIT');

      return {
        fravaer,
        udaekkedeLektioner: lektionerRes.rows.length,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async afslutMedLektioner(id, { bevarTildelinger = false }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fravaerRes = await client.query(
        'SELECT * FROM fravaer WHERE id = $1',
        [id]
      );
      const fravaer = fravaerRes.rows[0];
      if (!fravaer) throw new Error('Fravær ikke fundet');

      // end_date = i går, så læreren ikke fremstår fraværende resten af i dag
      await client.query(
        'UPDATE fravaer SET end_date = CURRENT_DATE - 1 WHERE id = $1',
        [id]
      );

      await client.query(
        "UPDATE laerere SET status = 'aktiv' WHERE id = $1",
        [fravaer.teacher_id]
      );

      // DATE(start_time) >= CURRENT_DATE normaliserer også lektioner
      // der allerede er startet i dag (ikke kun fremtidige)
      const lektionerRes = await client.query(`
        UPDATE lektioner
        SET status = 'normal'
        WHERE teacher_id         = $1
          AND DATE(start_time)  >= CURRENT_DATE
          AND status             = 'udækket'
        RETURNING id
      `, [fravaer.teacher_id]);

      if (!bevarTildelinger && lektionerRes.rows.length > 0) {
        const ids = lektionerRes.rows.map(r => r.id);
        await client.query(
          'DELETE FROM tildelinger WHERE lesson_id = ANY($1::int[])',
          [ids]
        );
      }

      await client.query('COMMIT');

      return {
        normaliseredelektioner: lektionerRes.rows.length,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = FravaerModel;