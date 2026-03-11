const TildelingModel = require('../models/tildelingModel');

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
      await TildelingModel.fjern(req.params.id);
      res.status(204).send();
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