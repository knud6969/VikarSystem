const pool = require('./db');

async function testDB() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('DB connected:', res.rows);
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    pool.end();
  }
}

testDB();