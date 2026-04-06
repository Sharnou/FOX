'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeaturedAdPopup({ ads }) {
  const [show, setShow] = useState(false);
  const [targetAd, setTargetAd] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Show once per session
    if (sessionStorage.getItem('featured-popup-shown')) return;
    if (!ads || ads.length === 0) return;

    // Find user's ad with low views
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || !user._id) return;

    const myLowViewAd = ads.find(ad => {
      const isBaby = (ad.category||'').toLowerCase().includes('أطفال') || 
                     (ad.category||'').toLowerCase().includes('baby') ||
                     (ad.category||'').toLowerCase().includes('kids');
      return ad.userId?._id === user._id && 
             !ad.isFeatured && 
             ((ad.views || 0) < 20 || isBaby);
    });

    if (myLowViewAd) {
      setTimeout(() => {
        setTargetAd(myLowViewAd);
        setShow(true);
        sessionStorage.setItem('featured-popup-shown', '1');
      }, 8000); // show after 8 seconds
    }
  }, [ads]);

  if (!show || !targetAd) return null;

  function dismiss() { setShow(false); }

  function promote() {
    setShow(false);
    router.push('/promote?adId=' + targetAd._id + '&title=' + encodeURIComponent(targetAd.title));
  }

  return (
    <div style={{
      position:'fixed', bottom:24, right:16, left:16,
      zIndex:9999,
      animation:'slideUpPop 0.4s cubic-bezier(.21,1.02,.73,1) both',
    }}>
      <style>{'\r\n        @keyframes slideUpPop {\r\n          from { transform: translateY(120px); opacity: 0; }\r\n          to   { transform: translateY(0);    opacity: 1; }\r\n        }\r\n        @keyframes zzz {\r\n          0%,100% { transform: translateY(0) rotate(-5deg); }\r\n          50%     { transform: translateY(-6px) rotate(5deg); }\r\n        }\r\n      '}</style>
      <div style={{
        maxWidth:340, margin:'0 auto',
        background:'#fff', borderRadius:20,
        boxShadow:'0 8px 32px rgba(0,0,0,0.18)',
        padding:20, direction:'rtl', fontFamily:'Cairo,sans-serif',
        border:'2px solid #002f34',
        position:'relative',
      }}>
        <button onClick={dismiss} style={{ position:'absolute', top:12, left:16, background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#aaa' }}>✕</button>
        
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:48, animation:'zzz 2s ease-in-out infinite', flexShrink:0 }}>😴</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:'#002f34', marginBottom:4 }}>إعلانك نايم! 😴</div>
            <div style={{ fontSize:13, color:'#555' }}>
              "{targetAd.title.slice(0,30)}{targetAd.title.length>30?'...':''}" — {targetAd.views||0} مشاهدة فقط
            </div>
          </div>
        </div>

        <p style={{ color:'#666', fontSize:13, margin:'12px 0', lineHeight:1.6 }}>
          روّجه الآن واوصل لمئات المشترين 🚀<br/>
          <strong style={{ color:'#002f34' }}>بدءاً من $1 فقط!</strong>
        </p>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={promote} style={{
            flex:1, background:'#002f34', color:'#fff', border:'none',
            borderRadius:12, padding:'12px 8px', fontSize:14, fontWeight:700,
            cursor:'pointer',
          }}>
            🚀 روّج الآن
          </button>
          <button onClick={dismiss} style={{
            flex:1, background:'#f5f5f5', color:'#666', border:'none',
            borderRadius:12, padding:'12px 8px', fontSize:14,
            cursor:'pointer',
          }}>
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
