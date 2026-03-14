const LaererModel = require('../models/laererModel');

const LaererController = {
  // ── Admin CRUD ────────────────────────────────────────────
  async getAll(req, res) {
    try {
      res.json(await LaererModel.getAll());
    } catch (err) {
      console.error('LaererController.getAll:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  async getById(req, res) {
    try {
      const laerer = await LaererModel.getById(req.params.id);
      if (!laerer) return res.status(404).json({ error: 'Lærer ikke fundet' });
      res.json(laerer);
    } catch (err) {
      console.error('LaererController.getById:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  async create(req, res) {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'name er påkrævet' });
      res.status(201).json(await LaererModel.create({ name }));
    } catch (err) {
      console.error('LaererController.create:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  async update(req, res) {
    try {
      const laerer = await LaererModel.update(req.params.id, req.body);
      if (!laerer) return res.status(404).json({ error: 'Lærer ikke fundet' });
      res.json(laerer);
    } catch (err) {
      console.error('LaererController.update:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  async delete(req, res) {
    try {
      const ok = await LaererModel.delete(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Lærer ikke fundet' });
      res.status(204).send();
    } catch (err) {
      console.error('LaererController.delete:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  // ── Lærer-login ───────────────────────────────────────────
  async getMig(req, res) {
    try {
      const laerer = await LaererModel.getByUserId(req.bruger.id);
      if (!laerer) return res.status(404).json({ error: 'Lærer ikke fundet' });
      const lektioner = await LaererModel.getLektioner(laerer.id);
      res.json({ ...laerer, lektioner });
    } catch (err) {
      console.error('LaererController.getMig:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};

module.exports = LaererController;