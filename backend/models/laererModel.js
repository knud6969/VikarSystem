const pool = require('../config/db');

const LaererModel = {
  // ── Admin CRUD ────────────────────────────────────────────
  async getAll() {
    const result = await pool.query(`
      SELECT * FROM laerere ORDER BY name
    `);
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(
      'SELECT * FROM laerere WHERE id = $1', [id]
    );
    return result.rows[0] || null;
  },

  async create({ name }) {
    const result = await pool.query(
      "INSERT INTO laerere (name, status) VALUES ($1, 'aktiv') RETURNING *",
      [name]
    );
    return result.rows[0];
  },

  async update(id, { name, status }) {
    const result = await pool.query(
      'UPDATE laerere SET name = COALESCE($1, name), status = COALESCE($2, status) WHERE id = $3 RETURNING *',
      [name, status, id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM laerere WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  // ── Lærer-login ───────────────────────────────────────────
  async getByUserId(userId) {
    const result = await pool.query(`
      SELECT la.*, br.email
      FROM laerere la
      JOIN brugere br ON br.id = la.user_id
      WHERE la.user_id = $1
    `, [userId]);
    return result.rows[0] || null;
  },

  async getLektioner(laererId) {
    const result = await pool.query(`
      SELECT l.*,
             k.name AS klasse_navn,
             v.name AS vikar_navn,
             ti.id  AS tildeling_id
      FROM lektioner l
      JOIN klasser k ON k.id = l.class_id
      LEFT JOIN tildelinger ti ON ti.lesson_id = l.id
      LEFT JOIN vikarer v      ON v.id = ti.substitute_id
      WHERE l.teacher_id = $1
      ORDER BY l.start_time
    `, [laererId]);
    return result.rows;
  },
};

module.exports = LaererModel;