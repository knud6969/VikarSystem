# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs backend on :3000 + frontend on :5173 concurrently)
npm run dev

# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# Production (backend only)
npm start

# Verify database connection
node backend/test-db.js

# Seed test data
node seed-users.js           # Creates admin@skole.dk
node seed-mockdata.js        # Creates teachers, substitutes, lessons
node seed-tilgaengelighed.js # Creates substitute availability data
```

No linter or test framework is configured.

## Architecture

Full-stack app in Danish for managing substitute teachers (vikarer) at Danish schools.

**Backend:** Node.js + Express (port 3000), MVC pattern, PostgreSQL via Neon (serverless, SSL required)
**Frontend:** React 18 + Vite (port 5173), Tailwind CSS, React Router v6. Vite proxies all API routes to `:3000` during development.

### Backend structure

- `backend/config/db.js` — PostgreSQL connection pool
- `backend/middleware/authMiddleware.js` — JWT verification + role-based access (`admin`, `vikar`, `laerer`)
- `backend/models/` — Data access layer (raw SQL queries)
- `backend/controllers/` — Business logic
- `backend/routes/index.js` — All route registrations
- `backend/server.js` — Express entry point

### Frontend structure

- `frontend/src/api/client.js` — Central fetch wrapper that injects JWT from localStorage
- `frontend/src/api/*Service.js` — Per-entity service files wrapping `client.js`
- `frontend/src/context/AuthContext.jsx` — Auth state + `useAuth()` hook
- `frontend/src/components/common/ProtectedRoute.jsx` — Guards routes by role
- `frontend/src/pages/` — Full page components, one per role/view

### Core domain flow

1. Admin registers a teacher absence (`fravaer`) → lessons in that period become `udækket`
2. Admin views available substitutes for a time slot via `GET /vikarer/ledige?dato=&startTid=&slutTid=`
   (logic in `vikarModel.getLedigI()` — excludes substitutes already assigned or marked `optaget`)
3. Admin assigns a substitute (`tildeling`) → lesson becomes `dækket` (transactional in `tildelingModel.tildel()`)
4. Substitutes manage their own availability (`tilgaengelighed`) with `ledig`/`optaget` status

### Key database tables

`brugere` (users) → `laerere` (teachers) / `vikarer` (substitutes)
`lektioner` (lessons, status: `normal`|`udækket`|`dækket`) ← `fravaer` (absences)
`tildelinger` (assignments, links lesson ↔ substitute)
`tilgaengelighed` (substitute availability slots)
`beskeder` (messages on lessons)

### Test accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@skole.dk | admin123 |
| Teacher | anders.hansen@skole.dk | password123 |
| Substitute | kasper@vikar.dk | vikar123 |
