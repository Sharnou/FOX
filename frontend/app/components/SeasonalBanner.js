'use client';
import { useState, useEffect } from 'react';

// Module-level constant — avoids TDZ in minified output
const ARAB_COUNTRIES = ['EG','SA','AE','KW','QA','BH','OM','JO','LB','SY','IQ','LY','TN','DZ','MA','YE'];

function getCountryFromTimezone(tz) {
  const map = {
    'Africa/Cairo': 'EG',
    'Asia/Riyadh': 'SA',
    'Asia/Dubai': 'AE',
    'Asia/Kuwait': 'KW',
    'Asia/Qatar': 'QA',
    'Asia/Bahrain': 'BH',
    'Asia/Muscat': 'OM',
    'Asia/Amman': 'JO',
    'Asia/Beirut': 'LB',
    'Asia/Damascus': 'SY',
    'Asia/Baghdad': 'IQ',
    'Africa/Tripoli': 'LY',
    'Africa/Tunis': 'TN',
    'Africa/Algiers': 'DZ',
    'Africa/Casablanca': 'MA',
    'Asia/Aden': 'YE',
    'Europe/London': 'GB',
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Los_Angeles': 'US',
    'Asia/Kolkata': 'IN',
    'Asia/Tokyo': 'JP',
    'Asia/Shanghai': 'CN',
  };
  return map[tz] || 'WORLD';
}

function d(year, month, day) {
  return new Date(year, month - 1, day);
}

