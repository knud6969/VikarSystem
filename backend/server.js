const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

app.get('/teachers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teachers');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});