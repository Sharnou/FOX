import { COUNTRY_LANGUAGE_MAP } from '../../lib/countryLanguageMap';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const country = (
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      ''
    ).toUpperCase();
    const localLang = COUNTRY_LANGUAGE_MAP[country] || 'en';
    return Response.json({ country, localLang });
  } catch {
    return Response.json({ country: '', localLang: 'en' });
  }
}
