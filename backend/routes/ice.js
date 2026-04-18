import express from 'express';
const router = express.Router();

// GET /api/ice/credentials
router.get('/credentials', async (req, res) => {
  // If METERED_API_KEY is set, fetch live time-limited credentials
  if (process.env.METERED_API_KEY) {
    try {
      const r = await fetch(
        `https://xtox.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (r.ok) {
        const servers = await r.json();
        return res.json({ iceServers: servers });
      }
    } catch (e) {
      console.warn('[ICE] Metered fetch failed, using fallback:', e.message);
    }
  }

  // Static fallback — multiple providers, TCP/TLS on 443 for Egypt NAT
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // OpenRelay — UDP + TCP + TLS
      { urls: 'turn:openrelay.metered.ca:80',                username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443',               username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turns:openrelay.metered.ca:443',              username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      // Numb.viagenie — backup
      { urls: 'turn:numb.viagenie.ca',                       username: 'webrtc@live.com',  credential: 'muazkh' },
      // FreeSWITCH/ExpressTurn — additional backup
      { urls: 'turn:relay1.expressturn.com:3478',            username: 'efUN37POS8DY1RLZEP', credential: 'D6IHNBJLFg9wkHLv' },
    ],
  });
});

export default router;
