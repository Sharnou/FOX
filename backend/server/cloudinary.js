import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({ cloud_name: process.env.CLOUD_NAME, api_key: process.env.CLOUD_KEY, api_secret: process.env.CLOUD_SECRET });
export async function uploadImage(filePath) { return cloudinary.uploader.upload(filePath, { folder: 'xtox_ads' }); }
export async function uploadVideo(filePath) { return cloudinary.uploader.upload(filePath, { folder: 'xtox_ads', resource_type: 'video' }); }
export async function deleteMedia(publicId) { return cloudinary.uploader.destroy(publicId); }
export default cloudinary;
