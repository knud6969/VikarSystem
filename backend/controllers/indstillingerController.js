const IndstillingerModel = require('../models/indstillingerModel');

const IndstillingerController = {
  // GET /indstillinger/timesat
  async getTimesatser(req, res) {
    try {
      const alle = await IndstillingerModel.getAlle();
      const obj  = Object.fromEntries(alle.map(r => [r.key, r.value]));
      res.json({
        timesat_laerer:   obj.timesat_laerer   ?? '250',
        timesat_paedagog: obj.timesat_paedagog ?? '220',
      });
    } catch (err) {
      console.error('IndstillingerController.getTimesatser:', err);
      res.status(500).json({ error: 'Intern serverfejl' });
    }
  },

  // PUT /indstillinger/timesat  (admin only)
  async setTimesatser(req, res) {
    try {
      const { timesat_laerer, timesat_paedagog } = req.body;
      if (timesat_laerer   !== undefined) await IndstillingerModel.set('timesat_laerer',   timesat_laerer);
      if (timesat_paedagog !== undefined) await IndstillingerModel.set('timesat_paedagog', timesat_paedagog);
      res.json({ ok: true });
    } catch (err) {
      console.error('IndstillingerController.setTimesatser:', err);
      res.status(500).json({ error: 'Intern serverfejl' });
    }
  },
};

module.exports = IndstillingerController;
