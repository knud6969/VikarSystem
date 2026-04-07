const pool = require('../config/db');

const LektionModel = {
  async getAll() {
    const result = await pool.query(`
      SELECT l.*, la.name AS laerer_navn, la.type AS laerer_type,
             la.phone AS laerer_phone, br_la.email AS laerer_email, br_la.personal_email AS laerer_personal_email,
             k.name AS klasse_navn,
             v.id AS vikar_id, v.name AS vikar_navn,
             v.phone AS vikar_phone, br_v.email AS vikar_email, br_v.personal_email AS vikar_personal_email
      FROM lektioner l
      JOIN laerere la       ON la.id = l.teacher_id
      LEFT JOIN brugere br_la ON br_la.id = la.user_id
      JOIN klasser k        ON k.id  = l.class_id
      LEFT JOIN tildelinger ti ON ti.lesson_id = l.id
      LEFT JOIN vikarer v      ON v.id = ti.substitute_id
      LEFT JOIN brugere br_v   ON br_v.id = v.user_id
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
   * Henter lektioner tildelt en specifik vikar.
   * Bruges i vikar-interfacet (mine lektioner).
   */
  async getForVikar(vikarId) {
    const result = await pool.query(`
      SELECT DISTINCT ON (l.id) l.*, la.name AS laerer_navn, la.type AS laerer_type,
             la.phone AS laerer_phone, br.email AS laerer_email, br.personal_email AS laerer_personal_email,
             k.name AS klasse_navn, ti.assigned_at
      FROM lektioner l
      JOIN tildelinger ti ON ti.lesson_id = l.id
      JOIN laerere la     ON la.id = l.teacher_id
      LEFT JOIN brugere br ON br.id = la.user_id
      JOIN klasser k      ON k.id  = l.class_id
      WHERE ti.substitute_id = $1
      ORDER BY l.id, l.start_time
    `, [vikarId]);
    // Sortér efter start_time efter DISTINCT ON
    result.rows.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    return result.rows;
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM lektioner WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};

module.exports = LektionModel;