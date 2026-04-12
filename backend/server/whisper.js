import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { callWithFailover } from './keyPool.js';

// Lazy import helpers — break circular dependencies at startup
async function _getBuildLanguagePrompt() {
  try {
    const mod = await import('./locationLanguageLearner.js');
    return mod.buildLanguagePrompt || null;
  } catch { return null; }
}

async function _getRecordDetectedLanguage() {
  try {
    const mod = await import('./locationLanguageLearner.js');
    return mod.recordDetectedLanguage || null;
  } catch { return null; }
}

// Build a FormData object from an audio source (file path or base64 buffer)
function _buildForm(filePath) {
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
  return form;
}

/**
 * transcribeAudio — CHANGE 4 & 5
 *
 * • Accepts optional `country` to build location-aware prompt for better accuracy.
 * • First attempt: uses a location-specific prompt (nudges Whisper toward local language).
 * • On any failure: retries once without the prompt (most permissive fallback).
 * • Both attempts fail: returns { text: '', language: 'unknown', error: true }.
 * • NEVER throws — ad publishing is NEVER blocked by a transcription failure.
 */
export async function transcribeAudio(filePath, country) {
  // --- Attempt 1: with optional location prompt ---
  try {
    const result = await callWithFailover(async (key) => {
      if (!key || key === 'your_openai_key') throw new Error('No key');

      const form = _buildForm(filePath);
      // No hardcoded language override — Whisper auto-detects
      form.append('prompt', 'Marketplace listing. Transcribe accurately in the original spoken language.');

      // Add location-specific vocabulary prompt for higher accuracy (CHANGE 5)
      if (country) {
        try {
          const buildPromptFn = await _getBuildLanguagePrompt();
          if (buildPromptFn) {
            const locPrompt = await buildPromptFn(country);
            if (locPrompt) {
              // Prepend local vocabulary words — nudges Whisper toward local dialect
              form.set('prompt', locPrompt + '. Marketplace listing. Transcribe accurately.');
            }
          }
        } catch { /* prompt build failed — continue without it */ }
      }

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, ...form.getHeaders() },
        body: form
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      return d.text || '';
    });

    const text = typeof result === 'string' ? result : (result && result.text) || '';

    // Feed detected context to language learner (CHANGE 4 — language never blocks)
    if (country && text) {
      setImmediate(async () => {
        try {
          const recordFn = await _getRecordDetectedLanguage();
          if (recordFn) await recordFn(null, { country, sampleText: text.slice(0, 100) });
        } catch { /* non-fatal */ }
      });
    }

    return { text, language: 'auto', error: false };
  } catch (_e1) {
    // --- Attempt 2: retry without any prompt (most permissive) ---
    try {
      const retry = await callWithFailover(async (key) => {
        if (!key || key === 'your_openai_key') throw new Error('No key');
        const form = _buildForm(filePath);
        // Simplest possible request — no model hints
        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, ...form.getHeaders() },
          body: form
        });
        const d = await res.json();
        if (d.error) throw new Error(d.error.message);
        return d.text || '';
      });
      const text = typeof retry === 'string' ? retry : (retry && retry.text) || '';
      return { text, language: 'auto', error: false };
    } catch (_e2) {
      // Both attempts failed — NEVER throw. Return empty text so ad still publishes.
      return { text: '', language: 'unknown', error: true, errorMsg: _e2.message };
    }
  }
}
