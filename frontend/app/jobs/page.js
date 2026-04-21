'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const JOB_TYPES = [
  { id: 'all',       label: 'الكل',        icon: '🗂️' },
  { id: 'fulltime',  label: 'دوام كامل',   icon: '⏰' },
  { id: 'parttime',  label: 'دوام جزئي',   icon: '🕐' },
  { id: 'remote',    label: 'عن بُعد',      icon: '🌐' },
  { id: 'freelance', label: 'فريلانس',     icon: '💼' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)  return 'منذ لحظات';
  if (diff < 3600) return 'منذ' + ' ' + Math.floor(diff / 60) + ' ' + 'دقيقة';
  if (diff < 86400) return 'منذ' + ' ' + Math.floor(diff / 3600) + ' ' + 'ساعة';
  if (diff < 2592000) return 'منذ' + ' ' + Math.floor(diff / 86400) + ' ' + 'يوم';
  return 'منذ' + ' ' + Math.floor(diff / 2592000) + ' ' + 'شهر';
}

function JobCard({ job }) {
  const hasWhatsApp = job.phone && (job.phone.startsWith('+') || job.phone.length >= 9);
  const wa = hasWhatsApp
    ? 'https://wa.me/' + job.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent('مرحباً، رأيت إعلان الوظيفة "' + job.title + '" على XTOX وأريد الاستفسار' + '" على XTOX وأريد الاستفسار')
    : null;

  const typeLabelMap = {
    fulltime: 'دوام كامل', parttime: 'دوام جزئي',
    remote: 'عن بُعد', freelance: 'فريلانس',
  };
  const typeLabel = typeLabelMap[job.jobType] || null;

  return (
    <article
      role="article"
      aria-label={'وظيفة: ' + job.title}
      style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        padding: '18px 20px',
        border: '1px solid #f0f0f0',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,47,52,0.13)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontWeight: 700, fontSize: 17, color: '#002f34', margin: '0 0 4px', lineHeight: 1.4 }}>
            {job.title}
          </h2>
          {job.company && (
            <p style={{ color: '#555', fontSize: 13, margin: 0 }}>🏢 {job.company}</p>
          )}
        </div>
        {typeLabel && (
          <span style={{
            background: '#e6f4f1', color: '#005952', fontSize: 11,
            fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            whiteSpace: 'nowrap', marginRight: 8,
          }}>
            {typeLabel}
          </span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <p style={{
          color: '#666', fontSize: 13, lineHeight: 1.7,
          margin: '0 0 12px',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {job.description}
        </p>
      )}

      {/* Meta info */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 14 }}>
        {job.city && (
          <span style={{ color: '#888', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            📍 {job.city}
          </span>
        )}
        {job.price && (
          <span style={{ color: '#002f34', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            💰 {job.price}{job.currency ? ' ' + job.currency : ''}
          </span>
        )}
        {job.createdAt && (
          <span style={{ color: '#aaa', fontSize: 12, marginRight: 'auto' }}>
            🕐 {timeAgo(job.createdAt)}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a
          href={'/chat?target=' + (job.userId?._id || job.userId?.id || (typeof job.userId === 'string' ? job.userId : ''))}
          aria-label={'محادثة بخصوص وظيفة ' + job.title}
          onClick={(e) => {
            const token = localStorage.getItem('xtox_token') || localStorage.getItem('token');
            if (!token) {
              e.preventDefault();
              window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            }
          }}
          style={{
            flex: 1, background: '#002f34', color: '#fff',
            textAlign: 'center', padding: '10px 12px',
            borderRadius: 12, fontSize: 14, fontWeight: 700,
            textDecoration: 'none', minWidth: 100,
          }}
        >
          💬 تواصل
        </a>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={'واتساب بخصوص وظيفة ' + job.title}
            style={{
              flex: 1, background: '#25D366', color: '#fff',
              textAlign: 'center', padding: '10px 12px',
              borderRadius: 12, fontSize: 14, fontWeight: 700,
              textDecoration: 'none', minWidth: 100,
            }}
          >
            📱 واتساب
          </a>
        )}
      </div>
    </article>
  );
}

export default function JobsPage() {
  const { t: tr, language, isRTL } = useLanguage();
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [citySearch, setCitySearch] = useState('');

  const [country, setCountry] = useState('EG');

  // Read country from localStorage only on client to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCountry(localStorage.getItem('country') || 'EG');
    }
  }, []);

  const fetchJobs = () => {
    const controller = new AbortController();
    setLoading(true);
    axios.get(API + '/api/jobs', { params: { country }, signal: controller.signal })
      .then(r => setJobs(Array.isArray(r.data) ? r.data : []))
      .catch(e => { if (!axios.isCancel(e)) console.warn('[Jobs] fetch error'); })
      .finally(() => setLoading(false));
    return controller;
  };

  useEffect(() => {
    const controller = fetchJobs();
    return () => controller.abort();
  }, [country]);

  const filtered = useMemo(() => {
    let list = jobs;
    if (filter !== 'all') list = list.filter(j => j.jobType === filter);
    if (citySearch.trim()) {
      const q = citySearch.trim().toLowerCase();
      list = list.filter(j => j.city?.toLowerCase().includes(q));
    }
    return list;
  }, [jobs, filter, citySearch]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'إعلانات الوظائف | XTOX',
    description: 'تصفح أحدث إعلانات الوظائف والعمل في منطقتك',
    url: 'https://xtox.app/jobs',
    inLanguage: 'ar',
    isPartOf: { '@type': 'WebSite', name: 'XTOX', url: 'https://xtox.app' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://xtox.app' },
        { '@type': 'ListItem', position: 2, name: 'الوظائف',  item: 'https://xtox.app/jobs' },
      ],
    },
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #002f34 0%, #004d40 100%)', padding: '24px 20px 32px', position: 'relative' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => history.back()}
              aria-label="العودة للصفحة السابقة"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}
            >
              ←
            </button>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>
              💼 الوظائف
            </h1>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>
              {loading ? '…' : jobs.length + ' إعلان'}
            </span>
            <Link
              href="/jobs/post"
              aria-label="نشر وظيفة جديدة"
              style={{
                marginRight: 'auto', background: '#fff', color: '#002f34',
                padding: '8px 16px', borderRadius: 12, fontSize: 14,
                fontWeight: 700, textDecoration: 'none',
              }}
            >
              + نشر وظيفة
            </Link>
          </div>

          {/* City search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>
              🔍
            </span>
            <input
              type="search"
              value={citySearch}
              onChange={e => setCitySearch(e.target.value)}
              placeholder="ابحث بالمدينة…"
              aria-label="البحث بالمدينة"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 14, padding: '11px 44px 11px 16px',
                color: '#fff', fontSize: 14, fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 32px' }}>

        {/* Filter tabs */}
        <div
          role="tablist"
          aria-label="تصفية الوظائف حسب النوع"
          style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 0', scrollbarWidth: 'none' }}
        >
          {JOB_TYPES.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              style={{
                background: filter === t.id ? '#002f34' : '#fff',
                color: filter === t.id ? '#fff' : '#555',
                border: '1.5px solid ' + (filter === t.id ? '#002f34' : '#e0e0e0'),
                borderRadius: 20, padding: '7px 16px',
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.18s ease',
                boxShadow: filter === t.id ? '0 2px 8px rgba(0,47,52,0.25)' : 'none',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>
            {filtered.length > 0
              ? filtered.length + ' وظيفة متاحة'
              : 'لا توجد وظائف تطابق البحث'}
          </p>
        )}

        {/* Job list */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <h2 style={{ color: '#002f34', fontSize: 20, marginBottom: 8 }}>لا توجد وظائف حالياً</h2>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
              {citySearch ? 'لا توجد نتائج في "' + citySearch + '" — جرب مدينة أخرى' : 'كن أول من ينشر وظيفة في منطقتك!'}
            </p>
            <Link
              href="/jobs/post"
              style={{ background: '#002f34', color: '#fff', padding: '12px 28px', borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}
            >
              + انشر وظيفة الآن
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(j => <JobCard key={j._id} job={j} />)}
          </div>
        )}
      </div>
    </div>
  );
}
