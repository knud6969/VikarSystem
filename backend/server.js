require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes    = require('./routes/authRoutes');
const laererRoutes  = require('./routes/laererRoutes');
const {
  vikarRouter,
  lektionRouter,
  fravaerRouter,
  tildelingRouter,
  tilgaengelighedRouter,
  beskedRouter,                  // ← NY
} = require('./routes/index');

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/auth',            authRoutes);
app.use('/laerere',         laererRoutes);
app.use('/vikarer',         vikarRouter);
app.use('/lektioner',       lektionRouter);
app.use('/fravaer',         fravaerRouter);
app.use('/tildelinger',     tildelingRouter);
app.use('/tilgaengelighed', tilgaengelighedRouter);
app.use('/beskeder',        beskedRouter);  // ← NY

// ── Sundhedstjek ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Ruten findes ikke' }));

// ── Global fejlhåndtering ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Uhåndteret fejl:', err);
  res.status(500).json({ error: 'Intern serverfejl' });
});

// ── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VikarSystem backend kører på http://localhost:${PORT}`);
});