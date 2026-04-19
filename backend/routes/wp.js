import express from 'express'
import Ad from '../models/Ad.js'
import Setting from '../models/Setting.js'
import { auth as verifyToken } from '../middleware/auth.js'

const router = express.Router()

const WP_SITE = process.env.WP_SITE || 'xt0x.wordpress.com'
const WP_API = `https://public-api.wordpress.com/rest/v1.1/sites/${WP_SITE}`
const WP_CLIENT_ID = process.env.WP_CLIENT_ID || '137369'
const WP_CLIENT_SECRET = process.env.WP_CLIENT_SECRET || 'dpPAaW4LFZIGd9j7Q8ElnIdLge7yfaSvlQhaioDxG080kgR3Dy3QLALLR5AAcxUb'
// Normalize redirect URI: strip any trailing slash so it exactly matches WP.com registration
const WP_REDIRECT_URI = (process.env.WP_REDIRECT_URI || 'https://xtox-production.up.railway.app/api/wp/callback').replace(/\/+$/, '')

// Get WP token: MongoDB first, then env var
async function getWpToken() {
  // Try MongoDB first (more reliable, no special char issues)
  const dbToken = await Setting.get('wp_access_token')
  if (dbToken) return dbToken
  // Fallback to env var
  const envToken = process.env.WP_ACCESS_TOKEN
  if (envToken) return envToken
  throw new Error('WP_ACCESS_TOKEN not configured. Use POST /api/wp/save-token or GET /api/wp/reauth')
}

// GET /api/wp/status
router.get('/status', async (req, res) => {
  try {
    const token = await getWpToken()
    const r = await fetch('https://public-api.wordpress.com/rest/v1.1/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await r.json()
    if (data.error) return res.json({ connected: false, error: data.error, message: data.message })
    const dbToken = await Setting.get('wp_access_token')
    res.json({
      connected: true,
      user: data.display_name,
      email: data.email,
      site: WP_SITE,
      tokenSource: dbToken ? 'mongodb' : 'env_var'
    })
  } catch (err) {
    res.json({ connected: false, error: err.message })
  }
})

// GET /api/wp/reauth — get the OAuth URL to open in browser
router.get('/reauth', (req, res) => {
  const url = `https://public-api.wordpress.com/oauth2/authorize?client_id=${WP_CLIENT_ID}&redirect_uri=${encodeURIComponent(WP_REDIRECT_URI)}&response_type=code&scope=global`
  // Return the URL (don't redirect — admin will open it manually)
  res.json({ auth_url: url, message: 'Open this URL in your browser to re-authenticate WordPress' })
})

// GET /api/wp/auth — redirect to OAuth (for browser click)
router.get('/auth', (req, res) => {
  const url = `https://public-api.wordpress.com/oauth2/authorize?client_id=${WP_CLIENT_ID}&redirect_uri=${encodeURIComponent(WP_REDIRECT_URI)}&response_type=code&scope=global`
  res.redirect(url)
})

// GET /api/wp/callback — OAuth callback, exchanges code for token, saves to MongoDB
router.get('/callback', async (req, res) => {
  const { code, state } = req.query
  // NOTE: WP.com sometimes returns ?state with no value (empty string) or omits it entirely.
  // We intentionally do NOT validate state here — lenient handling avoids invalid_grant rejections.
  if (!code) return res.status(400).send('<h1>Error: No code provided</h1>')
  try {
    const r = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: WP_CLIENT_ID,
        client_secret: WP_CLIENT_SECRET,
        redirect_uri: WP_REDIRECT_URI,
        code,
        grant_type: 'authorization_code'
      })
    })
    const data = await r.json()
    if (data.access_token) {
      // Save to MongoDB — no special char issues
      await Setting.set('wp_access_token', data.access_token)
      res.send(`
        <html><body style="font-family:Arial;padding:40px;text-align:center">
          <h1 style="color:green">&#x2705; WordPress Connected!</h1>
          <p>Token saved to database. You can close this window.</p>
          <p>Site: ${data.blog_url || WP_SITE}</p>
        </body></html>
      `)
    } else {
      res.status(400).send(`<h1>Error</h1><pre>${JSON.stringify(data, null, 2)}</pre>`)
    }
  } catch (err) {
    res.status(500).send(`<h1>Error: ${err.message}</h1>`)
  }
})

