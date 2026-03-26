const BeskedModel       = require('../models/beskedModel');
const NotifikationModel = require('../models/notifikationModel');
const pool              = require('../config/db');

const BeskedController = {
  /**
   * GET /beskeder/lektion/:lessonId
   * Tilgængelig for lærer (egne lektioner), vikar (tildelte lektioner) og admin.
   */
  async getForLektion(req, res) {
    try {
      const lessonId = parseInt(req.params.lessonId, 10);
      if (isNaN(lessonId)) return res.status(400).json({ error: 'Ugyldig lektion' });

      const beskeder = await BeskedModel.getForLektion(lessonId);
      res.json(beskeder);
    } catch (err) {
      console.error('BeskedController.getForLektion:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * POST /beskeder/lektion/:lessonId
   * Body: { indhold }
   */
  async opret(req, res) {
    try {
      const lessonId  = parseInt(req.params.lessonId, 10);
      const { indhold } = req.body;

      if (isNaN(lessonId))       return res.status(400).json({ error: 'Ugyldig lektion' });
      if (!indhold?.trim())      return res.status(400).json({ error: 'Indhold mangler' });

      const besked = await BeskedModel.opret({
        lessonId,
        afsenderId: req.bruger.id,
        indhold: indhold.trim(),
      });
      res.status(201).json(besked);

      // Notifikation til modparten
      try {
        const lektionRes = await pool.query(`
          SELECT l.subject, l.start_time,
                 la.user_id AS laerer_bruger_id, la.name AS laerer_navn,
                 v.user_id  AS vikar_bruger_id,  v.name  AS vikar_navn
          FROM lektioner l
          JOIN laerere la ON la.id = l.teacher_id
          LEFT JOIN tildelinger ti ON ti.lesson_id = l.id
          LEFT JOIN vikarer v ON v.id = ti.substitute_id
          WHERE l.id = $1
        `, [lessonId]);

        if (lektionRes.rows.length) {
          const l           = lektionRes.rows[0];
          const afsenderRolle = req.bruger.rolle;
          console.log('[Notif] besked: afsenderRolle=', afsenderRolle, 'vikar_bruger_id=', l.vikar_bruger_id, 'laerer_bruger_id=', l.laerer_bruger_id);
          const dato        = new Date(l.start_time).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });

          if (afsenderRolle === 'laerer' && l.vikar_bruger_id) {
            await NotifikationModel.opret({
              bruger_id: l.vikar_bruger_id,
              type: 'ny_besked',
              titel: `Ny besked fra ${l.laerer_navn}`,
              besked: `${l.subject} – ${dato}`,
              link: `/vikar/lektioner?lessonId=${lessonId}&besked=1`,
            });
          } else if (afsenderRolle === 'vikar') {
            await NotifikationModel.opret({
              bruger_id: l.laerer_bruger_id,
              type: 'ny_besked',
              titel: `Ny besked fra ${l.vikar_navn ?? 'vikaren'}`,
              besked: `${l.subject} – ${dato}`,
              link: `/laerer/lektioner?lessonId=${lessonId}&besked=1`,
            });
          }
        }
      } catch (notifErr) {
        console.error('Notifikation (besked) fejlede:', notifErr);
      }
    } catch (err) {
      console.error('BeskedController.opret:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * GET /beskeder/lektioner-med-beskeder?ids=1,2,3
   * Returnerer array af lesson_ids der har beskeder.
   */
  async getLektionerMedBeskeder(req, res) {
    try {
      const ids = (req.query.ids || '')
        .split(',')
        .map(Number)
        .filter(n => !isNaN(n) && n > 0);

      const result = await BeskedModel.getLektionerMedBeskeder(ids);
      res.json(result);
    } catch (err) {
      console.error('BeskedController.getLektionerMedBeskeder:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};

module.exports = BeskedController;