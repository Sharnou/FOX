import AdPageClient from './AdPageClient';

const API = 'https://fox-production.up.railway.app';
const SITE_URL = 'https://xtox.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export async function generateMetadata({ params }) {
  try {
    const res = await fetch(`${API}/api/ads/${params.id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Ad not found');
    const ad = await res.json();

    const title = ad.title ? `${ad.title} — XTOX` : 'XTOX Marketplace';
    const rawDescription = ad.description || '';
    const description = rawDescription.length > 160
      ? rawDescription.slice(0, 157) + '...'
      : rawDescription || 'اعثر على أفضل العروض في سوق XTOX المحلي';
    const image = (ad.media && ad.media[0]) || DEFAULT_OG_IMAGE;
    const url = `${SITE_URL}/ads/${params.id}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: 'XTOX',
        locale: 'ar_EG',
        type: 'website',
        images: [{ url: image, width: 1200, height: 630, alt: ad.title || 'XTOX' }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return {
      title: 'XTOX Marketplace',
      description: 'اعثر على أفضل العروض في سوق XTOX المحلي',
      openGraph: {
        title: 'XTOX Marketplace',
        description: 'اعثر على أفضل العروض في سوق XTOX المحلي',
        siteName: 'XTOX',
        locale: 'ar_EG',
        type: 'website',
        images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'XTOX' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'XTOX Marketplace',
        description: 'اعثر على أفضل العروض في سوق XTOX المحلي',
        images: [DEFAULT_OG_IMAGE],
      },
    };
  }
}

async function getAdJsonLd(id) {
  try {
    const res = await fetch(`${API}/api/ads/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const ad = await res.json();

    const url = `${SITE_URL}/ads/${id}`;
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
  const jsonLd = await getAdJsonLd(params.id);
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <AdPageClient params={params} />
    </>
  );
}
