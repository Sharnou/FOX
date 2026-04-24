/**
 * wpMigration.js — One-time WordPress cleanup migration
 *
 * Runs on server startup to:
 *  1. Delete duplicate WordPress pages (keeps oldest, deletes copies)
 *  2. Update sidebar/footer widgets from Bedrock/Minetest → XTOX content
 *  3. Create country-specific pages (one per Arab country, translated)
 *  4. Inject country detection JS into WP site footer
 *
 * Guarded by a MongoDB "migration" flag — runs exactly once per environment.
 */

import Setting from '../models/Setting.js';

const SITE   = 'xt0x.wordpress.com';
const API_V1 = `https://public-api.wordpress.com/rest/v1.1/sites/${SITE}`;
const API_V2 = `https://public-api.wordpress.com/wp/v2/sites/${SITE}`;

// ─── XTOX sidebar/footer replacement content ─────────────────────────────────
const XTOX_ABOUT_WIDGET = `<div dir="rtl" style="font-family:Arial,sans-serif;color:#1e293b">
<h3 style="color:#2563eb;margin:0 0 8px;font-size:18px">📱 XTOX – سوق محلي عربي</h3>
<p style="font-size:13px;color:#64748b;margin:0 0 12px;line-height:1.6">السوق المحلي العربي الأول — اعلن مجاناً وابيع وإشتري في منطقتك</p>
<a href="https://fox-kohl-eight.vercel.app/install" target="_blank"
   style="display:block;background:#2563eb;color:white;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;margin-bottom:8px">
  📲 حمّل تطبيق XTOX مجاناً
</a>
<a href="https://fox-kohl-eight.vercel.app" target="_blank"
   style="display:block;background:#0f172a;color:#60a5fa;padding:8px 14px;border-radius:8px;text-decoration:none;font-size:13px;text-align:center">
  🏠 زيارة XTOX
</a>
</div>`;

const XTOX_DESCRIPTION = 'السوق المحلي العربي الأول — اعلن مجاناً وابيع وإشتري في منطقتك';
const XTOX_TITLE       = 'XTOX – سوق محلي عربي';

