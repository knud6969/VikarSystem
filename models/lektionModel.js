const pool = require('../config/db');

const LektionModel = {
  async getAll() {
    const result = await pool.query(`
      SELECT l.*, la.name AS laerer_navn, k.name AS klasse_navn
      FROM lektioner l
      JOIN laerere la ON la.id = l.teacher_id
      JOIN klasser k  ON k.id  = l.class_id
      ORDER BY l.start_time
    `);
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(`
      SELECT l.*, la.name AS laerer_navn, k.name AS klasse_navn
      FROM lektioner l
      JOIN laerere la ON la.id = l.teacher_id
      JOIN klasser k  ON k.id  = l.class_id
      WHERE l.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async create({ teacher_id, class_id, subject, room, start_time, end_time }) {
    const result = await pool.query(`
      INSERT INTO lektioner (teacher_id, class_id, subject, room, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'normal')
      RETURNING *
    `, [teacher_id, class_id, subject, room, start_time, end_time]);
    return result.rows[0];
  },

  /**
   * Markerer alle lektioner som 'udækket' for en lærer i en given periode.
   * Bruges når admin registrerer fravær (User Story 1 + 2).
   */
  async markerUdaekketForLaerer(teacher_id, startDate, endDate) {
    const result = await pool.query(`
      UPDATE lektioner
      SET status = 'udækket'
      WHERE teacher_id = $1
        AND DATE(start_time) >= $2
        AND DATE(start_time) <= $3
        AND status = 'normal'
      RETURNING *
    `, [teacher_id, startDate, endDate]);
    return result.rows;
  },

  /**
   * Normaliserer fremtidige lektioner tilbage til 'normal' ved raskmeldning.
   * Behold lektioner der allerede er 'dækket' (de har en vikar).
   * (User Story 5)
   */
  async normaliserFremtidigeForLaerer(teacher_id) {
    const result = await pool.query(`
      UPDATE lektioner
      SET status = 'normal'
      WHERE teacher_id = $1
        AND start_time  > NOW()
        AND status      = 'udækket'
      RETURNING *
    `, [teacher_id]);
    return result.rows;
  },

  /**
   * Henter lektioner tildelt en specifik vikar.
   * Bruges i vikar-interfacet (mine lektioner).
   */
  async getForVikar(vikarId) {
    const result = await pool.query(`
      SELECT l.*, la.name AS laerer_navn, k.name AS klasse_navn,
             ti.assigned_at
      FROM lektioner l
      JOIN tildelinger ti ON ti.lesson_id = l.id
      JOIN laerere la     ON la.id = l.teacher_id
      JOIN klasser k      ON k.id  = l.class_id
      WHERE ti.substitute_id = $1
        AND l.start_time >= NOW()
      ORDER BY l.start_time
    `, [vikarId]);
    return result.rows;
  },

  async opdaterStatus(id, status) {
    const result = await pool.query(
      'UPDATE lektioner SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM lektioner WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};

module.exports = LektionModel;