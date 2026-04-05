'use client';
import { useState, useEffect } from 'react';
import { detectLang } from '../../lib/lang';

const i18n = {
  ar: {
    scanToView: 'امسح الرمز لعرض الإعلان',
    downloadQR: 'تحميل رمز QR',
    copyLink: 'نسخ رابط الإعلان',
    copied: 'تم النسخ!',
    copyFailed: 'فشل النسخ',
    adQR: 'رمز QR للإعلان',
    shareAd: 'مشاركة الإعلان',
    close: 'إغلاق',
    poweredBy: 'مشغّل بواسطة XTOX',
    downloading: 'جارٍ التحميل...',
  },
  en: {
    scanToView: 'Scan to view ad',
    downloadQR: 'Download QR Code',
    copyLink: 'Copy Ad Link',
    copied: 'Copied!',
    copyFailed: 'Copy failed',
    adQR: 'Ad QR Code',
    shareAd: 'Share Ad',
    close: 'Close',
    poweredBy: 'Powered by XTOX',
    downloading: 'Downloading...',
  },
};

export default function QRCode({ adId, adTitle, adUrl, showModal = false, onClose }) {
  const [lang, setLang] = useState('ar');
  const [copyStatus, setCopyStatus] = useState(null); // null | 'copied' | 'failed'
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVisible, setIsVisible] = useState(showModal);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('xtox_lang');
      if (stored === 'en' || stored === 'ar') setLang(stored);
    }
  }, []);

  useEffect(() => {
    setIsVisible(showModal);
  }, [showModal]);

  const t = i18n[lang] || i18n.ar;
  const isRTL = lang === 'ar';

  // Build the QR URL — use the adUrl prop or fallback
  const targetUrl = adUrl || (adId ? `https://fox-kohl-eight.vercel.app/ads/${adId}` : '');
  const qrImageUrl = targetUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}&color=FF6B35&bgcolor=ffffff&margin=10`
    : null;

  const handleCopyLink = async () => {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopyStatus('copied');
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = targetUrl;
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      setCopyStatus(ok ? 'copied' : 'failed');
    }
    setTimeout(() => setCopyStatus(null), 2500);
  };

  const handleDownload = async () => {
    if (!qrImageUrl) return;
    setIsDownloading(true);
    try {
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xtox-qr-${adId || 'ad'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Open in new tab as fallback
      window.open(qrImageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  // Inline card mode (no modal)
  if (!showModal) {
    if (!targetUrl) return null;
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : 'inherit' }}
        className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm w-fit"
      >
        {qrImageUrl && (
          <img
            src={qrImageUrl}
            alt={t.adQR}
            width={160}
            height={160}
            className="rounded-xl border border-orange-100"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
        {adTitle && (
          <p
            className="text-sm font-semibold text-gray-800 max-w-[160px] truncate text-center"
            title={adTitle}
          >
            {adTitle}
          </p>
        )}
        <p className="text-xs text-gray-500 text-center">{t.scanToView}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-opacity"
            style={{ backgroundColor: '#FF6B35', opacity: isDownloading ? 0.7 : 1 }}
          >
            {isDownloading ? t.downloading : `⬇ ${t.downloadQR}`}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
            style={{
              borderColor: copyStatus === 'copied' ? '#22c55e' : '#FF6B35',
              color: copyStatus === 'copied' ? '#22c55e' : '#FF6B35',
              backgroundColor: copyStatus === 'copied' ? '#f0fdf4' : 'transparent',
            }}
          >
            {copyStatus === 'copied' ? `✓ ${t.copied}` : copyStatus === 'failed' ? t.copyFailed : `🔗 ${t.copyLink}`}
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-1">{t.poweredBy}</p>
      </div>
    );
  }

  // Modal mode
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
        onClick={handleClose}
      >
        {/* Modal card */}
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : 'inherit' }}
          className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs flex flex-col items-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 end-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors text-lg"
            aria-label={t.close}
          >
            ×
          </button>

          {/* Header */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#FF6B35' }}
            >
              XTOX
            </span>
            <h3 className="text-base font-bold text-gray-900">{t.shareAd}</h3>
            {adTitle && (
              <p
                className="text-sm text-gray-500 text-center max-w-[220px] truncate"
                title={adTitle}
              >
                {adTitle}
              </p>
            )}
          </div>

          {/* QR Image */}
          {qrImageUrl ? (
            <div
              className="p-3 rounded-2xl border-2"
              style={{ borderColor: '#FF6B35' }}
            >
              <img
                src={qrImageUrl}
                alt={t.adQR}
                width={180}
                height={180}
                className="rounded-xl"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          ) : (
            <div className="w-[180px] h-[180px] rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              No URL
            </div>
          )}

          {/* Scan label */}
          <p className="text-sm text-gray-600 font-medium text-center">{t.scanToView}</p>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
              style={{ backgroundColor: '#FF6B35', opacity: isDownloading ? 0.7 : 1 }}
            >
              {isDownloading ? t.downloading : `⬇ ${t.downloadQR}`}
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 flex items-center justify-center gap-2 transition-all"
              style={{
                borderColor: copyStatus === 'copied' ? '#22c55e' : '#FF6B35',
                color: copyStatus === 'copied' ? '#22c55e' : '#FF6B35',
                backgroundColor: copyStatus === 'copied' ? '#f0fdf4' : 'transparent',
              }}
            >
              {copyStatus === 'copied'
                ? `✓ ${t.copied}`
                : copyStatus === 'failed'
                ? t.copyFailed
                : `🔗 ${t.copyLink}`}
            </button>
          </div>

          <p className="text-[10px] text-gray-300">{t.poweredBy}</p>
        </div>
      </div>
    </>
  );
}
