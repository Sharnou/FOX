export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import AdPageClient from './AdPageClient';

// Fix A: Validate MongoDB ObjectId before fetching
function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const SITE_URL = 'https://xtox.app';
const DEFAULT_OG_IMAGE = SITE_URL + '/og-default.png';

export async function generateMetadata({ params }) {
  const { id } = await params;
  // Fix A: validate ObjectId before making any API call
  if (!isValidObjectId(id)) notFound();
  try {
    const res = await fetch(API + '/api/ads/' + id, {
      next: { revalidate: 60 },
    });
    // Fix B: handle 404 and non-OK responses gracefully
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error('API error ' + res.status);
    const ad = await res.json();
    if (!ad || !ad._id) notFound();

    const title = `${ad.title || 'إعلان'} | ${ad.category || ''} في ${ad.city || ad.location || ''} | XTOX`;
    const desc = `${(ad.description || '').slice(0, 155)} — السعر: ${ad.price || ''} | XTOX سوق محلي`;
    const img = ad.images?.[0] || ad.media?.[0] || DEFAULT_OG_IMAGE;
    const url = SITE_URL + '/ads/' + id;
    return {
      title,
      description: desc,
      openGraph: { title, description: desc, images: [img], type: 'website',
        url, siteName: 'XTOX - سوق محلي عربي', locale: 'ar_EG' },
      twitter: { card: 'summary_large_image', title, description: desc, images: [img] },
      alternates: {
        canonical: url,
        languages: {
          'ar': url,
          'ar-EG': url,
        }
      },
      keywords: [ad.title, typeof ad.category === 'string' ? ad.category : (ad.category?.name || ''), typeof ad.city === 'string' ? ad.city : (ad.city?.name || ''), ad.location, 'XTOX', 'إعلانات مبوبة', 'بيع وشراء', 'سوق محلي'].filter(Boolean).join(', '),
      robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    };
  } catch {
    return {
      title: 'XTOX - سوق محلي عربي',
      description: 'اعثر على أفضل العروض في سوق XTOX المحلي',
      openGraph: {
        title: 'XTOX - سوق محلي عربي',
        description: 'اعثر على أفضل العروض في سوق XTOX المحلي',
        siteName: 'XTOX',
        locale: 'ar_EG',
        type: 'website',
        images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'XTOX' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'XTOX - سوق محلي عربي',
        description: 'اعثر على أفضل العروض في سوق XTOX المحلي',
        images: [DEFAULT_OG_IMAGE],
      },
    };
  }
}

async function getAdJsonLd(id) {
  if (!isValidObjectId(id)) return null;
  try {
    const res = await fetch(API + '/api/ads/' + id, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const ad = await res.json();
    if (!ad || !ad._id) return null;

    const url = SITE_URL + '/ads/' + id;
    const images = (ad.images?.length > 0 ? ad.images : null) || (ad.media?.length > 0 ? ad.media : null) || [DEFAULT_OG_IMAGE];

    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: ad.title || 'XTOX Listing',
      description: ad.description || '',
      image: images,
      url,
      offers: {
        '@type': 'Offer',
        priceCurrency: ad.currency || 'EGP',
        ...(ad.price != null && { price: String(ad.price) }),
        availability: 'https://schema.org/InStock',
        url,
      },
      ...(ad.category && { category: ad.category }),
      ...(ad.userId && {
        seller: {
          '@type': 'Person',
          name: ad.userId?.name || ad.seller?.name || 'XTOX Seller',
        },
      }),
    };
  } catch {
    return null;
  }
}

export default async function AdPage({ params }) {
  const { id } = await params;
  // Fix A: Validate ObjectId before any fetch
  if (!isValidObjectId(id)) notFound();

  const jsonLd = await getAdJsonLd(id);
  
  // Fetch ad for breadcrumb schema
  // Fix B: Handle API errors gracefully — return notFound for 404, skip on 500
  let ad = null;
  try {
    const adRes = await fetch(API + '/api/ads/' + id, { next: { revalidate: 60 } });
    if (adRes.status === 404) notFound();
    if (adRes.ok) {
      const adData = await adRes.json();
      if (adData && adData._id) ad = adData;
    }
  } catch {}
  
  // Fix C: safe field access with optional chaining
  const adTitle = ad?.title || 'إعلان XTOX';
  const adDescription = ad?.description || '';
  const adImages = Array.isArray(ad?.images) ? ad.images : [];
  const adPrice = ad?.price ? `${ad.price} ${ad?.currency || 'EGP'}` : 'غير محدد';
  
  const breadcrumbLd = ad ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "XTOX", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": (typeof ad.category === 'string' ? ad.category : ad.category?.name) || 'إعلانات', "item": `${SITE_URL}/?category=${encodeURIComponent(typeof ad.category === 'string' ? ad.category : (ad.category?.name || ''))}` },
      { "@type": "ListItem", "position": 3, "name": ad.title || 'إعلان', "item": `${SITE_URL}/ads/${id}` }
    ]
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      <AdPageClient params={{ id }} />
    </>
  );
}
