const LaererModel = require('../models/laererModel');

const LaererController = {
  /**
   * GET /laerere/mig
   * Returnerer den indloggede lærers profil + lektioner.
   */
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