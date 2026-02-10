# VikarSystem - Implementation Complete

## Oversigt

Dette projekt implementerer et komplet vikarstyringssystem til folkeskoler, som specificeret i kravene.

## Implementerede Funktioner

### 1. Database (SQLite)
- **vikarer**: Gemmer vikarer med navn, email og telefon
- **laerere**: Gemmer lærere med navn, email og fag
- **utilgaengelighed**: Registrerer dage hvor vikarer er utilgængelige
- **sygdom**: Håndterer sygemeldinger og vikar-tildelinger

### 2. Vikar Funktionalitet
✅ Vikarer kan se listen af alle vikarer i systemet
✅ Vikarer kan markere sig selv som utilgængelig på specifikke datoer
✅ Vikarer kan se deres egne utilgængelige dage
✅ Vikarer kan fjerne utilgængelighed

### 3. Administrator Funktionalitet
✅ Admins kan sygemelde lærere på specifikke datoer
✅ Admins kan se alle sygemeldinger med status (dækket/ikke dækket)
✅ Admins kan tjekke hvilke vikarer der er ledige på en given dato
✅ Admins kan tildele vikarer til at dække syge lærers timer
✅ Admins kan fjerne vikar-tildelinger
✅ Systemet viser automatisk kun ledige vikarer (filtrerer dem der er utilgængelige eller allerede tildelt)

### 4. Sikkerhed
✅ Rate limiting implementeret (100 requests per 15 minutter per IP)
✅ Ingen sikkerhedssårbarheder fundet af CodeQL
✅ Database placeret i .gitignore for at undgå at committe følsomme data

## Testdata

Systemet inkluderer følgende eksempeldata:

**Vikarer:**
- Anna Nielsen (anna@vikar.dk, 12345678)
- Lars Jensen (lars@vikar.dk, 23456789)
- Marie Andersen (marie@vikar.dk, 34567890)

**Lærere:**
- Bent Larsen - Matematik (bent@skole.dk)
- Karen Petersen - Dansk (karen@skole.dk)
- Peter Hansen - Engelsk (peter@skole.dk)

## API Endpoints

### Vikar Endpoints
- `GET /api/vikarer` - Hent alle vikarer
- `GET /api/vikarer/:id/utilgaengelig` - Hent utilgængelige datoer
- `POST /api/vikarer/:id/utilgaengelig` - Markér utilgængelig
- `DELETE /api/vikarer/:id/utilgaengelig/:dato` - Fjern utilgængelighed

### Lærer Endpoints
- `GET /api/laerere` - Hent alle lærere

### Admin Endpoints
- `GET /api/admin/sygdom` - Hent alle sygemeldinger
- `POST /api/admin/sygdom` - Sygemeld lærer
- `GET /api/admin/ledige-vikarer/:dato` - Hent ledige vikarer
- `PUT /api/admin/sygdom/:id/daek` - Tildel vikar
- `PUT /api/admin/sygdom/:id/fjern-vikar` - Fjern vikar

## Installation og Kørsel

```bash
# Installer dependencies
npm install

# Start serveren
npm start
```

Serveren kører på http://localhost:3000

## Teknisk Stack

- **Backend**: Node.js med Express framework
- **Database**: SQLite3 (embedded database)
- **Frontend**: Vanilla JavaScript med moderne CSS
- **Sikkerhed**: Express rate limiting
- **Design**: Gradient UI med responsive layout

## Filstruktur

```
VikarSystem/
├── server.js           # Express server med API endpoints
├── database.js         # Database setup og initialisering
├── package.json        # NPM dependencies
├── public/
│   └── index.html      # Web frontend
├── README.md           # Projekt beskrivelse
└── README_USAGE.md     # Detaljeret brugervejledning
```

## Test Scenarie

1. Start serveren: `npm start`
2. Åbn http://localhost:3000 i en browser
3. Test Vikar Panel:
   - Vælg "Anna Nielsen"
   - Se hendes utilgængelige dag (15. februar 2026)
4. Test Admin Panel:
   - Se at Bent Larsen er sygemeldt 15. februar
   - Se at Lars Jensen er tildelt som vikar
   - Test "Tjek ledige vikarer" for 15. februar (viser Lars Jensen og Marie Andersen, men ikke Anna)

## Sikkerhedsgennemgang

✅ CodeQL analyse bestået uden fejl
✅ Rate limiting implementeret på alle API routes
✅ Ingen sikkerhedssårbarheder fundet
✅ Database credentials ikke hardcoded
✅ Input validering på alle endpoints

## Fremtidige Forbedringer

Potentielle udvidelser kunne inkludere:
- Autentificering og autorisering (login system)
- Email notifikationer til vikarer ved tildeling
- Kalender visning af sygemeldinger
- Export af data til Excel/PDF
- Statistik og rapporter
- Multi-tenancy for flere skoler
