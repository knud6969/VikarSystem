// vikarer
const express         = require('express');
const vikarRouter     = express.Router();
const VikarController = require('../controllers/vikarController');
const { requireAuth, requireRolle } = require('../middleware/authMiddleware');

vikarRouter.get('/ledige', requireAuth, requireRolle('admin'), VikarController.getLedige);
vikarRouter.get('/',       requireAuth, requireRolle('admin'), VikarController.getAll);
vikarRouter.get('/:id',    requireAuth, VikarController.getById);

// lektioner
const lektionRouter     = express.Router();
const LektionController = require('../controllers/lektionController');

lektionRouter.get('/vikar/:vikarId', requireAuth, LektionController.getForVikar);
lektionRouter.get('/',              requireAuth, LektionController.getAll);
lektionRouter.get('/:id',           requireAuth, LektionController.getById);
lektionRouter.post('/',             requireAuth, requireRolle('admin'), LektionController.create);
lektionRouter.delete('/:id',        requireAuth, requireRolle('admin'), LektionController.delete);

// fravaer
const fravaerRouter     = express.Router();
const FravaerController = require('../controllers/fravaerController');

fravaerRouter.get('/',              requireAuth, requireRolle('admin'), FravaerController.getAll);
fravaerRouter.post('/',             requireAuth, requireRolle('admin'), FravaerController.opret);
fravaerRouter.patch('/:id/afslut',  requireAuth, requireRolle('admin'), FravaerController.afslut);

// tildelinger
const tildelingRouter     = express.Router();
const TildelingController = require('../controllers/tildelingController');

tildelingRouter.get('/',      requireAuth, requireRolle('admin'), TildelingController.getAll);
tildelingRouter.post('/',     requireAuth, requireRolle('admin'), TildelingController.tildel);
tildelingRouter.delete('/:id',requireAuth, requireRolle('admin'), TildelingController.fjern);

// tilgaengelighed
const tilgaengelighedRouter     = express.Router();
const TilgaengelighedController = require('../controllers/tilgaengelighedController');

tilgaengelighedRouter.get('/min',  requireAuth, requireRolle('vikar'), TilgaengelighedController.getMin);
tilgaengelighedRouter.post('/',    requireAuth, requireRolle('vikar'), TilgaengelighedController.saet);
tilgaengelighedRouter.delete('/:id', requireAuth, requireRolle('vikar'), TilgaengelighedController.delete);

module.exports = { vikarRouter, lektionRouter, fravaerRouter, tildelingRouter, tilgaengelighedRouter };