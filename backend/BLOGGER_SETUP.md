# Blogger Auto-Sync Setup Guide

## How It Works
Every new ad published on XTOX automatically creates a Blogger post on xt0x.blogspot.com with:
- SEO-optimized title and content
- Smart Arabic keyword generation
- Auto-labeled posts by category/location
- CTA buttons linking back to the XTOX app
- Automatic deletion when ad is sold or deleted

## Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create new project: "XTOX-Blogger"
3. Enable "Blogger API v3" (APIs & Services → Library → search "Blogger API v3" → Enable)
4. Go to APIs & Services → Credentials
5. Create OAuth 2.0 Client ID (Web application type)
6. Add authorized redirect URI: `https://xtox-production.up.railway.app/api/blogger/oauth/callback`
7. Copy Client ID and Client Secret

## Step 2: Get Blogger Blog ID
1. Go to https://www.blogger.com → your dashboard
2. Click on xt0x.blogspot.com blog
3. The blog ID is in the URL: `blogger.com/blog/posts/XXXXXXXXXXXXXXXXXX`
4. Copy that number (the long numeric ID)

## Step 3: Get Refresh Token (one-time setup)
1. Add to Railway env vars temporarily:
   ```
   BLOGGER_CLIENT_ID=your_client_id
   BLOGGER_CLIENT_SECRET=your_client_secret
   BLOGGER_BLOG_ID=your_blog_id
   ```
2. Deploy the backend (Railway auto-deploys on push)
3. Visit: `https://xtox-production.up.railway.app/api/blogger/oauth/start`
4. Click "Allow" to authorize with the Google account that owns xt0x.blogspot.com
5. Copy the `refresh_token` from the JSON response
6. Add to Railway: `BLOGGER_REFRESH_TOKEN=the_token_you_copied`

## Step 4: All Required Railway Environment Variables
```
BLOGGER_CLIENT_ID=your_google_oauth_client_id
BLOGGER_CLIENT_SECRET=your_google_oauth_client_secret
BLOGGER_BLOG_ID=your_numeric_blog_id
BLOGGER_REFRESH_TOKEN=your_refresh_token
```

## Step 5: Verify It's Working
1. Publish a new test ad on XTOX
2. Check Railway logs for: `[Blogger] Post created: https://xt0x.blogspot.com/...`
3. Visit xt0x.blogspot.com to see the new post

## Blogger Theme Setup
1. Go to Blogger Dashboard → Theme → Customize → Edit HTML
2. Replace all content with `blogger-theme.xml` from this repo
3. Save theme

## Blogger robots.txt Setup
1. Go to Blogger Dashboard → Settings → Crawlers and indexing
2. Enable "Custom robots.txt"
3. Paste content from `blogger-robots.txt` from this repo
4. Save

## Custom Domain (Optional)
To use a custom domain like ads.xtox.com:
1. Go to Blogger → Settings → Publishing → Custom domain
2. Add your domain and follow DNS instructions

## Troubleshooting
- **No posts appearing**: Check Railway logs for `[Blogger]` entries
- **401 Unauthorized**: Refresh token expired — re-run Step 3
- **400 Bad Request**: Check Blog ID is correct
- **Posts not deleting**: Check if `bloggerPostId` is saved on the ad in MongoDB

## Files in This Repo
- `blogger-theme.xml` — Custom dark theme for xt0x.blogspot.com
- `blogger-robots.txt` — robots.txt configuration for Blogger
- `promo-post.html` — First pinned promotional post (paste HTML into Blogger)
- `backend/utils/blogger.js` — Core Blogger API integration
- `backend/routes/blogger.js` — OAuth flow routes
- `frontend/app/redirect/page.js` — Smart redirect page (Blogger → App)
