/**
 * Opret notifikationer-tabel.
 * Kør med: node create-notifikationer.js
 */
require('dotenv').config({ quiet: true });
const pool = require('./backend/config/db');

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifikationer (
      id          SERIAL PRIMARY KEY,
      bruger_id   INTEGER NOT NULL REFERENCES brugere(id) ON DELETE CASCADE,
      type        VARCHAR(60) NOT NULL,
      titel       VARCHAR(255) NOT NULL,
      besked      TEXT,
      link        VARCHAR(255),
      laest       BOOLEAN NOT NULL DEFAULT FALSE,
      oprettet_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notif_bruger ON notifikationer(bruger_id, laest);
  `);
  console.log('Tabel notifikationer oprettet (eller eksisterede allerede).');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
