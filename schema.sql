-- VikarSystem Database Schema
-- Kør i psql: psql -U postgres -d vikarsystem -f schema.sql

-- ── Brugere ──────────────────────────────────────────────────
CREATE TABLE brugere (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rolle         VARCHAR(20)  NOT NULL CHECK (rolle IN ('admin', 'vikar')),
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Lærere ───────────────────────────────────────────────────
CREATE TABLE laerere (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  status     VARCHAR(20)  NOT NULL DEFAULT 'aktiv'
               CHECK (status IN ('aktiv', 'syg', 'fraværende')),
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Klasser ──────────────────────────────────────────────────
CREATE TABLE klasser (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL UNIQUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Vikarer ──────────────────────────────────────────────────
CREATE TABLE vikarer (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES brugere(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  phone      VARCHAR(20),
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Lektioner ────────────────────────────────────────────────
CREATE TABLE lektioner (
  id         SERIAL PRIMARY KEY,
  teacher_id INTEGER      NOT NULL REFERENCES laerere(id) ON DELETE CASCADE,
  class_id   INTEGER      NOT NULL REFERENCES klasser(id) ON DELETE CASCADE,
  subject    VARCHAR(100) NOT NULL,
  room       VARCHAR(50),
  start_time TIMESTAMP    NOT NULL,
  end_time   TIMESTAMP    NOT NULL,
  status     VARCHAR(20)  NOT NULL DEFAULT 'normal'
               CHECK (status IN ('normal', 'udækket', 'dækket')),
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Fravær ───────────────────────────────────────────────────
CREATE TABLE fravaer (
  id           SERIAL PRIMARY KEY,
  teacher_id   INTEGER    NOT NULL REFERENCES laerere(id) ON DELETE CASCADE,
  type         VARCHAR(20) NOT NULL DEFAULT 'syg'
                 CHECK (type IN ('syg', 'kursus', 'andet')),
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  oprettet_af  INTEGER     NOT NULL REFERENCES brugere(id),
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── Tildelinger ──────────────────────────────────────────────
CREATE TABLE tildelinger (
  id            SERIAL PRIMARY KEY,
  lesson_id     INTEGER   NOT NULL REFERENCES lektioner(id) ON DELETE CASCADE,
  substitute_id INTEGER   NOT NULL REFERENCES vikarer(id)  ON DELETE CASCADE,
  tildelt_af    INTEGER   NOT NULL REFERENCES brugere(id),
  assigned_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Tilgængelighed ───────────────────────────────────────────
CREATE TABLE tilgaengelighed (
  id            SERIAL PRIMARY KEY,
  substitute_id INTEGER     NOT NULL REFERENCES vikarer(id) ON DELETE CASCADE,
  date          DATE        NOT NULL,
  start_time    TIME        NOT NULL,
  end_time      TIME        NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'ledig'
                  CHECK (status IN ('ledig', 'optaget')),
  UNIQUE (substitute_id, date, start_time)
);