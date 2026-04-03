import { transcribeAudio } from './whisper.js';
import { analyzeImage } from './vision.js';
import { generateAd, generateOfflineAd } from './aiGenerator.js';
import { detectCategoryOffline } from './offlineDict.js';

export async function buildAdFromMedia({ imagePath, audioPath, text }) {
  let imageDesc = '', voiceText = '';

  // If image or audio provided → must use AI vision/whisper first (can't skip)
  if (imagePath) try { imageDesc = await analyzeImage(imagePath); } catch {}
  if (audioPath) try { voiceText = await transcribeAudio(audioPath); } catch {}

  const combined = `${text || ''} ${voiceText} ${imageDesc}`.trim();

  // Text-only path: try offline first to save API costs
  if (!imagePath && !audioPath && text) {
    const offlineResult = generateOfflineAd(text);
    // If offline matched a specific category AND subcategory (high confidence), return immediately
    if (offlineResult.confidence === 'high') {
      console.log('[AI] Offline-first: high confidence match, skipping AI call');
      return offlineResult;
    }
    // Offline returned General/Other — fall through to AI
    console.log('[AI] Offline-first: low confidence, calling AI');
  }

  const offlineCat = detectCategoryOffline(combined);
  const aiAd = await generateAd({ text: combined, imageDesc });
  return { ...aiAd, category: aiAd.category || offlineCat.main, subcategory: aiAd.subcategory || offlineCat.sub };
}
