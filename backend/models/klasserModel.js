const pool = require('../config/db');
const KlasserModel = {
  async getAll() {
    const result = await pool.query('SELECT * FROM klasser ORDER BY name');
    return result.rows;
  },
};
module.exports = KlasserModel;
