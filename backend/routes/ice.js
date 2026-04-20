import express from 'express';
const router = express.Router();

// ── Metered TURN credentials ─────────────────────────────────────────────────
// App: xtox | API Key (updated): EuVCcOArr0ADkyICPSBlS149mE9Ieut5
// URL format: https://{appName}.metered.live/api/v1/turn/credentials?apiKey={key}
const DEFAULT_METERED_APP = 'xtox';
const DEFAULT_METERED_KEY = 'EuVCcOArr0ADkyICPSBlS149mE9Ieut5';

// Proven static TURN servers — used when Metered not configured or unavailable
const STATIC_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // a.relay.metered.ca — multi-port bundle (80, 443, TLS 443)
  {
    urls: ['turn:a.relay.metered.ca:80', 'turn:a.relay.metered.ca:443', 'turns:a.relay.metered.ca:443'],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  // openrelay.metered.ca — port 80 (firewall-friendly)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  // Viagenie numb — well-known free TURN
  {
    urls: 'turn:numb.viagenie.ca',
    username: 'webrtc@live.com',
    credential: 'muazkh',
  },
  // Expressturn free tier (500 MB/month)
  {
    urls: 'turn:relay.expressturn.com:3478',
    username: 'efO0SYRH0SGLD8CJPF',
    credential: 'Ts1WGX2l1n3JM9Xz',
  },
];

// Cache Metered credentials for 12 hours to avoid redundant API calls
let _meteredCache = null;
let _meteredCacheAt = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

async function fetchMeteredCredentials() {
  const now = Date.now();
  if (_meteredCache && (now - _meteredCacheAt) < CACHE_TTL) {
    return _meteredCache;
  }

  const appName = process.env.METERED_APP_NAME || DEFAULT_METERED_APP;
  const apiKey  = process.env.METERED_API_KEY  || DEFAULT_METERED_KEY;

  // Primary URL: https://{appName}.metered.live/api/v1/turn/credentials?apiKey={key}
  const primaryUrl  = `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`;
  // Fallback URL: relay.metered.ca standard endpoint
  const fallbackUrl = `https://relay.metered.ca/api/v1/turn/credentials?apiKey=${apiKey}`;

  for (const url of [primaryUrl, fallbackUrl]) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) {
        console.warn(`[ICE] Metered ${url} returned ${resp.status}`);
        continue;
      }
      const servers = await resp.json();
      if (!Array.isArray(servers) || servers.length === 0) {
        console.warn('[ICE] Metered returned empty server list');
        continue;
      }
      console.log(`[ICE] Metered credentials fetched OK (${servers.length} servers) from ${url}`);
      _meteredCache = servers;
      _meteredCacheAt = now;
      return servers;
    } catch (e) {
      console.warn(`[ICE] Metered fetch error (${url}):`, e.message);
    }
  }

  return null; // both attempts failed
}

router.get('/credentials', async (req, res) => {
  try {
    const servers = await fetchMeteredCredentials();
    if (servers) {
      return res.json({ iceServers: servers });
    }
  } catch (e) {
    console.warn('[ICE] fetchMeteredCredentials threw:', e.message);
  }

  console.warn('[ICE] Metered unavailable — using static TURN fallback');
  return res.json({ iceServers: STATIC_ICE });
});

export default router;
