const LektionModel = require('../models/lektionModel');

const LektionController = {
  async getAll(req, res) {
    try {
      res.json(await LektionModel.getAll());
    } catch (err) {
      console.error('LektionController.getAll:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  async getById(req, res) {
    try {
      const lektion = await LektionModel.getById(req.params.id);
      if (!lektion) return res.status(404).json({ error: 'Lektion ikke fundet' });
      res.json(lektion);
    } catch (err) {
      console.error('LektionController.getById:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  async create(req, res) {
    try {
      const { teacher_id, class_id, subject, room, start_time, end_time } = req.body;
      if (!teacher_id || !class_id || !subject || !start_time || !end_time) {
        return res.status(400).json({ error: 'teacher_id, class_id, subject, start_time og end_time er påkrævet' });
      }
      res.status(201).json(await LektionModel.create({ teacher_id, class_id, subject, room, start_time, end_time }));
    } catch (err) {
      console.error('LektionController.create:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * GET /lektioner/vikar/:vikarId
   * Henter lektioner tildelt en specifik vikar.
   */
  async getForVikar(req, res) {
    try {
      res.json(await LektionModel.getForVikar(req.params.vikarId));
    } catch (err) {
      console.error('LektionController.getForVikar:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  async delete(req, res) {
    try {
      const ok = await LektionModel.delete(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Lektion ikke fundet' });
      res.status(204).send();
    } catch (err) {
      console.error('LektionController.delete:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};

module.exports = LektionController;