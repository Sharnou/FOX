import express from 'express';
const router = express.Router();

// Proven static TURN servers — used when Metered not configured
const STATIC_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // OpenRelay (Metered.ca free public TURN — works from Egypt symmetric NAT)
  { urls: 'turn:openrelay.metered.ca:80',                username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443',               username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turns:openrelay.metered.ca:443',              username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  // Expressturn free tier (500 MB/month)
  { urls: 'turn:relay.expressturn.com:3478',             username: 'efUN55DZL6OFIRBQXI', credential: 'UfBApCBfMQiOunPs' },
  { urls: 'turn:relay.expressturn.com:3478?transport=tcp', username: 'efUN55DZL6OFIRBQXI', credential: 'UfBApCBfMQiOunPs' },
];

router.get('/credentials', async (req, res) => {
  const apiKey  = process.env.METERED_API_KEY;
  const appName = process.env.METERED_APP_NAME || 'xtox';

  // Skip Metered entirely if no API key — return static servers immediately
  if (!apiKey) {
    return res.json({ iceServers: STATIC_ICE });
  }

  try {
    const url = `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
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
