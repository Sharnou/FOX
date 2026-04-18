import express from 'express';
const router = express.Router();

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
      console.warn('[ICE] Metered.ca returned', r.status);
    } catch (e) {
      console.warn('[ICE] Metered.ca fetch failed:', e.message);
    }
  }

  // Static fallback
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'turn:openrelay.metered.ca:80',                username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443',               username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turns:openrelay.metered.ca:443',              username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:numb.viagenie.ca',                       username: 'webrtc@live.com',  credential: 'muazkh' },
    ],
  });
});

export default router;
