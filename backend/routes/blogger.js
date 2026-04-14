import express from 'express';
import { google } from 'googleapis';

const router = express.Router();

// One-time OAuth setup route (admin only)
router.get('/oauth/start', (req, res) => {
  const oauth2 = new google.auth.OAuth2(
    process.env.BLOGGER_CLIENT_ID,
    process.env.BLOGGER_CLIENT_SECRET,
    `https://xtox-production.up.railway.app/api/blogger/oauth/callback`
  );
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/blogger'],
    prompt: 'consent',
  });
  res.redirect(url);
});

router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  const oauth2 = new google.auth.OAuth2(
    process.env.BLOGGER_CLIENT_ID,
    process.env.BLOGGER_CLIENT_SECRET,
    `https://xtox-production.up.railway.app/api/blogger/oauth/callback`
  );
  try {
    const { tokens } = await oauth2.getToken(code);
    res.json({
      message: 'Copy this refresh_token to Railway env vars as BLOGGER_REFRESH_TOKEN',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
