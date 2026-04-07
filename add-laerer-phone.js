/**
 * Migration: Tilføj manglende kolonner.
 *   - laerere.phone
 *   - brugere.personal_email
 * Kør én gang: node add-laerer-phone.js
 */
require('dotenv').config();
const pool = require('./backend/config/db');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE laerere ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`);
    console.log('✓ laerere.phone tilføjet (eller eksisterede allerede)');

    await pool.query(`ALTER TABLE brugere ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255)`);
    console.log('✓ brugere.personal_email tilføjet (eller eksisterede allerede)');
  } catch (err) {
    console.error('Fejl:', err.message);
  } finally {
    pool.end();
  }
}

migrate();
