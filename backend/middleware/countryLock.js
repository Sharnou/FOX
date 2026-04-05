// countryLock.js — passthrough middleware (Bug 1 fix)
// Country-based filtering is now handled explicitly per-route via query params.
// This middleware no longer auto-blocks requests based on user country/IP.
// Users see all ads by default; filtering is opt-in via ?country= query param.

export function countryLock(req, res, next) {
  // No-op: country filtering is done at the query level, not at middleware level.
  // Previously this blocked users whose profile country != PLATFORM_COUNTRY.
  next();
}

export default countryLock;
