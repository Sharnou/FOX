import { v2 as cloudinary } from 'cloudinary';

// ── Cloudinary configuration ────────────────────────────────────────────────
// Primary: parse CLOUDINARY_URL (format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
// This is the only Cloudinary env var available on Railway.
// The v2 SDK auto-reads CLOUDINARY_URL when present, but we parse manually as a
// safety net in case the SDK doesn't auto-detect it.
let configuredViaUrl = false;
if (process.env.CLOUDINARY_URL) {
  const match = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    cloudinary.config({ api_key: match[1], api_secret: match[2], cloud_name: match[3] });
    configuredViaUrl = true;
    console.log('[Cloudinary] Configured from CLOUDINARY_URL ✅ cloud:', match[3]);
  } else {
    console.warn('[Cloudinary] CLOUDINARY_URL present but could not be parsed');
  }
}

// Fallback: individual env vars (CLOUD_NAME / CLOUD_KEY / CLOUD_SECRET)
if (!configuredViaUrl) {
  const CLOUD_NAME   = process.env.CLOUD_NAME;
  const CLOUD_KEY    = process.env.CLOUD_KEY;
  const CLOUD_SECRET = process.env.CLOUD_SECRET;

  const isValidCloudName = !!(
    CLOUD_NAME &&
    CLOUD_NAME !== 'Root' &&
    CLOUD_NAME !== 'undefined' &&
    CLOUD_NAME !== 'null' &&
    !CLOUD_NAME.includes(' ') &&
    /^[a-z0-9_-]+$/i.test(CLOUD_NAME)
  );

  if (isValidCloudName && CLOUD_KEY && CLOUD_SECRET) {
    cloudinary.config({ cloud_name: CLOUD_NAME, api_key: CLOUD_KEY, api_secret: CLOUD_SECRET });
    console.log('[Cloudinary] Configured from CLOUD_NAME/CLOUD_KEY/CLOUD_SECRET ✅ cloud:', CLOUD_NAME);
  } else {
    if (CLOUD_NAME && !isValidCloudName) {
      console.warn('[Cloudinary] Skipped — CLOUD_NAME "' + CLOUD_NAME + '" is invalid. Image uploads disabled.');
    } else {
      console.warn('[Cloudinary] Not configured (CLOUDINARY_URL and CLOUD_NAME/CLOUD_KEY/CLOUD_SECRET all missing) — image uploads disabled');
    }
  }
}

// CLOUDINARY_ENABLED: true if cloudinary is configured with valid credentials
const cfg = cloudinary.config();
export const CLOUDINARY_ENABLED = !!(cfg.cloud_name && cfg.api_key && cfg.api_secret);

export async function uploadImage(filePath) {
  if (!CLOUDINARY_ENABLED) {
    console.warn('[Cloudinary] Upload skipped — not configured');
    return null;
  }
  return cloudinary.uploader.upload(filePath, { folder: 'xtox_ads' });
}

export async function uploadVideo(filePath) {
  if (!CLOUDINARY_ENABLED) {
    console.warn('[Cloudinary] Video upload skipped — not configured');
    return null;
  }
  return cloudinary.uploader.upload(filePath, { folder: 'xtox_ads', resource_type: 'video' });
}

export async function deleteMedia(publicId, resourceType = 'image') {
  if (!CLOUDINARY_ENABLED) return null;
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export default cloudinary;
