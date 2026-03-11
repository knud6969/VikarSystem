const LaererModel = require('../models/laererModel');

const LaererController = {
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
      const { name, status } = req.body;
      if (!name) return res.status(400).json({ error: 'Navn er påkrævet' });
      res.status(201).json(await LaererModel.create({ name, status }));
    } catch (err) {
      console.error('LaererController.create:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  async update(req, res) {
    try {
      const { name, status } = req.body;
      if (!name || !status) return res.status(400).json({ error: 'Navn og status er påkrævet' });
      const laerer = await LaererModel.update(req.params.id, { name, status });
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
};

module.exports = LaererController;