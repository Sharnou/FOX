/**
 * countries.js — Shared country list for XTOX platform
 *
 * Used by wpMigration.js, admin routes, and any future country-aware logic.
 * Each country has:
 *   - code:    ISO 3166-1 alpha-2 country code (uppercase)
 *   - slug:    WP page slug  →  ads-{lowercase code}
 *   - name:    Arabic local name
 *   - dialect: short dialect tag for content generation
 *   - title:   WP page title  →  "إعلانات {name}"
 *   - intro:   2-3 sentence intro in local dialect
 *   - ctaUrl:  CTA link to the platform filtered by country
 */
export const COUNTRIES = [
  {
    code: 'EG', slug: 'ads-eg', name: 'مصر', dialect: 'egyptian',
    title: 'إعلانات مصر',
    intro: `هنا هتلاقي أحسن الإعلانات المبوبة في مصر. ابيع أو إشتري أي حاجة بسهولة وبسرعة. انضم لآلاف المصريين اللي بيستخدموا XTOX كل يوم.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=EG',
  },
  {
    code: 'SA', slug: 'ads-sa', name: 'السعودية', dialect: 'gulf',
    title: 'إعلانات السعودية',
    intro: `تصفح آلاف الإعلانات المبوبة في المملكة العربية السعودية. بيّع وإشتري بكل سهولة من أي مكان بالمملكة. XTOX هو سوقك المحلي الأول في السعودية.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=SA',
  },
  {
    code: 'AE', slug: 'ads-ae', name: 'الإمارات', dialect: 'gulf',
    title: 'إعلانات الإمارات',
    intro: `اكتشف أفضل الإعلانات المبوبة في الإمارات العربية المتحدة. بيّع وإشتري بكل يسر وسهولة في دبي وأبوظبي وسائر الإمارات. XTOX هو السوق المحلي الأول في الإمارات.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=AE',
  },
  {
    code: 'KW', slug: 'ads-kw', name: 'الكويت', dialect: 'gulf',
    title: 'إعلانات الكويت',
    intro: `تصفح آلاف الإعلانات المبوبة بالكويت. بيّع وإشتري بكل سهولة في السوق المحلي الكويتي. XTOX هو منصتك الأولى للإعلانات المبوبة بالكويت.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=KW',
  },
  {
    code: 'QA', slug: 'ads-qa', name: 'قطر', dialect: 'gulf',
    title: 'إعلانات قطر',
    intro: `اعثر على أفضل الصفقات في قطر عبر XTOX. بيّع وإشتري بكل سهولة في الدوحة وسائر مناطق قطر. سوقك المحلي الأول للإعلانات المبوبة في قطر.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=QA',
  },
  {
    code: 'BH', slug: 'ads-bh', name: 'البحرين', dialect: 'gulf',
    title: 'إعلانات البحرين',
    intro: `تصفح إعلانات البحرين المبوبة وابحث عن أفضل الصفقات. بيّع وإشتري بسهولة في المنامة وسائر مناطق البحرين. XTOX هو السوق المحلي الأول في البحرين.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=BH',
  },
  {
    code: 'OM', slug: 'ads-om', name: 'عُمان', dialect: 'gulf',
    title: 'إعلانات عُمان',
    intro: `اكتشف آلاف الإعلانات المبوبة في سلطنة عُمان. بيّع وإشتري بكل يسر في مسقط وسائر محافظات سلطنة عُمان. XTOX منصتك المحلية الأولى للإعلانات في عُمان.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=OM',
  },
  {
    code: 'JO', slug: 'ads-jo', name: 'الأردن', dialect: 'levantine',
    title: 'إعلانات الأردن',
    intro: `تصفح أفضل الإعلانات المبوبة بالأردن. بيع واشتري بسهولة بعمّان وسائر محافظات المملكة. XTOX هو السوق المحلي الأول للإعلانات بالأردن.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=JO',
  },
  {
    code: 'LB', slug: 'ads-lb', name: 'لبنان', dialect: 'levantine',
    title: 'إعلانات لبنان',
    intro: `اعثر على أفضل الإعلانات المبوبة بلبنان. بيع واشتري بسهولة ببيروت وسائر المناطق اللبنانية. XTOX هو سوقك المحلي الأول للإعلانات بلبنان.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=LB',
  },
  {
    code: 'SY', slug: 'ads-sy', name: 'سوريا', dialect: 'levantine',
    title: 'إعلانات سوريا',
    intro: `تصفح آلاف الإعلانات المبوبة في سوريا. بيع واشتري بسهولة بدمشق وحلب وسائر المدن السورية. XTOX هو السوق المحلي الأول للإعلانات في سوريا.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=SY',
  },
  {
    code: 'IQ', slug: 'ads-iq', name: 'العراق', dialect: 'iraqi',
    title: 'إعلانات العراق',
    intro: `تصفح أحسن الإعلانات المبوبة بالعراق. بيع واشتري بسهولة ببغداد والبصرة وسائر المحافظات. XTOX منصتك المحلية الأولى للإعلانات بالعراق.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=IQ',
  },
  {
    code: 'LY', slug: 'ads-ly', name: 'ليبيا', dialect: 'north-african',
    title: 'إعلانات ليبيا',
    intro: `اكتشف آلاف الإعلانات المبوبة في ليبيا. بيع واشتري بسهولة في طرابلس وبنغازي وسائر المدن الليبية. XTOX هو السوق المحلي الأول للإعلانات في ليبيا.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=LY',
  },
  {
    code: 'TN', slug: 'ads-tn', name: 'تونس', dialect: 'maghrebi',
    title: 'إعلانات تونس',
    intro: `تصفح أحسن الإعلانات المبوبة في تونس. بيع واشري بكل سهولة في تونس العاصمة وسائر الولايات. XTOX هو السوق المحلي الأول للإعلانات في تونس.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=TN',
  },
  {
    code: 'DZ', slug: 'ads-dz', name: 'الجزائر', dialect: 'maghrebi',
    title: 'إعلانات الجزائر',
    intro: `تصفح آلاف الإعلانات المبوبة في الجزائر. بيع وإشري بكل سهولة في الجزائر العاصمة ووهران وسائر الولايات. XTOX هو السوق المحلي الأول للإعلانات في الجزائر.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=DZ',
  },
  {
    code: 'MA', slug: 'ads-ma', name: 'المغرب', dialect: 'moroccan',
    title: 'إعلانات المغرب',
    intro: `تصفح آلاف الإعلانات المبوبة فالمغرب. بيع وإشري بسهولة فالدار البيضاء والرباط وسائر المدن. XTOX هو السوق المحلي الأول للإعلانات فالمغرب.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=MA',
  },
  {
    code: 'SD', slug: 'ads-sd', name: 'السودان', dialect: 'sudanese',
    title: 'إعلانات السودان',
    intro: `تصفح آلاف الإعلانات المبوبة في السودان. بيع واشتري بسهولة في الخرطوم وأم درمان وسائر المدن السودانية. XTOX هو السوق المحلي الأول للإعلانات في السودان.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=SD',
  },
  {
    code: 'YE', slug: 'ads-ye', name: 'اليمن', dialect: 'yemeni',
    title: 'إعلانات اليمن',
    intro: `تصفح آلاف الإعلانات المبوبة في اليمن. بيع واشتري بسهولة في صنعاء وعدن وسائر المحافظات اليمنية. XTOX هو السوق المحلي الأول للإعلانات في اليمن.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=YE',
  },
  {
    code: 'PS', slug: 'ads-ps', name: 'فلسطين', dialect: 'levantine',
    title: 'إعلانات فلسطين',
    intro: `تصفح آلاف الإعلانات المبوبة في فلسطين. بيع واشتري بسهولة في رام الله والقدس وغزة وسائر المناطق الفلسطينية. XTOX هو السوق المحلي الأول للإعلانات في فلسطين.`,
    ctaUrl: 'https://fox-kohl-eight.vercel.app/?country=PS',
  },
];

export default COUNTRIES;
