// One typed request function shared between apps/web and apps/mobile,
// parameterized by base URL and auth-header injection (cookie-based for
// web, Bearer-token-based for mobile).
//
// Populated in Phase 3: encapsulates the fetch + res.ok + data.error pattern
// every apps/web/src/components/*Manager.tsx currently repeats by hand.
// This is also the single choke point where the mobile offline outbox
// (Phase 6 of the mobile-app plan) gets wired in later.
export {};
