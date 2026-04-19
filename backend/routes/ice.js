import express from 'express';
const router = express.Router();

// Static TURN/STUN fallback — used when Metered API is unavailable or returns non-200
const STATIC_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80',                username: 'openrelayproject',    credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443',               username: 'openrelayproject',    credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject',    credential: 'openrelayproject' },
  { urls: 'turn:numb.viagenie.ca',                       username: 'webrtc@live.com',     credential: 'muazkh' },
  { urls: 'turn:relay.expressturn.com:3478',             username: 'efUN55DZL6OFIRBQXI', credential: 'UfBApCBfMQiOunPs' },
];

router.get('/credentials', async (req, res) => {
  if (process.env.METERED_API_KEY) {
    const appName = process.env.METERED_APP_NAME || 'xtox';
    const url = `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const servers = await r.json();
        console.log('[ICE] Metered.ca credentials fetched:', servers.length, 'servers');
        return res.json({ iceServers: servers });
      }
      // Non-200 from Metered (401 if key invalid, etc.) — silent fallback, no error log
      console.warn('[ICE] Metered unavailable — using static TURN fallback');
    } catch (e) {
      // Network/timeout error — silent fallback
      console.warn('[ICE] Metered unavailable — using static TURN fallback');
    }
  }

  // Static fallback (always returned when Metered is unavailable or not configured)
  res.json({ iceServers: STATIC_ICE });
});

export default router;
