'use client';
import { useState, useEffect } from 'react';

function getActiveBannerSafe() {
  try {
    const BANNERS = [
      { id: 'sham', title: 'عيد شم النسيم 🌸', subtitle: 'كل عام وأنتم بخير', emoji: '🌸', gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)', textColor: '#2d5a3d', startMonth: 4, startDay: 10, endMonth: 4, endDay: 21 },
      { id: 'eid_fitr', title: 'عيد الفطر المبارك 🌙', subtitle: 'كل عام وأنتم بخير', emoji: '🌙', gradient: 'linear-gradient(135deg, #f093fb, #f5a623)', textColor: '#4a0080', startMonth: 3, startDay: 25, endMonth: 4, endDay: 5 },
      { id: 'eid_adha', title: 'عيد الأضحى المبارك 🐑', subtitle: 'تقبل الله منا ومنكم', emoji: '🐑', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)', textColor: '#1a4a2e', startMonth: 6, startDay: 1, endMonth: 6, endDay: 10 },
      { id: 'ramadan', title: 'رمضان كريم 🌙', subtitle: 'كل عام وأنتم بخير', emoji: '🌙', gradient: 'linear-gradient(135deg, #1a1a2e, #16213e)', textColor: '#f5c518', startMonth: 2, startDay: 28, endMonth: 3, endDay: 30 },
    ];
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return BANNERS.find(b => {
      if (b.startMonth === b.endMonth) return month === b.startMonth && day >= b.startDay && day <= b.endDay;
      if (month === b.startMonth) return day >= b.startDay;
      if (month === b.endMonth) return day <= b.endDay;
      return month > b.startMonth && month < b.endMonth;
    }) || null;
  } catch { return null; }
}

export default function SeasonalBanner() {
  const [banner, setBanner] = useState(null);
  useEffect(() => { setBanner(getActiveBannerSafe()); }, []);
  if (!banner) return null;
  return (
    <div style={{ background: banner.gradient, color: banner.textColor, padding: '10px 16px', textAlign: 'center', borderRadius: 12, margin: '8px 12px 0', fontSize: 14, fontWeight: 600, direction: 'rtl' }}>
      <span style={{ fontSize: 20, marginLeft: 8 }}>{banner.emoji}</span>
      {banner.title} — {banner.subtitle}
    </div>
  );
}