// ─── Arab country data ────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'EG', slug: 'eg', lang: 'ar-EG', name: 'مصر', downloadTitle: 'حمّل تطبيق XTOX مجاناً في مصر', downloadContent: '<h2>سوق مصر المحلي</h2><p>نزّل تطبيق XTOX وابيع واشتري في مصر — مجاناً!</p><p><a href="https://fox-kohl-eight.vercel.app">افتح الموقع</a></p>', aboutTitle: 'من نحن | XTOX مصر', aboutContent: '<h2>XTOX السوق المحلي المصري</h2><p>أكبر سوق إعلانات مبوبة مجانية في مصر. بيع واشتر بسهولة في منطقتك.</p>' },
  { code: 'SA', slug: 'sa', lang: 'ar-SA', name: 'السعودية', downloadTitle: 'حمّل تطبيق XTOX مجاناً في السعودية', downloadContent: '<h2>سوق السعودية المحلي</h2><p>نزّل تطبيق XTOX وبيّع واشتري في السعودية — مجاناً!</p><p><a href="https://fox-kohl-eight.vercel.app">افتح الموقع</a></p>', aboutTitle: 'من نحن | XTOX السعودية', aboutContent: '<h2>XTOX السوق المحلي السعودي</h2><p>أكبر سوق إعلانات مبوبة مجانية في المملكة العربية السعودية.</p>' },
  { code: 'AE', slug: 'ae', lang: 'ar-AE', name: 'الإمارات', downloadTitle: 'حمّل تطبيق XTOX مجاناً في الإمارات', downloadContent: '<h2>سوق الإمارات المحلي</h2><p>حمّل XTOX وبيّع واشتري في الإمارات — مجاناً!</p><p><a href="https://fox-kohl-eight.vercel.app">افتح الموقع</a></p>', aboutTitle: 'من نحن | XTOX الإمارات', aboutContent: '<h2>XTOX السوق المحلي الإماراتي</h2><p>أكبر سوق إعلانات مبوبة مجانية في الإمارات العربية المتحدة.</p>' },
  { code: 'KW', slug: 'kw', lang: 'ar-KW', name: 'الكويت', downloadTitle: 'حمّل تطبيق XTOX مجاناً في الكويت', downloadContent: '<h2>سوق الكويت المحلي</h2><p>حمّل XTOX وبيّع واشتري بالكويت — مجاناً!</p><p><a href="https://fox-kohl-eight.vercel.app">افتح الموقع</a></p>', aboutTitle: 'من نحن | XTOX الكويت', aboutContent: '<h2>XTOX السوق المحلي الكويتي</h2><p>سوق إعلانات مبوبة مجانية في الكويت.</p>' },
  { code: 'QA', slug: 'qa', lang: 'ar-QA', name: 'قطر', downloadTitle: 'حمّل تطبيق XTOX مجاناً في قطر', downloadContent: '<h2>سوق قطر المحلي</h2><p>حمّل XTOX وبيّع واشتري في قطر — مجاناً!</p><p><a href="https://fox-kohl-eight.vercel.app">افتح الموقع</a></p>', aboutTitle: 'من نحن | XTOX قطر', aboutContent: '<h2>XTOX السوق المحلي القطري</h2><p>سوق إعلانات مبوبة مجانية في قطر.</p>' },
  { code: 'JO', slug: 'jo', lang: 'ar-JO', name: 'الأردن', downloadTitle: 'حمّل تطبيق XTOX مجاناً في الأردن', downloadContent: '<h2>سوق الأردن المحلي</h2><p>حمّل XTOX وبيّع واشتري بالأردن — مجاناً!</p><p><a href="https://fox-kohl-eight.vercel.app">افتح الموقع</a></p>', aboutTitle: 'من نحن | XTOX الأردن', aboutContent: '<h2>XTOX السوق المحلي الأردني</h2><p>سوق إعلانات مبوبة مجانية في الأردن.</p>' },
  { code: 'MA', slug: 'ma', lang: 'ar-MA', name: 'المغرب', downloadTitle: 'حمّل تطبيق XTOX مجاناً في المغرب', downloadContent: '<h2>سوق المغرب المحلي</h2><p>حمّل XTOX وبيع واشتري فالمغرب — مجاناً!</p><p><a href="https://fox-kohl-eight.vercel.app">افتح الموقع</a></p>', aboutTitle: 'من نحن | XTOX المغرب', aboutContent: '<h2>XTOX السوق المحلي المغربي</h2><p>سوق إعلانات مبوبة مجانية فالمغرب.</p>' },
  { code: 'IQ', slug: 'iq', lang: 'ar-IQ', name: 'العراق', downloadTitle: 'حمّل تطبيق XTOX مجاناً في العراق', downloadContent: '<h2>سوق العراق المحلي</h2><p>نزّل XTOX وبيع واشتري بالعراق — مجاناً!</p><p><a href="https://fox-kohl-eight.vercel.app">افتح الموقع</a></p>', aboutTitle: 'من نحن | XTOX العراق', aboutContent: '<h2>XTOX السوق المحلي العراقي</h2><p>سوق إعلانات مبوبة مجانية في العراق.</p>' },
];

// Migration key — bump version to force re-run
const MIGRATION_KEY = 'wp_migration_v3_done';

function getToken() {
  return process.env.WP_ACCESS_TOKEN || null;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };
}

async function safeFetch(url, options = {}, timeoutMs = 12000) {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res;
  } catch (e) {
    console.warn('[WP-MIGRATE] fetch error:', e.message, url.slice(0, 80));
    return null;
  }
}

