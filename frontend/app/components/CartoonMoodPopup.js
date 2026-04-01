'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Mood config based on ad performance
function getMood(ad) {
  const views = ad.views || 0;
  const category = (ad.category || '').toLowerCase();
  const isBaby = category.includes('baby') || category.includes('أطفال') || 
                 category.includes('babies') || category.includes('طفل') ||
                 category.includes('kids') || category.includes('children');

  if (isBaby) return {
    emoji: '🐱',
    animation: 'bounce',
    title: 'منتج أطفال رائع! 🐱',
    msg: 'الأمهات تبحث عن منتجات مثل منتجك — روّجه ليظهر أولاً!',
    color: '#FF6B9D',
    gradient: 'linear-gradient(135deg,#FF6B9D,#FFB347)',
    cta: '🐱 روّج للأمهات',
  };

  if (views < 5) return {
    emoji: '😴',
    animation: 'zzz',
    title: 'إعلانك نايم! 😴',
    msg: `${views} مشاهدة فقط — إعلانك يحتاج تنبيه!`,
    color: '#6C63FF',
    gradient: 'linear-gradient(135deg,#6C63FF,#48CAE4)',
    cta: '⏰ أيقظ إعلانك',
  };

  if (views < 20) return {
    emoji: '📉',
    animation: 'shake',
    title: 'مشاهدات منخفضة! 📉',
    msg: `${views} مشاهدة فقط — المنافسون يسبقونك!`,
    color: '#FF6584',
    gradient: 'linear-gradient(135deg,#FF6584,#FF8C42)',
    cta: '📈 ارفع مشاهداتك',
  };

  if (views < 100) return {
    emoji: '🔥',
    animation: 'pulse',
    title: 'إعلانك يسخن! 🔥',
    msg: `${views} مشاهدة — أنت على الطريق الصحيح، روّجه ليصل للقمة!`,
    color: '#FF6B35',
    gradient: 'linear-gradient(135deg,#FF6B35,#FFD700)',
    cta: '🔥 خليه يشتعل',
  };

  return {
    emoji: '🚀',
    animation: 'rocket',
    title: 'إعلانك فيروسي! 🚀',
    msg: `${views} مشاهدة — استمر بالزخم واجعله رقم 1!`,
    color: '#002f34',
    gradient: 'linear-gradient(135deg,#002f34,#00B894)',
    cta: '🚀 اجعله الأول',
  };
}

export default function CartoonMoodPopup({ ads }) {
  const [show, setShow] = useState(false);
  const [targetAd, setTargetAd] = useState(null);
  const [mood, setMood] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (sessionStorage.getItem('mood-popup-shown')) return;
    if (!ads || ads.length === 0) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user._id) return;

    // Find user's ad with most interesting mood
    const myAds = ads.filter(ad => ad.userId?._id === user._id && !ad.isFeatured);
    if (myAds.length === 0) return;

    // Sort by most "interesting" (lowest views first, but babies category gets priority)
    const sorted = myAds.sort((a, b) => {
      const aBaby = ((a.category||'').toLowerCase().includes('أطفال') || (a.category||'').toLowerCase().includes('baby'));
      const bBaby = ((b.category||'').toLowerCase().includes('أطفال') || (b.category||'').toLowerCase().includes('baby'));
      if (aBaby && !bBaby) return -1;
      if (bBaby && !aBaby) return 1;
      return (a.views||0) - (b.views||0);
    });

    const ad = sorted[0];
    const m = getMood(ad);

    setTimeout(() => {
      setTargetAd(ad);
      setMood(m);
      setShow(true);
      sessionStorage.setItem('mood-popup-shown', '1');
    }, 6000);
  }, [ads]);

  if (!show || !targetAd || !mood) return null;

  const dismiss = () => setShow(false);
  const promote = () => {
    setShow(false);
    router.push(`/promote?adId=${targetAd._id}&title=${encodeURIComponent(targetAd.title)}`);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 16, left: 16, zIndex: 9999,
      animation: 'moodSlideUp 0.5s cubic-bezier(.21,1.02,.73,1) both',
    }}>
      <style>{`
        @keyframes moodSlideUp {
          from { transform: translateY(140px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes zzz {
          0%,100% { transform: translateY(0) rotate(-8deg); }
          50%     { transform: translateY(-10px) rotate(8deg); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.15); }
        }
        @keyframes rocket {
          0%,100% { transform: translateY(0) rotate(-15deg); }
          50%     { transform: translateY(-12px) rotate(-15deg); }
        }
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          30%     { transform: translateY(-12px); }
          60%     { transform: translateY(-6px); }
        }
      `}</style>

      <div style={{
        maxWidth: 360, margin: '0 auto', direction: 'rtl',
        fontFamily: 'Cairo, sans-serif',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        border: `2px solid ${mood.color}22`,
      }}>
        {/* Gradient header */}
        <div style={{
          background: mood.gradient,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'relative',
        }}>
          <button onClick={dismiss} style={{
            position: 'absolute', top: 10, left: 12,
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: '50%', width: 26, height: 26,
            color: '#fff', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>

          <div style={{
            fontSize: 52,
            animation: `${mood.animation} 2s ease-in-out infinite`,
            flexShrink: 0,
          }}>{mood.emoji}</div>

          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, lineHeight: 1.3 }}>
              {mood.title}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>
              "{targetAd.title?.slice(0, 28)}{targetAd.title?.length > 28 ? '...' : ''}"
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 20px 16px' }}>
          <p style={{ color: '#555', fontSize: 14, margin: '0 0 14px', lineHeight: 1.6 }}>
            {mood.msg}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={promote} style={{
              flex: 1, background: mood.gradient, color: '#fff', border: 'none',
              borderRadius: 12, padding: '12px 8px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', boxShadow: `0 4px 14px ${mood.color}44`,
            }}>
              {mood.cta}
            </button>
            <button onClick={dismiss} style={{
              flex: 1, background: '#f5f5f5', color: '#888', border: 'none',
              borderRadius: 12, padding: '12px 8px', fontSize: 14, cursor: 'pointer',
            }}>
              لاحقاً
            </button>
          </div>

          {/* Progress dots showing mood level */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {['😴','📉','🔥','🚀'].map((e, i) => {
              const levels = ['😴','📉','🔥','🚀'];
              const current = levels.indexOf(mood.emoji) >= 0 ? levels.indexOf(mood.emoji) : 0;
              return (
                <div key={i} style={{
                  width: i === current ? 20 : 8, height: 8, borderRadius: 4,
                  background: i === current ? mood.color : '#e0e0e0',
                  transition: 'all 0.3s', fontSize: i === current ? 10 : 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}/>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
