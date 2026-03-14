const pool = require('../config/db');

const BeskedModel = {
  /**
   * Henter alle beskeder for en lektion, inkl. afsenders navn og rolle.
   */
  async getForLektion(lessonId) {
    const result = await pool.query(`
      SELECT b.id, b.lesson_id, b.afsender_id, b.indhold, b.created_at,
             br.rolle AS afsender_rolle,
             COALESCE(v.name, la.name) AS afsender_navn
      FROM beskeder b
      JOIN brugere br ON br.id = b.afsender_id
      LEFT JOIN vikarer  v  ON v.user_id  = b.afsender_id
      LEFT JOIN laerere  la ON la.user_id = b.afsender_id
      WHERE b.lesson_id = $1
      ORDER BY b.created_at ASC
    `, [lessonId]);
    return result.rows;
  },

  /**
   * Sender en besked på en lektion.
   */
  async opret({ lessonId, afsenderId, indhold }) {
    const result = await pool.query(`
      INSERT INTO beskeder (lesson_id, afsender_id, indhold)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [lessonId, afsenderId, indhold]);
    return result.rows[0];
  },

  /**
   * Returnerer lesson_ids der har mindst én besked — bruges til notifikationsprik.
   * Filtrerer på de lektioner der er i listen.
   */
  async getLektionerMedBeskeder(lessonIds) {
    if (!lessonIds.length) return [];
    const result = await pool.query(`
      SELECT DISTINCT lesson_id
      FROM beskeder
      WHERE lesson_id = ANY($1::int[])
    `, [lessonIds]);
    return result.rows.map(r => r.lesson_id);
  },
};

module.exports = BeskedModel;