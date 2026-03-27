import { transcribeAudio } from './whisper.js';
import { analyzeImage } from './vision.js';
import { generateAd } from './aiGenerator.js';
import { detectCategoryOffline } from './offlineDict.js';
export async function buildAdFromMedia({ imagePath, audioPath, text }) {
  let imageDesc = '', voiceText = '';
  if (imagePath) try { imageDesc = await analyzeImage(imagePath); } catch {}
  if (audioPath) try { voiceText = await transcribeAudio(audioPath); } catch {}
  const combined = `${text || ''} ${voiceText} ${imageDesc}`.trim();
  const offlineCat = detectCategoryOffline(combined);
  const aiAd = await generateAd({ text: combined, imageDesc });
  return { ...aiAd, category: aiAd.category || offlineCat.main, subcategory: aiAd.subcategory || offlineCat.sub };
}
