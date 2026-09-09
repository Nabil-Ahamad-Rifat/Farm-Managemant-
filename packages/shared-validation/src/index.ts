// Zod validation schemas shared between apps/web (API route validation) and
// apps/mobile (client-side form validation, including while offline, before
// a request ever reaches the network).
//
// apps/web/src/app/api/auth/{login,register}/route.ts already use zod
// locally — populated in Phase 3, those two plus every other data route's
// validation move here as the single source of truth.
export {};
