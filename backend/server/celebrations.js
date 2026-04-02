import Celebration from '../models/Celebration.js';
import { callWithFailover } from './keyPool.js';
import fetch from 'node-fetch';

const FIXED_CELEBRATIONS = {
  EG: [
    { name: 'Ramadan', nameAr: 'رمضان', type: 'religious', dynamic: true },
    { name: 'Eid Al-Fitr', nameAr: 'عيد الفطر', type: 'religious', dynamic: true },
    { name: 'Eid Al-Adha', nameAr: 'عيد الأضحى', type: 'religious', dynamic: true },
    { name: 'Revolution Day', nameAr: 'ثورة يوليو', type: 'national', month: 7, day: 23 },
    { name: '6th October', nameAr: 'نصر أكتوبر', type: 'national', month: 10, day: 6 }
  ],
  SA: [{ name: 'National Day', nameAr: 'اليوم الوطني', month: 9, day: 23 }],
  DE: [{ name: 'Oktoberfest', type: 'cultural', month: 10, day: 1 }, { name: 'Christmas', month: 12, day: 25 }],
  US: [{ name: 'Independence Day', month: 7, day: 4 }, { name: 'Thanksgiving', type: 'dynamic' }],
};

export async function seedCelebrations() {
  for (const [country, events] of Object.entries(FIXED_CELEBRATIONS)) {
    for (const ev of events) {
      await Celebration.findOneAndUpdate({ country, name: ev.name }, { country, ...ev }, { upsert: true });
    }
  }
}

export async function fetchCelebrationsFromAI(countryCode) {
  try {
    const result = await callWithFailover(async (key) => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: `List the top 5 holidays and celebrations for country code ${countryCode} in ${new Date().getFullYear()}. Return JSON array: [{name, date_approx, type}]` }],
          max_tokens: 300
        })
      });
      return res.json();
    });
    const events = JSON.parse(result.choices[0].message.content);
    for (const ev of events) {
      await Celebration.findOneAndUpdate({ country: countryCode, name: ev.name }, { country: countryCode, ...ev, aiGenerated: true }, { upsert: true });
    }
  } catch (e) {
    console.error('Failed to fetch celebrations:', e.message);
  }
}

export async function getActiveCelebration(countryCode) {
  const now = new Date();
  const celebrations = await Celebration.find({ country: countryCode });
  return celebrations.find(c => {
    if (c.month && c.day) {
      return now.getMonth() + 1 === c.month && Math.abs(now.getDate() - c.day) <= 7;
    }
    return false;
  }) || null;
}
