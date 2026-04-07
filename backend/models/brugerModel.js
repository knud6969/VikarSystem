const pool = require('../config/db');

const BrugerModel = {
  /**
   * Finder en bruger baseret på email.
   * Bruges til login.
   */
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM brugere WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Finder en bruger baseret på ID.
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT id, email, personal_email, rolle, created_at FROM brugere WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async updatePersonalEmail(userId, personalEmail) {
    const result = await pool.query(
      'UPDATE brugere SET personal_email = $1 WHERE id = $2 RETURNING id, email, personal_email',
      [personalEmail || null, userId]
    );
    return result.rows[0] || null;
  },

  async skiftKode(userId, nyHash) {
    await pool.query(
      'UPDATE brugere SET password_hash = $1 WHERE id = $2',
      [nyHash, userId]
    );
  },
};

module.exports = BrugerModel;