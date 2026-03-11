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
      'SELECT id, email, rolle, created_at FROM brugere WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = BrugerModel;