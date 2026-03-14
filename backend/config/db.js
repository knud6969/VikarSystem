require('dotenv').config();
const { Pool, types } = require('pg');

// Returner PostgreSQL DATE som streng i stedet for JavaScript Date-objekt
// Dette sikrer at datosammenligninger som f.end_date >= '2026-03-13' virker korrekt
types.setTypeParser(1082, (val) => val); // DATE → streng 'YYYY-MM-DD'

const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     process.env.DB_PORT || 5432,
});

pool.on('error', (err) => {
  console.error('Uventet databasefejl:', err);
});

module.exports = pool;