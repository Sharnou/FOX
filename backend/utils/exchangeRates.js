// Fetches and caches USD exchange rates for 1 hour
// Uses open.er-api.com (free, no auth required)

let ratesCache = null;
let ratesCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getUSDRates() {
  if (ratesCache && Date.now() - ratesCacheTime < CACHE_TTL) {
    return ratesCache;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data.rates) {
      ratesCache = data.rates;
      ratesCacheTime = Date.now();
      return ratesCache;
    }
  } catch {}

  // Fallback hardcoded rates (for when API is down)
  return {
    USD: 1, EUR: 0.92, GBP: 0.79, EGP: 52.5, SAR: 3.75, AED: 3.67,
    KWD: 0.31, QAR: 3.64, BHD: 0.38, OMR: 0.38, JOD: 0.71,
    TRY: 32.5, JPY: 155, KRW: 1380, CNY: 7.24, INR: 83.5,
    BRL: 5.1, MXN: 17.2, RUB: 90, UAH: 39.5, PLN: 3.95,
    SEK: 10.6, NOK: 10.8, DKK: 6.88, CHF: 0.9, CAD: 1.37,
    AUD: 1.55, NZD: 1.66, SGD: 1.35, HKD: 7.82, THB: 35.5,
    IDR: 16200, MYR: 4.72, VND: 25000, PHP: 58, BDT: 110,
    PKR: 278, NPR: 134, LKR: 303, MMK: 2100, KHR: 4100,
    MAD: 9.97, TND: 3.15, DZD: 135, LYD: 4.86, SDG: 600,
    IQD: 1310, SYP: 13000, LBP: 89500, YER: 250,
    ILS: 3.7, IRR: 42000, NGN: 1600, GHS: 15.7, KES: 130,
    ETB: 57, ZAR: 18.6, TZS: 2600, UGX: 3750, RWF: 1300,
    ZMW: 26, BWP: 13.6, MWK: 1740, MZN: 63.8, AOA: 900,
    XOF: 605, XAF: 605, HUF: 355, RON: 4.6, BGN: 1.8,
    HRK: 7.0, CZK: 23.2, MKD: 57, RSD: 108,
    ALL: 93, GEL: 2.7, AMD: 390, AZN: 1.7,
    TWD: 32.5, MNT: 3450, KZT: 450, UZS: 12700, BYN: 3.3, MDL: 18,
    ARS: 900, COP: 4000, CLP: 970, PEN: 3.75, VES: 36, BOB: 6.9,
    PYG: 7500, UYU: 39, GNF: 8600, CDF: 2800, BAM: 1.8,
  };
}

// Country code → currency code mapping
export const COUNTRY_CURRENCY = {
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  EG: 'EGP', SA: 'SAR', AE: 'AED', KW: 'KWD', QA: 'QAR',
  BH: 'BHD', OM: 'OMR', JO: 'JOD', LB: 'LBP', IQ: 'IQD',
  LY: 'LYD', TN: 'TND', DZ: 'DZD', MA: 'MAD', SD: 'SDG',
  YE: 'YER', SY: 'SYP', PS: 'ILS', DE: 'EUR', FR: 'EUR',
  IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', IE: 'EUR', FI: 'EUR', SK: 'EUR', SI: 'EUR',
  LU: 'EUR', MT: 'EUR', CY: 'EUR', EE: 'EUR', LV: 'EUR',
  LT: 'EUR', GR: 'EUR', MC: 'EUR', SM: 'EUR', VA: 'EUR',
  CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'EUR',
  RS: 'RSD', AL: 'ALL', MK: 'MKD', BA: 'BAM', ME: 'EUR',
  UA: 'UAH', RU: 'RUB', TR: 'TRY', IL: 'ILS', IR: 'IRR',
  JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR', PK: 'PKR',
  BD: 'BDT', LK: 'LKR', NP: 'NPR', MM: 'MMK', KH: 'KHR',
  TH: 'THB', VN: 'VND', ID: 'IDR', MY: 'MYR', SG: 'SGD',
  PH: 'PHP', HK: 'HKD', TW: 'TWD', MN: 'MNT',
  NG: 'NGN', GH: 'GHS', KE: 'KES', ET: 'ETB', ZA: 'ZAR',
  TZ: 'TZS', UG: 'UGX', RW: 'RWF', CM: 'XAF', SN: 'XOF',
  CI: 'XOF', ML: 'XOF', BF: 'XOF', GN: 'GNF', TG: 'XOF',
  BJ: 'XOF', NE: 'XOF', CF: 'XAF', GA: 'XAF', CG: 'XAF',
  CD: 'CDF', BR: 'BRL', MX: 'MXN', AR: 'ARS', CO: 'COP',
  CL: 'CLP', PE: 'PEN', VE: 'VES', EC: 'USD', BO: 'BOB',
  PY: 'PYG', UY: 'UYU', GE: 'GEL', AM: 'AMD', AZ: 'AZN',
  KZ: 'KZT', UZ: 'UZS', BY: 'BYN', MD: 'MDL',
  DEFAULT: 'USD',
};

// Currency display symbols
export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', EGP: 'ج.م', SAR: 'ر.س',
  AED: 'د.إ', KWD: 'د.ك', QAR: 'ر.ق', BHD: 'د.ب', OMR: 'ر.ع',
  JOD: 'د.ا', ILS: '₪', TRY: '₺', JPY: '¥', KRW: '₩',
  CNY: '¥', INR: '₹', BRL: 'R$', RUB: '₽', UAH: '₴',
  PLN: 'zł', SEK: 'kr', NOK: 'kr', DKK: 'kr', CHF: 'Fr',
  CAD: 'C$', AUD: 'A$', NZD: 'NZ$', SGD: 'S$', HKD: 'HK$',
  THB: '฿', IDR: 'Rp', MYR: 'RM', VND: '₫', PHP: '₱',
  NGN: '₦', KES: 'KSh', ZAR: 'R', GHS: '₵', ETB: 'Br',
  MAD: 'د.م', DZD: 'دج', TND: 'د.ت', PKR: '₨', BDT: '৳',
  TWD: 'NT$', KZT: '₸', ARS: '$', COP: '$', CLP: '$',
  PEN: 'S/', UYU: '$U', PYG: 'Gs', BOB: 'Bs.',
};
