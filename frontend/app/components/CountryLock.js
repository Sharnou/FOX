'use client';
import { useEffect, useState } from 'react';
const COUNTRIES = ['EG', 'SA', 'AE', 'DE', 'US', 'GB', 'JO', 'LY', 'MA'];
export default function CountryLock({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('country')) {
      const code = prompt('اختر كودك الدولي (EG, SA, AE, DE, US...)', 'EG') || 'EG';
      localStorage.setItem('country', code.toUpperCase());
    }
    setReady(true);
  }, []);
  if (!ready) return <div className="flex justify-center p-20 text-brand text-2xl">جار التحميل...</div>;
  return children;
}
