require('dotenv').config();
const bcrypt = require('bcrypt');
const pool   = require('./backend/config/db');

const vikarer = [
  { name: 'Kasper Lund',   email: 'kasper@vikar.dk',  phone: '20 11 22 33' },
  { name: 'Sofie Dahl',    email: 'sofie@vikar.dk',   phone: '31 22 33 44' },
  { name: 'Mikkel Holm',   email: 'mikkel@vikar.dk',  phone: '42 33 44 55' },
  { name: 'Emma Kjær',     email: 'emma@vikar.dk',    phone: '53 44 55 66' },
  { name: 'Oliver Frost',  email: 'oliver@vikar.dk',  phone: '64 55 66 77' },
];

const laerere = [
  { name: 'Anders Hansen',     email: 'anders.hansen@skole.dk'     },
  { name: 'Mette Nielsen',     email: 'mette.nielsen@skole.dk'     },
  { name: 'Søren Pedersen',    email: 'soren.pedersen@skole.dk'    },
  { name: 'Lise Andersen',     email: 'lise.andersen@skole.dk'     },
  { name: 'Peter Christensen', email: 'peter.christensen@skole.dk' },
  { name: 'Hanne Møller',      email: 'hanne.moller@skole.dk'      },
  { name: 'Rasmus Berg',       email: 'rasmus.berg@skole.dk'       },
  { name: 'Trine Skov',        email: 'trine.skov@skole.dk'        },
];

const paedagoger = [
  { name: 'Maria Lund',    email: 'maria.lund@skole.dk'    },
  { name: 'Brian Kofoed',  email: 'brian.kofoed@skole.dk'  },
  { name: 'Pia Vestergaard', email: 'pia.vestergaard@skole.dk' },
];

const klasser = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A', '6A'];
const fag     = ['Dansk', 'Matematik', 'Engelsk', 'Naturfag', 'Historie', 'Idræt', 'Musik', 'Geografi', 'Billedkunst'];
const lokaler = ['A1', 'A2', 'B3', 'B4', 'C1', 'Sal', 'Idrætsal'];

