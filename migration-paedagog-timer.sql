-- Migration: pædagoger, indstillinger og lønkørsel
-- Kør med: node backend/config/db.js eller psql

-- 1. Type-kolonne på lærere/pædagoger
ALTER TABLE laerere ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'laerer';

-- 2. Global indstillinger (timesatser m.m.)
CREATE TABLE IF NOT EXISTS indstillinger (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO indstillinger (key, value) VALUES
  ('timesat_laerer',   '250'),
  ('timesat_paedagog', '220')
ON CONFLICT (key) DO NOTHING;

-- 3. Lønkørsler — admin markerer en måned som sendt
CREATE TABLE IF NOT EXISTS loenkoersel (
  id        SERIAL PRIMARY KEY,
  maaned    VARCHAR(7)  NOT NULL,
  koert_af  INTEGER     NOT NULL REFERENCES brugere(id),
  koert_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE(maaned)
);
