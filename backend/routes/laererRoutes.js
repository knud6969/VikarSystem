const express          = require('express');
const router           = express.Router();
const LaererController = require('../controllers/laererController.js');
const { requireAuth, requireRolle } = require('../middleware/authMiddleware.js');

// Lærer-login: hent og opdater egne data
router.get('/mig',  requireAuth, requireRolle('laerer'), LaererController.getMig);
router.put('/mig',  requireAuth, requireRolle('laerer'), LaererController.updateMig);

// Admin CRUD — disse skal stadig eksistere så AdminKalenderPage kan hente lærere
router.get('/',       requireAuth,                        LaererController.getAll);
router.get('/:id',    requireAuth,                        LaererController.getById);
router.post('/',      requireAuth, requireRolle('admin'), LaererController.create);
router.put('/:id',    requireAuth, requireRolle('admin'), LaererController.update);
router.delete('/:id', requireAuth, requireRolle('admin'), LaererController.delete);

module.exports = router;