// ─── 1. Delete duplicate WP pages ────────────────────────────────────────────
async function deleteDuplicateWPPages() {
  const token = getToken();
  if (!token) return { skipped: true, reason: 'no token' };

  console.log('[WP-MIGRATE] Fetching all WP pages for dedup...');

  // Fetch all pages (paginated)
  const allPages = [];
  let offset = 0;
  while (true) {
    const res = await safeFetch(
      `${API_V1}/posts?type=page&number=100&offset=${offset}&order_by=date&order=ASC&status=any&fields=ID,title,slug,date`,
      { headers: authHeaders() }
    );
    if (!res || !res.ok) break;
    const data = await res.json().catch(() => ({}));
    const posts = data.posts || [];
    if (!posts.length) break;
    allPages.push(...posts);
    if (posts.length < 100) break;
    offset += 100;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[WP-MIGRATE] Found ${allPages.length} WP pages total`);

  // Normalize title: strip trailing numbers and extra spaces
  function normalizeTitle(t) {
    return (t || '').replace(/\s*[-–—]\s*\d+\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // Group by normalized title
  const groups = {};
  for (const page of allPages) {
    const title = typeof page.title === 'object' ? (page.title.rendered || '') : (page.title || '');
    const key = normalizeTitle(title);
    if (!groups[key]) groups[key] = [];
    groups[key].push(page);
  }

  let deleted = 0;
  let kept = 0;

  for (const [title, pages] of Object.entries(groups)) {
    if (pages.length <= 1) { kept++; continue; }

    // Sort oldest first (by date), keep the FIRST, delete the rest
    pages.sort((a, b) => new Date(a.date) - new Date(b.date));
    const [keep, ...dupes] = pages;
    kept++;

    const pageTitle = typeof keep.title === 'object' ? keep.title.rendered : keep.title;
    console.log(`[WP-MIGRATE] Dedup page "${pageTitle.slice(0, 50)}" (${pages.length} copies → keep ID ${keep.ID})`);

    for (const dupe of dupes) {
      const delRes = await safeFetch(
        `${API_V1}/posts/${dupe.ID}/delete`,
        { method: 'POST', headers: authHeaders() }
      );
      if (delRes && (delRes.ok || delRes.status === 404)) {
        deleted++;
        console.log(`[WP-MIGRATE]   Deleted page ID ${dupe.ID}`);
      } else {
        console.warn(`[WP-MIGRATE]   Failed to delete page ID ${dupe.ID}: status=${delRes?.status}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`[WP-MIGRATE] Page dedup done: kept=${kept}, deleted=${deleted}`);
  return { deleted, kept, total: allPages.length };
}

