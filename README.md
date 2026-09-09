# Farm Management

A monorepo for the farm-management app: a Next.js web app today, with a React Native (Expo) mobile companion app planned.

## Layout

```
apps/
  web/       Next.js 16 app (App Router), Prisma + MongoDB Atlas — the original app
  mobile/    React Native (Expo) app — planned, not yet scaffolded
packages/
  shared-types/        canonical TypeScript types shared across apps
  shared-validation/   zod validation schemas shared across apps
  business-logic/      pure calculation/date helpers shared across apps
  api-client/          typed HTTP client shared across apps
```

## Getting started

From the repo root:

```bash
npm install
npm run dev        # turbo run dev — starts every app in dev mode
```

To run a single app: `npm run dev --workspace=apps/web` (or `cd apps/web && npm run dev`).

See `apps/web/.env.example` for the environment variables the web app needs (copy to `apps/web/.env` and fill in real values — never commit the real file).

## Common scripts (run from the repo root, via Turborepo)

- `npm run dev` — start all apps in development mode
- `npm run build` — build all apps
- `npm run lint` — lint all apps/packages
- `npm run typecheck` — type-check all apps/packages
