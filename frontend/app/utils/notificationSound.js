'use client';

let audioCtx = null;
let lastPlayed = 0;

/**
 * Play iPhone "Opening" Alt 1 notification sound.
 * Ascending major arpeggio: E5 → G#5 → B5 → E6
 * Primary: Web Audio API (synthesized, no file needed)
 * Fallback: /sounds/notification.wav
 */
export function playNotificationSound() {
  // Debounce — max once per second
  const now = Date.now();
  if (now - lastPlayed < 1000) return;
  lastPlayed = now;

  // Respect user mute preference (set in profile settings)
  if (typeof window !== 'undefined' && localStorage.getItem('xtox_mute_sounds') === 'true') return;

  // Try Web Audio API first (synthesized arpeggio — no network dependency)
  if (playWebAudioNotification()) return;

  // Fallback: try WAV file
  try {
    const audio = new Audio('/sounds/notification.wav');
    audio.volume = 0.45;
    const p = audio.play();
    if (p) p.catch(() => {}); // silently ignore autoplay block
  } catch (_) {}
}

// Returns true if Web Audio API is available and sound was scheduled
function playWebAudioNotification() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    // iPhone "Opening" Alt 1 — E5 G#5 B5 E6 ascending arpeggio
    const notes = [
      { freq: 659.25, time: 0,    dur: 0.15 },  // E5
      { freq: 830.61, time: 0.11, dur: 0.15 },  // G#5
      { freq: 987.77, time: 0.22, dur: 0.15 },  // B5
      { freq: 1318.5, time: 0.33, dur: 0.28 },  // E6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      const t = audioCtx.currentTime + time;
      // Quick attack then exponential decay
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.start(t);
      osc.stop(t + dur + 0.02);
    });

    return true;
  } catch (_) {
    return false;
  }
}
