const express    = require('express');
const router     = express.Router();
const AuthController = require('../controllers/authController.js');
const { requireAuth } = require('../middleware/authMiddleware.js');

router.post('/login', AuthController.login);
router.get('/me', requireAuth, AuthController.me);

module.exports = router;