import Country from '../models/Country.js';
import { dbState } from './memoryStore.js';

const defaultCountries = [
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', currency: 'EGP', language: 'ar', flag: '🇪🇬' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', currency: 'SAR', language: 'ar', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE', nameAr: 'الإمارات', currency: 'AED', language: 'ar', flag: '🇦🇪' },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', currency: 'EUR', language: 'de', flag: '🇩🇪' },
  { code: 'US', name: 'United States', nameAr: 'أمريكا', currency: 'USD', language: 'en', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', nameAr: 'بريطانيا', currency: 'GBP', language: 'en', flag: '🇬🇧' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', currency: 'JOD', language: 'ar', flag: '🇯🇴' },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', currency: 'LYD', language: 'ar', flag: '🇱🇾' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', currency: 'MAD', language: 'ar', flag: '🇲🇦' },
];

export async function seedCountries() {
  for (const c of defaultCountries) {
    await Country.findOneAndUpdate({ code: c.code }, c, { upsert: true });
  }
}

export async function getOrCreateCountry(code, name) {
  // Skip DB when using in-memory store — country validation not needed
  if (dbState.usingMemoryStore) {
    return { code, name: name || code, nameAr: name || code, currency: 'USD', language: 'ar', flag: '🌍' };
  }
  let country = await Country.findOne({ code });
  if (!country) {
    country = await Country.create({
      code, name, nameAr: name, currency: 'USD', language: 'en', flag: '🌍', autoCreated: true
    });
    console.log(`Auto-created country: ${code} - ${name}`);
  }
  return country;
}
