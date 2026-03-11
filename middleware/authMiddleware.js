const jwt = require('jsonwebtoken');

/**
 * Verificerer JWT-token fra Authorization header.
 * Tilføjer req.bruger = { id, email, rolle } ved success.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Ingen adgangstoken — log ind først' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.bruger = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Ugyldig eller udløbet token' });
  }
}

/**
 * Kræver at den indloggede bruger har en specifik rolle.
 * Bruges efter requireAuth.
 * Eksempel: router.get('/...', requireAuth, requireRolle('admin'), controller)
 */
function requireRolle(...roller) {
  return (req, res, next) => {
    if (!roller.includes(req.bruger?.rolle)) {
      return res.status(403).json({ error: 'Du har ikke adgang til denne ressource' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRolle };