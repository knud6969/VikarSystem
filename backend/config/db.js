require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: 'knudaundal',      // dit mac username
  host: 'localhost',
  database: 'vikarsystem',
  password: '6tfghy6TF',            // ofte tom på local Mac
  port: 5432,
});

pool.on('error', (err) => {
  console.error('Uventet databasefejl:', err);
});

module.exports = pool;