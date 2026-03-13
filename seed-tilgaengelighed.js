/**
 * seed-tilgaengelighed.js
 *
 * Opretter/fornyer tilgængelighed for alle vikarer for indeværende + næste uge.
 * Kør når tilgængelighed er udløbet: node seed-tilgaengelighed.js
 */
require('dotenv').config();
const pool = require('./backend/config/db');

function getMandagDenne() {
  const d = new Date();
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function seed() {
  const client = await pool.connect();
  try {
    // Hent alle vikarer
    const vikarRes = await client.query('SELECT id, name FROM vikarer ORDER BY name');
    const vikarer = vikarRes.rows;

    if (vikarer.length === 0) {
      console.log('Ingen vikarer fundet — kør seed-mockdata.js først');
      return;
    }

    const mandag = getMandagDenne();
    let oprettet = 0;

    // Opret tilgængelighed for indeværende + næste uge (10 dage)
    for (let dagOffset = 0; dagOffset < 10; dagOffset++) {
      const dag = new Date(mandag);
      dag.setDate(dag.getDate() + dagOffset);

      // Spring weekender over
      const ugedag = dag.getDay();
      if (ugedag === 0 || ugedag === 6) continue;

      const dagStr = dag.toLocaleDateString('sv-SE');

      for (const vikar of vikarer) {
        await client.query(`
          INSERT INTO tilgaengelighed (substitute_id, date, start_time, end_time, status)
          VALUES ($1, $2, '08:00', '15:00', 'ledig')
          ON CONFLICT (substitute_id, date, start_time) DO NOTHING
        `, [vikar.id, dagStr]);
        oprettet++;
      }
    }

    console.log(`✅ Tilgængelighed oprettet/fornyet for ${vikarer.length} vikarer`);
    console.log(`   ${oprettet} rækker (ON CONFLICT DO NOTHING springer eksisterende over)`);
    vikarer.forEach(v => console.log(`   · ${v.name}`));

  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Fejl:', err.message);
  process.exit(1);
});