// POST /api/wp/save-token — admin: manually save a WP token to MongoDB
router.post('/save-token', verifyToken, async (req, res) => {
  const role = req.user?.role
  if (!['admin', 'sub_admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ error: 'Admin only' })
  }
  const { token } = req.body
  if (!token || token.length < 10) return res.status(400).json({ error: 'Invalid token' })
  try {
    await Setting.set('wp_access_token', token)
    // Verify it works
    const r = await fetch('https://public-api.wordpress.com/rest/v1.1/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await r.json()
    if (data.error) return res.status(400).json({ error: 'Token saved but WP rejected it', wpError: data.error })
    res.json({ success: true, savedToDb: true, user: data.display_name, email: data.email })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Helper: build WP post from ad
function adToWpPost(ad) {
  const slug = `xtox-ad-${ad._id}`
  const title = String(ad.title || 'إعلان XTOX').substring(0, 200)
  const desc = String(ad.description || '').substring(0, 500)
  const content = [
    desc ? `<p>${desc}</p>` : '',
    ad.price ? `<p><strong>السعر: ${ad.price} جنيه مصري</strong></p>` : '',
    ad.city ? `<p>&#x1F4CD; ${ad.city}</p>` : '',
    ad.condition ? `<p>الحالة: ${ad.condition}</p>` : '',
    ad.category ? `<p>التصنيف: ${ad.category}</p>` : '',
    `<p><a href="https://fox-kohl-eight.vercel.app/ads/${ad._id}">عرض الإعلان على XTOX</a></p>`
  ].filter(Boolean).join('\n')
  const tagList = [ad.category, ad.city, 'XTOX', 'إعلانات', 'مصر'].filter(Boolean)
  return {
    title,
    content,
    excerpt: (desc || title).substring(0, 150),
    slug,
    status: 'publish',
    tags: tagList.join(',')
  }
}

// POST /api/wp/sync/:adId
router.post('/sync/:adId', verifyToken, async (req, res) => {
  const { adId } = req.params
  if (!/^[a-f\d]{24}$/i.test(adId)) return res.status(400).json({ error: 'Invalid adId' })
  try {
    const token = await getWpToken()
    const ad = await Ad.findById(adId)
    if (!ad) return res.status(404).json({ error: 'Ad not found' })
    const postData = adToWpPost(ad)
    const searchRes = await fetch(`${WP_API}/posts?slug=${postData.slug}&number=1`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const searchData = await searchRes.json().catch(() => ({}))
    const existing = Array.isArray(searchData.posts) ? searchData.posts[0] : null
    let result
    if (existing) {
      const r = await fetch(`${WP_API}/posts/${existing.ID}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      })
      result = await r.json().catch(() => ({}))
    } else {
      const r = await fetch(`${WP_API}/posts/new`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      })
      result = await r.json().catch(() => ({}))
    }
    if (result.error) return res.status(400).json({ error: result.error, message: result.message })
    res.json({ success: true, wpPostId: result.ID, wpUrl: result.URL, action: existing ? 'updated' : 'created' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/wp/sync-all (admin only)
router.post('/sync-all', verifyToken, async (req, res) => {
  const role = req.user?.role
  if (!['admin', 'sub_admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  try {
    const token = await getWpToken()
    const ads = await Ad.find({ status: { $ne: 'deleted' } }).limit(500)
    let synced = 0, failed = 0
    const errors = []
    for (const ad of ads) {
      try {
        const postData = adToWpPost(ad)
        const searchRes = await fetch(`${WP_API}/posts?slug=${postData.slug}&number=1`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const searchData = await searchRes.json().catch(() => ({}))
        const existing = Array.isArray(searchData.posts) ? searchData.posts[0] : null
        let result
        if (existing) {
          const r = await fetch(`${WP_API}/posts/${existing.ID}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
          })
          result = await r.json().catch(() => ({}))
        } else {
          const r = await fetch(`${WP_API}/posts/new`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
          })
          result = await r.json().catch(() => ({}))
        }
        if (result.error) {
          failed++
          errors.push({ adId: String(ad._id), title: ad.title, error: result.error, message: result.message || '' })
        } else {
          synced++
        }
        await new Promise(r => setTimeout(r, 200))
      } catch (err) {
        failed++
        errors.push({ adId: String(ad._id), title: ad.title, error: err.message })
      }
    }
    // Ping sitemaps
    try {
      await Promise.all([
        fetch(`https://www.google.com/ping?sitemap=https://${WP_SITE}/sitemap.xml`, { signal: AbortSignal.timeout(5000) }),
        fetch(`https://www.bing.com/ping?sitemap=https://${WP_SITE}/sitemap.xml`, { signal: AbortSignal.timeout(5000) })
      ])
    } catch {}
    res.json({ success: true, total: ads.length, synced, failed, errors: errors.slice(0, 10) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/wp/sitemap
router.get('/sitemap', async (req, res) => {
  try {
    const r = await fetch(`https://${WP_SITE}/sitemap.xml`)
    const xml = await r.text()
    res.set('Content-Type', 'application/xml')
    res.send(xml)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// POST /api/wp/dedup-all — admin: global site-wide dedup of all WP posts
// Fetches ALL posts, groups by slug prefix, keeps highest ID (newest), deletes extras
router.post('/dedup-all', verifyToken, async (req, res) => {
  const role = req.user?.role;
  if (!['admin', 'sub_admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const token = await getWpToken();
    // Fetch all posts from WP (paginated, up to 1000)
    const allPosts = [];
    let page = 1;
    while (true) {
      const r = await fetch(`${WP_API}/posts?status=any&number=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) break;
      const data = await r.json();
      const posts = data.posts || (Array.isArray(data) ? data : []);
      if (!posts.length) break;
      allPosts.push(...posts);
      if (posts.length < 100) break;
      page++;
      await new Promise(r => setTimeout(r, 300));
    }

    // Group by slug (strip numeric suffix: slug-2, slug-3 → same group)
    const groups = {};
    for (const post of allPosts) {
      const baseSlug = (post.slug || '').replace(/-\d+$/, '');
      if (!groups[baseSlug]) groups[baseSlug] = [];
      groups[baseSlug].push(post);
    }

    // For each group: keep highest ID (newest), delete the rest
    let deleted = 0;
    let kept = 0;
    for (const [slug, posts] of Object.entries(groups)) {
      if (posts.length <= 1) { kept++; continue; }
      // Sort by ID descending — keep highest (newest)
      posts.sort((a, b) => (b.ID || b.id || 0) - (a.ID || a.id || 0));
      const [keep, ...dupes] = posts;
      kept++;
      for (const dupe of dupes) {
        try {
          await fetch(`${WP_API}/posts/${dupe.ID || dupe.id}/delete`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
          });
          deleted++;
          await new Promise(r => setTimeout(r, 150));
        } catch (_) {}
      }
    }
    res.json({ deleted, kept, total: allPosts.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// POST /api/wp/dedup-now — alias for dedup-all but uses v2 API + title dedup
// Fetches ALL posts, groups by slug, keeps highest ID, deletes extras
router.post('/dedup-now', verifyToken, async (req, res) => {
  const role = req.user?.role;
  if (!['admin', 'sub_admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const token = await getWpToken();
    const WP_V2_SITE = `https://public-api.wordpress.com/wp/v2/sites/${WP_SITE}`;

    // Fetch ALL posts (paginated)
    let allPosts = [];
    let page = 1;
    while (true) {
      const r = await fetch(`${WP_V2_SITE}/posts?per_page=100&page=${page}&orderby=id&order=asc&status=any`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) break;
      const posts = await r.json();
      if (!Array.isArray(posts) || !posts.length) break;
      allPosts = allPosts.concat(posts);
      if (posts.length < 100) break;
      page++;
      await new Promise(r => setTimeout(r, 300));
    }

    // Group by slug (strip numeric suffix: slug-2, slug-3 → same group)
    const groups = {};
    for (const p of allPosts) {
      const baseSlug = (p.slug || '').replace(/-\d+$/, '');
      if (!groups[baseSlug]) groups[baseSlug] = [];
      groups[baseSlug].push(p);
    }

    let deleted = 0, kept = 0;
    for (const [slug, posts] of Object.entries(groups)) {
      if (posts.length <= 1) { kept++; continue; }
      // Sort by ID descending — keep highest (newest)
      posts.sort((a, b) => (b.id || 0) - (a.id || 0));
      const [keep, ...dupes] = posts;
      kept++;
      for (const dupe of dupes) {
        try {
          const dr = await fetch(`${WP_V2_SITE}/posts/${dupe.id}?force=true`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
          });
          if (dr.ok) { deleted++; console.log(`[WP-DEDUP-NOW] Deleted post id=${dupe.id} slug="${slug}"`); }
          await new Promise(r => setTimeout(r, 150));
        } catch (_) {}
      }
    }
    res.json({ deleted, kept, total: allPosts.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/wp/dedup-titles — dedup posts AND pages by TITLE similarity
router.post('/dedup-titles', verifyToken, async (req, res) => {
  const role = req.user?.role;
  if (!['admin', 'sub_admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const token = await getWpToken();
    const WP_V2_SITE = `https://public-api.wordpress.com/wp/v2/sites/${WP_SITE}`;

    // Fetch all posts
    let allPosts = [];
    let page = 1;
    while (true) {
      const r = await fetch(
        `${WP_V2_SITE}/posts?per_page=100&page=${page}&orderby=id&order=asc`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
      );
      if (!r.ok) break;
      const posts = await r.json();
      if (!Array.isArray(posts) || !posts.length) break;
      allPosts = allPosts.concat(posts);
      if (posts.length < 100) break;
      page++;
      await new Promise(r => setTimeout(r, 300));
    }

    // Group by normalized title
    const groups = {};
    for (const p of allPosts) {
      const key = (p.title?.rendered || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    let deleted = 0;
    for (const [title, posts] of Object.entries(groups)) {
      if (posts.length <= 1) continue;
      // Sort by ID descending — keep highest (newest)
      posts.sort((a, b) => (b.id || 0) - (a.id || 0));
      const toDelete = posts.slice(1); // all but the newest
      for (const p of toDelete) {
        try {
          const dr = await fetch(
            `${WP_V2_SITE}/posts/${p.id}?force=true`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
          );
          if (dr.ok) { deleted++; console.log(`[WP-DEDUP-TITLE] Deleted post id=${p.id} title="${title.slice(0,50)}"`); }
          await new Promise(r => setTimeout(r, 150));
        } catch (_) {}
      }
    }

    // Also dedup pages by title
    let allPages = [];
    page = 1;
    while (true) {
      const r = await fetch(
        `${WP_V2_SITE}/pages?per_page=100&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
      );
      if (!r.ok) break;
      const pages = await r.json();
      if (!Array.isArray(pages) || !pages.length) break;
      allPages = allPages.concat(pages);
      if (pages.length < 100) break;
      page++;
      await new Promise(r => setTimeout(r, 300));
    }
    const pageGroups = {};
    for (const p of allPages) {
      const key = (p.title?.rendered || '').trim().toLowerCase();
      if (!pageGroups[key]) pageGroups[key] = [];
      pageGroups[key].push(p);
    }
    for (const [title, pages] of Object.entries(pageGroups)) {
      if (pages.length <= 1) continue;
      pages.sort((a, b) => (b.id || 0) - (a.id || 0));
      for (const p of pages.slice(1)) {
        try {
          const dr = await fetch(
            `${WP_V2_SITE}/pages/${p.id}?force=true`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
          );
          if (dr.ok) { deleted++; console.log(`[WP-DEDUP-TITLE] Deleted page id=${p.id} title="${title.slice(0,50)}"`); }
          await new Promise(r => setTimeout(r, 150));
        } catch (_) {}
      }
    }

    res.json({ deleted, total: allPosts.length + allPages.length, kept: allPosts.length + allPages.length - deleted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router
