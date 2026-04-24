/**
 * aiImage.js — Shared utility for AI-powered ad image generation.
 * Uses DALL-E 3 → Cloudinary pipeline to generate and store product photos.
 * Fire-and-forget: call generateAIImage(ad) after responding to the client.
 */
import Ad from '../models/Ad.js';

/**
 * Generate an AI product image for an ad that has no photos.
 * Uploads to Cloudinary and updates the ad document.
 * @param {Object} ad - Mongoose Ad document (or plain object with _id, title, category, subcategory)
 */
export async function generateAIImage(ad) {
  try {
    const prompt = `Professional product photo of "${ad.title}" for a classified ads website. Clean white background, high quality, realistic, Arabic marketplace style. Category: ${ad.category || ''} ${ad.subcategory || ''}. No text, no watermarks.`;

    const { default: OpenAI } = await import('openai');
    const { default: cloudinary } = await import('../server/cloudinary.js');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0].url;

    // Upload to Cloudinary
    const cloudinaryResult = await cloudinary.uploader.upload(imageUrl, {
      folder: 'xtox-ads',
      public_id: `ai-${ad._id}`,
    });

    // Update ad with the generated image
    await Ad.findByIdAndUpdate(ad._id, {
      $push: { images: cloudinaryResult.secure_url },
      aiGeneratedImage: true,
    });

    console.log(`[AI Image] Generated for ad ${ad._id}: ${cloudinaryResult.secure_url}`);
  } catch (err) {
    console.error(`[AI Image] Failed for ad ${ad._id}:`, err.message);
  }
}
