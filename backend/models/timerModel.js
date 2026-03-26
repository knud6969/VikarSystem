const pool = require('../config/db');

const TimerModel = {
  /**
   * Henter en vikars timer for en given måned (YYYY-MM), opdelt på laerer/paedagog.
   */
  async getForVikar(vikarId, maaned) {
    const result = await pool.query(`
      SELECT
        la.type                                                           AS laerer_type,
        COUNT(*)::int                                                     AS lektioner,
        ROUND(SUM(
          EXTRACT(EPOCH FROM (l.end_time - l.start_time)) / 3600
        )::numeric, 2)                                                    AS timer
      FROM tildelinger t
      JOIN lektioner l  ON l.id  = t.lesson_id
      JOIN laerere  la ON la.id = l.teacher_id
      WHERE t.substitute_id = $1
        AND TO_CHAR(l.start_time AT TIME ZONE 'Europe/Copenhagen', 'YYYY-MM') = $2
      GROUP BY la.type
    `, [vikarId, maaned]);
    return result.rows;
  },

  /**
   * Henter alle vikarer med deres timer for en given måned (admin-overblik).
   */
  async getAlleVikarer(maaned) {
    const result = await pool.query(`
      SELECT
        v.id                                                              AS vikar_id,
        v.name                                                            AS vikar_navn,
        la.type                                                           AS laerer_type,
        COUNT(*)::int                                                     AS lektioner,
        ROUND(SUM(
          EXTRACT(EPOCH FROM (l.end_time - l.start_time)) / 3600
        )::numeric, 2)                                                    AS timer
      FROM tildelinger t
      JOIN lektioner l  ON l.id  = t.lesson_id
      JOIN laerere  la ON la.id = l.teacher_id
      JOIN vikarer  v  ON v.id  = t.substitute_id
      WHERE TO_CHAR(l.start_time AT TIME ZONE 'Europe/Copenhagen', 'YYYY-MM') = $1
      GROUP BY v.id, v.name, la.type
      ORDER BY v.name, la.type
    `, [maaned]);
    return result.rows;
  },
};

module.exports = TimerModel;
