const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ===== VIKAR ENDPOINTS =====

// Get all vikarer
app.get('/api/vikarer', (req, res) => {
  db.all('SELECT * FROM vikarer ORDER BY navn', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Mark vikar as unavailable for a specific date
app.post('/api/vikarer/:id/utilgaengelig', (req, res) => {
  const { id } = req.params;
  const { dato } = req.body;

  if (!dato) {
    return res.status(400).json({ error: 'Dato er påkrævet' });
  }

  db.run(
    'INSERT INTO utilgaengelighed (vikar_id, dato) VALUES (?, ?)',
    [id, dato],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Allerede markeret som utilgængelig' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, vikar_id: id, dato });
    }
  );
});

// Remove unavailability
app.delete('/api/vikarer/:id/utilgaengelig/:dato', (req, res) => {
  const { id, dato } = req.params;

  db.run(
    'DELETE FROM utilgaengelighed WHERE vikar_id = ? AND dato = ?',
    [id, dato],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Get unavailability for a vikar
app.get('/api/vikarer/:id/utilgaengelig', (req, res) => {
  const { id } = req.params;

  db.all(
    'SELECT * FROM utilgaengelighed WHERE vikar_id = ? ORDER BY dato',
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// ===== LÆRER ENDPOINTS =====

// Get all lærere
app.get('/api/laerere', (req, res) => {
  db.all('SELECT * FROM laerere ORDER BY navn', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// ===== ADMIN ENDPOINTS =====

// Mark teacher as sick
app.post('/api/admin/sygdom', (req, res) => {
  const { laerer_id, dato } = req.body;

  if (!laerer_id || !dato) {
    return res.status(400).json({ error: 'Lærer ID og dato er påkrævet' });
  }

  db.run(
    'INSERT INTO sygdom (laerer_id, dato) VALUES (?, ?)',
    [laerer_id, dato],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Lærer er allerede sygemeldt denne dag' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, laerer_id, dato, dækket: false });
    }
  );
});

// Get all sick leave records
app.get('/api/admin/sygdom', (req, res) => {
  const query = `
    SELECT s.*, l.navn as laerer_navn, l.fag, v.navn as vikar_navn
    FROM sygdom s
    JOIN laerere l ON s.laerer_id = l.id
    LEFT JOIN vikarer v ON s.vikar_id = v.id
    ORDER BY s.dato DESC, s.dækket ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get available vikarer for a specific date
app.get('/api/admin/ledige-vikarer/:dato', (req, res) => {
  const { dato } = req.params;

  const query = `
    SELECT v.* 
    FROM vikarer v
    WHERE v.id NOT IN (
      SELECT vikar_id FROM utilgaengelighed WHERE dato = ?
    )
    AND v.id NOT IN (
      SELECT vikar_id FROM sygdom WHERE dato = ? AND vikar_id IS NOT NULL
    )
    ORDER BY v.navn
  `;

  db.all(query, [dato, dato], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Assign vikar to cover sick leave
app.put('/api/admin/sygdom/:id/daek', (req, res) => {
  const { id } = req.params;
  const { vikar_id } = req.body;

  if (!vikar_id) {
    return res.status(400).json({ error: 'Vikar ID er påkrævet' });
  }

  db.run(
    'UPDATE sygdom SET vikar_id = ?, dækket = 1 WHERE id = ?',
    [vikar_id, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Sygdom ikke fundet' });
      }
      res.json({ success: true, id, vikar_id });
    }
  );
});

// Remove vikar assignment
app.put('/api/admin/sygdom/:id/fjern-vikar', (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE sygdom SET vikar_id = NULL, dækket = 0 WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Sygdom ikke fundet' });
      }
      res.json({ success: true, id });
    }
  );
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VikarSystem kører på http://localhost:${PORT}`);
});

module.exports = app;
