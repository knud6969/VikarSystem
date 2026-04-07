const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const BrugerModel = require('../models/brugerModel');
const SALT_ROUNDS = 10;

const AuthController = {
  /**
   * POST /auth/login
   * Body: { email, password }
   * Returnerer JWT-token og brugerinfo.
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email og adgangskode er påkrævet' });
      }

      const bruger = await BrugerModel.findByEmail(email);
      if (!bruger) {
        return res.status(401).json({ error: 'Forkert email eller adgangskode' });
      }

      const kodeOk = await bcrypt.compare(password, bruger.password_hash);
      if (!kodeOk) {
        return res.status(401).json({ error: 'Forkert email eller adgangskode' });
      }

      const token = jwt.sign(
        { id: bruger.id, email: bruger.email, rolle: bruger.rolle },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
        token,
        bruger: {
          id:    bruger.id,
          email: bruger.email,
          rolle: bruger.rolle,
        },
      });
    } catch (err) {
      console.error('AuthController.login fejl:', err);
      res.status(500).json({ error: 'Serverfejl ved login' });
    }
  },

  /**
   * PUT /auth/skift-kode
   * Body: { nuvaerende, ny }
   */
  async skiftKode(req, res) {
    try {
      const { nuvaerende, ny } = req.body;
      if (!nuvaerende || !ny) {
        return res.status(400).json({ error: 'nuvaerende og ny adgangskode er påkrævet' });
      }
      if (ny.length < 6) {
        return res.status(400).json({ error: 'Ny adgangskode skal være mindst 6 tegn' });
      }
      const bruger = await BrugerModel.findById(req.bruger.id);
      const fuld   = await BrugerModel.findByEmail(bruger.email);
      const kodeOk = await bcrypt.compare(nuvaerende, fuld.password_hash);
      if (!kodeOk) {
        return res.status(401).json({ error: 'Nuværende adgangskode er forkert' });
      }
      const nyHash = await bcrypt.hash(ny, SALT_ROUNDS);
      await BrugerModel.skiftKode(req.bruger.id, nyHash);
      res.json({ ok: true });
    } catch (err) {
      console.error('AuthController.skiftKode:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },

  /**
   * GET /auth/me
   * Returnerer den aktuelt indloggede bruger (kræver JWT).
   */
  async me(req, res) {
    try {
      const bruger = await BrugerModel.findById(req.bruger.id);
      if (!bruger) {
        return res.status(404).json({ error: 'Bruger ikke fundet' });
      }
      res.json(bruger);
    } catch (err) {
      console.error('AuthController.me fejl:', err);
      res.status(500).json({ error: 'Serverfejl' });
    }
  },
};

module.exports = AuthController;