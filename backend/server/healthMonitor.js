import fetch from 'node-fetch';
import ErrorLog from '../models/ErrorLog.js';

const BACKEND_URL = process.env.BACKEND_URL || ('http://localhost:' + (process.env.PORT || 3000));

const TEST_ROUTES = [
  { url: '/', name: 'Backend Health', critical: true },
  { url: '/api/ads?country=EG', name: 'Ads API', critical: true },
  { url: '/rss/EG', name: 'RSS Feed', critical: false },
];

export async function runHealthCheck() {
  const results = [];
  for (const route of TEST_ROUTES) {
    try {
      const start = Date.now();
      const res = await fetch(`${BACKEND_URL}${route.url}`, {
        method: route.method || 'GET',
        signal: AbortSignal.timeout(10000)
      });
      const ms = Date.now() - start;
      const ok = res.status < 500;
      results.push({ name: route.name, status: res.status, ok, ms });
      if (!ok && route.critical) {
        await ErrorLog.create({ page: 'health-monitor', message: `${route.name} returned ${res.status}`, url: route.url, severity: 'high', userId: 'system' }).catch(() => {});
      }
    } catch (e) {
      results.push({ name: route.name, ok: false, error: e.message });
      if (route.critical) {
        await ErrorLog.create({ page: 'health-monitor', message: `${route.name} FAILED: ${e.message}`, url: route.url, severity: 'critical', userId: 'system' }).catch(() => {});
      }
    }
  }
  const failed = results.filter(r => !r.ok);
  console.log(`[HEALTH] ${new Date().toISOString()} — ${results.length - failed.length}/${results.length} OK`);
  return results;
}

export async function autoResolveOldErrors() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await ErrorLog.updateMany(
    { resolved: false, severity: { $in: ['low', 'medium'] }, createdAt: { $lt: cutoff } },
    { resolved: true }
  );
  if (result.modifiedCount > 0) console.log(`[HEALTH] Auto-resolved ${result.modifiedCount} old errors`);
}
