'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';
import AISearchBar from '../components/AISearchBar';
import { fetchWithRetry } from '../../lib/fetchWithRetry';
import SaveSearch from '../components/SaveSearch';
import PriceAlert from '../components/PriceAlert';
import { detectLang } from '../../lib/lang';
import VerifiedBadge from '../components/VerifiedBadge';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const CATEGORIES = ['الكل', 'سيارات', 'إلكترونيات', 'عقارات', 'وظائف', 'خدمات', 'سوبرماركت', 'صيدلية', 'طعام', 'موضة'];
const CAT_MAP = { 'سيارات': 'Vehicles', 'إلكترونيات': 'Electronics', 'عقارات': 'Real Estate', 'وظائف': 'Jobs', 'خدمات': 'Services', 'سوبرماركت': 'Supermarket', 'صيدلية': 'Pharmacy', 'طعام': 'Fast Food', 'موضة': 'Fashion' };
const SUBCATEGORY_MAP = {
  'Vehicles': [{ value: '', label: 'كل الأنواع' }, { value: 'Cars', label: 'سيارات' }, { value: 'Motorcycles', label: 'موتوسيكلات' }, { value: 'Trucks', label: 'شاحنات' }, { value: 'Boats', label: 'قوارب' }, { value: 'CarParts', label: 'قطع غيار' }],
  'Electronics': [{ value: '', label: 'كل الأنواع' }, { value: 'MobilePhones', label: 'موبايلات' }, { value: 'Laptops', label: 'لابتوب' }, { value: 'TVs', label: 'تليفزيونات' }, { value: 'Cameras', label: 'كاميرات' }, { value: 'Gaming', label: 'جيمنج' }, { value: 'Tablets', label: 'تابلت' }],
  'Real Estate': [{ value: '', label: 'كل الأنواع' }, { value: 'Apartments', label: 'شقق' }, { value: 'Villas', label: 'فيلات' }, { value: 'Offices', label: 'مكاتب' }, { value: 'Land', label: 'أراضي' }],
  'RealEstate': [{ value: '', label: 'كل الأنواع' }, { value: 'Apartments', label: 'شقق' }, { value: 'Villas', label: 'فيلات' }, { value: 'Offices', label: 'مكاتب' }, { value: 'Land', label: 'أراضي' }],
  'Jobs': [{ value: '', label: 'كل الأنواع' }, { value: 'FullTime', label: 'دوام كامل' }, { value: 'PartTime', label: 'دوام جزئي' }, { value: 'Internship', label: 'تدريب' }],
  'Services': [{ value: '', label: 'كل الأنواع' }, { value: 'HomeServices', label: 'خدمات منزلية' }, { value: 'Tutoring', label: 'دروس خصوصية' }, { value: 'Transport', label: 'نقل' }, { value: 'Beauty', label: 'تجميل' }],
  'Fashion': [{ value: '', label: 'كل الأنواع' }, { value: 'MensClothing', label: 'ملابس رجالي' }, { value: 'WomensClothing', label: 'ملابس حريمي' }, { value: 'KidsClothing', label: 'ملابس أطفال' }, { value: 'Accessories', label: 'اكسسوارات' }],
  'Supermarket': [{ value: '', label: 'كل الأنواع' }, { value: 'Groceries', label: 'مواد غذائية' }, { value: 'Household', label: 'منتجات منزلية' }],
  'FastFood': [{ value: '', label: 'كل الأنواع' }, { value: 'Restaurants', label: 'مطاعم' }, { value: 'Cafes', label: 'كافيهات' }],
  'Pharmacy': [{ value: '', label: 'كل الأنواع' }, { value: 'Medicines', label: 'أدوية' }, { value: 'BabyProducts', label: 'منتجات أطفال' }],
};
const SUBSUB_MAP = {
  'Cars': [{ value: '', label: 'كل الأنواع' }, { value: 'Sedan', label: 'سيدان' }, { value: 'SUV', label: 'SUV / دفع رباعي' }, { value: 'Pickup', label: 'بيك آب' }, { value: 'Coupe', label: 'كوبيه' }, { value: 'Electric', label: 'كهربائية' }],
  'Motorcycles': [{ value: '', label: 'كل الأنواع' }, { value: 'Sport', label: 'رياضية' }, { value: 'Scooter', label: 'سكوتر' }, { value: 'OffRoad', label: 'أوف رود' }],
  'MobilePhones': [{ value: '', label: 'كل الأنواع' }, { value: 'iPhone', label: 'آيفون' }, { value: 'Samsung', label: 'سامسونج' }, { value: 'Huawei', label: 'هواوي' }, { value: 'Xiaomi', label: 'شاومي' }, { value: 'Oppo', label: 'أوبو' }],
  'Laptops': [{ value: '', label: 'كل الأنواع' }, { value: 'MacBook', label: 'ماك بوك' }, { value: 'GamingLaptop', label: 'جيمينج' }, { value: 'Business', label: 'للأعمال' }],
  'Gaming': [{ value: '', label: 'كل الأنواع' }, { value: 'PlayStation', label: 'بلايستيشن' }, { value: 'Xbox', label: 'إكس بوكس' }, { value: 'Nintendo', label: 'نينتندو' }, { value: 'PCGaming', label: 'PC' }],
  'Apartments': [{ value: '', label: 'كل الأنواع' }, { value: 'Studio', label: 'استوديو' }, { value: '1BR', label: 'غرفة واحدة' }, { value: '2BR', label: 'غرفتان' }, { value: '3BR', label: '3 غرف' }, { value: '4BR', label: '4 غرف+' }, { value: 'Duplex', label: 'دوبلكس' }],
  'Villas': [{ value: '', label: 'كل الأنواع' }, { value: 'Independent', label: 'مستقلة' }, { value: 'Compound', label: 'كمبوند' }, { value: 'TwinHouse', label: 'توين هاوس' }, { value: 'TownHouse', label: 'تاون هاوس' }],
  'HomeServices': [{ value: '', label: 'كل الأنواع' }, { value: 'Plumber', label: 'سباكة' }, { value: 'Electrician', label: 'كهرباء' }, { value: 'Carpenter', label: 'نجارة' }, { value: 'Painter', label: 'دهانات' }],
  'MensClothing': [{ value: '', label: 'كل الأنواع' }, { value: 'Formal', label: 'رسمي' }, { value: 'Casual', label: 'كاجوال' }, { value: 'Sports', label: 'رياضي' }],
  'WomensClothing': [{ value: '', label: 'كل الأنواع' }, { value: 'Abayas', label: 'عبايات' }, { value: 'Dresses', label: 'فساتين' }, { value: 'Casual', label: 'كاجوال' }],
  'Shoes': [{ value: '', label: 'كل الأنواع' }, { value: 'Sneakers', label: 'سنيكرز' }, { value: 'Sandals', label: 'صنادل' }, { value: 'Sports', label: 'رياضي' }, { value: 'Formal', label: 'رسمي' }],
};
const POPULAR = ['عربية', 'آيفون', 'شقة', 'لابتوب', 'سباك', 'تليفزيون', 'موبايل', 'أثاث'];
const MAX_RECENT = 8;

