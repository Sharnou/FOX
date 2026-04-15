'use client';
import { useEffect } from 'react';
import { detectCountry, COUNTRIES } from '../utils/geoDetect';

export default function GeoMetaInjector() {
  useEffect(() => {
    detectCountry().then(code => {
      const info = COUNTRIES[code];
      if (!info) return;
      
      // 1. Set document language and direction
      document.documentElement.lang = info.lang;
      document.documentElement.dir = info.dir;
      
      // 2. Inject geo meta tags
      const metaMap = {
        'geo.region': code,
        'geo.country': code,
        'language': info.lang,
        'content-language': info.lang,
      };
      Object.entries(metaMap).forEach(([name, content]) => {
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
        el.content = content;
      });

      // 3. hreflang self-referencing
      if (!document.querySelector('link[hreflang]')) {
        const hl = document.createElement('link');
        hl.rel = 'alternate'; hl.hreflang = info.lang; hl.href = window.location.href;
        document.head.appendChild(hl);
      }

      // 4. Preconnect to backend for faster ads loading
      ['https://xtox-production.up.railway.app', 'https://ipapi.co'].forEach(origin => {
        if (!document.querySelector(`link[href="${origin}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preconnect'; link.href = origin;
          document.head.appendChild(link);
        }
      });

      // 5. IndexNow ping (once per session)
      try {
        if (!sessionStorage.getItem('xtox_np')) {
          new Image().src = `https://www.bing.com/indexnow?url=${encodeURIComponent(window.location.href)}&key=xtox2026indexnow`;
          sessionStorage.setItem('xtox_np', '1');
        }
      } catch(e) {}

      // 6. Update OG locale dynamically
      const ogLocale = document.querySelector('meta[property="og:locale"]');
      if (ogLocale) ogLocale.content = info.lang === 'ar' ? `ar_${code}` : info.lang;
      
      // 7. robots meta — ensure max crawl
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
      robots.content = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
      
      // 8. revisit-after (hint for crawlers)
      let revisit = document.querySelector('meta[name="revisit-after"]');
      if (!revisit) { revisit = document.createElement('meta'); revisit.name = 'revisit-after'; document.head.appendChild(revisit); }
      revisit.content = '3 days';
    });
  }, []);
  return null;
}
