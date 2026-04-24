import { COUNTRY_LANGUAGE_MAP } from '../../lib/countryLanguageMap';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const country = request.headers.get('x-vercel-ip-country')
      || request.headers.get('cf-ipcountry')
      || 'DEFAULT';
    const localLang = COUNTRY_LANGUAGE_MAP[country] || COUNTRY_LANGUAGE_MAP['DEFAULT'] || 'en';
    return Response.json({ country, localLang });
  } catch (e) {
    return Response.json({ country: 'DEFAULT', localLang: 'en' });
  }
}
