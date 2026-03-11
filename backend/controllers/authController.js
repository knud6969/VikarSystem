const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const BrugerModel = require('../models/brugerModel');

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