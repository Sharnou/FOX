import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { callWithFailover } from './keyPool.js';

export async function transcribeAudio(filePath) {
  try {
    return await callWithFailover(async (key) => {
      if (!key || key === 'your_openai_key') throw new Error('No key');
      const form = new FormData();
      if (filePath && (filePath.startsWith('/') || filePath.includes(':/'))) {
        form.append('file', fs.createReadStream(filePath));
      } else if (filePath) {
        const buffer = Buffer.from(filePath, 'base64');
        form.append('file', buffer, { filename: 'audio.webm', contentType: 'audio/webm' });
      } else {
        throw new Error('No audio data');
      }
      form.append('model', 'whisper-1');
      // No language override — Whisper auto-detects language from audio
      // (previously had language:'ar' hardcoded, which caused 'language override unsupported' errors)
      form.append('prompt', 'Marketplace listing. Transcribe accurately in the original spoken language.');
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, ...form.getHeaders() },
        body: form
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      return d.text || '';
    });
  } catch (e) {
    console.warn('[Whisper] Transcription failed (non-fatal):', e.message);
    return '';
  }
}

