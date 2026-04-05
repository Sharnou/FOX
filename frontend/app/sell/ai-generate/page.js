'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import AIListingGenerator from '@/components/sell/AIListingGenerator';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AIGeneratePage() {
  const router = useRouter();
  const [generated, setGenerated] = useState(null);

  const handleGenerated = (data) => {
    setGenerated(data);
  };

  const useListing = () => {
    // Store in sessionStorage so the sell page can pick it up
    if (typeof window !== 'undefined' && generated) {
      sessionStorage.setItem('ai_generated_listing', JSON.stringify(generated));
    }
    router.push('/sell');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', direction: 'rtl', fontFamily: 'inherit', padding: '24px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Back nav */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
          <Link href="/ai-tools" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← أدوات AI</Link>
          <span style={{ color: '#d1d5db' }}>|</span>
          <Link href="/sell" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>نشر إعلان</Link>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
          ⚡ مولّد الإعلانات بالذكاء الاصطناعي
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>
          AI Listing Generator — اكتب وصفاً أو ارفع صورة وسيتولى الذكاء الاصطناعي الباقي
        </p>

        <AIListingGenerator onGenerated={handleGenerated} />

        {generated && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, marginTop: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#111827' }}>
              ✅ تم إنشاء الإعلان — راجع التفاصيل:
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>عنوان الإعلان</label>
                <input
                  defaultValue={generated.title}
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>الوصف</label>
                <textarea
                  defaultValue={generated.description}
                  rows={4}
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>الفئة</label>
                  <input defaultValue={generated.category} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>السعر التقديري (USD)</label>
                  <input defaultValue={generated.estimated_price_usd} type="number" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={useListing} style={{
                flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: 10,
                padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                انتقل لنشر الإعلان →
              </button>
              <Link href="/sell" style={{
                padding: '12px 20px', border: '1px solid #e5e7eb', borderRadius: 10,
                fontSize: 14, color: '#374151', textDecoration: 'none', fontWeight: 500,
              }}>
                نشر يدوياً
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
