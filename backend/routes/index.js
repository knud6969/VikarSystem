const express = require('express');
const { requireAuth, requireRolle } = require('../middleware/authMiddleware');

// ── Vikarer ──────────────────────────────────────────────────────────────────
const vikarRouter     = express.Router();
const VikarController = require('../controllers/vikarController');

vikarRouter.get('/ledige', requireAuth, requireRolle('admin'), VikarController.getLedige);
vikarRouter.get('/mig',    requireAuth, requireRolle('vikar'), VikarController.getMig);
vikarRouter.put('/mig',    requireAuth, requireRolle('vikar'), VikarController.updateMig);
vikarRouter.get('/',       requireAuth,                        VikarController.getAll);
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

tildelingRouter.get('/',       requireAuth,                        TildelingController.getAll);
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

// ── Timer ─────────────────────────────────────────────────────────────────────
const timerRouter     = express.Router();
const TimerController = require('../controllers/timerController');

timerRouter.get('/mine',          requireAuth, requireRolle('vikar'), TimerController.getMineTimer);
timerRouter.get('/admin',         requireAuth, requireRolle('admin'), TimerController.getAlleTimer);
timerRouter.get('/admin/:vikarId',requireAuth, requireRolle('admin'), TimerController.getVikarTimer);

// ── Indstillinger ─────────────────────────────────────────────────────────────
const indstillingerRouter     = express.Router();
const IndstillingerController = require('../controllers/indstillingerController');

indstillingerRouter.get('/timesat', requireAuth,                        IndstillingerController.getTimesatser);
indstillingerRouter.put('/timesat', requireAuth, requireRolle('admin'), IndstillingerController.setTimesatser);

// ── Lønkørsel ─────────────────────────────────────────────────────────────────
const loenkoerselRouter     = express.Router();
const LoenkoerselController = require('../controllers/loenkoerselController');

loenkoerselRouter.get('/',          requireAuth,                        LoenkoerselController.get);
loenkoerselRouter.post('/',         requireAuth, requireRolle('admin'), LoenkoerselController.koer);
loenkoerselRouter.delete('/:maaned',requireAuth, requireRolle('admin'), LoenkoerselController.annuller);

// ── Notifikationer ─────────────────────────────────────────────────────────────
const notifikationRouter     = express.Router();
const NotifikationController = require('../controllers/notifikationController');

notifikationRouter.get('/',            requireAuth, NotifikationController.getForMig);
notifikationRouter.patch('/:id/laest', requireAuth, NotifikationController.markerLaest);

// ── Klasser ──────────────────────────────────────────────────────────────────
const klasserRouter     = express.Router();
const KlasserController = require('../controllers/klasserController');

klasserRouter.get('/', requireAuth, KlasserController.getAll);

module.exports = {
  vikarRouter,
  laererRouter,
  lektionRouter,
  fravaerRouter,
  tildelingRouter,
  tilgaengelighedRouter,
  beskedRouter,
  timerRouter,
  indstillingerRouter,
  loenkoerselRouter,
  notifikationRouter,
  klasserRouter,
};