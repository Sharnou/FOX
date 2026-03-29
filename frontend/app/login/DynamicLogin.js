'use client';
import dynamic from 'next/dynamic';

// This MUST be in a client component - ssr:false not allowed in server components
const LoginClient = dynamic(() => import('./LoginClient'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #002f34, #004d40)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Cairo, system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
        <p style={{ opacity: 0.8, fontSize: 16 }}>جار التحميل...</p>
      </div>
    </div>
  )
});

export default function DynamicLogin() {
  return <LoginClient />;
}