function getBanners(country, year) {
  const banners = [];

  // ─── Universal Islamic holidays (all Arab countries) ──────────────────────
  const isArab = ARAB_COUNTRIES.includes(country);

  if (isArab || country === 'WORLD') {
    // Ramadan 2026: approximately Feb 18 – Mar 19
    // Eid al-Fitr 2026: Mar 30 – Apr 1
    if (year === 2026) {
      banners.push({
        key: 'ramadan_2026',
        start: d(2026, 2, 18),
        end: d(2026, 3, 19),
        emoji: '🌙',
        title: 'رمضان كريم!',
        subtitle: 'رمضان مبارك — شهر الرحمة والمغفرة 🤲',
        gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        textColor: '#f5c518',
      });
      banners.push({
        key: 'eid_fitr_2026',
        start: d(2026, 3, 29),
        end: d(2026, 4, 2),
        emoji: '🌙',
        title: 'عيد الفطر المبارك!',
        subtitle: 'تقبل الله منا ومنكم الطاعات',
        gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        textColor: '#f5c518',
      });
      // Eid al-Adha 2026: Jun 6–8
      banners.push({
        key: 'eid_adha_2026',
        start: d(2026, 6, 5),
        end: d(2026, 6, 9),
        emoji: '🐑',
        title: 'عيد الأضحى المبارك!',
        subtitle: 'تقبل الله منا ومنكم صالح الأعمال 🤲',
        gradient: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #16a34a 100%)',
        textColor: '#fff',
      });
      // Islamic New Year 2026: Jun 26
      banners.push({
        key: 'islamic_new_year_2026',
        start: d(2026, 6, 25),
        end: d(2026, 6, 27),
        emoji: '🌙✨',
        title: 'عام هجري جديد!',
        subtitle: 'كل عام وأنتم بخير',
        gradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
        textColor: '#fff',
      });
      // Mawlid 2026: Sep 4
      banners.push({
        key: 'mawlid_2026',
        start: d(2026, 9, 3),
        end: d(2026, 9, 5),
        emoji: '🕌',
        title: 'المولد النبوي الشريف',
        subtitle: 'اللهم صلِّ على نبينا محمد ﷺ',
        gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)',
        textColor: '#fff',
      });
    }
  }

  // ─── Universal (New Year, Labor Day) ──────────────────────────────────────
  banners.push({
    key: 'new_year_' + year,
    start: d(year, 1, 1),
    end: d(year, 1, 2),
    emoji: '🎆',
    title: 'كل عام وأنتم بخير! 🎉',
    subtitle: 'Happy New Year ' + year,
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)',
    textColor: '#fff',
  });

  banners.push({
    key: 'labor_day_' + year,
    start: d(year, 5, 1),
    end: d(year, 5, 1),
    emoji: '👷',
    title: 'عيد العمال!',
    subtitle: 'تحية لكل عامل مجتهد 💪',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    textColor: '#fff',
  });

  // ─── Egypt ────────────────────────────────────────────────────────────────
  if (country === 'EG') {
    // Coptic Christmas Jan 7
    banners.push({
      key: 'coptic_christmas_' + year,
      start: d(year, 1, 6),
      end: d(year, 1, 8),
      emoji: '🎄',
      title: 'عيد الميلاد المجيد!',
      subtitle: 'كل عام وأنتم بخير 🌟',
      gradient: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #dc2626 100%)',
      textColor: '#fff',
    });
    // Revolution Day Jan 25
    banners.push({
      key: 'jan25_' + year,
      start: d(year, 1, 25),
      end: d(year, 1, 25),
      emoji: '🇪🇬',
      title: 'ذكرى ثورة 25 يناير',
      subtitle: 'تحيا مصر 🌹',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #fff 50%, #000 100%)',
      textColor: '#dc2626',
    });
    // Sinai Liberation Day Apr 25
    banners.push({
      key: 'sinai_' + year,
      start: d(year, 4, 25),
      end: d(year, 4, 25),
      emoji: '🇪🇬',
      title: 'عيد تحرير سيناء',
      subtitle: 'سيناء عربية 🌟',
      gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
      textColor: '#fff',
    });
    // June 30 Revolution
    banners.push({
      key: 'jun30_' + year,
      start: d(year, 6, 30),
      end: d(year, 6, 30),
      emoji: '🇪🇬',
      title: 'ذكرى ثورة 30 يونيو',
      subtitle: 'تحيا مصر 🌹',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      textColor: '#fff',
    });
    // Revolution Day Jul 23
    banners.push({
      key: 'jul23_' + year,
      start: d(year, 7, 23),
      end: d(year, 7, 23),
      emoji: '🇪🇬',
      title: 'ذكرى ثورة 23 يوليو',
      subtitle: 'تحيا الجمهورية 🦅',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #fff 50%, #000 100%)',
      textColor: '#dc2626',
    });
    // Armed Forces Day Oct 6
    banners.push({
      key: 'armed_forces_' + year,
      start: d(year, 10, 6),
      end: d(year, 10, 6),
      emoji: '🎖️',
      title: 'عيد القوات المسلحة',
      subtitle: 'تحيا مصر وتحيا قواتها المسلحة 🦅',
      gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
      textColor: '#fff',
    });
  }

  // ─── Saudi Arabia ─────────────────────────────────────────────────────────
  if (country === 'SA') {
    banners.push({
      key: 'saudi_national_' + year,
      start: d(year, 9, 23),
      end: d(year, 9, 23),
      emoji: '🇸🇦',
      title: 'اليوم الوطني السعودي',
      subtitle: 'وطننا فخرنا 💚',
      gradient: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
      textColor: '#fff',
    });
  }

  // ─── UAE ──────────────────────────────────────────────────────────────────
  if (country === 'AE') {
    banners.push({
      key: 'uae_national_' + year,
      start: d(year, 12, 2),
      end: d(year, 12, 2),
      emoji: '🇦🇪',
      title: 'اليوم الوطني الإماراتي',
      subtitle: 'يحيا الاتحاد ❤️',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #16a34a 50%, #000 100%)',
      textColor: '#fff',
    });
  }

  // ─── Kuwait ───────────────────────────────────────────────────────────────
  if (country === 'KW') {
    banners.push({
      key: 'kuwait_national_' + year,
      start: d(year, 2, 25),
      end: d(year, 2, 25),
      emoji: '🇰🇼',
      title: 'اليوم الوطني الكويتي',
      subtitle: 'والكويت خالدة 💚',
      gradient: 'linear-gradient(135deg, #15803d 0%, #fff 50%, #dc2626 100%)',
      textColor: '#15803d',
    });
  }

  // ─── Qatar ────────────────────────────────────────────────────────────────
  if (country === 'QA') {
    banners.push({
      key: 'qatar_national_' + year,
      start: d(year, 12, 18),
      end: d(year, 12, 18),
      emoji: '🇶🇦',
      title: 'اليوم الوطني القطري',
      subtitle: 'بالله ثم بالوطن 💜',
      gradient: 'linear-gradient(135deg, #7c1d3b 0%, #9c2856 100%)',
      textColor: '#fff',
    });
  }

  // ─── Bahrain ──────────────────────────────────────────────────────────────
  if (country === 'BH') {
    banners.push({
      key: 'bahrain_national_' + year,
      start: d(year, 12, 16),
      end: d(year, 12, 16),
      emoji: '🇧🇭',
      title: 'اليوم الوطني البحريني',
      subtitle: 'البحرين وطن وفخر ❤️',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #fff 100%)',
      textColor: '#dc2626',
    });
  }

  // ─── Oman ─────────────────────────────────────────────────────────────────
  if (country === 'OM') {
    banners.push({
      key: 'oman_national_' + year,
      start: d(year, 11, 18),
      end: d(year, 11, 18),
      emoji: '🇴🇲',
      title: 'اليوم الوطني العُماني',
      subtitle: 'عُمان المجيدة ❤️',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #fff 50%, #15803d 100%)',
      textColor: '#dc2626',
    });
  }

  // ─── Jordan ───────────────────────────────────────────────────────────────
  if (country === 'JO') {
    banners.push({
      key: 'jordan_independence_' + year,
      start: d(year, 5, 25),
      end: d(year, 5, 25),
      emoji: '🇯🇴',
      title: 'عيد الاستقلال الأردني',
      subtitle: 'يحيا الأردن 🌹',
      gradient: 'linear-gradient(135deg, #000 0%, #fff 50%, #dc2626 100%)',
      textColor: '#dc2626',
    });
  }

  // ─── Lebanon ──────────────────────────────────────────────────────────────
  if (country === 'LB') {
    banners.push({
      key: 'lebanon_independence_' + year,
      start: d(year, 11, 22),
      end: d(year, 11, 22),
      emoji: '🇱🇧',
      title: 'عيد الاستقلال اللبناني',
      subtitle: 'لبنان وطن وحضارة 🌲',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #fff 50%, #dc2626 100%)',
      textColor: '#dc2626',
    });
  }

  // ─── Morocco ──────────────────────────────────────────────────────────────
  if (country === 'MA') {
    banners.push({
      key: 'throne_day_' + year,
      start: d(year, 7, 30),
      end: d(year, 7, 30),
      emoji: '🇲🇦',
      title: 'عيد العرش',
      subtitle: 'الله الوطن الملك 🌟',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      textColor: '#fff',
    });
    banners.push({
      key: 'morocco_independence_' + year,
      start: d(year, 11, 18),
      end: d(year, 11, 18),
      emoji: '🇲🇦',
      title: 'عيد الاستقلال المغربي',
      subtitle: 'المغرب يتألق 🌟',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
      textColor: '#fff',
    });
  }

  // ─── UK ───────────────────────────────────────────────────────────────────
  if (country === 'GB') {
    banners.push({
      key: 'christmas_gb_' + year,
      start: d(year, 12, 24),
      end: d(year, 12, 26),
      emoji: '🎄',
      title: 'Merry Christmas! 🎅',
      subtitle: 'Wishing you a wonderful holiday season',
      gradient: 'linear-gradient(135deg, #15803d 0%, #dc2626 100%)',
      textColor: '#fff',
    });
    if (year === 2026) {
      banners.push({
        key: 'easter_monday_gb_2026',
        start: d(2026, 4, 6),
        end: d(2026, 4, 6),
        emoji: '🐣',
        title: 'Happy Easter Monday!',
        subtitle: 'Enjoy the long weekend 🌷',
        gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
        textColor: '#fff',
      });
    }
  }

  // ─── US ───────────────────────────────────────────────────────────────────
  if (country === 'US') {
    banners.push({
      key: 'independence_day_us_' + year,
      start: d(year, 7, 4),
      end: d(year, 7, 5),
      emoji: '🎆',
      title: 'Happy 4th of July! 🇺🇸',
      subtitle: 'Happy Independence Day!',
      gradient: 'linear-gradient(135deg, #1d4ed8 0%, #fff 50%, #dc2626 100%)',
      textColor: '#1d4ed8',
    });
    if (year === 2026) {
      banners.push({
        key: 'thanksgiving_us_2026',
        start: d(2026, 11, 26),
        end: d(2026, 11, 26),
        emoji: '🦃',
        title: 'Happy Thanksgiving! 🍂',
        subtitle: 'Gratitude and blessings 🙏',
        gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
        textColor: '#fff',
      });
    }
    banners.push({
      key: 'christmas_us_' + year,
      start: d(year, 12, 24),
      end: d(year, 12, 26),
      emoji: '🎄',
      title: 'Merry Christmas! 🎅',
      subtitle: 'Happy Holidays! 🌟',
      gradient: 'linear-gradient(135deg, #15803d 0%, #dc2626 100%)',
      textColor: '#fff',
    });
  }

  // ─── France, Germany (Christmas) ──────────────────────────────────────────
  if (country === 'FR' || country === 'DE') {
    banners.push({
      key: 'christmas_eu_' + year,
      start: d(year, 12, 24),
      end: d(year, 12, 26),
      emoji: '🎄',
      title: country === 'FR' ? 'Joyeux Noël! 🎅' : 'Frohe Weihnachten! 🎅',
      subtitle: 'Happy Holidays! 🌟',
      gradient: 'linear-gradient(135deg, #15803d 0%, #dc2626 100%)',
      textColor: '#fff',
    });
  }

  return banners;
}

