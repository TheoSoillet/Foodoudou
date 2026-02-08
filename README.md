# Foodoudou - World Cuisine Map

Application Next.js + Supabase pour suivre vos restaurants par pays, en deux étapes:

1. Ajouter un restaurant (nom, date, plats/boissons/entrées + photos).
2. Revenir sur le restaurant pour le noter (Doudou ou Doudette), choisir les favoris, donner une note ludique et un commentaire.

## Stack
- Next.js App Router + React + TypeScript
- Tailwind CSS
- Mapbox GL JS (globe)
- Supabase Postgres + Storage

## SQL Supabase
- Installation neuve:
  1. `supabase/migrations/001_schema.sql`
  2. `supabase/migrations/002_storage_and_seed.sql`
- Projet existant (déjà migré avant):
  1. `supabase/migrations/004_two_step_flow_upgrade.sql`
  2. `supabase/migrations/005_increase_photo_size_limit.sql`

## Lancer
```bash
npm install
npm run dev
```

Variables requises dans `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
