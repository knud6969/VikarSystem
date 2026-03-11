const express          = require('express');
const router           = express.Router();
const LaererController = require('../controllers/laererController.js');
const { requireAuth, requireRolle } = require('../middleware/authMiddleware.js');

router.get('/',     requireAuth, LaererController.getAll);
router.get('/:id',  requireAuth, LaererController.getById);
router.post('/',    requireAuth, requireRolle('admin'), LaererController.create);
router.put('/:id',  requireAuth, requireRolle('admin'), LaererController.update);
router.delete('/:id', requireAuth, requireRolle('admin'), LaererController.delete);

module.exports = router;