function saveRecentSearch(term) {
  if (!term?.trim() || typeof window === 'undefined') return;
  try {
    const stored = JSON.parse(localStorage.getItem('xtox_recent_searches') || '[]');
    const updated = [term.trim(), ...stored.filter(s => s !== term.trim())].slice(0, MAX_RECENT);
    localStorage.setItem('xtox_recent_searches', JSON.stringify(updated));
  } catch {}
}

function loadRecentSearches() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('xtox_recent_searches') || '[]'); } catch { return []; }
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem('xtox_recent_searches'); } catch {}
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('الكل');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [city, setCity] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [subcategory, setSubcategory] = useState('');
  const [subsub2, setSubsub2] = useState('');
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) { setQuery(q); doSearch(q); }
    }
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowRecent(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function doSearch(q = query) {
    if (!q.trim() && category === 'الكل') return;
    setShowRecent(false);
    setLoading(true); setSearched(true);
    if (q.trim()) {
      saveRecentSearch(q.trim());
      setRecentSearches(loadRecentSearches());
    }
    try {
      const params = { country };
      if (category !== 'الكل') params.category = CAT_MAP[category] || category;
      if (subcategory) params.subcategory = subcategory;
      if (subsub2) params.subsub = subsub2;
      if (city) params.city = city;
      const res = await axios.get(API + '/api/ads', { params });
      const _searchData = res.data;
      const _searchAds = Array.isArray(_searchData) ? _searchData : (_searchData.ads || _searchData.data || []);
      setSearchError('');
      const filtered = (_searchAds || []).filter(ad =>
        !q.trim() ||
        ad.title?.toLowerCase().includes(q.toLowerCase()) ||
        ad.description?.toLowerCase().includes(q.toLowerCase()) ||
        ad.city?.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered);
    } catch { setResults([]); setSearchError('تعذّر تحميل النتائج — تحقّق من اتصالك وأعد المحاولة'); }
    setLoading(false);
  }

  function handleClearRecent() {
    clearRecentSearches();
    setRecentSearches([]);
    setShowRecent(false);
  }

  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'subsub') return (a.subsub || '').localeCompare(b.subsub || '');
    if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  }).filter(ad => {
    if (minPrice && ad.price < Number(minPrice)) return false;
    if (maxPrice && ad.price > Number(maxPrice)) return false;
    return true;
  });

  const searchPrices = sorted.map(a => Number(a.price)).filter(p => p > 0);
  const searchJsonLd = searched ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: query
      ? ('نتائج البحث عن "' + query + '" في XTOX')
      : ('إعلانات XTOX - ' + (category !== 'الكل' ? category : 'جميع الفئات')),
    description: 'نتائج البحث في سوق XTOX للإعلانات المبوبة',
    numberOfItems: sorted.length,
    ...(searchPrices.length > 0 && {
      offers: {
        '@type': 'AggregateOffer',
        offerCount: sorted.length,
        lowPrice: Math.min(...searchPrices),
        highPrice: Math.max(...searchPrices),
        priceCurrency: 'EGP',
      },
    }),
    itemListElement: sorted.slice(0, 10).map((ad, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: ad.title,
        url: 'https://xtox.app/ads/' + ad._id,
        image: ad.media?.[0] || undefined,
        offers: {
          '@type': 'Offer',
          price: ad.price,
          priceCurrency: ad.currency || 'EGP',
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/UsedCondition',
        },
      },
    })),
  } : null;

  const breadcrumbSearchItems = [
    { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://xtox.app' },
    { '@type': 'ListItem', position: 2, name: 'البحث', item: 'https://xtox.app/search' },
  ];
  if (searched && query.trim()) {
    breadcrumbSearchItems.push({
      '@type': 'ListItem',
      position: 3,
      name: query,
      item: 'https://xtox.app/search?q=' + encodeURIComponent(query),
    });
  }
  const breadcrumbSearchLd = searched ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbSearchItems,
  } : null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      {searchJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(searchJsonLd) }} />
      )}
      {breadcrumbSearchLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSearchLd) }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ color: '#002f34', margin: 0, fontSize: 22, fontWeight: 'bold' }}>🔍 البحث</h1>
      </div>

      <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => recentSearches.length > 0 && !query && setShowRecent(true)}
              onKeyDown={e => {
                if (e.key === 'Enter') doSearch();
                if (e.key === 'Escape') setShowRecent(false);
              }}
              placeholder="ابحث عن أي شيء..."
              dir="rtl"
              style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '2px solid #002f34', fontSize: 16, fontFamily: 'inherit' }}
              autoFocus
            />
            <button onClick={() => doSearch()}
              style={{ padding: '12px 24px', background: '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
              بحث
            </button>
          </div>
          {showRecent && recentSearches.length > 0 && (
            <div
              ref={dropdownRef}
              role="listbox"
              aria-label="عمليات البحث الأخيرة"
              style={{
                position: 'absolute', top: '100%', right: 0, left: 0,
                background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '1px solid #e8e8e8', zIndex: 100, overflow: 'hidden', marginTop: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px 6px', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: '600' }}>🕐 عمليات البحث الأخيرة</span>
                <button
                  onClick={handleClearRecent}
                  style={{ background: 'none', border: 'none', color: '#cc4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 6px', borderRadius: 6 }}
                >
                  مسح الكل
                </button>
              </div>
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  role="option"
                  onClick={() => { setQuery(term); doSearch(term); }}
                  style={{
                    width: '100%', textAlign: 'right', padding: '10px 14px',
                    background: 'none', border: 'none', fontSize: 14,
                    cursor: 'pointer', fontFamily: 'inherit', color: '#333',
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderBottom: i < recentSearches.length - 1 ? '1px solid #f5f5f5' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8faf8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ color: '#aaa', fontSize: 12 }}>🔍</span>
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
        <SaveSearch searchParams={{ q: query, category, minPrice, maxPrice, city, sortBy }} lang="ar" />
        <PriceAlert lang="ar" keyword={query} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          <select value={category} onChange={e => { setCategory(e.target.value); setSubcategory(''); setSubsub2(''); }}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: 'white', fontFamily: 'inherit' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {category !== 'الكل' && (SUBCATEGORY_MAP[CAT_MAP[category] || category] || null) && (
            <select value={subcategory} onChange={e => { setSubcategory(e.target.value); setSubsub2(''); }}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: 'white', fontFamily: 'inherit' }}>
              {(SUBCATEGORY_MAP[CAT_MAP[category] || category] || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
          {subcategory && (SUBSUB_MAP[subcategory] || null) && (
            <select value={subsub2} onChange={e => setSubsub2(e.target.value)}
              title="التصنيف الفرعي الثاني"
              style={{ padding: '8px 12px', borderRadius: 10, border: '2px solid #6366f1', fontSize: 13, background: 'white', fontFamily: 'inherit', fontWeight: 600 }}>
              {(SUBSUB_MAP[subcategory] || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="المدينة" dir="rtl"
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }} />
          <input value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="أدنى سعر" type="number"
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13 }} />
          <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="أعلى سعر" type="number"
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13 }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: 'white', fontFamily: 'inherit' }}>
            <option value="newest">الأحدث</option>
            <option value="subsub">بالتصنيف الفرعي</option>
            <option value="price_low">السعر: الأقل</option>
            <option value="price_high">السعر: الأعلى</option>
            <option value="views">الأكثر مشاهدة</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[...Array(6)].map((_, i) => <AdCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && searched && sorted.length > 0 && (
        <div>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 12, fontWeight: '600' }}>
            وجدنا <span style={{ color: '#002f34' }}>{sorted.length}</span> نتيجة
            {query.trim() && <span style={{ color: '#888', fontWeight: 'normal' }}> لـ "{query}"</span>}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {sorted.map(ad => (
              <a key={ad._id} href={'/ads/' + ad._id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ height: 130, background: '#f0f0f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                  {(ad.media?.[0] || ad.images?.[0]) ? <img src={ad.media?.[0] || ad.images?.[0]} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={ad.title} onError={function(e){e.target.style.display='none'}} /> : '📦'}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0 }}>{ad.title?.slice(0, 30)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 14, margin: '4px 0' }}>{ad.price} {ad.currency}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <VerifiedBadge
                      emailVerified={ad.userId?.emailVerified || ad.seller?.emailVerified}
                      whatsappVerified={ad.userId?.whatsappVerified || ad.seller?.whatsappVerified}
                    />
                    <p style={{ color: '#999', fontSize: 11, margin: 0 }}>👁 {ad.views} · {ad.city}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {!loading && searched && searchError && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#e74c3c', fontSize: 15 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ margin: 0 }}>{searchError}</p>
          <button onClick={() => doSearch()} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#002f34', color: 'white', cursor: 'pointer', fontSize: 13 }}>إعادة المحاولة</button>
        </div>
      )}
      {!loading && searched && !searchError && sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#555', background: 'white', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} dir="rtl" aria-label="لا توجد نتائج بحث">
          <div style={{ fontSize: 56, marginBottom: 12 }} aria-hidden="true">🔍</div>
          <h2 style={{ fontSize: 20, fontWeight: '700', color: '#002f34', margin: '0 0 8px' }}>
            لا توجد نتائج
            {query.trim() && <span style={{ color: '#666', fontWeight: '400' }}> لـ "{query}"</span>}
          </h2>
          <p style={{ color: '#888', fontSize: 14, margin: '0 0 24px', lineHeight: 1.7 }}>
            جرّب كلمات مختلفة أو تصفّح الفئات أدناه
          </p>
          {(minPrice || maxPrice || category !== 'الكل' || city) && (
            <button
              onClick={() => { setMinPrice(''); setMaxPrice(''); setCategory('الكل'); setCity(''); setSubcategory(''); doSearch(); }}
              style={{ padding: '10px 24px', background: '#f0f0f0', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, color: '#333', fontWeight: '600' }}
            >
              ✕ إزالة الفلاتر
            </button>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {POPULAR.map(s => (
              <button key={s} onClick={() => { setQuery(s); doSearch(s); }}
                style={{ padding: '8px 16px', background: '#002f34', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: '500' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!searched && (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }} dir="rtl">
          <div style={{ fontSize: 60 }}>🔍</div>
          <p style={{ marginTop: 12, fontSize: 15 }}>ابحث عن أي شيء في XTOX</p>
          {recentSearches.length > 0 && (
            <div style={{ marginTop: 20, marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>🕐 عمليات البحث الأخيرة</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {recentSearches.slice(0, 5).map((s, i) => (
                  <button key={i} onClick={() => { setQuery(s); doSearch(s); }}
                    style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: '#444' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p style={{ fontSize: 13, color: '#bbb', margin: '16px 0 8px' }}>أو جرّب من الشائع</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {POPULAR.map(s => (
              <button key={s} onClick={() => { setQuery(s); doSearch(s); }}
                style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
