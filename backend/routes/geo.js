import express from 'express';
import mongoose from 'mongoose';
import Ad from '../models/Ad.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET_GEO = process.env.JWT_SECRET || 'fox-default-secret';

// Optional auth for geo routes — extracts userId if token present
function geoOptionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return next();
    req.user = jwt.verify(token, JWT_SECRET_GEO);
  } catch {}
  next();
}

const router = express.Router();

// ─── Country → language detection ────────────────────────────────────────────

const ENGLISH_COUNTRIES = new Set([
  'US','GB','AU','CA','NZ','IE','ZA','SG','PH','NG','GH','JM','TT','BB','BS','BZ','FJ','PG','WS','SB','VU','TO','KI'
]);

const LANGUAGE_MAP = {
  // Arabic
  'EG':'ar','SA':'ar','AE':'ar','KW':'ar','QA':'ar','BH':'ar','OM':'ar','YE':'ar','IQ':'ar','JO':'ar','LB':'ar','SY':'ar','LY':'ar','TN':'ar','DZ':'ar','MA':'ar','SD':'ar','SO':'ar','MR':'ar','DJ':'ar','KM':'ar','PS':'ar',
  // French
  'FR':'fr','BE':'fr','CH':'fr','LU':'fr','MC':'fr','CD':'fr','CI':'fr','CM':'fr','MG':'fr','SN':'fr','ML':'fr','BF':'fr','GN':'fr','TG':'fr','BJ':'fr','NE':'fr','CF':'fr','GA':'fr','CG':'fr','RW':'fr','BI':'fr','MU':'fr','SC':'fr','HT':'fr',
  // Spanish
  'ES':'es','MX':'es','CO':'es','AR':'es','PE':'es','VE':'es','CL':'es','EC':'es','GT':'es','CU':'es','BO':'es','DO':'es','HN':'es','PY':'es','SV':'es','NI':'es','CR':'es','PA':'es','UY':'es','GQ':'es',
  // German
  'DE':'de','AT':'de',
  // Portuguese
  'PT':'pt','BR':'pt','AO':'pt','MZ':'pt','CV':'pt','ST':'pt','GW':'pt','TL':'pt',
  // Russian
  'RU':'ru','BY':'ru','KZ':'ru',
  // Chinese
  'CN':'zh','TW':'zh','HK':'zh',
  // Japanese
  'JP':'ja',
  // Korean
  'KR':'ko',
  // Turkish
  'TR':'tr',
  // Italian
  'IT':'it',
  // Dutch
  'NL':'nl',
  // Hindi
  'IN':'hi',
  // Persian
  'IR':'fa',
  // Urdu
  'PK':'ur',
  // Bengali
  'BD':'bn',
  // Indonesian
  'ID':'id',
  // Malay
  'MY':'ms',
  // Thai
  'TH':'th',
  // Vietnamese
  'VN':'vi',
  // Polish
  'PL':'pl',
  // Ukrainian
  'UA':'uk',
  // Romanian
  'RO':'ro',
  // Greek
  'GR':'el',
  // Hebrew
  'IL':'he',
  // Swahili
  'TZ':'sw','KE':'sw','UG':'sw',
  // Amharic
  'ET':'am',
  // Somali
  'SO':'so',
};

const NATIVE_NAMES = {
  'ar': 'عر', 'fr': 'Fr', 'es': 'Es', 'de': 'De', 'pt': 'Pt', 'ru': 'Ru',
  'zh': '中', 'ja': '日', 'ko': '한', 'tr': 'Tr', 'it': 'It', 'nl': 'Nl',
  'hi': 'हि', 'fa': 'فا', 'ur': 'اُ', 'bn': 'বাং', 'id': 'Id', 'ms': 'Ms',
  'th': 'ไท', 'vi': 'Vi', 'pl': 'Pl', 'uk': 'Uk', 'ro': 'Ro', 'el': 'Ελ',
  'he': 'עב', 'sw': 'Sw', 'am': 'አማ', 'so': 'So',
};

const RTL_LANGS = new Set(['ar', 'fa', 'ur', 'he']);

