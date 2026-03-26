const TimerModel  = require('../models/timerModel');
const VikarModel  = require('../models/vikarModel');

const TimerController = {
  // GET /timer/mine?maaned=YYYY-MM  (vikar)
  async getMineTimer(req, res) {
    try {
      const vikar  = await VikarModel.getByUserId(req.bruger.id);
      if (!vikar) return res.status(404).json({ error: 'Vikar ikke fundet' });
      const maaned = req.query.maaned || new Date().toISOString().slice(0, 7);
      const rækker = await TimerModel.getForVikar(vikar.id, maaned);
      res.json(rækker);
    } catch (err) {
      console.error('TimerController.getMineTimer:', err);
      res.status(500).json({ error: 'Intern serverfejl' });
    }
  },

  // GET /timer/admin?maaned=YYYY-MM  (admin — alle vikarer)
  async getAlleTimer(req, res) {
    try {
      const maaned = req.query.maaned || new Date().toISOString().slice(0, 7);
      const rækker = await TimerModel.getAlleVikarer(maaned);
      res.json(rækker);
    } catch (err) {
      console.error('TimerController.getAlleTimer:', err);
      res.status(500).json({ error: 'Intern serverfejl' });
    }
  },

  // GET /timer/admin/:vikarId?maaned=YYYY-MM  (admin — én vikar)
  async getVikarTimer(req, res) {
    try {
      const maaned = req.query.maaned || new Date().toISOString().slice(0, 7);
      const rækker = await TimerModel.getForVikar(req.params.vikarId, maaned);
      res.json(rækker);
    } catch (err) {
      console.error('TimerController.getVikarTimer:', err);
      res.status(500).json({ error: 'Intern serverfejl' });
    }
  },
};

module.exports = TimerController;
