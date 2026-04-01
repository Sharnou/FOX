'use client';
/**
 * AdDetailSkeleton — shimmer placeholder for the ad detail page.
 * Shown while ad data is loading. Matches the AdPageClient layout.
 * RTL-aware: works with Arabic (dir=rtl) layout.
 */
export default function AdDetailSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '0 0 40px',
        fontFamily: "'Cairo', 'Tajawal', system-ui",
      }}
    >
      {/* Back button placeholder */}
      <div
        className="skeleton-shimmer"
        style={{ height: 36, width: 80, borderRadius: 8, margin: '12px 16px' }}
      />

      {/* Main image area */}
      <div
        className="skeleton-shimmer"
        style={{ height: 320, width: '100%' }}
      />

      {/* Thumbnail strip */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{ height: 56, width: 56, borderRadius: 8, flexShrink: 0 }}
          />
        ))}
      </div>

      {/* Ad info */}
      <div style={{ padding: '16px 16px 0' }}>
        {/* Title */}
        <div
          className="skeleton-shimmer"
          style={{ height: 22, borderRadius: 6, marginBottom: 10, width: '85%' }}
        />
        {/* Price */}
        <div
          className="skeleton-shimmer"
          style={{ height: 26, borderRadius: 6, marginBottom: 14, width: '45%' }}
        />
        {/* Description lines */}
        {[100, 92, 78, 60].map((pct, i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{
              height: 14,
              borderRadius: 6,
              marginBottom: i === 3 ? 16 : 7,
              width: `${pct}%`,
            }}
          />
        ))}
        {/* Meta row (city, views, category, expiry) */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {[70, 90, 80, 100].map((w, i) => (
            <div
              key={i}
              className="skeleton-shimmer"
              style={{ height: 13, borderRadius: 6, width: w }}
            />
          ))}
        </div>
      </div>

      {/* Action buttons — 2-col grid (Chat + Call) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          padding: '0 16px',
          marginBottom: 20,
        }}
      >
        <div className="skeleton-shimmer" style={{ height: 48, borderRadius: 12 }} />
        <div className="skeleton-shimmer" style={{ height: 48, borderRadius: 12 }} />
      </div>

      {/* Seller card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          marginBottom: 20,
        }}
      >
        {/* Avatar circle */}
        <div
          className="skeleton-shimmer"
          style={{ height: 44, width: 44, borderRadius: '50%', flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div
            className="skeleton-shimmer"
            style={{ height: 14, borderRadius: 6, width: '55%', marginBottom: 6 }}
          />
          <div
            className="skeleton-shimmer"
            style={{ height: 12, borderRadius: 6, width: '35%' }}
          />
        </div>
      </div>
    </div>
  );
}