const SLOTS = [
  ['08:00', '08:45'],
  ['08:50', '09:35'],
  ['09:40', '10:25'],
  ['10:40', '11:25'],
  ['11:30', '12:15'],
  ['13:00', '13:45'],
  ['13:50', '14:35'],
];

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

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Klasser
    console.log('Opretter klasser…');
    const klasseIds = [];
    for (const name of klasser) {
      const res = await client.query(
        `INSERT INTO klasser (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [name]
      );
      klasseIds.push(res.rows[0].id);
    }

    // Lærere med login
    console.log('Opretter lærere med login…');
    const laererIds = [];
    const laererHash = await bcrypt.hash('password123', 10);
    for (const l of laerere) {
      const brugerRes = await client.query(
        `INSERT INTO brugere (email, password_hash, rolle)
         VALUES ($1, $2, 'laerer')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING id`,
        [l.email, laererHash]
      );
      const userId = brugerRes.rows[0].id;

      const existing = await client.query('SELECT id FROM laerere WHERE user_id = $1', [userId]);
      if (existing.rows.length > 0) {
        laererIds.push(existing.rows[0].id);
      } else {
        const res = await client.query(
          `INSERT INTO laerere (user_id, name, status) VALUES ($1, $2, 'aktiv') RETURNING id`,
          [userId, l.name]
        );
        laererIds.push(res.rows[0].id);
      }
    }

    // Pædagoger
    console.log('Opretter pædagoger med login…');
    const paedagogIds = [];
    for (const p of paedagoger) {
      const brugerRes = await client.query(
        `INSERT INTO brugere (email, password_hash, rolle)
         VALUES ($1, $2, 'laerer')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING id`,
        [p.email, laererHash]
      );
      const userId = brugerRes.rows[0].id;

      const existing = await client.query('SELECT id FROM laerere WHERE user_id = $1', [userId]);
      if (existing.rows.length > 0) {
        await client.query("UPDATE laerere SET type = 'paedagog' WHERE id = $1", [existing.rows[0].id]);
        paedagogIds.push(existing.rows[0].id);
      } else {
        const res = await client.query(
          `INSERT INTO laerere (user_id, name, status, type) VALUES ($1, $2, 'aktiv', 'paedagog') RETURNING id`,
          [userId, p.name]
        );
        paedagogIds.push(res.rows[0].id);
      }
    }

    // Vikarer
    console.log('Opretter vikarer med login…');
    const vikarIds = [];
    const vikarHash = await bcrypt.hash('vikar123', 10);
    for (const v of vikarer) {
      const brugerRes = await client.query(
        `INSERT INTO brugere (email, password_hash, rolle)
         VALUES ($1, $2, 'vikar')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING id`,
        [v.email, vikarHash]
      );
      const userId = brugerRes.rows[0].id;

      const existing = await client.query('SELECT id FROM vikarer WHERE user_id = $1', [userId]);
      if (existing.rows.length > 0) {
        vikarIds.push(existing.rows[0].id);
      } else {
        const res = await client.query(
          `INSERT INTO vikarer (user_id, name, phone) VALUES ($1, $2, $3) RETURNING id`,
          [userId, v.name, v.phone]
        );
        vikarIds.push(res.rows[0].id);
      }
    }

    // Lektioner
    console.log('Opretter lektioner…');
    const mandag = getMandagDenne();
    let lektionerOprettet = 0;

    for (let dagOffset = 0; dagOffset < 5; dagOffset++) {
      const dag = new Date(mandag);
      dag.setDate(dag.getDate() + dagOffset);

      for (let li = 0; li < laererIds.length; li++) {
        const laererId  = laererIds[li];
        const klasserId = klasseIds[li % klasseIds.length];
        const antal     = 4 + Math.floor(Math.random() * 3);
        const shuffled  = [...SLOTS].sort(() => Math.random() - 0.5);
        const valgteSlots = shuffled.slice(0, antal);

        for (const [start, slut] of valgteSlots) {
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

    // Lektioner for pædagoger
    const paedagogFag = ['SFO', 'Støtte', 'Specialklasse', 'Mellemordning', '0. klasse'];
    for (let dagOffset = 0; dagOffset < 5; dagOffset++) {
      const dag = new Date(mandag);
      dag.setDate(dag.getDate() + dagOffset);

      for (let pi = 0; pi < paedagogIds.length; pi++) {
        const paedagogId = paedagogIds[pi];
        const klasserId  = klasseIds[pi % klasseIds.length];
        const antal      = 3 + Math.floor(Math.random() * 2);
        const shuffled   = [...SLOTS].sort(() => Math.random() - 0.5);
        const valgteSlots = shuffled.slice(0, antal);

        for (const [start, slut] of valgteSlots) {
          const startTime = new Date(dag);
          const [sh, sm] = start.split(':');
          startTime.setHours(Number(sh), Number(sm), 0, 0);

          const endTime = new Date(dag);
          const [eh, em] = slut.split(':');
          endTime.setHours(Number(eh), Number(em), 0, 0);

          await client.query(
            `INSERT INTO lektioner (teacher_id, class_id, subject, room, start_time, end_time, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'normal')`,
            [paedagogId, klasserId, tilfældig(paedagogFag), tilfældig(lokaler), startTime.toISOString(), endTime.toISOString()]
          );
          lektionerOprettet++;
        }
      }
    }

    // Tilgængelighed for vikarer
    console.log('Opretter tilgængelighed…');
    for (let dagOffset = 0; dagOffset < 5; dagOffset++) {
      const dag = new Date(mandag);
      dag.setDate(dag.getDate() + dagOffset);
      const dagStr = dag.toLocaleDateString('sv-SE');
      for (const vikarId of vikarIds) {
        await client.query(
          `INSERT INTO tilgaengelighed (substitute_id, date, start_time, end_time, status)
           VALUES ($1, $2, '08:00', '15:00', 'ledig')
           ON CONFLICT (substitute_id, date, start_time) DO NOTHING`,
          [vikarId, dagStr]
        );
      }
    }

    await client.query('COMMIT');

    console.log(`\n✅ Færdig!\n`);
    console.log(`  ${klasser.length} klasser`);
    console.log(`  ${laerere.length} lærere`);
    console.log(`  ${paedagoger.length} pædagoger`);
    console.log(`  ${vikarer.length} vikarer`);
    console.log(`  ${lektionerOprettet} lektioner\n`);
    console.log('Lærer-logins (password: password123):');
    laerere.forEach(l => console.log(`  ${l.email}`));
    console.log('\nPædagog-logins (password: password123):');
    paedagoger.forEach(p => console.log(`  ${p.email}`));
    console.log('\nVikar-logins (password: vikar123):');
    vikarer.forEach(v => console.log(`  ${v.email}`));

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