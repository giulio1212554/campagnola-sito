# Trattoria Enoteca Campagnola

Sito ristorante: **Home · Menù · Prenota · Admin**.

## Stack

- TanStack Start + React + Tailwind
- Storage **locale** (file `.data/db.json`) — **niente Supabase**
- Prenotazioni con codice + QR
- Admin con PIN (default `1234`)

## Avvio

```bash
npm install
npm run dev
```

## Admin

- URL: `/admin`
- PIN: `1234` (opzionale: env `MANAGER_PIN`)

Tab: prenotazioni, sala, cucina, conti, menù (ghost), team, offerte.

## Pagine

| Route | Contenuto |
|-------|-----------|
| `/` | Bio, menù, recensioni, orari, mappa |
| `/menu` | Piatti + allergeni al click |
| `/prenota` | Form → codice + QR check-in |
| `/admin` | Area staff |

## Deploy (Vercel)

Nessuna chiave Supabase richiesta. Opzionale: `MANAGER_PIN`.

Su Vercel lo storage file è **ephemeral** (si resetta al redeploy). Per produzione persistente serve un volume o un DB esterno.
