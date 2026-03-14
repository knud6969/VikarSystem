const express          = require('express');
const router           = express.Router();
const LaererController = require('../controllers/laererController.js');
const { requireAuth, requireRolle } = require('../middleware/authMiddleware.js');

// Lærer-login: hent egne data + lektioner
router.get('/mig', requireAuth, requireRolle('laerer'), LaererController.getMig);

module.exports = router;