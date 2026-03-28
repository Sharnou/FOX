'use client';
/**
 * AdCardSkeleton — shimmer placeholder shown while ads are loading.
 * Matches the exact shape of an AdCard to prevent layout shift.
 * RTL-aware: works seamlessly with Arabic (dir=rtl) layout.
 */
export default function AdCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'white',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }}
    >
      {/* Image area */}
      <div className="skeleton-shimmer" style={{ height: 140 }} />

      {/* Text lines */}
      <div style={{ padding: '10px 12px' }}>
        {/* Title — wide */}
        <div className="skeleton-shimmer" style={{ height: 13, borderRadius: 6, marginBottom: 8, width: '78%' }} />
        {/* Price — medium */}
        <div className="skeleton-shimmer" style={{ height: 15, borderRadius: 6, marginBottom: 8, width: '48%' }} />
        {/* Meta (views · city) — narrow */}
        <div className="skeleton-shimmer" style={{ height: 11, borderRadius: 6, marginBottom: 6, width: '62%' }} />
        {/* Expiry date */}
        <div className="skeleton-shimmer" style={{ height: 11, borderRadius: 6, width: '52%' }} />
      </div>
    </div>
  );
}
