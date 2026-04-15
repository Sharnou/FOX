# WordPress Auto-Sync Setup — No OAuth, No Google Cloud!

## Step 1: Create free WordPress.com site (2 min)
1. Go to https://wordpress.com/start
2. Sign up with any email
3. Choose site name: xt0x (URL will be https://xt0x.wordpress.com)
4. Choose free plan

## Step 2: Generate Application Password (1 min)
1. Go to https://wordpress.com/me/security/two-step
   Enable 2-factor auth first (required for app passwords)
2. Go to https://wordpress.com/me/security/application-passwords
3. Click "Add New Application Password"
4. Name it: "XTOX Backend"
5. Copy the 24-character password shown (e.g. "AbCd EfGh IjKl MnOp QrSt UvWx")

## Step 3: Add 3 Railway env vars
```
WP_SITE_URL=https://xt0x.wordpress.com
WP_USERNAME=your_wordpress_username
WP_APP_PASSWORD=AbCd EfGh IjKl MnOp QrSt UvWx
```

## Step 4: Test
Publish any ad on XTOX → check https://xt0x.wordpress.com within 10 seconds.
The post will appear automatically with full SEO, images, and CTA buttons.

## That's it! No Google Cloud. No OAuth. Just 3 env vars.
