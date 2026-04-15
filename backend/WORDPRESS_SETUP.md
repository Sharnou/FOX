# WordPress.com Auto-Sync — Setup Guide

## One-time setup (2 minutes)

### Step 1: Authorize (already done — app created)
Visit this URL while logged into wordpress.com as the xt0x.wordpress.com owner:

https://xtox-production.up.railway.app/api/wp/auth

→ WordPress will ask you to authorize XTOX
→ Click "Approve"
→ You'll see a page with your WP_ACCESS_TOKEN

### Step 2: Add to Railway
Add ONE env var to Railway:
```
WP_ACCESS_TOKEN=<token from step 1>
```

### Step 3: Verify connection
Visit: https://xtox-production.up.railway.app/api/wp/status
Should return: { "connected": true, "wpUser": "..." }

## That's it!
Every new ad → WordPress post published automatically
Ad deleted or sold → WordPress post deleted automatically

## Credentials (already in code, no need to add to Railway)
- Client ID: 137369
- Client Secret: dpPAaW4LFZIGd9j7Q8ElnIdLge7yfaSvlQhaioDxG080kgR3Dy3QLALLR5AAcxUb
- Site: xt0x.wordpress.com

---

## Country System (Updated)

### How Country Assignment Works

1. **New Ads**: Country is auto-detected using this priority chain:
   - `req.body.country` (if valid 2-letter ISO code)
   - Cloudflare `cf-ipcountry` header (if behind CF proxy)
   - Location text → country mapping via `backend/utils/geoCountry.js`
   - User's JWT `country` field
   - Default: `EG` (Egypt)

2. **City → Country Mapping**: `backend/utils/geoCountry.js` contains 100+ Arab and international city names mapped to 2-letter ISO codes (EG, SA, AE, KW, QA, BH, OM, JO, LB, MA, DZ, TN, LY, IQ, SY, PS, YE, SD, US, GB, FR, DE, CA, AU).

3. **Backfill Existing Ads**: Run `POST /api/admin/backfill-countries` (admin auth required) to fix all ads with missing/invalid country codes.

4. **CountryTabs UI**: Now shows "كل الدول" for the "All" tab, and each country tab shows `{flag} {countryName} ({count} إعلان)`.

### WordPress Country JS Widget

Every WordPress post now includes a country-aware JavaScript widget (`buildCountryJS`) that:
- Detects visitor's country (ipapi.co → timezone fallback)
- Sets page direction (RTL for Arabic, LTR for others)
- Injects geo meta tags (`geo.region`, `geo.country`, `language`)
- Adds `hreflang` alternate links
- Shows country-filtered ads in a sidebar widget
- Injects country-aware Schema.org structured data
- Pings Bing + Yandex IndexNow once per session
- Sets `robots` meta to `max-snippet:-1, max-image-preview:large`

### SEO Enhancements (Max Free Visibility)

- `GeoMetaInjector` component in Next.js layout: injects geo meta tags dynamically based on visitor country
- Service Worker (`sw.js`): Stale-While-Revalidate for `/api/ads`, cache-first for static assets, background sync tag `refresh-ads`
- `GET /api/ads`: Now returns `Cache-Control: public, max-age=300, stale-while-revalidate=3600` + `Last-Modified` header
- `setupWordPressSite()`: Submits sitemaps to Google and Bing on every setup run
