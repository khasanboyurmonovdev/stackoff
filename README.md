# Stackoff

A MERN monorepo skeleton.

## Structure

- `client/` — Vite + React + Tailwind (mobile-first) frontend
- `server/` — Node + Express (ESM) API
- `docs/` — project documentation
- `pipeline/` — data/build pipeline

## Getting started

```bash
# Server (http://localhost:4000)
cd server && npm install && cp .env.example .env && npm run dev

# Client (http://localhost:5173)
cd client && npm install && npm run dev
```
