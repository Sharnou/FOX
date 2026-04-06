'use client';

import React from 'react';

/**
 * HijriDateDisplay — converts Gregorian dates to Hijri (Islamic) calendar
 * and displays them in Arabic RTL format.
 * XTOX Arab Marketplace — Run 122
 */

function gregorianToHijri(gDate) {
  const gYear = gDate.getFullYear();
  const gMonth = gDate.getMonth() + 1;
  const gDay = gDate.getDate();

  const JD =
    Math.floor((1461 * (gYear + 4800 + Math.floor((gMonth - 14) / 12))) / 4) +
    Math.floor((367 * (gMonth - 2 - 12 * Math.floor((gMonth - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gYear + 4900 + Math.floor((gMonth - 14) / 12)) / 100)) / 4) +
    gDay -
    32075;

  const l = JD - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;

  return { year: hYear, month: hMonth, day: hDay };
}

const HIJRI_MONTHS_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

function toArabicNumerals(num) {
  return String(num).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
}

/**
 * HijriDateDisplay
 * @param {Date|string} date - The Gregorian date to display
 * @param {boolean} showGregorian - Whether to also show the Gregorian date
 * @param {string} className - Additional CSS class
 */
export default function HijriDateDisplay({ date, showGregorian = true, className = '' }) {
  const d = date ? new Date(date) : new Date();
  const hijri = gregorianToHijri(d);

  const hijriStr = toArabicNumerals(hijri.day) + ' ' + HIJRI_MONTHS_AR[hijri.month - 1] + ' ' + toArabicNumerals(hijri.year);

  const gregorianStr = d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={'hijri-date-display ' + className}
      dir="rtl"
      style={{
        fontSize: '0.82rem',
        color: '#888',
        fontFamily: 'Cairo, Tajawal, sans-serif',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span
        role="time"
        title={showGregorian ? gregorianStr : ''}
        style={{ cursor: 'default' }}
        aria-label={'تاريخ الإعلان: ' + hijriStr + ' هجري'}
      >
        📅 {hijriStr} هـ
      </span>
      {showGregorian && (
        <span style={{ color: '#bbb', fontSize: '0.75rem' }}>({gregorianStr})</span>
      )}
    </div>
  );
}
