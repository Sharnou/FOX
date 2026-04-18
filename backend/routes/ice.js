import express from 'express';

const router = express.Router();

// GET /api/ice/credentials — returns TURN server config for WebRTC
// Allows updating TURN servers without redeploying the frontend.
router.get('/credentials', (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // OpenRelay (primary) — multiple ports + TCP fallback for Egypt NAT
      { urls: 'turn:openrelay.metered.ca:80',                username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443',               username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turns:openrelay.metered.ca:443',              username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      // FreeSWITCH public TURN (backup)
      { urls: 'turn:relay1.expressturn.com:3478', username: 'efUN37POS8DY1RLZEP', credential: 'D6IHNBJLFg9wkHLv' },
      // Numb.viagenie (backup)
      { urls: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com' },
    ],
  });
});

export default router;
