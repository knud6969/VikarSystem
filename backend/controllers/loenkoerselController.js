const LoenkoerselModel = require('../models/loenkoerselModel');

const LoenkoerselController = {
  // GET /loenkoersel?maaned=YYYY-MM  (admin)
  async get(req, res) {
    try {
      if (req.query.maaned) {
        const kørsel = await LoenkoerselModel.getForMaaned(req.query.maaned);
        return res.json(kørsel);
      }
      const alle = await LoenkoerselModel.getAlle();
      res.json(alle);
    } catch (err) {
      console.error('LoenkoerselController.get:', err);
      res.status(500).json({ error: 'Intern serverfejl' });
    }
  },

  // DELETE /loenkoersel/:maaned  (admin)
  async annuller(req, res) {
    try {
      const ok = await LoenkoerselModel.annuller(req.params.maaned);
      if (!ok) return res.status(404).json({ error: 'Ingen lønkørsel fundet for denne måned' });
      res.json({ ok: true });
    } catch (err) {
      console.error('LoenkoerselController.annuller:', err);
      res.status(500).json({ error: 'Intern serverfejl' });
    }
  },

  // POST /loenkoersel  { maaned: 'YYYY-MM' }  (admin)
  async koer(req, res) {
    try {
      const { maaned } = req.body;
      if (!maaned) return res.status(400).json({ error: 'maaned er påkrævet' });
      const eksisterende = await LoenkoerselModel.getForMaaned(maaned);
      if (eksisterende) return res.status(409).json({ error: 'Lønkørsel er allerede kørt for denne måned' });
      const kørsel = await LoenkoerselModel.koer(maaned, req.bruger.id);
      res.status(201).json(kørsel);
    } catch (err) {
      console.error('LoenkoerselController.koer:', err);
      res.status(500).json({ error: 'Intern serverfejl' });
    }
  },
};

module.exports = LoenkoerselController;
