export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      gap: 16,
      fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: '3px solid rgba(99,102,241,0.2)',
        borderTopColor: '#6366f1',
        animation: 'xtox-spin 0.8s linear infinite',
      }} />
      <span style={{ color: '#94a3b8', fontSize: 14 }}>جارٍ التحميل...</span>
      <style>{`
        @keyframes xtox-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