function getActiveBanner(country) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const year = now.getFullYear();
  const banners = getBanners(country, year);
  return banners.find(b => {
    const start = new Date(b.start.getFullYear(), b.start.getMonth(), b.start.getDate());
    const end = new Date(b.end.getFullYear(), b.end.getMonth(), b.end.getDate());
    return today >= start && today <= end;
  }) || null;
}

export default function SeasonalBanner() {
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const country = getCountryFromTimezone(tz);
      const active = getActiveBanner(country);
      if (active) {
        // Check if this banner was already dismissed (persistent)
        try {
          if (localStorage.getItem('xtox_banner_dismissed_' + active.key) === '1') {
            setBanner(null);
            return;
          }
        } catch {}
        setBanner(active);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    if (banner?.key) {
      try { localStorage.setItem('xtox_banner_dismissed_' + banner.key, '1'); } catch {}
    }
    setDismissed(true);
  };

  if (!banner || dismissed) return null;

  return (
    <div
      style={{
        background: banner.gradient,
        color: banner.textColor || '#fff',
        padding: '12px 16px',
        textAlign: 'center',
        position: 'relative',
        direction: 'rtl',
      }}
    >
      <span style={{ fontSize: 22 }}>{banner.emoji}</span>
      {' '}
      <strong style={{ fontSize: 15 }}>{banner.title}</strong>
      {' — '}
      <span style={{ fontSize: 13 }}>{banner.subtitle}</span>
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.25)',
          border: 'none',
          borderRadius: '50%',
          width: 28,
          height: 28,
          cursor: 'pointer',
          color: banner.textColor || '#fff',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
        aria-label="إغلاق"
      >
        ×
      </button>
    </div>
  );
}
