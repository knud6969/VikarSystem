require('dotenv').config();
const bcrypt = require('bcrypt');
const pool   = require('./backend/config/db');

const brugere = [
  {
    email:    'admin@skole.dk',
    password: 'admin123',
    rolle:    'admin',
  },
  {
    email:    'vikar1@skole.dk',
    password: 'vikar123',
    rolle:    'vikar',
  },
  {
    email:    'vikar2@skole.dk',
    password: 'vikar123',
    rolle:    'vikar',
  },
];

async function seed() {
  console.log('Opretter testbrugere...\n');

  for (const bruger of brugere) {
    const hash = await bcrypt.hash(bruger.password, 10);

    await pool.query(`
      INSERT INTO brugere (email, password_hash, rolle)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
    `, [bruger.email, hash, bruger.rolle]);

    console.log(`✓ ${bruger.rolle.padEnd(6)} — ${bruger.email}  (password: ${bruger.password})`);
  }

  console.log('\nFærdig!');
  await pool.end();
}

seed().catch(err => {
  console.error('Fejl:', err.message);
  process.exit(1);
});