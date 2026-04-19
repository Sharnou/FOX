# WordPress.com Setup Guide for xt0x.wordpress.com

> **Automated script**: `WP_ACCESS_TOKEN=your_token node backend/scripts/setup-wordpress.js`
> 
> The steps below require manual action in the WordPress.com dashboard.

---

## 1. Launch Site (Remove Coming Soon)

**Dashboard** → **My Home** → Click **"Launch your site"** button → Click **Launch**

Or: **Dashboard** → **Settings** → **General** → scroll to **Privacy** → select **Public** → Save

---

## 2. Site Identity

**Dashboard** → **Settings** → **General**

| Field | Value |
|-------|-------|
| Site Title | `XTOX - سوق محلي عربي` |
| Tagline | `أكبر سوق إلكتروني عربي محلي — بيع واشتري بكل سهولة وأمان في مصر` |
| Language | Arabic (ar) |
| Timezone | Cairo (Africa/Cairo, UTC+2) |
| Date Format | `d/m/Y` |
| Time Format | `H:i` |
| Week Starts On | Saturday |

**Dashboard** → **Appearance** → **Site Identity** → Upload Site Icon
- Icon URL: `https://fox-kohl-eight.vercel.app/icon-512.png`
- Download and upload as 512×512 PNG

---

## 3. Reading Settings

**Dashboard** → **Settings** → **Reading**

| Setting | Value |
|---------|-------|
| Blog pages show at most | 12 posts |
| Search engine visibility | ✅ Allow search engines to index this site |

---

## 4. Permalinks

**Dashboard** → **Settings** → **Permalinks**

Select: **Post name** (`/%postname%/`) for clean Arabic-friendly URLs.

---

## 5. Comments (Disable Spam)

**Dashboard** → **Settings** → **Discussion**

- ✅ Comment author must fill out name and email
- ✅ Hold a comment in the queue if it contains 1 or more links
- ✅ Automatically close comments on posts older than 30 days
- Akismet is pre-enabled on WordPress.com — no action needed

---

## 6. Menus

**Dashboard** → **Appearance** → **Menus** → Create Primary Menu:

| Label | URL |
|-------|-----|
| الرئيسية | https://fox-kohl-eight.vercel.app/ |
| الإعلانات | https://fox-kohl-eight.vercel.app/ads |
| لوحة الشرف | https://fox-kohl-eight.vercel.app/leaderboard |
| عن XTOX | /about-xtox/ |
| تواصل معنا | /contact/ |

---

## 7. Performance (WordPress.com Business/Premium)

**Dashboard** → **Performance**

- Enable site caching: ON
- CDN (Jetpack CDN): ON

---

## 8. WP Token Refresh

If the WordPress token expires:

```bash
# Option A: Via browser
open https://xtox-production.up.railway.app/api/wp/auth

# Option B: Via API
curl https://xtox-production.up.railway.app/api/wp/reauth | jq .auth_url

# Option C: Save token via API
curl -X POST https://xtox-production.up.railway.app/api/wp/save-token \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_NEW_TOKEN"}'
```

---

## 9. Run Automated Setup

```bash
# In Railway, run one-off command:
WP_ACCESS_TOKEN=$(node -e "require('./backend/utils/wordpress.js')") \
  node backend/scripts/setup-wordpress.js

# Or locally:
cd /path/to/FOX
WP_ACCESS_TOKEN=your_token node backend/scripts/setup-wordpress.js
```

---

## 10. WordPress.com Plan Features

| Feature | Free | Personal | Business |
|---------|------|----------|---------|
| Custom domain | ❌ | ✅ | ✅ |
| Remove WP branding | ❌ | ❌ | ✅ |
| Plugin install | ❌ | ❌ | ✅ |
| Atomic deployments | ❌ | ❌ | ✅ |
| Activity log | 25 items | 30 days | 1 year |

Current plan covers REST API integration for content sync from Railway backend.
