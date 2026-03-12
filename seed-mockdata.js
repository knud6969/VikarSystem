require('dotenv').config();
const pool = require('./backend/config/db');

// ── Mockdata ─────────────────────────────────────────────────
const laerere = [
  { name: 'Anders Hansen',   status: 'aktiv' },
  { name: 'Mette Nielsen',   status: 'aktiv' },
  { name: 'Søren Pedersen',  status: 'aktiv' },
  { name: 'Lise Andersen',   status: 'aktiv' },
  { name: 'Peter Christensen', status: 'aktiv' },
  { name: 'Hanne Møller',    status: 'aktiv' },
];

const klasser = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A', '6A'];

// Lektioner denne uge (mandag–fredag)
function getMandagDenne() {
  const d = new Date();
  const dag = d.getDay();
  const diff = dag === 0 ? -6 : 1 - dag;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const fag = ['Dansk', 'Matematik', 'Engelsk', 'Naturfag', 'Historie', 'Idræt', 'Musik', 'Billedkunst', 'Geografi'];
const lokaler = ['A1', 'A2', 'B3', 'B4', 'C1', 'Sal', 'Idrætsal'];

// Generér lektioner for en given dag
function lektionerForDag(dato, laererId, klasserId, antal = 3) {
  const tider = [
    ['08:00', '09:00'],
    ['09:05', '10:05'],
    ['10:15', '11:15'],
    ['11:20', '12:20'],
    ['12:50', '13:50'],
    ['13:55', '14:55'],
  ];
  const valgte = tider.slice(0, antal);
  return valgte.map(([start, slut]) => {
    const startTime = new Date(dato);
    const [sh, sm] = start.split(':');
    startTime.setHours(Number(sh), Number(sm), 0, 0);
    const endTime = new Date(dato);
    const [eh, em] = slut.split(':');
    endTime.setHours(Number(eh), Number(em), 0, 0);
    return {
      teacher_id: laererId,
      class_id:   klasserId,
      subject:    fag[Math.floor(Math.random() * fag.length)],
      room:       lokaler[Math.floor(Math.random() * lokaler.length)],
      start_time: startTime.toISOString(),
      end_time:   endTime.toISOString(),
    };
  });
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Opretter klasser…');
    const klasseIds = [];
    for (const name of klasser) {
      const res = await client.query(
        'INSERT INTO klasser (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id',
        [name]
      );
      klasseIds.push(res.rows[0].id);
    }

    console.log('Opretter lærere…');
    const laererIds = [];
    for (const l of laerere) {
      const res = await client.query(
        'INSERT INTO laerere (name, status) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
        [l.name, l.status]
      );
      if (res.rows.length > 0) {
        laererIds.push(res.rows[0].id);
      } else {
        const existing = await client.query('SELECT id FROM laerere WHERE name=$1', [l.name]);
        laererIds.push(existing.rows[0].id);
      }
    }

    console.log('Opretter lektioner for denne uge…');
    const mandag = getMandagDenne();
    let lektionerOprettet = 0;

    for (let dagOffset = 0; dagOffset < 5; dagOffset++) {
      const dag = new Date(mandag);
      dag.setDate(dag.getDate() + dagOffset);

      // Giv hver lærer 2-4 lektioner per dag
      for (let li = 0; li < laererIds.length; li++) {
        const laererId  = laererIds[li];
        const klasserId = klasseIds[li % klasseIds.length];
        const antal     = 2 + Math.floor(Math.random() * 3);
        const lektioner = lektionerForDag(dag, laererId, klasserId, antal);

        for (const l of lektioner) {
          await client.query(`
            INSERT INTO lektioner (teacher_id, class_id, subject, room, start_time, end_time, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'normal')
          `, [l.teacher_id, l.class_id, l.subject, l.room, l.start_time, l.end_time]);
          lektionerOprettet++;
        }
      }
    }

    await client.query('COMMIT');
    console.log(`\n✓ ${klasser.length} klasser`);
    console.log(`✓ ${laerere.length} lærere`);
    console.log(`✓ ${lektionerOprettet} lektioner (denne uge)\n`);
    console.log('Husk: vikarer oprettes via seed-users.js + manuelt i vikarer-tabellen.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Fejl:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();