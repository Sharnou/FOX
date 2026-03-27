import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { callWithFailover } from './keyPool.js';
export async function transcribeAudio(filePath) {
  return callWithFailover(async (key) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('model', 'whisper-1');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
    const d = await res.json(); return d.text || '';
  });
}
