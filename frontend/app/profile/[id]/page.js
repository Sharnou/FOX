'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';

function Stars({ rating }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#ffd700' : '#ddd', fontSize: 18 }}>★</span>
      ))}
    </span>
  );
}

export default function ProfilePage({ params }) {
  const [data, setData] = useState(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    if (params?.id) {
      axios.get(`${API}/api/profile/${params.id}`).then(r => setData(r.data)).catch(() => {});
    }
  }, [params?.id]);

  async function submitReview() {
    if (!myRating) return alert('اختر تقييم أولاً');
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/profile/${params.id}/review`,
        { rating: myRating, comment: myComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const r = await axios.get(`${API}/api/profile/${params.id}`);
      setData(r.data);
      setMyRating(0); setMyComment('');
      alert('تم إرسال تقييمك!');
    } catch (e) { alert(e.response?.data?.error || 'خطأ'); }
    setSubmitting(false);
  }

  if (!data) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 20, color: '#002f34' }}>
      جار التحميل...
    </div>
  );

  const { user, ads, reviews, avgRating, reviewCount } = data;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>← رجوع</button>

      {/* Profile Header */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          {user.avatar ? (
            <img src={user.avatar} style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid #002f34' }} alt="" />
          ) : (
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'white' }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
          )}
          {user.role === 'admin' && (
            <span style={{ position: 'absolute', bottom: 0, right: 0, background: '#ffd700', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👑</span>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>{user.name}</h1>
          <p style={{ color: '#666', margin: '4px 0', fontSize: 14 }}>📍 {user.city} · {user.country}</p>
          <p style={{ color: '#999', margin: '4px 0', fontSize: 13 }}>عضو منذ {new Date(user.createdAt).toLocaleDateString('ar-EG')}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {avgRating ? (
              <>
                <Stars rating={avgRating} />
                <span style={{ fontWeight: 'bold', fontSize: 16 }}>{avgRating}</span>
                <span style={{ color: '#999', fontSize: 13 }}>({reviewCount} تقييم)</span>
              </>
            ) : (
              <span style={{ color: '#999', fontSize: 13 }}>لا توجد تقييمات بعد</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: 20, color: '#002f34' }}>{ads.length}</div>
              <div style={{ color: '#999', fontSize: 12 }}>إعلان</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: 20, color: '#002f34' }}>{user.reputation || 0}</div>
              <div style={{ color: '#999', fontSize: 12 }}>سمعة</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: 20, color: '#002f34' }}>{reviewCount}</div>
              <div style={{ color: '#999', fontSize: 12 }}>تقييم</div>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Ads */}
      {ads.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: 12, color: '#002f34' }}>📋 إعلانات البائع</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {ads.map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ height: 100, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                  {ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📦'}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 12, margin: 0 }}>{ad.title?.slice(0, 30)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 13, margin: '4px 0 0' }}>{ad.price} {ad.currency}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Leave Review */}
      {token && (
        <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: 16, color: '#002f34' }}>⭐ اترك تقييمك</h2>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[1,2,3,4,5].map(i => (
              <button key={i}
                onMouseEnter={() => setHoverStar(i)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => setMyRating(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 32, color: i <= (hoverStar || myRating) ? '#ffd700' : '#ddd', padding: '0 2px' }}>
                ★
              </button>
            ))}
            {myRating > 0 && <span style={{ alignSelf: 'center', color: '#666', fontSize: 14 }}>{['', 'سيء', 'مقبول', 'جيد', 'ممتاز', 'رائع'][myRating]}</span>}
          </div>
          <textarea value={myComment} onChange={e => setMyComment(e.target.value)}
            placeholder="اكتب تعليقك هنا (اختياري)..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, resize: 'vertical', minHeight: 80, boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <button onClick={submitReview} disabled={submitting || !myRating}
            style={{ marginTop: 12, background: myRating ? '#002f34' : '#ccc', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 'bold', cursor: myRating ? 'pointer' : 'not-allowed', fontSize: 15 }}>
            {submitting ? 'جار الإرسال...' : 'إرسال التقييم'}
          </button>
        </div>
      )}

      {/* Reviews List */}
      <div>
        <h2 style={{ fontWeight: 'bold', marginBottom: 12, color: '#002f34' }}>💬 التقييمات ({reviewCount})</h2>
        {reviews.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center', color: '#999' }}>لا توجد تقييمات بعد. كن أول من يقيّم!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map(r => (
              <div key={r._id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                    {r.buyerId?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: 14 }}>{r.buyerId?.name}</p>
                    <Stars rating={r.rating} />
                  </div>
                  <span style={{ marginLeft: 'auto', color: '#999', fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                {r.comment && <p style={{ margin: 0, color: '#444', fontSize: 14, lineHeight: 1.6 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
