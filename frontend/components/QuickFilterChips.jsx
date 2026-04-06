'use client';

/**
 * QuickFilterChips - One-tap contextual filter chips for XTOX marketplace
 * 
 * Features:
 * - Horizontally-scrollable RTL-aware chip strip
 * - Category-specific smart filters (cars, properties, electronics, etc.)
 * - One-tap toggle: applies/removes URL param filter instantly
 * - Active state: orange highlight
 * - Arabic/English labels based on locale
 * - Zero dependencies (uses Next.js router only)
 * - Mobile-first (dominant in Arab markets)
 * - Full RTL dir support
 * - Cairo/Tajawal fonts
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const CATEGORY_CHIPS = {
  cars: [
    { label: 'Under 50K', labelAr: 'أقل من 50,000', param: 'maxPrice', value: '50000' },
    { label: 'Toyota', labelAr: 'تويوتا', param: 'brand', value: 'toyota' },
    { label: 'Automatic', labelAr: 'أوتوماتيك', param: 'transmission', value: 'automatic' },
    { label: '2020+', labelAr: '2020 فأعلى', param: 'minYear', value: '2020' },
    { label: 'Low KM', labelAr: 'كيلومتر منخفض', param: 'maxKm', value: '50000' },
    { label: 'Diesel', labelAr: 'ديزل', param: 'fuel', value: 'diesel' },
  ],
  properties: [
    { label: 'For Rent', labelAr: 'للإيجار', param: 'type', value: 'rent' },
    { label: 'For Sale', labelAr: 'للبيع', param: 'type', value: 'sale' },
    { label: '3+ Rooms', labelAr: '3 غرف فأكثر', param: 'minRooms', value: '3' },
    { label: 'Furnished', labelAr: 'مفروشة', param: 'furnished', value: 'true' },
    { label: 'Ground Floor', labelAr: 'دور أرضي', param: 'floor', value: 'ground' },
    { label: 'With Garden', labelAr: 'بحديقة', param: 'garden', value: 'true' },
  ],
  electronics: [
    { label: 'iPhone', labelAr: 'آيفون', param: 'brand', value: 'apple' },
    { label: 'Samsung', labelAr: 'سامسونج', param: 'brand', value: 'samsung' },
    { label: 'Under 1K', labelAr: 'أقل من 1,000', param: 'maxPrice', value: '1000' },
    { label: 'Like New', labelAr: 'كالجديد', param: 'condition', value: 'like_new' },
    { label: 'With Warranty', labelAr: 'بضمان', param: 'warranty', value: 'true' },
  ],
  furniture: [
    { label: 'Bedroom', labelAr: 'غرفة نوم', param: 'type', value: 'bedroom' },
    { label: 'Living Room', labelAr: 'غرفة معيشة', param: 'type', value: 'living' },
    { label: 'Kitchen', labelAr: 'مطبخ', param: 'type', value: 'kitchen' },
    { label: 'Used', labelAr: 'مستعمل', param: 'condition', value: 'used' },
    { label: 'New', labelAr: 'جديد', param: 'condition', value: 'new' },
  ],
  jobs: [
    { label: 'Full Time', labelAr: 'دوام كامل', param: 'type', value: 'fulltime' },
    { label: 'Part Time', labelAr: 'دوام جزئي', param: 'type', value: 'parttime' },
    { label: 'Remote', labelAr: 'عن بُعد', param: 'remote', value: 'true' },
    { label: 'Urgent', labelAr: 'عاجل', param: 'urgent', value: 'true' },
  ],
};

export default function QuickFilterChips({ category = '', locale = 'ar' }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const chips = CATEGORY_CHIPS[category] || [];
  const isRTL = locale === 'ar';

  const toggleChip = useCallback(
    (chip) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(chip.param) === chip.value) {
        params.delete(chip.param);
      } else {
        params.set(chip.param, chip.value);
      }
      router.push('?' + params.toString(), { scroll: false });
    },
    [searchParams, router]
  );

  if (!chips.length) return null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '8px 16px',
        margin: '0 -16px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        fontFamily: isRTL
          ? "'Cairo', 'Tajawal', sans-serif"
          : "'Inter', sans-serif",
      }}
    >
      {chips.map((chip) => {
        const active = searchParams.get(chip.param) === chip.value;
        return (
          <button
            key={chip.param + '-' + chip.value}
            onClick={() => toggleChip(chip)}
            style={{
              flexShrink: 0,
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 500,
              border: active ? '1.5px solid #f97316' : '1.5px solid #d1d5db',
              background: active
                ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                : '#ffffff',
              color: active ? '#ffffff' : '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              boxShadow: active
                ? '0 2px 8px rgba(249,115,22,0.35)'
                : '0 1px 3px rgba(0,0,0,0.08)',
              outline: 'none',
              lineHeight: 1.5,
            }}
            aria-pressed={active}
            aria-label={isRTL ? chip.labelAr : chip.label}
          >
            {isRTL ? chip.labelAr : chip.label}
          </button>
        );
      })}
    </div>
  );
}