// ─── 2. Update sidebar/footer: replace Minetest/Bedrock → XTOX ──────────────
async function updateWPSidebarWidgets() {
  const token = getToken();
  if (!token) return { skipped: true, reason: 'no token' };

  // ── 2a. Update site description (site identity) ───────────────────────────
  console.log('[WP-MIGRATE] Updating WP site identity (title + description)...');
  const identityRes = await safeFetch(`${API_V1}/settings`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      blogname: XTOX_TITLE,
      blogdescription: XTOX_DESCRIPTION,
    }),
  });
  if (identityRes && identityRes.ok) {
    console.log('[WP-MIGRATE] ✅ Site identity updated');
  } else {
    console.warn('[WP-MIGRATE] ⚠️ Site identity update failed:', identityRes?.status);
  }

  // ── 2b. List and update sidebar widgets ──────────────────────────────────
  console.log('[WP-MIGRATE] Fetching sidebar widgets...');
  const widgetsRes = await safeFetch(`${API_V1}/widgets`, { headers: authHeaders() });
  let widgetsUpdated = 0;

  if (widgetsRes && widgetsRes.ok) {
    const widgetsData = await widgetsRes.json().catch(() => ({}));
    const widgets = widgetsData.widgets || [];
    console.log(`[WP-MIGRATE] Found ${widgets.length} widgets`);

    for (const widget of widgets) {
      const widgetId = widget.id;
      const settings = widget.settings || {};
      const title  = settings.title  || '';
      const text   = settings.text   || '';
      const combo  = (title + ' ' + text).toLowerCase();

      // Check for Minetest/Bedrock placeholder content
      const isMinetest = combo.includes('minetest') || combo.includes('bedrock') ||
                         combo.includes('i\'m bedrock') || combo.includes("i'm bedrock") ||
                         combo.includes('ultimate minetest');
      if (!isMinetest) continue;

      console.log(`[WP-MIGRATE] Updating Minetest widget "${title.slice(0, 40)}" (ID: ${widgetId})`);

      const updateRes = await safeFetch(`${API_V1}/widgets/${widgetId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          settings: {
            title: 'XTOX – سوق محلي عربي',
            text: XTOX_ABOUT_WIDGET,
            filter: false,
          },
        }),
      });
      if (updateRes && updateRes.ok) {
        widgetsUpdated++;
        console.log(`[WP-MIGRATE] ✅ Updated widget ${widgetId}`);
      } else {
        console.warn(`[WP-MIGRATE] ⚠️ Widget update failed: ${widgetId}, status=${updateRes?.status}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // ── 2c. Update blogroll / links (remove Minetest blog links) ─────────────
  console.log('[WP-MIGRATE] Checking blogroll for Minetest links...');
  const linksRes = await safeFetch(`${API_V1}/links`, { headers: authHeaders() });
  let linksDeleted = 0;

  if (linksRes && linksRes.ok) {
    const linksData = await linksRes.json().catch(() => ({}));
    const links = linksData.links || [];
    for (const link of links) {
      const linkCombo = ((link.name || '') + ' ' + (link.url || '') + ' ' + (link.description || '')).toLowerCase();
      if (linkCombo.includes('minetest') || linkCombo.includes('bedrock') || linkCombo.includes('minecraft')) {
        const delRes = await safeFetch(`${API_V1}/links/${link.link_id}/delete`, {
          method: 'POST',
          headers: authHeaders(),
        });
        if (delRes && delRes.ok) {
          linksDeleted++;
          console.log(`[WP-MIGRATE] Deleted blogroll link: "${link.name}"`);
        }
      }
    }
  }

  // ── 2d. Try to update theme template parts (FSE / Gutenberg) ─────────────
  console.log('[WP-MIGRATE] Checking FSE template parts...');
  const tplRes = await safeFetch(`${API_V2}/template-parts`, { headers: authHeaders() });

  if (tplRes && tplRes.ok) {
    const templates = await tplRes.json().catch(() => ([]));
    if (Array.isArray(templates)) {
      for (const tpl of templates) {
        const content = tpl.content?.raw || '';
        const hasMinetest = content.toLowerCase().includes('minetest') ||
                            content.toLowerCase().includes('bedrock') ||
                            content.toLowerCase().includes("i'm bedrock");
        if (!hasMinetest) continue;

        console.log(`[WP-MIGRATE] Updating template part "${tpl.slug}" with Minetest content`);

        // Replace Minetest/Bedrock placeholders with XTOX content
        let newContent = content
          .replace(/i['']m\s+bedrock[^<"]*?<\/p>/gi, `<p>${XTOX_DESCRIPTION}</p>`)
          .replace(/discover\s+the\s+ultimate\s+minetest[^<"]*?<\/p>/gi, `<p>${XTOX_DESCRIPTION}</p>`)
          .replace(/minetest\s+blog/gi, 'XTOX')
          .replace(/minetest/gi, 'XTOX')
          .replace(/bedrock/gi, 'XTOX');

        const tplUpdateRes = await safeFetch(`${API_V2}/template-parts/${tpl.id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ content: newContent }),
        });
        if (tplUpdateRes && tplUpdateRes.ok) {
          console.log(`[WP-MIGRATE] ✅ Updated template part ${tpl.slug}`);
        } else {
          console.warn(`[WP-MIGRATE] ⚠️ Template part update failed: status=${tplUpdateRes?.status}`);
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }
  } else {
    console.log('[WP-MIGRATE] Template parts API not accessible (may require Business plan)');
  }

  return { widgetsUpdated, linksDeleted };
}

// ─── 3. Create country-specific pages (one per Arab country) ─────────────────
export async function createCountryPages(token) {
  const API = `https://public-api.wordpress.com/rest/v1.1/sites/254170569`;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  let created = 0, skipped = 0;

  for (const country of COUNTRIES) {
    for (const pageType of ['download', 'about']) {
      const slug = pageType === 'download'
        ? `haml-tatbiq-xtox-${country.slug}`
        : `man-nahnu-xtox-${country.slug}`;
      const title   = pageType === 'download' ? country.downloadTitle   : country.aboutTitle;
      const content = pageType === 'download' ? country.downloadContent : country.aboutContent;

      try {
        // Check if already exists
        const checkRes = await fetch(`${API}/posts?type=page&slug=${slug}`, { headers });
        const checkData = await checkRes.json();
        if (checkData.posts && checkData.posts.length > 0) {
          console.log(`[WP Country Pages] Already exists: ${slug}`);
          skipped++;
          continue;
        }

        // Create page
        const createRes = await fetch(`${API}/posts/new`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'page', title, content, slug, status: 'publish' }),
        });
        const createData = await createRes.json().catch(() => ({}));
        if (createRes.ok) {
          created++;
          console.log(`[WP Country Pages] ✅ Created: ${slug} (ID: ${createData.ID})`);
        } else {
          console.warn(`[WP Country Pages] ⚠️ Failed to create ${slug}:`, createData.error || createRes.status);
        }
        await new Promise(r => setTimeout(r, 400)); // rate limit
      } catch (e) {
        console.error(`[WP Country Pages] Failed ${slug}:`, e.message);
      }
    }
  }

  console.log(`[WP Country Pages] Created: ${created}, Skipped (existing): ${skipped}`);
  return { created, skipped };
}

// ─── 4. Inject country detection JS into WP site footer ──────────────────────
async function injectCountryDetectionScript(token) {
  const API = `https://public-api.wordpress.com/rest/v1.1/sites/254170569`;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const detectionScript = `
<script>
(function() {
  var COUNTRY_SLUGS = {
    'EG': 'haml-tatbiq-xtox-eg', 'SA': 'haml-tatbiq-xtox-sa', 'AE': 'haml-tatbiq-xtox-ae',
    'KW': 'haml-tatbiq-xtox-kw', 'QA': 'haml-tatbiq-xtox-qa', 'JO': 'haml-tatbiq-xtox-jo',
    'MA': 'haml-tatbiq-xtox-ma', 'IQ': 'haml-tatbiq-xtox-iq'
  };
  var ABOUT_SLUGS = {
    'EG': 'man-nahnu-xtox-eg', 'SA': 'man-nahnu-xtox-sa', 'AE': 'man-nahnu-xtox-ae',
    'KW': 'man-nahnu-xtox-kw', 'QA': 'man-nahnu-xtox-qa', 'JO': 'man-nahnu-xtox-jo',
    'MA': 'man-nahnu-xtox-ma', 'IQ': 'man-nahnu-xtox-iq'
  };

  function hideCountryNavLinks(countryCode) {
    var links = document.querySelectorAll('.wp-block-page-list a, .wp-block-navigation a');
    links.forEach(function(link) {
      var href = link.getAttribute('href') || '';
      var isCountryDownload = /haml-tatbiq-xtox-/.test(href);
      var isCountryAbout = /man-nahnu-xtox-/.test(href);
      if (isCountryDownload || isCountryAbout) {
        var mySlug = isCountryDownload ? COUNTRY_SLUGS[countryCode] : ABOUT_SLUGS[countryCode];
        var li = link.closest('li');
        if (li) {
          if (!href.includes(mySlug || '')) {
            li.style.display = 'none';
          }
        }
      }
    });
  }

  // Detect country
  var cached = sessionStorage.getItem('xtox_country');
  if (cached) {
    hideCountryNavLinks(cached);
  } else {
    fetch('https://ipapi.co/json/')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var code = d.country_code || 'EG';
        sessionStorage.setItem('xtox_country', code);
        hideCountryNavLinks(code);
      })
      .catch(function() { hideCountryNavLinks('EG'); });
  }
})();
</script>
`;

  try {
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ footer_code: detectionScript }),
    });
    if (res.ok) {
      console.log('[WP Country] ✅ Detection script injected into footer');
    } else {
      const err = await res.json().catch(() => ({}));
      console.warn('[WP Country] ⚠️ Script inject failed:', res.status, err.error || '');
    }
  } catch (e) {
    console.error('[WP Country] Script inject error:', e.message);
  }
}

// ─── Main migration entry point ───────────────────────────────────────────────
export async function runWPMigration() {
  try {
    // Check if already done
    const alreadyDone = await Setting.get(MIGRATION_KEY).catch(() => null);
    if (alreadyDone === 'true') {
      console.log('[WP-MIGRATE] Already done — skipping');
      return;
    }

    const token = getToken();
    if (!token) {
      console.log('[WP-MIGRATE] No WP_ACCESS_TOKEN — skipping migration');
      return;
    }

    console.log('[WP-MIGRATE] 🚀 Starting WordPress cleanup migration v3...');

    // Step 1: Delete duplicate pages
    const dedupResult = await deleteDuplicateWPPages();
    console.log('[WP-MIGRATE] Step 1 result:', JSON.stringify(dedupResult));

    // Step 2: Update sidebar/footer from Minetest → XTOX
    const widgetResult = await updateWPSidebarWidgets();
    console.log('[WP-MIGRATE] Step 2 result:', JSON.stringify(widgetResult));

    // Step 3: Create country-specific pages (one per Arab country)
    const countryResult = await createCountryPages(token);
    console.log('[WP-MIGRATE] Step 3 result:', JSON.stringify(countryResult));

    // Step 4: Inject country detection JS into WP site footer
    await injectCountryDetectionScript(token);
    console.log('[WP-MIGRATE] Step 4 done');

    // Mark as done
    await Setting.set(MIGRATION_KEY, 'true').catch(() => {});
    console.log('[WP-MIGRATE] ✅ Migration complete and flagged as done');
  } catch (e) {
    console.error('[WP-MIGRATE] Migration error (non-fatal):', e.message);
  }
}
