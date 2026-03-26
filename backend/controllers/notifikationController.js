const NotifikationModel = require('../models/notifikationModel');

const NotifikationController = {
  /**
   * GET /notifikationer
   * Returnerer notifikationer for den indloggede bruger.
   */
  async getForMig(req, res) {
    try {
      const notifikationer = await NotifikationModel.getForBruger(req.bruger.id);
      res.json(notifikationer);
    } catch (err) {
      console.error('NotifikationController.getForMig:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * PATCH /notifikationer/:id/laest
   * Markerer én notifikation som læst.
   */
  async markerLaest(req, res) {
    try {
      const notif = await NotifikationModel.markerLaest(req.params.id, req.bruger.id);
      if (!notif) return res.status(404).json({ error: 'Notifikation ikke fundet' });
      res.json(notif);
    } catch (err) {
      console.error('NotifikationController.markerLaest:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};

module.exports = NotifikationController;
