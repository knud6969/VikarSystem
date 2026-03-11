const VikarModel = require('../models/vikarModel');

const VikarController = {
  async getAll(req, res) {
    try {
      res.json(await VikarModel.getAll());
    } catch (err) {
      console.error('VikarController.getAll:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  async getById(req, res) {
    try {
      const vikar = await VikarModel.getById(req.params.id);
      if (!vikar) return res.status(404).json({ error: 'Vikar ikke fundet' });
      res.json(vikar);
    } catch (err) {
      console.error('VikarController.getById:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * GET /vikarer/ledige?dato=2026-03-11&start=08:00&slut=10:00
   * Finder ledige vikarer i et tidsrum. (User Story 3)
   */
  async getLedige(req, res) {
    try {
      const { dato, start, slut } = req.query;
      if (!dato || !start || !slut) {
        return res.status(400).json({ error: 'dato, start og slut er påkrævet som query-parametre' });
      }
      const vikarer = await VikarModel.getLedigI({ dato, startTid: start, slutTid: slut });
      res.json(vikarer);
    } catch (err) {
      console.error('VikarController.getLedige:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};

module.exports = VikarController;