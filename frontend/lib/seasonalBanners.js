// Celebration banners with auto-expiry
// Dates are month/day (not year-specific, repeats annually)
//
// IMPORTANT: This module is imported by SeasonalBanner.js (client component).
// ALL functions here MUST be safe for server-side rendering (SSR).
// Do NOT rely on window / document / localStorage in module-level code.

export const SEASONAL_BANNERS = [
  {
    id: 'sham_el_nassim',
    title: 'عيد شم النسيم 🌸',
    subtitle: 'كل عام وأنتم بخير',
    emoji: '🌸',
    gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)',
    textColor: '#2d5a3d',
    // Sham El Nassim window: April 10-21 each year
    startMonth: 4, startDay: 10,
    endMonth: 4, endDay: 21,
  },
  {
    id: 'eid_al_fitr',
    title: 'عيد الفطر المبارك 🌙',
    subtitle: 'كل عام وأنتم بخير',
    emoji: '🌙',
    gradient: 'linear-gradient(135deg, #f093fb, #f5a623)',
    textColor: '#4a0080',
    startMonth: 3, startDay: 25,
    endMonth: 4, endDay: 5,
  },
  {
    id: 'eid_al_adha',
    title: 'عيد الأضحى المبارك 🐑',
    subtitle: 'تقبل الله منا ومنكم',
    emoji: '🐑',
    gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)',
    textColor: '#1a4a2e',
    startMonth: 6, startDay: 1,
    endMonth: 6, endDay: 10,
  },
  {
    id: 'ramadan',
    title: 'رمضان كريم 🌙',
    subtitle: 'كل عام وأنتم بخير',
    emoji: '🌙',
    gradient: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    textColor: '#f5c518',
    startMonth: 2, startDay: 28,
    endMonth: 3, endDay: 30,
  },
];

/**
 * Returns the currently active seasonal banner, or null if none applies.
 *
 * SSR-safe: returns null on the server so the initial HTML is always empty.
 * Only evaluates dates in the browser to avoid prerender mismatches.
 *
 * @returns {object|null}
 */
export function getActiveBanner() {
  // Guard: never run date logic during server-side prerendering.
  // This prevents "ReferenceError: getActiveBanner is not defined" and
  // "window is not defined" errors at build time.
  if (typeof window === 'undefined') return null;

  try {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    return SEASONAL_BANNERS.find(banner => {
      // Handle same-month range
      if (banner.startMonth === banner.endMonth) {
        return month === banner.startMonth && day >= banner.startDay && day <= banner.endDay;
      }
      // Handle cross-month range
      if (month === banner.startMonth) return day >= banner.startDay;
      if (month === banner.endMonth) return day <= banner.endDay;
      if (month > banner.startMonth && month < banner.endMonth) return true;
      return false;
    }) || null;
  } catch {
    return null;
  }
}
