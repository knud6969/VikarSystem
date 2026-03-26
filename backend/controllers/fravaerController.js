const FravaerModel = require('../models/fravaerModel');

const FravaerController = {
  async getAll(req, res) {
    try {
      const { teacher_id } = req.query;
      res.json(await FravaerModel.getAll(teacher_id ? { teacher_id } : {}));
    } catch (err) {
      console.error('FravaerController.getAll:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * POST /fravaer
   * Opretter fravær og markerer lektioner som udækkede.
   * (User Story 1 + 2)
   */
  async opret(req, res) {
    try {
      const { teacher_id, type, start_date, end_date } = req.body;
      if (!teacher_id || !start_date || !end_date) {
        return res.status(400).json({ error: 'teacher_id, start_date og end_date er påkrævet' });
      }
      const resultat = await FravaerModel.opretMedLektioner({
        teacher_id,
        type: type || 'syg',
        start_date,
        end_date,
        oprettet_af: req.bruger.id,
      });
      res.status(201).json(resultat);
    } catch (err) {
      console.error('FravaerController.opret:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * PATCH /fravaer/:id/afslut
   * Raskmelder en lærer og normaliserer fremtidige lektioner.
   * (User Story 5)
   */
  async afslut(req, res) {
    try {
      const { bevarTildelinger = false } = req.body;
      const resultat = await FravaerModel.afslutMedLektioner(
        req.params.id,
        { bevarTildelinger }
      );
      res.json(resultat);
    } catch (err) {
      if (err.message === 'Fravær ikke fundet') {
        return res.status(404).json({ error: err.message });
      }
      console.error('FravaerController.afslut:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};

module.exports = FravaerController;