const express = require('express');
const { requireAuth, requireRolle } = require('../middleware/authMiddleware');

// ── Vikarer ──────────────────────────────────────────────────────────────────
const vikarRouter     = express.Router();
const VikarController = require('../controllers/vikarController');

vikarRouter.get('/ledige', requireAuth, requireRolle('admin'), VikarController.getLedige);
vikarRouter.get('/mig',    requireAuth, requireRolle('vikar'), VikarController.getMig);
vikarRouter.get('/',       requireAuth, requireRolle('admin'), VikarController.getAll);
vikarRouter.get('/:id',    requireAuth,                        VikarController.getById);

// ── Lærere ───────────────────────────────────────────────────────────────────
const laererRouter     = express.Router();
const LaererController = require('../controllers/laererController');

laererRouter.get('/mig', requireAuth, requireRolle('laerer'), LaererController.getMig);

// ── Lektioner ────────────────────────────────────────────────────────────────
const lektionRouter     = express.Router();
const LektionController = require('../controllers/lektionController');

lektionRouter.get('/vikar/:vikarId', requireAuth,                        LektionController.getForVikar);
lektionRouter.get('/',               requireAuth,                        LektionController.getAll);
lektionRouter.get('/:id',            requireAuth,                        LektionController.getById);
lektionRouter.post('/',              requireAuth, requireRolle('admin'), LektionController.create);
lektionRouter.delete('/:id',         requireAuth, requireRolle('admin'), LektionController.delete);

// ── Fravær ───────────────────────────────────────────────────────────────────
const fravaerRouter     = express.Router();
const FravaerController = require('../controllers/fravaerController');

fravaerRouter.get('/',             requireAuth, requireRolle('admin'), FravaerController.getAll);
fravaerRouter.post('/',            requireAuth, requireRolle('admin'), FravaerController.opret);
fravaerRouter.patch('/:id/afslut', requireAuth, requireRolle('admin'), FravaerController.afslut);

// ── Tildelinger ──────────────────────────────────────────────────────────────
const tildelingRouter     = express.Router();
const TildelingController = require('../controllers/tildelingController');

tildelingRouter.get('/',       requireAuth, requireRolle('admin'), TildelingController.getAll);
tildelingRouter.post('/',      requireAuth, requireRolle('admin'), TildelingController.tildel);
tildelingRouter.delete('/:id', requireAuth, requireRolle('admin'), TildelingController.fjern);

// ── Tilgængelighed ───────────────────────────────────────────────────────────
const tilgaengelighedRouter     = express.Router();
const TilgaengelighedController = require('../controllers/tilgaengelighedController');

tilgaengelighedRouter.get('/alle',   requireAuth, requireRolle('admin'), TilgaengelighedController.getAlle);
tilgaengelighedRouter.get('/min',    requireAuth, requireRolle('vikar'), TilgaengelighedController.getMin);
tilgaengelighedRouter.post('/',      requireAuth, requireRolle('vikar'), TilgaengelighedController.saet);
tilgaengelighedRouter.delete('/:id', requireAuth, requireRolle('vikar'), TilgaengelighedController.delete);

// ── Beskeder ─────────────────────────────────────────────────────────────────
const beskedRouter     = express.Router();
const BeskedController = require('../controllers/beskedController');

beskedRouter.get('/lektioner-med-beskeder', requireAuth, BeskedController.getLektionerMedBeskeder);
beskedRouter.get('/lektion/:lessonId',      requireAuth, BeskedController.getForLektion);
beskedRouter.post('/lektion/:lessonId',     requireAuth, BeskedController.opret);

module.exports = {
  vikarRouter,
  laererRouter,
  lektionRouter,
  fravaerRouter,
  tildelingRouter,
  tilgaengelighedRouter,
  beskedRouter,
};