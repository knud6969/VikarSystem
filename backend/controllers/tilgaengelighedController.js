const TilgaengelighedModel = require('../models/tilgaengelighedModel');
const VikarModel           = require('../models/vikarModel');

const TilgaengelighedController = {
  /**
   * GET /tilgaengelighed/min
   * Vikar henter sin egen tilgængelighed.
   */
  async getMin(req, res) {
    try {
      const vikar = await VikarModel.getByUserId(req.bruger.id);
      if (!vikar) return res.status(404).json({ error: 'Vikar ikke fundet' });
      res.json(await TilgaengelighedModel.getForVikar(vikar.id));
    } catch (err) {
      console.error('TilgaengelighedController.getMin:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * GET /tilgaengelighed/alle
   * Admin henter alle vikarters utilgængeligheder til kalender-visning.
   */
  async getAlle(req, res) {
    try {
      res.json(await TilgaengelighedModel.getAlleOptaget());
    } catch (err) {
      console.error('TilgaengelighedController.getAlle:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * POST /tilgaengelighed
   * Vikar sætter sin tilgængelighed. (User Story 6)
   */
  async saet(req, res) {
    try {
      const vikar = await VikarModel.getByUserId(req.bruger.id);
      if (!vikar) return res.status(404).json({ error: 'Vikar ikke fundet' });

      const { date, start_time, end_time, status, kommentar } = req.body;
      if (!date || !start_time || !end_time) {
        return res.status(400).json({ error: 'date, start_time og end_time er påkrævet' });
      }

      const result = await TilgaengelighedModel.saet({
        substitute_id: vikar.id,
        date, start_time, end_time,
        status: status || 'ledig',
        kommentar: kommentar || null,
      });
      res.status(201).json(result);
    } catch (err) {
      console.error('TilgaengelighedController.saet:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * DELETE /tilgaengelighed/:id
   */
  async delete(req, res) {
    try {
      const vikar = await VikarModel.getByUserId(req.bruger.id);
      if (!vikar) return res.status(404).json({ error: 'Vikar ikke fundet' });

      const ok = await TilgaengelighedModel.delete(req.params.id, vikar.id);
      if (!ok) return res.status(404).json({ error: 'Tilgængelighed ikke fundet' });
      res.status(204).send();
    } catch (err) {
      console.error('TilgaengelighedController.delete:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};

module.exports = TilgaengelighedController;