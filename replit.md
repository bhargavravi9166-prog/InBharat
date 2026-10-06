# INBHARAT

INBHARAT helps people discover Indian village heritage, local spots, and rural history through community-shared places and stories.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/inbharat/src/App.tsx` — responsive app routes, discovery interactions, and generated API-hook usage
- `artifacts/inbharat/src/index.css` — INBHARAT visual theme and responsive styling
- `artifacts/inbharat/supabase/schema.sql` — Supabase tables, public read/submit policies, and atomic upvote function
- `artifacts/api-server/src/routes/heritage.ts` — API endpoints that normalize and validate Supabase records
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- Supabase is the data source; the app API uses the public publishable key and relies on Supabase RLS for access control.
- Run `artifacts/inbharat/supabase/schema.sql` in the configured Supabase SQL Editor before using spot and village features.
- Guest community points are saved in the current browser until a user-account flow is added.

## Product

- Search and filter village heritage by state, district, tehsil, village, and category.
- Browse community-submitted spots, open a coordinate-based community map, and sort nearby entries using browser location.
- Submit spots, upvote shared locations, and browse community and profile views.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Supabase project URL must resolve, and the public tables need the RLS policies in `artifacts/inbharat/supabase/schema.sql`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
