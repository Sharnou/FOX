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
