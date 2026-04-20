'use client';

export function CardSkeleton() {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #eee', background: '#fff' }}>
      <div style={{
        width: '100%', paddingBottom: '65%',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'xtox-shimmer 1.5s infinite'
      }} />
      <div style={{ padding: 12 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{
            height: 12, background: '#f0f0f0', borderRadius: 6, marginBottom: 8,
            width: i === 3 ? '60%' : '100%',
            animation: 'xtox-shimmer 1.5s infinite'
          }} />
        ))}
      </div>
      <style>{`@keyframes xtox-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

export function PageSkeleton({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export default PageSkeleton;
