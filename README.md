# Trattoria Enoteca Campagnola

Sito prenotazioni + admin operativo (TanStack Start + Supabase).

## Pagine
- `/` Home
- `/menu` Menù con allergeni
- `/prenota` Codice + QR check-in
- `/admin` Staff (PIN)

## Admin tabs
Prenotazioni · Sala · Cucina · Conti · Menù (ghost) · Team · Offerte · Chat

## Setup
```bash
cp .env.example .env
npm i && npm run dev
```

## Env richiesti
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MANAGER_PIN
- VITE_SUPABASE_*

## Deploy Vercel
Collega questo repo e imposta le stesse env (soprattutto SERVICE_ROLE e MANAGER_PIN).

Menù editor in admin è **ghost** (non salva in produzione).
