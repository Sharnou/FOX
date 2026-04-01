'use client';
import AdCard from './AdCard';

// ── Arabic Empty-State Component — run 44 ────────────────────────────────────
// Displays a friendly Arabic message when no ads are available.
// Supports custom icon, message, sub-message, and CTA link so callers
// can tailor the empty state per page (search, saved, category, etc.).
function EmptyAdState({ message, subMessage, icon, actionLabel, actionHref }) {
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        fontFamily: "\'Cairo\', \'Tajawal\', system-ui, sans-serif",
      }}
    >
      {/* Illustration icon */}
      <div
        style={{ fontSize: 72, marginBottom: 16, lineHeight: 1 }}
        role="img"
        aria-label="لا توجد إعلانات"
      >
        {icon || '\uD83D\uDCED'}
      </div>

      {/* Primary message */}
      <p style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 18, margin: '0 0 6px' }}>
        {message || 'لا توجد إعلانات حالياً'}
      </p>

      {/* Secondary / helper message */}
      {subMessage && (
        <p style={{ color: '#888', fontSize: 14, margin: '0 0 20px', maxWidth: 280 }}>
          {subMessage}
        </p>
      )}

      {/* Call-to-action button */}
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '10px 28px',
            background: '#002f34',
            color: '#fff',
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}

// ── AdFeed ────────────────────────────────────────────────────────────────────
// Props:
//   ads            — array of ad objects (default: [])
//   emptyMessage   — override default Arabic empty-state heading
//   emptySubMessage— override default Arabic empty-state body
//   emptyIcon      — override default emoji icon
//   emptyActionLabel / emptyActionHref — optional CTA for the empty state
export default function AdFeed({
  ads = [],
  emptyMessage,
  emptySubMessage,
  emptyIcon,
  emptyActionLabel,
  emptyActionHref,
}) {
  // ── Empty state ──────────────────────────────────────────────────────────────
  if (ads.length === 0) {
    return (
      <EmptyAdState
        message={emptyMessage || 'لا توجد إعلانات حالياً'}
        subMessage={emptySubMessage || 'كن أول من ينشر إعلاناً — يستغرق الأمر أقل من دقيقة!'}
        icon={emptyIcon || '📭'}
        actionLabel={emptyActionLabel || 'أضف إعلانك الآن'}
        actionHref={emptyActionHref || '/sell'}
      />
    );
  }

  // ── Normal grid ──────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {ads.map(ad => <AdCard key={ad._id} ad={ad} />)}
    </div>
  );
}
