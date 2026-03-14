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

  /**
   * Opretter fravær og markerer relevante lektioner som 'udækket'.
   * Kører i én transaktion.
   * (User Story 1 + 2)
   */
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

      // Opdater lærerens status
      await client.query(
        'UPDATE laerere SET status = $1 WHERE id = $2',
        [type === 'syg' ? 'syg' : 'fraværende', teacher_id]
      );

      // Markér lektioner som udækkede — inkl. lektioner der allerede er startet samme dag
      const lektionerRes = await client.query(`
        UPDATE lektioner
        SET status = 'udækket'
        WHERE teacher_id         = $1
          AND DATE(start_time)  >= $2
          AND DATE(start_time)  <= $3
          AND status             = 'normal'
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

  /**
   * Afslutter fravær (raskmelding) og normaliserer lektioner fra i dag og frem.
   *
   * VIGTIGT — to bevidste valg:
   *
   * 1) end_date sættes til CURRENT_DATE - 1 (i går).
   *    Kalender-tjekket er "end_date >= valgtDag", så hvis end_date = CURRENT_DATE
   *    ville læreren stadig fremstå fraværende resten af i dag.
   *    Med end_date = i går er perioden afsluttet og tjekket slår ikke længere til.
   *
   * 2) Normalisering bruger DATE(start_time) >= CURRENT_DATE (ikke start_time > NOW()).
   *    Den oprindelige betingelse (start_time > NOW()) udelod lektioner der allerede
   *    var startet i dag men ikke afsluttet — de forblev røde. Med DATE-sammenligning
   *    normaliseres ALLE lektioner på og efter raskmeldings-dagen.
   *
   * (User Story 5)
   */
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

      // Sæt end_date til I GÅR så læreren ikke fremstår fraværende resten af i dag
      await client.query(
        "UPDATE fravaer SET end_date = CURRENT_DATE - INTERVAL '1 day' WHERE id = $1",
        [id]
      );

      // Sæt lærer aktiv igen
      await client.query(
        "UPDATE laerere SET status = 'aktiv' WHERE id = $1",
        [fravaer.teacher_id]
      );

      if (bevarTildelinger) {
        // Bevar vikardækning: kun 'udækket' lektioner normaliseres
        // 'dækket' lektioner beholdes med deres vikarer
        await client.query(`
          UPDATE lektioner
          SET status = 'normal'
          WHERE teacher_id        = $1
            AND DATE(start_time) >= CURRENT_DATE
            AND status            = 'udækket'
        `, [fravaer.teacher_id]);
      } else {
        // Fjern alle tildelinger: sæt ALLE fremtidige lektioner (dækket + udækket) til normal
        // og slet tilhørende tildelinger
        const daekkedeRes = await client.query(`
          SELECT id FROM lektioner
          WHERE teacher_id        = $1
            AND DATE(start_time) >= CURRENT_DATE
            AND status            = 'dækket'
        `, [fravaer.teacher_id]);

        if (daekkedeRes.rows.length > 0) {
          const ids = daekkedeRes.rows.map(r => r.id);
          await client.query(
            'DELETE FROM tildelinger WHERE lesson_id = ANY($1::int[])',
            [ids]
          );
          await client.query(`
            UPDATE lektioner SET status = 'normal'
            WHERE id = ANY($1::int[])
          `, [ids]);
        }

        // Normalisér udækkede lektioner
        await client.query(`
          UPDATE lektioner
          SET status = 'normal'
          WHERE teacher_id        = $1
            AND DATE(start_time) >= CURRENT_DATE
            AND status            = 'udækket'
        `, [fravaer.teacher_id]);
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