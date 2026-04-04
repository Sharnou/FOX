import { v2 as cloudinary } from 'cloudinary';

// Guard: only configure Cloudinary if all 3 env vars are present
const CLOUD_NAME = process.env.CLOUD_NAME;
const CLOUD_KEY  = process.env.CLOUD_KEY;
const CLOUD_SECRET = process.env.CLOUD_SECRET;

export const CLOUDINARY_ENABLED = !!(CLOUD_NAME && CLOUD_KEY && CLOUD_SECRET);

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_KEY,
    api_secret: CLOUD_SECRET,
  });
  console.log('[Cloudinary] Configured ✅ cloud:', CLOUD_NAME);
} else {
  console.warn('[Cloudinary] Not configured (CLOUD_NAME/CLOUD_KEY/CLOUD_SECRET missing) — image uploads disabled');
}

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

export async function deleteMedia(publicId) {
  if (!CLOUDINARY_ENABLED) return null;
  return cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
