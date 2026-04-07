/**
 * Seed personal_email for test users.
 * Run once: node seed-personal-emails.js
 */
require('dotenv').config();
const pool = require('./backend/config/db');

async function seed() {
  try {
    const updates = [
      { email: 'anders.hansen@skole.dk', personal_email: 'anders.hansen@gmail.com' },
      { email: 'kasper@vikar.dk',         personal_email: 'kaspernielsen@gmail.com'  },
    ];

    for (const { email, personal_email } of updates) {
      const res = await pool.query(
        'UPDATE brugere SET personal_email = $1 WHERE email = $2 RETURNING email, personal_email',
        [personal_email, email]
      );
      if (res.rowCount > 0) {
        console.log(`✓ ${email} → personal_email: ${personal_email}`);
      } else {
        console.log(`✗ Bruger ikke fundet: ${email}`);
      }
    }

    // Also update any other laerere/vikarer that have a user_id linked
    const laerere = await pool.query(`
      SELECT b.email FROM brugere b
      JOIN laerere la ON la.user_id = b.id
      WHERE b.personal_email IS NULL AND b.email NOT IN (${updates.map((_, i) => `$${i+1}`).join(',')})
    `, updates.map(u => u.email));

    for (const row of laerere.rows) {
      const localPart = row.email.split('@')[0];
      const personal = `${localPart}@gmail.com`;
      await pool.query('UPDATE brugere SET personal_email = $1 WHERE email = $2', [personal, row.email]);
      console.log(`✓ ${row.email} → personal_email: ${personal}`);
    }

    const vikarer = await pool.query(`
      SELECT b.email FROM brugere b
      JOIN vikarer v ON v.user_id = b.id
      WHERE b.personal_email IS NULL AND b.email NOT IN (${updates.map((_, i) => `$${i+1}`).join(',')})
    `, updates.map(u => u.email));

    for (const row of vikarer.rows) {
      const localPart = row.email.split('@')[0];
      const personal = `${localPart}@gmail.com`;
      await pool.query('UPDATE brugere SET personal_email = $1 WHERE email = $2', [personal, row.email]);
      console.log(`✓ ${row.email} → personal_email: ${personal}`);
    }

    console.log('\nFærdig!');
  } catch (err) {
    console.error('Fejl:', err.message);
  } finally {
    pool.end();
  }
}

seed();
