'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

/**
 * SwipeAdCard — Tinder-style swipe-to-browse for mobile Arab users
 * Right swipe → save to wishlist | Left swipe → skip
 * RTL-first, bilingual Arabic/English UX
 */
export default function SwipeAdCard({ ads = [], token, onWishlistUpdate }) {
  const [stack, setStack] = useState(ads);
  const [swipeDir, setSwipeDir] = useState(null);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const cardRef = useRef(null);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    currentX.current = e.touches[0].clientX - startX.current;
    if (cardRef.current) {
      const rotate = currentX.current * 0.08;
      cardRef.current.style.transform = `translateX(${currentX.current}px) rotate(${rotate}deg)`;
      cardRef.current.style.transition = 'none';
    }
    if (currentX.current > 50) setSwipeDir('right');
    else if (currentX.current < -50) setSwipeDir('left');
    else setSwipeDir(null);
  };

  const handleTouchEnd = async () => {
    setDragging(false);
    const threshold = 100;
    if (currentX.current > threshold) {
      await handleSwipe('right', stack[stack.length - 1]);
    } else if (currentX.current < -threshold) {
      handleSwipe('left', stack[stack.length - 1]);
    } else {
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0) rotate(0deg)';
        cardRef.current.style.transition = 'transform 0.3s ease';
      }
    }
    setSwipeDir(null);
    currentX.current = 0;
  };

  const handleSwipe = async (direction, ad) => {
    if (!ad) return;
    if (direction === 'right' && token) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ adId: ad._id })
        });
        if (onWishlistUpdate) onWishlistUpdate(ad._id);
      } catch (_) {}
    }
    setStack(prev => prev.slice(0, -1));
    setSwipeDir(null);
    currentX.current = 0;
  };

  const topAd = stack[stack.length - 1];
  const secondAd = stack[stack.length - 2];

  if (stack.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-gray-400" dir="rtl">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-xl font-semibold">شاهدت كل الإعلانات!</p>
        <p className="text-sm mt-1 text-gray-300">You've seen all ads</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto select-none" style={{ height: 480 }}>
      {/* Background card (second) */}
      {secondAd && (
        <div
          className="absolute inset-0 bg-white rounded-2xl shadow-md overflow-hidden"
          style={{ transform: 'scale(0.95) translateY(12px)', zIndex: 1 }}
        >
          <img
            src={secondAd.images?.[0] || '/placeholder.jpg'}
            alt={secondAd.title}
            className="w-full h-60 object-cover"
          />
        </div>
      )}

      {/* Top draggable card */}
      {topAd && (
        <div
          ref={cardRef}
          className="absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ zIndex: 2, transition: 'transform 0.3s ease' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe overlays */}
          {swipeDir === 'right' && (
            <div className="absolute top-5 left-5 z-10 border-4 border-green-400 text-green-500 font-bold text-xl px-3 py-1 rounded-lg"
              style={{ transform: 'rotate(-15deg)' }}>
              حفظ ✓
            </div>
          )}
          {swipeDir === 'left' && (
            <div className="absolute top-5 right-5 z-10 border-4 border-red-400 text-red-500 font-bold text-xl px-3 py-1 rounded-lg"
              style={{ transform: 'rotate(15deg)' }}>
              تخطي ✗
            </div>
          )}

          <img
            src={topAd.images?.[0] || '/placeholder.jpg'}
            alt={topAd.title}
            className="w-full h-60 object-cover pointer-events-none"
          />
          <div className="p-4 text-right" dir="rtl">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{topAd.category}</p>
            <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{topAd.title}</h3>
            <p className="text-green-600 font-bold text-xl mt-1">
              {topAd.price?.toLocaleString('ar-EG')} {topAd.currency || 'EGP'}
            </p>
            <p className="text-gray-400 text-sm mt-1">📍 {topAd.location?.city || ''}</p>
            <p className="text-gray-500 text-sm mt-2 line-clamp-2">{topAd.description}</p>
          </div>

          {/* Action buttons */}
          <div className="flex justify-around px-6 pb-4 pt-2 border-t border-gray-100" dir="rtl">
            <button
              onClick={() => handleSwipe('left', topAd)}
              className="w-12 h-12 rounded-full bg-red-50 border-2 border-red-300 text-red-500 text-xl flex items-center justify-center hover:bg-red-100 transition"
              title="تخطي"
            >✗</button>
            <Link
              href={`/ads/${topAd._id}`}
              className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-300 text-blue-500 text-xl flex items-center justify-center hover:bg-blue-100 transition"
              title="عرض التفاصيل"
            >👁</Link>
            <button
              onClick={() => handleSwipe('right', topAd)}
              className="w-12 h-12 rounded-full bg-green-50 border-2 border-green-300 text-green-600 text-xl flex items-center justify-center hover:bg-green-100 transition"
              title="حفظ"
            >♥</button>
          </div>
        </div>
      )}

      {/* Counter */}
      <div className="absolute bottom-0 left-0 right-0 text-center pb-1 text-xs text-gray-400 z-10" dir="rtl">
        {stack.length} إعلان متبقٍ
      </div>
    </div>
  );
}
