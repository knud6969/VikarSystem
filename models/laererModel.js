const pool = require('../config/db');

const LaererModel = {
  async getAll() {
    const result = await pool.query('SELECT * FROM laerere ORDER BY name');
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM laerere WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create({ name, status = 'aktiv' }) {
    const result = await pool.query(
      'INSERT INTO laerere (name, status) VALUES ($1, $2) RETURNING *',
      [name, status]
    );
    return result.rows[0];
  },

  async update(id, { name, status }) {
    const result = await pool.query(
      'UPDATE laerere SET name = $1, status = $2 WHERE id = $3 RETURNING *',
      [name, status, id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM laerere WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};

module.exports = LaererModel;