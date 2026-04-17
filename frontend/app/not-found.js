'use client'
import { useLanguage } from './context/LanguageContext'

export default function NotFound() {
  const { t, isRTL } = useLanguage()
  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '60px',
      background: 'linear-gradient(135deg, #002f34 0%, #004d57 40%, #1a6b5e 100%)'
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        fontFamily: 'Cairo, sans-serif',
        direction: isRTL ? 'rtl' : 'ltr', textAlign: 'center'
      }}>
        <h1 style={{
          color: '#ffffff', fontSize: '72px', fontWeight: '800',
          margin: '0 0 8px 0', textShadow: '0 2px 16px rgba(0,0,0,0.6)', lineHeight: 1
        }}>404</h1>
        <p style={{
          color: '#ffffffdd', fontSize: '22px', marginBottom: '28px',
          textShadow: '0 1px 8px rgba(0,0,0,0.5)'
        }}>{t('not_found_title')}</p>
        <a href="/" style={{
          background: '#ffffff', color: '#002f34',
          padding: '14px 40px', borderRadius: '14px',
          fontWeight: '700', fontSize: '17px',
          textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>{t('not_found_btn')}</a>
      </div>
    </div>
  )
}
