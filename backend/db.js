const { Pool } = require('pg');

const pool = new Pool({
  user: 'knudaundal',      // dit mac username
  host: 'localhost',
  database: 'vikarsystem',
  password: '6tfghy6TF',            // ofte tom på local Mac
  port: 5432,
});

module.exports = pool;