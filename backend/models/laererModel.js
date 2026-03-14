const pool = require('../config/db');

const LaererModel = {
  /**
   * Finder lærer-rækken baseret på bruger-id.
   * Bruges ved /laerere/mig ligesom vikarer/mig.
   */
  async getByUserId(userId) {
    const result = await pool.query(`
      SELECT la.*, br.email
      FROM laerere la
      JOIN brugere br ON br.id = la.user_id
      WHERE la.user_id = $1
    `, [userId]);
    return result.rows[0] || null;
  },

  /**
   * Henter alle lektioner for en lærer.
   * Inkluderer vikarens navn hvis lektionen er dækket.
   */
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