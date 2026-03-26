const TildelingModel    = require('../models/tildelingModel');
const NotifikationModel = require('../models/notifikationModel');
const pool              = require('../config/db');

const TildelingController = {
  async getAll(req, res) {
    try {
      res.json(await TildelingModel.getAll());
    } catch (err) {
      console.error('TildelingController.getAll:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * POST /tildelinger
   * Tildeler vikar til lektion. (User Story 4)
   */
  async tildel(req, res) {
    try {
      const { lesson_id, substitute_id } = req.body;
      if (!lesson_id || !substitute_id) {
        return res.status(400).json({ error: 'lesson_id og substitute_id er påkrævet' });
      }
      const tildeling = await TildelingModel.tildel({
        lesson_id,
        substitute_id,
        tildelt_af: req.bruger.id,
      });
      res.status(201).json(tildeling);

      // Notifikationer (fejl her må ikke påvirke svaret)
      try {
        const lektionRes = await pool.query(`
          SELECT l.subject, l.start_time, la.name AS laerer_navn, la.user_id AS laerer_bruger_id
          FROM lektioner l
          JOIN laerere la ON la.id = l.teacher_id
          WHERE l.id = $1
        `, [lesson_id]);
        const vikarRes = await pool.query(
          'SELECT user_id, name FROM vikarer WHERE id = $1', [substitute_id]
        );
        if (lektionRes.rows.length && vikarRes.rows.length) {
          const lektion    = lektionRes.rows[0];
          const vikar      = vikarRes.rows[0];
          console.log('[Notif] tildel: vikar.user_id=', vikar.user_id, 'laerer_bruger_id=', lektion.laerer_bruger_id);
          const dato       = new Date(lektion.start_time).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
          const tid        = new Date(lektion.start_time).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

          // Notificer vikaren
          await NotifikationModel.opret({
            bruger_id: vikar.user_id,
            type: 'tildeling_oprettet',
            titel: `Du er tildelt en lektion`,
            besked: `${lektion.subject} – ${dato} kl. ${tid} (${lektion.laerer_navn})`,
            link: `/vikar/lektioner?lessonId=${lesson_id}`,
          });

          // Notificer læreren
          await NotifikationModel.opret({
            bruger_id: lektion.laerer_bruger_id,
            type: 'vikar_tildelt',
            titel: `Vikar tildelt din lektion`,
            besked: `${vikar.name} dækker ${lektion.subject} – ${dato} kl. ${tid}`,
            link: `/laerer/lektioner?lessonId=${lesson_id}`,
          });
        }
        console.log('[Notif] tildel: notifikationer oprettet OK');
      } catch (notifErr) {
        console.error('Notifikation (tildel) fejlede:', notifErr);
      }
    } catch (err) {
      if (err.message.includes('ikke udækket')) {
        return res.status(409).json({ error: err.message });
      }
      console.error('TildelingController.tildel:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * DELETE /tildelinger/:id
   * Fjerner tildeling og sætter lektion tilbage til 'udækket'.
   */
  async fjern(req, res) {
    try {
      // Hent detaljer inden sletning til notifikationer
      const tildelingRes = await pool.query(`
        SELECT ti.substitute_id, ti.lesson_id,
               v.user_id AS vikar_bruger_id, v.name AS vikar_navn,
               l.subject, l.start_time,
               la.user_id AS laerer_bruger_id, la.name AS laerer_navn
        FROM tildelinger ti
        JOIN vikarer v   ON v.id  = ti.substitute_id
        JOIN lektioner l ON l.id  = ti.lesson_id
        JOIN laerere la  ON la.id = l.teacher_id
        WHERE ti.id = $1
      `, [req.params.id]);

      await TildelingModel.fjern(req.params.id);
      res.status(204).send();

      // Notifikationer
      try {
        console.log('[Notif] fjern: tildelingRes.rows.length=', tildelingRes.rows.length);
        if (tildelingRes.rows.length) {
          const r    = tildelingRes.rows[0];
          const dato = new Date(r.start_time).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
          const tid  = new Date(r.start_time).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

          await NotifikationModel.opret({
            bruger_id: r.vikar_bruger_id,
            type: 'tildeling_fjernet',
            titel: `Du er fjernet fra en lektion`,
            besked: `${r.subject} – ${dato} kl. ${tid} (${r.laerer_navn})`,
            link: `/vikar/lektioner`,
          });

          await NotifikationModel.opret({
            bruger_id: r.laerer_bruger_id,
            type: 'vikar_fjernet',
            titel: `Vikar fjernet fra din lektion`,
            besked: `${r.vikar_navn} er ikke længere tildelt ${r.subject} – ${dato} kl. ${tid}`,
            link: `/laerer/lektioner?lessonId=${r.lesson_id}`,
          });
        }
        console.log('[Notif] fjern: notifikationer oprettet OK');
      } catch (notifErr) {
        console.error('Notifikation (fjern) fejlede:', notifErr);
      }
    } catch (err) {
      if (err.message === 'Tildeling ikke fundet') {
        return res.status(404).json({ error: err.message });
      }
      console.error('TildelingController.fjern:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};

module.exports = TildelingController;