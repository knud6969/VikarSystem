# VikarSystem

System til vikarstyring i danske folkeskoler.

---

## Kom i gang

### Forudsætninger

- [Node.js](https://nodejs.org) v18 eller nyere
- [nvm](https://github.com/nvm-sh/nvm) anbefales til at styre Node-versioner

### 1. Klon repository

```bash
git clone https://github.com/knudaundal/VikarSystem.git
cd VikarSystem
```

### 2. Installer afhængigheder

```bash
npm install
cd frontend && npm install && cd ..
```

### 3. Opret `.env`-fil

Kopiér eksempel-filen og udfyld med de delte databaseoplysninger (få dem af Knud):

```bash
cp .env.example .env
```

`.env` skal indeholde:

```env
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
DB_PORT=5432
JWT_SECRET=...
JWT_EXPIRES_IN=8h
```

### 4. Start systemet

```bash
npm run dev
```

Dette starter både backend (port 3000) og frontend (port 5173) samtidig.

Åbn browseren på **http://localhost:5173**

---

## Testlogins

| Rolle   | Email                         | Password     |
|---------|-------------------------------|--------------|
| Admin   | admin@skole.dk                | admin123     |
| Lærer   | anders.hansen@skole.dk        | password123  |
| Lærer   | mette.nielsen@skole.dk        | password123  |
| Vikar   | kasper@vikar.dk               | vikar123     |
| Vikar   | sofie@vikar.dk                | vikar123     |

Alle lærere bruger `password123`, alle vikarer bruger `vikar123`.

---

## Kommandoer

| Kommando                  | Beskrivelse                        |
|---------------------------|------------------------------------|
| `npm run dev`             | Start backend + frontend           |
| `npm run dev:backend`     | Start kun backend                  |
| `npm run dev:frontend`    | Start kun frontend                 |
| `node seed-users.js`      | Opret admin-bruger                 |
| `node seed-mockdata.js`   | Opret testdata (lærere, vikarer, lektioner) |
| `node seed-tilgaengelighed.js` | Forny vikar-tilgængelighed    |
| `node backend/test-db.js` | Test databaseforbindelse           |

---

## Projektstruktur

```
VikarSystem/
├── backend/
│   ├── config/        # Databasekonfiguration
│   ├── controllers/   # Forretningslogik (MVC)
│   ├── middleware/    # JWT-autentificering
│   ├── models/        # Databaseforespørgsler (MVC)
│   ├── routes/        # API-ruter (MVC)
│   └── server.js      # Entry point
├── frontend/
│   └── src/
│       ├── api/       # Service-lag (API-kald)
│       ├── components/# Genbrugelige UI-komponenter
│       ├── context/   # Auth-context
│       ├── hooks/     # Custom React hooks
│       ├── pages/     # Sider (Admin, Vikar, Lærer)
│       └── utils/     # Hjælpefunktioner
├── schema.sql          # Databaseskema
├── seed-mockdata.js    # Testdata
└── package.json
```