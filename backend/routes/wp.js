import express from 'express'
import Ad from '../models/Ad.js'
import { auth as verifyToken } from '../middleware/auth.js'

const router = express.Router()

const WP_SITE = process.env.WP_SITE || 'xt0x.wordpress.com'
const WP_API = `https://public-api.wordpress.com/rest/v1.1/sites/${WP_SITE}`

function getWpToken() {
  const token = process.env.WP_ACCESS_TOKEN
  if (!token) throw new Error('WP_ACCESS_TOKEN not configured')
  return token
}

// GET /api/wp/status — public, check WP connection
router.get('/status', async (req, res) => {
  try {
    const token = getWpToken()
    const r = await fetch('https://public-api.wordpress.com/rest/v1.1/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await r.json()
    if (data.error) return res.json({ connected: false, error: data.error })
    res.json({ connected: true, user: data.display_name, email: data.email, site: WP_SITE })
  } catch (err) {
    res.json({ connected: false, error: err.message })
  }
})

// GET /api/wp/auth — start OAuth (for re-auth flow)
router.get('/auth', (req, res) => {
  const clientId = process.env.WP_CLIENT_ID || '137369'
  const redirectUri = process.env.WP_REDIRECT_URI || 'https://xtox-production.up.railway.app/api/wp/callback'
  const url = `https://public-api.wordpress.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=global`
  res.redirect(url)
})

// GET /api/wp/callback — OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'No code provided' })
  try {
    const r = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.WP_CLIENT_ID || '137369',
        client_secret: process.env.WP_CLIENT_SECRET || '',
        redirect_uri: process.env.WP_REDIRECT_URI || 'https://xtox-production.up.railway.app/api/wp/callback',
        code,
        grant_type: 'authorization_code'
      })
    })
    const data = await r.json()
    if (data.access_token) {
      res.json({ success: true, message: 'Set this as WP_ACCESS_TOKEN in Railway env vars', access_token: data.access_token, blog_url: data.blog_url })
    } else {
      res.status(400).json({ error: 'Token exchange failed', details: data })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Helper: build WP post body from ad
function adToWpPost(ad) {
  const slug = `xtox-ad-${ad._id}`
  const title = ad.title || 'إعلان XTOX'
  const price = ad.price ? `السعر: ${ad.price} جنيه` : ''
  const city = ad.city || ''
  const condition = ad.condition || ''
  const category = ad.category || ''
  const desc = ad.description || ''
  const content = [
    `<p>${desc}</p>`,
    price ? `<p><strong>${price}</strong></p>` : '',
    city ? `<p>📍 ${city}</p>` : '',
    condition ? `<p>الحالة: ${condition}</p>` : '',
    `<p>تصنيف: ${category}</p>`,
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
    // NO language, NO categories_by_name — they cause unknown_post_field errors
  }
}

// POST /api/wp/sync-all — sync ALL ads (admin only)
// Fix C: inline admin check — no double-middleware, no requireAdmin import needed
router.post('/sync-all', verifyToken, async (req, res) => {
  // Inline admin guard — supports admin, sub_admin, superadmin roles
  const role = req.user?.role
  if (!role || !['admin', 'sub_admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }

  try {
    const token = getWpToken()
    const ads = await Ad.find({ status: { $ne: 'deleted' } }).limit(500)

    let synced = 0, failed = 0
    const errors = []

    for (const ad of ads) {
      try {
        const postData = adToWpPost(ad)

        // Find existing by slug — guard against non-JSON responses
        const searchRes = await fetch(`${WP_API}/posts?slug=${postData.slug}`, {
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
          errors.push({
            adId: String(ad._id),
            title: ad.title,
            error: result.error,
            message: result.message || ''
          })
        } else {
          synced++
        }

        // Rate limit: 200ms between posts
        await new Promise(r => setTimeout(r, 200))
      } catch (err) {
        failed++
        errors.push({ adId: String(ad._id), title: ad.title, error: err.message })
      }
    }

    // Ping sitemaps
    try {
      await Promise.all([
        fetch(`https://www.google.com/ping?sitemap=https://xt0x.wordpress.com/sitemap.xml`, { signal: AbortSignal.timeout(5000) }),
        fetch(`https://www.bing.com/ping?sitemap=https://xt0x.wordpress.com/sitemap.xml`, { signal: AbortSignal.timeout(5000) })
      ])
    } catch {}

    res.json({ success: true, total: ads.length, synced, failed, errors: errors.slice(0, 10) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/wp/sync/:adId — sync one ad (admin or called internally)
router.post('/sync/:adId', verifyToken, async (req, res) => {
  const { adId } = req.params
  // ObjectId validation
  if (!/^[a-f\d]{24}$/i.test(adId)) return res.status(400).json({ error: 'Invalid adId' })
  try {
    const token = getWpToken()
    const ad = await Ad.findById(adId)
    if (!ad) return res.status(404).json({ error: 'Ad not found' })

    const postData = adToWpPost(ad)

    // Try update by slug first (upsert pattern)
    const searchRes = await fetch(`${WP_API}/posts?slug=${postData.slug}`, {
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

// GET /api/wp/sitemap — proxy sitemap for SEO
router.get('/sitemap', async (req, res) => {
  try {
    const r = await fetch(`https://xt0x.wordpress.com/sitemap.xml`)
    const xml = await r.text()
    res.set('Content-Type', 'application/xml')
    res.send(xml)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

// Stub for backward compat — server/index.js imports this
export async function setupWordPressSite() {
  const token = process.env.WP_ACCESS_TOKEN
  if (!token) {
    console.log('[WP Setup] Skipped — WP_ACCESS_TOKEN not set')
    return { skipped: true }
  }
  console.log('[WP Setup] Token present — WordPress integration active')
  return { ok: true }
}
