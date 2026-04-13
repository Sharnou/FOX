'use client';

/**
 * VerifiedBadge — shows verification checkmark(s) next to seller name.
 * Gold double-check = both email + WhatsApp verified.
 * Green single-check = WhatsApp only.
 * Blue single-check = Email only.
 * Returns null if neither is verified.
 */
export default function VerifiedBadge({ emailVerified, whatsappVerified }) {
  if (!emailVerified && !whatsappVerified) return null;

  const both = emailVerified && whatsappVerified;
  const color = both ? '#f59e0b' : whatsappVerified ? '#25d366' : '#3b82f6';
  const title = both
    ? 'موثق بالبريد الإلكتروني والواتساب'
    : whatsappVerified
    ? 'موثق بالواتساب'
    : 'موثق بالبريد الإلكتروني';

  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        fontSize: '12px',
        color,
        fontWeight: 700,
        marginRight: '4px',
        flexShrink: 0,
      }}
    >
      ✓
      {both && <span style={{ fontSize: '10px' }}>✓</span>}
    </span>
  );
}
