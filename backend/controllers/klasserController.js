const KlasserModel = require('../models/klasserModel');
const KlasserController = {
  async getAll(req, res) {
    try {
      res.json(await KlasserModel.getAll());
    } catch (err) {
      console.error('KlasserController.getAll:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};
module.exports = KlasserController;
