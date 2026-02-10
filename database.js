const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'vikarsystem.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Vikarer (Substitutes) table
  db.run(`CREATE TABLE IF NOT EXISTS vikarer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    navn TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Lærere (Teachers) table
  db.run(`CREATE TABLE IF NOT EXISTS laerere (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    navn TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    fag TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Utilgængelighed (Unavailability) table - vikarer mark days they cannot work
  db.run(`CREATE TABLE IF NOT EXISTS utilgaengelighed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vikar_id INTEGER NOT NULL,
    dato DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vikar_id) REFERENCES vikarer(id),
    UNIQUE(vikar_id, dato)
  )`);

  // Sygdom (Sick leave) table - teachers who are sick
  db.run(`CREATE TABLE IF NOT EXISTS sygdom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    laerer_id INTEGER NOT NULL,
    dato DATE NOT NULL,
    dækket BOOLEAN DEFAULT 0,
    vikar_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (laerer_id) REFERENCES laerere(id),
    FOREIGN KEY (vikar_id) REFERENCES vikarer(id),
    UNIQUE(laerer_id, dato)
  )`);

  // Insert some sample data
  db.run(`INSERT OR IGNORE INTO vikarer (navn, email, telefon) VALUES 
    ('Anna Nielsen', 'anna@vikar.dk', '12345678'),
    ('Lars Jensen', 'lars@vikar.dk', '23456789'),
    ('Marie Andersen', 'marie@vikar.dk', '34567890')`);

  db.run(`INSERT OR IGNORE INTO laerere (navn, email, fag) VALUES 
    ('Bent Larsen', 'bent@skole.dk', 'Matematik'),
    ('Karen Petersen', 'karen@skole.dk', 'Dansk'),
    ('Peter Hansen', 'peter@skole.dk', 'Engelsk')`);
});

module.exports = db;
