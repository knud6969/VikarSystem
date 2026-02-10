# VikarSystem - Brugervejledning

Dette system er udviklet til at håndtere vikardækning ved læreres sygdom i folkeskoler.

## Funktionalitet

### For Vikarer
- Se alle registrerede vikarer
- Markere sig som utilgængelig på specifikke datoer
- Se sine egne utilgængelige dage
- Fjerne utilgængelighed

### For Administratorer
- Sygemelde lærere for specifikke datoer
- Se alle sygemeldinger
- Tjekke hvilke vikarer der er ledige på en given dato
- Tildele vikarer til at dække syge lærers timer
- Fjerne vikar-tildelinger

## Installation og Kørsel

### Installation
```bash
npm install
```

### Start serveren
```bash
npm start
```

Serveren kører på http://localhost:3000

## Database

Systemet bruger SQLite database, som automatisk oprettes ved første kørsel.

### Database struktur:
- **vikarer**: Opbevarer information om vikarer (navn, email, telefon)
- **laerere**: Opbevarer information om lærere (navn, email, fag)
- **utilgaengelighed**: Gemmer datoer hvor vikarer er utilgængelige
- **sygdom**: Registrerer sygemeldinger og vikar-tildelinger

### Eksempeldata
Systemet indeholder følgende eksempeldata ved opstart:

**Vikarer:**
- Anna Nielsen (anna@vikar.dk)
- Lars Jensen (lars@vikar.dk)
- Marie Andersen (marie@vikar.dk)

**Lærere:**
- Bent Larsen - Matematik (bent@skole.dk)
- Karen Petersen - Dansk (karen@skole.dk)
- Peter Hansen - Engelsk (peter@skole.dk)

## API Endpoints

### Vikar endpoints
- `GET /api/vikarer` - Hent alle vikarer
- `GET /api/vikarer/:id/utilgaengelig` - Hent utilgængelige datoer for en vikar
- `POST /api/vikarer/:id/utilgaengelig` - Markér vikar som utilgængelig (body: {dato})
- `DELETE /api/vikarer/:id/utilgaengelig/:dato` - Fjern utilgængelighed

### Lærer endpoints
- `GET /api/laerere` - Hent alle lærere

### Admin endpoints
- `GET /api/admin/sygdom` - Hent alle sygemeldinger
- `POST /api/admin/sygdom` - Sygemeld lærer (body: {laerer_id, dato})
- `GET /api/admin/ledige-vikarer/:dato` - Hent ledige vikarer for en dato
- `PUT /api/admin/sygdom/:id/dæk` - Tildel vikar (body: {vikar_id})
- `PUT /api/admin/sygdom/:id/fjern-vikar` - Fjern vikar-tildeling

## Brugergrænseflade

### Vikar Panel
1. Vælg din profil fra dropdown-menuen
2. Tilføj datoer hvor du er utilgængelig
3. Se og administrer dine utilgængelige dage

### Admin Panel
1. **Sygemeld lærer**: Vælg lærer og dato, tryk "Sygemeld lærer"
2. **Se ledige vikarer**: Vælg dato og tryk "Tjek ledige vikarer"
3. **Tildel vikar**: I sygemeldingstabellen, tryk "Tildel vikar" for udækkede vagter
4. **Fjern vikar**: Tryk "Fjern vikar" for at fjerne en tildeling

## Teknologi

- **Backend**: Node.js med Express
- **Database**: SQLite3
- **Frontend**: Vanilla JavaScript med moderne CSS
- **Styling**: Gradient design med responsive layout
