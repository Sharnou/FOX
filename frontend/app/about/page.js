'use client';
import { useState, useEffect } from 'react';
import { detectLang } from '../../lib/lang';

const TRANSLATIONS = {
  ar: {
    title: 'عن إكستوكس',
    subtitle: 'السوق العربي الذكي للمنتجات المحلية',
    mission: 'مهمتنا',
    missionText: 'نربط المجتمعات العربية بسوق رقمي آمن وذكي، يدعم اللغة العربية ويحترم خصوصية المستخدم.',
    stats: 'أرقامنا',
    team: 'فريقنا',
    contact: 'تواصل معنا',
    countries: 'دولة',
    ads: 'إعلان نشط',
    users: 'مستخدم',
    vision: 'رؤيتنا',
    visionText: 'أن نكون المنصة العربية الأولى للتجارة المحلية الذكية، حيث يستطيع كل مواطن عربي البيع والشراء بلغته وفي بلده بكل أمان.',
    values: 'قيمنا',
    value1Title: 'الخصوصية أولاً',
    value1Desc: 'بياناتك محمية — إعلاناتك لا تُرى إلا في بلدك',
    value2Title: 'الذكاء الاصطناعي',
    value2Desc: 'صور وأصوات تتحول إلى إعلانات تلقائياً',
    value3Title: 'المجتمع المحلي',
    value3Desc: 'سوق لكل حي وكل مدينة',
    value4Title: 'الأمان والثقة',
    value4Desc: 'تشفير AES-256 لكل المحادثات',
    backHome: 'العودة للرئيسية',
  },
  en: {
    title: 'About XTOX',
    subtitle: 'The Smart Arab Marketplace for Local Products',
    mission: 'Our Mission',
    missionText: 'We connect Arab communities through a safe, AI-powered digital marketplace that respects your language and privacy.',
    stats: 'Our Numbers',
    team: 'Our Team',
    contact: 'Contact Us',
    countries: 'Countries',
    ads: 'Active Ads',
    users: 'Users',
    vision: 'Our Vision',
    visionText: 'To be the #1 Arab platform for smart local commerce, where every Arab citizen can buy and sell in their language, in their country, safely.',
    values: 'Our Values',
    value1Title: 'Privacy First',
    value1Desc: 'Your data is protected — ads visible only in your country',
    value2Title: 'AI-Powered',
    value2Desc: 'Photos and voice turn into listings automatically',
    value3Title: 'Local Community',
    value3Desc: 'A marketplace for every neighborhood and city',
    value4Title: 'Security & Trust',
    value4Desc: 'AES-256 encryption for all conversations',
    backHome: 'Back to Home',
  },
};

const STATS = [
  { key: 'countries', value: '30+', icon: '🌍' },
  { key: 'ads', value: '50K+', icon: '📋' },
  { key: 'users', value: '100K+', icon: '👥' },
];

const VALUES = [
  { key: 'value1', icon: '🔒', color: '#667eea' },
  { key: 'value2', icon: '🤖', color: '#f093fb' },
  { key: 'value3', icon: '🏘️', color: '#4facfe' },
  { key: 'value4', icon: '🛡️', color: '#43e97b' },
];

export default function AboutPage() {
  const [lang, setLang] = useState('ar');
  const isRtl = lang === 'ar';
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    try {
      const stored = localStorage.getItem('xtox_lang');
      if (stored === 'en') setLang('en');
    } catch {}
  }, []);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        color: '#fff',
        fontFamily: isRtl ? "'Cairo', 'Segoe UI', sans-serif" : "'Segoe UI', sans-serif",
        paddingBottom: '60px',
      }}
    >
      {/* Hero */}
      <div
        style={{
          textAlign: 'center',
          padding: '80px 20px 40px',
          background: 'linear-gradient(180deg, rgba(102,126,234,0.15) 0%, transparent 100%)',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🦊</div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px' }}>
          {t.title}
        </h1>
        <p style={{ fontSize: 'clamp(14px,2.5vw,20px)', color: '#a78bfa', maxWidth: '600px', margin: '0 auto 24px' }}>
          {t.subtitle}
        </p>
        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
        >
          {lang === 'ar' ? 'English' : 'عربي'}
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
        {/* Mission */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: '#a78bfa' }}>
            {t.mission}
          </h2>
          <div
            style={{
              background: 'rgba(102,126,234,0.1)',
              border: '1px solid rgba(102,126,234,0.3)',
              borderRadius: '16px',
              padding: '24px',
              fontSize: '18px',
              lineHeight: '1.8',
              color: '#e2e8f0',
            }}
          >
            {t.missionText}
          </div>
        </section>

        {/* Stats */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px', color: '#a78bfa' }}>
            {t.stats}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {STATS.map(stat => (
              <div
                key={stat.key}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '28px 20px',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#a78bfa', marginBottom: '4px' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>{t[stat.key]}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Vision */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: '#a78bfa' }}>
            {t.vision}
          </h2>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(240,147,251,0.1) 0%, rgba(102,126,234,0.1) 100%)',
              border: '1px solid rgba(240,147,251,0.3)',
              borderRadius: '16px',
              padding: '24px',
              fontSize: '17px',
              lineHeight: '1.8',
              color: '#e2e8f0',
            }}
          >
            {t.visionText}
          </div>
        </section>

        {/* Values */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px', color: '#a78bfa' }}>
            {t.values}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {VALUES.map(v => (
              <div
                key={v.key}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${v.color}33`,
                  borderRadius: '16px',
                  padding: '24px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 32px ${v.color}22`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{v.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: v.color }}>
                  {t[`${v.key}Title`]}
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                  {t[`${v.key}Desc`]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section style={{ marginBottom: '48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px', color: '#a78bfa' }}>
            {t.contact}
          </h2>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: '📧 Email', href: 'mailto:ahmed_sharnou@yahoo.com', color: '#667eea' },
              { label: '💬 WhatsApp', href: 'https://wa.me/', color: '#25d366' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  display: 'inline-block',
                  background: `${link.color}22`,
                  border: `1px solid ${link.color}55`,
                  color: link.color,
                  padding: '12px 28px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.target.style.background = `${link.color}44`}
                onMouseLeave={e => e.target.style.background = `${link.color}22`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>

        {/* Back home */}
        <div style={{ textAlign: 'center' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              padding: '14px 36px',
              borderRadius: '14px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(102,126,234,0.4)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.target.style.transform = 'none'}
          >
            {t.backHome}
          </a>
        </div>
      </div>
    </div>
  );
}
