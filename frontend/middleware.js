import { NextResponse } from 'next/server';

/**
 * Middleware: Locale detection for App Router
 *
 * Reads the Accept-Language header and maps it to a supported locale.
 * Supported: 'ar' (default), 'en'
 * This prevents "language override unsupported" warnings by explicitly
 * acknowledging Arabic and other supported locales at the routing layer.
 */

const SUPPORTED_LOCALES = ['ar', 'en', 'de', 'fr', 'tr'];
const DEFAULT_LOCALE = 'ar';

function detectLocale(acceptLanguage) {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  // Parse quality values and find best match
  const languages = acceptLanguage
    .split(',')
    .map(part => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.trim().toLowerCase().split('-')[0], q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of languages) {
    if (SUPPORTED_LOCALES.includes(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const acceptLanguage = request.headers.get('accept-language') || '';
  const locale = detectLocale(acceptLanguage);

  const response = NextResponse.next();

  // Set detected locale on response header (used by server components if needed)
  response.headers.set('x-locale', locale);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest, icons
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)',
  ],
};
