-- Migration: Tilføj kommentar til tilgaengelighed
-- Kør én gang: psql -U postgres -d vikarsystem -f migration-tilgaengelighed-kommentar.sql

ALTER TABLE tilgaengelighed
  ADD COLUMN IF NOT EXISTS kommentar VARCHAR(255);