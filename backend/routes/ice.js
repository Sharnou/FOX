import express from 'express';
const router = express.Router();

// ── Metered TURN credentials (hardcoded fallback if env vars missing/wrong) ──
// App: xtox | API Key: b407qSLzRIoMZMVIlidUC19HPqxyLqLrbmXmL_4-NwyeoM6P
// URL format: https://{appName}.metered.live/api/v1/turn/credentials?apiKey={key}
const DEFAULT_METERED_APP = 'xtox';
const DEFAULT_METERED_KEY = 'b407qSLzRIoMZMVIlidUC19HPqxyLqLrbmXmL_4-NwyeoM6P';

// Proven static TURN servers — used when Metered not configured or unavailable
// Updated: 5 reliable servers proven to work from Egypt symmetric NAT (#120)
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
  // Expressturn free tier (500 MB/month) — updated credentials
  {
    urls: 'turn:relay.expressturn.com:3478',
    username: 'efO0SYRH0SGLD8CJPF',
    credential: 'Ts1WGX2l1n3JM9Xz',
  },
];

router.get('/credentials', async (req, res) => {
  // Use env vars if set, otherwise fall back to hardcoded correct values
  const appName = process.env.METERED_APP_NAME || DEFAULT_METERED_APP;
  const apiKey  = process.env.METERED_API_KEY  || DEFAULT_METERED_KEY;

  // Build the correct Metered API URL format: https://{appName}.metered.live/api/v1/...
  const meteredUrl = `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`;

  try {
    const resp = await fetch(meteredUrl, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) {
      console.warn(`[ICE] Metered unavailable (${resp.status}) — using static TURN fallback`);
      return res.json({ iceServers: STATIC_ICE });
    }
    const servers = await resp.json();
    if (!Array.isArray(servers) || servers.length === 0) {
      return res.json({ iceServers: STATIC_ICE });
    }
    return res.json({ iceServers: servers });
  } catch (e) {
    console.warn('[ICE] Metered fetch error — using static TURN fallback:', e.message);
    return res.json({ iceServers: STATIC_ICE });
  }
});

export default router;
