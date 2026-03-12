require('dotenv').config();
const bcrypt = require('bcrypt');
const pool   = require('./backend/config/db');

// ── Vikarer med login ─────────────────────────────────────────
const vikarer = [
  { name: 'Kasper Lund',      email: 'kasper@vikar.dk',   phone: '20 11 22 33' },
  { name: 'Sofie Dahl',       email: 'sofie@vikar.dk',    phone: '31 22 33 44' },
  { name: 'Mikkel Holm',      email: 'mikkel@vikar.dk',   phone: '42 33 44 55' },
  { name: 'Emma Kjær',        email: 'emma@vikar.dk',     phone: '53 44 55 66' },
  { name: 'Oliver Frost',     email: 'oliver@vikar.dk',   phone: '64 55 66 77' },
];

const VIKAR_PASSWORD = 'vikar123';

// ── Lærere ────────────────────────────────────────────────────
const laerere = [
  { name: 'Anders Hansen'    },
  { name: 'Mette Nielsen'    },
  { name: 'Søren Pedersen'   },
  { name: 'Lise Andersen'    },
  { name: 'Peter Christensen'},
  { name: 'Hanne Møller'     },
  { name: 'Rasmus Berg'      },
  { name: 'Trine Skov'       },
];

// ── Klasser ───────────────────────────────────────────────────
const klasser = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A', '6A'];

// ── Fag og lokaler ────────────────────────────────────────────
const fag     = ['Dansk', 'Matematik', 'Engelsk', 'Naturfag', 'Historie', 'Idræt', 'Musik', 'Geografi', 'Billedkunst'];
const lokaler = ['A1', 'A2', 'B3', 'B4', 'C1', 'Sal', 'Idrætsal'];

// ── Hjælpefunktioner ──────────────────────────────────────────
function getMandagDenne() {
  const d = new Date();
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function tilfældig(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Lektionstider — 6 mulige slots per dag
const SLOTS = [
  ['08:00', '09:00'],
  ['09:05', '10:05'],
  ['10:15', '11:15'],
  ['11:20', '12:20'],
  ['12:50', '13:50'],
  ['13:55', '14:55'],
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Klasser ──────────────────────────────────────────
    console.log('Opretter klasser…');
    const klasseIds = [];
    for (const name of klasser) {
      const res = await client.query(
        `INSERT INTO klasser (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name]
      );
      klasseIds.push(res.rows[0].id);
    }

    // ── 2. Lærere ───────────────────────────────────────────
    console.log('Opretter lærere…');
    const laererIds = [];
    for (const l of laerere) {
      const existing = await client.query('SELECT id FROM laerere WHERE name = $1', [l.name]);
      if (existing.rows.length > 0) {
        laererIds.push(existing.rows[0].id);
      } else {
        const res = await client.query(
          `INSERT INTO laerere (name, status) VALUES ($1, 'aktiv') RETURNING id`,
          [l.name]
        );
        laererIds.push(res.rows[0].id);
      }
    }

    // ── 3. Vikarer med login ────────────────────────────────
    console.log('Opretter vikarer med login…');
    const vikarIds = [];
    const hash = await bcrypt.hash(VIKAR_PASSWORD, 10);

    for (const v of vikarer) {
      // Opret bruger
      const brugerRes = await client.query(
        `INSERT INTO brugere (email, password_hash, rolle)
         VALUES ($1, $2, 'vikar')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id`,
        [v.email, hash]
      );
      const userId = brugerRes.rows[0].id;

      // Opret vikarprofil
      const existing = await client.query('SELECT id FROM vikarer WHERE user_id = $1', [userId]);
      if (existing.rows.length > 0) {
        vikarIds.push(existing.rows[0].id);
      } else {
        const vikarRes = await client.query(
          `INSERT INTO vikarer (user_id, name, phone) VALUES ($1, $2, $3) RETURNING id`,
          [userId, v.name, v.phone]
        );
        vikarIds.push(vikarRes.rows[0].id);
      }
    }

    // ── 4. Lektioner for denne uge ──────────────────────────
    console.log('Opretter lektioner for denne uge…');
    const mandag = getMandagDenne();
    let lektionerOprettet = 0;

    for (let dagOffset = 0; dagOffset < 5; dagOffset++) {
      const dag = new Date(mandag);
      dag.setDate(dag.getDate() + dagOffset);

      for (let li = 0; li < laererIds.length; li++) {
        const laererId  = laererIds[li];
        const klasserId = klasseIds[li % klasseIds.length];
        // 2-4 lektioner per lærer per dag
        const antal  = 2 + Math.floor(Math.random() * 3);
        const slots  = SLOTS.slice(0, antal);

        for (const [start, slut] of slots) {
          const startTime = new Date(dag);
          const [sh, sm] = start.split(':');
          startTime.setHours(Number(sh), Number(sm), 0, 0);

          const endTime = new Date(dag);
          const [eh, em] = slut.split(':');
          endTime.setHours(Number(eh), Number(em), 0, 0);

          await client.query(
            `INSERT INTO lektioner (teacher_id, class_id, subject, room, start_time, end_time, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'normal')`,
            [laererId, klasserId, tilfældig(fag), tilfældig(lokaler), startTime.toISOString(), endTime.toISOString()]
          );
          lektionerOprettet++;
        }
      }
    }

    // ── 5. Tilgængelighed for vikarer (hele denne uge) ──────
    console.log('Opretter tilgængelighed for vikarer…');
    let tilgaengelighedOprettet = 0;

    for (let dagOffset = 0; dagOffset < 5; dagOffset++) {
      const dag = new Date(mandag);
      dag.setDate(dag.getDate() + dagOffset);
      const dagStr = dag.toISOString().slice(0, 10);

      for (const vikarId of vikarIds) {
        // Alle vikarer er ledige hele dagen (08:00-15:00)
        await client.query(
          `INSERT INTO tilgaengelighed (substitute_id, date, start_time, end_time, status)
           VALUES ($1, $2, '08:00', '15:00', 'ledig')
           ON CONFLICT (substitute_id, date, start_time) DO NOTHING`,
          [vikarId, dagStr]
        );
        tilgaengelighedOprettet++;
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ Mockdata oprettet:\n');
    console.log(`  ${klasser.length} klasser`);
    console.log(`  ${laerere.length} lærere`);
    console.log(`  ${vikarer.length} vikarer med login`);
    console.log(`  ${lektionerOprettet} lektioner (denne uge)`);
    console.log(`  ${tilgaengelighedOprettet} tilgængeligheds-poster\n`);
    console.log('Vikar-logins:');
    vikarer.forEach(v => console.log(`  ${v.email.padEnd(22)} — ${VIKAR_PASSWORD}`));
    console.log('');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Fejl:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();