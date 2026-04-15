export const dynamic = 'force-dynamic';
import AdPageClient from './AdPageClient';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const SITE_URL = 'https://xtox.app';
const DEFAULT_OG_IMAGE = SITE_URL + '/og-default.png';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const res = await fetch(API + '/api/ads/' + id, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Ad not found');
    const ad = await res.json();

    const title = `${ad.title || 'إعلان'} | ${ad.category || ''} في ${ad.city || ad.location || ''} | XTOX`;
    const desc = `${(ad.description || '').slice(0, 155)} — السعر: ${ad.price || ''} | XTOX سوق محلي`;
    const img = ad.images?.[0] || ad.media?.[0] || 'https://fox-kohl-eight.vercel.app/icon-512.png';
    const url = `https://fox-kohl-eight.vercel.app/ads/${id}`;
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
      keywords: [ad.title, ad.category, ad.city, ad.location, 'XTOX', 'إعلانات مبوبة', 'بيع وشراء', 'سوق محلي'].filter(Boolean).join(', '),
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
  try {
    const res = await fetch(API + '/api/ads/' + id, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const ad = await res.json();

    const url = SITE_URL + '/ads/' + id;
    const images = ad.media && ad.media.length > 0 ? ad.media : [DEFAULT_OG_IMAGE];

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
          name: (ad.userId.name) || 'XTOX Seller',
        },
      }),
    };
  } catch {
    return null;
  }
}

export default async function AdPage({ params }) {
  const { id } = await params;
  const jsonLd = await getAdJsonLd(id);
  
  // Fetch ad for breadcrumb schema
  let ad = null;
  try {
    const adRes = await fetch(API + '/api/ads/' + id, { next: { revalidate: 3600 } });
    if (adRes.ok) ad = await adRes.json();
  } catch {}
  
  const breadcrumbLd = ad ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "XTOX", "item": "https://fox-kohl-eight.vercel.app" },
      { "@type": "ListItem", "position": 2, "name": ad.category || 'إعلانات', "item": `https://fox-kohl-eight.vercel.app/?category=${encodeURIComponent(ad.category || '')}` },
      { "@type": "ListItem", "position": 3, "name": ad.title || 'إعلان', "item": `https://fox-kohl-eight.vercel.app/ads/${id}` }
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
