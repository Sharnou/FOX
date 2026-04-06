'use client';
/**
 * XTOX AI Quality Score Badge
 * Shows color-coded quality score on ad cards
 * Red < 40, Yellow 40-70, Green > 70
 */

function getScoreColor(score) {
  if (score >= 70) return { bg: '#dcfce7', color: '#15803d', label: 'ممتاز' };
  if (score >= 40) return { bg: '#fef9c3', color: '#854d0e', label: 'جيد' };
  return { bg: '#fee2e2', color: '#dc2626', label: 'يحتاج تحسين' };
}

export default function AIQualityBadge({ score }) {
  if (score === null || score === undefined || isNaN(score)) return null;
  const { bg, color, label } = getScoreColor(score);

  return (
    <span
      title={'جودة الإعلان: ' + score + '/100'}
      aria-label={'جودة الإعلان ' + score + ' من 100 - ' + label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 7px',
        borderRadius: 8,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.5,
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      ✨ {score}
    </span>
  );
}