function getCountryLanguageInfo(countryCode) {
  if (ENGLISH_COUNTRIES.has(countryCode)) {
    return { language: 'en', rtl: false, nativeName: null, showToggle: false };
  }
  const lang = LANGUAGE_MAP[countryCode] || 'en';
  if (lang === 'en') {
    return { language: 'en', rtl: false, nativeName: null, showToggle: false };
  }
  return {
    language: lang,
    rtl: RTL_LANGS.has(lang),
    nativeName: NATIVE_NAMES[lang] || lang.toUpperCase(),
    showToggle: true,
  };
}

// GET /api/geo/detect — detect country + language from IP
router.get('/detect', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || req.headers['x-real-ip']
      || req.connection?.remoteAddress
      || req.ip
      || '';

    const isPrivate = !ip || ip === '::1' || ip === '127.0.0.1'
      || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('::ffff:127.');

    let countryCode = 'EG';

    if (!isPrivate) {
      try {
        const response = await fetch(
          `http://ip-api.com/json/${ip}?fields=countryCode`,
          { signal: AbortSignal.timeout(3000) }
        );
        const data = await response.json();
        if (data.countryCode) countryCode = data.countryCode;
      } catch (_) {
        // fallback to EG
      }
    }

    const info = getCountryLanguageInfo(countryCode);
    res.json({ country: countryCode, ...info });
  } catch (err) {
    res.json({ country: 'EG', language: 'ar', rtl: true, nativeName: 'عر', showToggle: true });
  }
});

// GET ads near a GPS coordinate (within radius km)
router.get('/nearby', geoOptionalAuth, async (req, res) => {
  try {
    const { lat, lng, radius = 20, country } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseFloat(radius);

    const filter = {
      isExpired: { $ne: true },
      isDeleted: { $ne: true },
      visibilityScore: { $gt: 0 },
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
          $maxDistance: parsedRadius * 1000
        }
      }
    };

    if (country) filter.country = country;

    // TASK 2: Exclude logged-in user's own ads from nearby listing
    if (req.user) {
      const currentUserId = req.user._id || req.user.id;
      if (currentUserId) {
        filter.$and = [
          { userId: { $ne: currentUserId } },
          { seller: { $ne: currentUserId } },
        ];
      }
    }

    const ads = await Ad.find(filter).limit(100);

    const R = 6371;
    const nearby = ads.filter(ad => ad.location && ad.location.coordinates).map(ad => {
      const [adLng, adLat] = ad.location.coordinates;
      const dLat = (adLat - parsedLat) * Math.PI / 180;
      const dLng = (adLng - parsedLng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(parsedLat * Math.PI / 180) * Math.cos(adLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...ad.toObject(), distance: Math.round(distance * 10) / 10 };
    });

    res.json(nearby);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST tag location on an ad
router.post('/tag-location', async (req, res) => {
  try {
    const { adId, lat, lng, placeName } = req.body;
    if (!adId) return res.status(400).json({ error: 'adId required' });
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'Invalid adId format' });
    }
    const parsedLat2 = parseFloat(lat);
    const parsedLng2 = parseFloat(lng);
    if (isNaN(parsedLat2) || isNaN(parsedLng2)) {
      return res.status(400).json({ error: 'lat and lng must be valid numbers' });
    }
    await Ad.findByIdAndUpdate(adId, {
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
        placeName: placeName || ''
      }
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET app share info for QR/link generation
router.get('/app-share', (req, res) => {
  const { lat, lng, zone } = req.query;
  const appUrl = process.env.FRONTEND_URL || 'https://fox-kohl-eight.vercel.app';
  const shareUrl = `${appUrl}?ref=geo&lat=${lat}&lng=${lng}&zone=${zone || ''}`;
  res.json({
    appUrl,
    shareUrl,
    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`,
    shareText: `🛒 اكتشف XTOX — السوق المحلي الذكي في منطقتك!\n${shareUrl}`,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`🛒 XTOX - السوق المحلي الذكي\nإعلانات قريبة منك في ${zone || 'منطقتك'}\n${shareUrl}`)}`
  });
});

export default router;
