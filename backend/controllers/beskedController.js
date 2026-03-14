const BeskedModel = require('../models/beskedModel');

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