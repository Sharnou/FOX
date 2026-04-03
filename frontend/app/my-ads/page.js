'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export default function MyAdsPage() {
  const [data, setData] = useState({ active: [], expired: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [token, setToken] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('token');
    if (!t) { window.location.href = '/login'; return; }
    setToken(t);
    fetchMyAds(t);
  }, []);

  async function fetchMyAds(t) {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/ads/my/all`, {
        headers: { Authorization: `Bearer ${t || token}` }
      });
      setData(res.data);
    } catch { setData({ active: [], expired: [] }); }
    setLoading(false);
  }

  async function republish(adId) {
    try {
      await axios.post(`${API}/api/ads/${adId}/republish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ تم إعادة نشر الإعلان لمدة 45 يوم إضافية!');
      fetchMyAds(token);
    } catch (e) { alert(e.response?.data?.error || 'فشل إعادة النشر'); }
  }

  async function deleteAd(adId) {
    if (!confirm('هل تريد حذف هذا الإعلان؟')) return;
    try {
      await axios.delete(`${API}/api/ads/${adId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchMyAds(token);
    } catch { alert('فشل الحذف'); }
  }

  const activeAds = data.active || [];
  const expiredAds = data.expired || [];

  // Performance stats for active ads
  const totalViews = activeAds.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const bestAd = activeAds.length > 0 ? activeAds.reduce((best, ad) => (ad.views || 0) > (best.views || 0) ? ad : best, activeAds[0]) : null;
  const featuredCount = activeAds.filter(ad => ad.isFeatured).length;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ color: '#002f34', margin: 0, fontSize: 22, fontWeight: 'bold' }}>إعلاناتي</h1>
        <a href="/sell" style={{ marginRight: 'auto', background: '#002f34', color: 'white', padding: '8px 16px', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 'bold' }}>+ إعلان جديد</a>
      </div>

      {/* Performance Stats Banner */}
      {!loading && activeAds.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #002f34 0%, #00514a 100%)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, color: 'white', boxShadow: '0 4px 12px rgba(0,47,52,0.25)' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.85 }}>📊 أداء إعلاناتك النشطة</p>
          <div style={{ display: 'flex', gap: 0, textAlign: 'center' }}>
            <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: 26, fontWeight: 'bold' }}>{activeAds.length}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>إعلان نشط</div>
            </div>
            <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: 26, fontWeight: 'bold' }}>{totalViews.toLocaleString('ar-EG')}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>مشاهدة إجمالية</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 26, fontWeight: 'bold' }}>{featuredCount}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>إعلان مميز ⭐</div>
            </div>
          </div>
          {bestAd && bestAd.views > 0 && (
            <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', fontSize: 13 }}>
              🏆 الأكثر مشاهدة: <strong>{bestAd.title?.slice(0, 30)}</strong> — {bestAd.views} مشاهدة
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', background: 'white', borderRadius: 12, padding: 4, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <button onClick={() => setTab('active')}
          style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 14, background: tab === 'active' ? '#002f34' : 'transparent', color: tab === 'active' ? 'white' : '#666', fontFamily: 'inherit' }}>
          ✅ النشطة ({activeAds.length})
        </button>
        <button onClick={() => setTab('expired')}
          style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 14, background: tab === 'expired' ? '#e44' : 'transparent', color: tab === 'expired' ? 'white' : '#666', fontFamily: 'inherit' }}>
          ⏰ المنتهية ({expiredAds.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>جار التحميل...</div>
      ) : (
        <>
          {tab === 'active' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeAds.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: '#999', background: 'white', borderRadius: 16 }}>
                  <div style={{ fontSize: 48 }}>📋</div>
                  <p>لا توجد إعلانات نشطة</p>
                  <a href="/sell" style={{ color: '#002f34', fontWeight: 'bold' }}>انشر إعلانك الأول</a>
                </div>
              )}
              {activeAds.map(ad => {
                const daysLeft = Math.max(0, Math.ceil((new Date(ad.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000)));
                const expiryPercent = Math.min(100, Math.round((daysLeft / 45) * 100));
                return (
                  <div key={ad._id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', gap: 14 }}>
                    <div style={{ width: 80, height: 80, borderRadius: 10, background: '#f0f0f0', overflow: 'hidden', flexShrink: 0 }}>
                      {ad.media?.[0] ? <img loading="lazy" src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📦</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 'bold', margin: 0, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.title}</p>
                      <p style={{ color: '#002f34', fontWeight: 'bold', margin: '4px 0', fontSize: 16 }}>{ad.price} {ad.currency}</p>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#999', flexWrap: 'wrap', marginBottom: 6 }}>
                        <span>👁 {ad.views}</span>
                        <span style={{ color: daysLeft <= 7 ? '#e44' : '#00aa44', fontWeight: 'bold' }}>⏰ {daysLeft} يوم</span>
                        {ad.isFeatured && <span style={{ color: '#ffd700' }}>⭐ مميز</span>}
                      </div>
                      {/* Expiry Progress Bar */}
                      <div style={{ background: '#f0f0f0', borderRadius: 4, height: 4, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${expiryPercent}%`, background: daysLeft <= 7 ? '#e44' : daysLeft <= 15 ? '#ffd700' : '#00aa44', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <a href={`/ads/${ad._id}`} style={{ background: '#f0f0f0', color: '#333', padding: '4px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 'bold' }}>👁 عرض</a>
                        <a href={`/sell?edit=${ad._id}`} style={{ background: '#e8f0fe', color: '#1a56db', padding: '4px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 'bold' }}>✏️ تعديل</a>
                        <button onClick={() => deleteAd(ad._id)} style={{ background: '#fff0f0', color: '#e44', border: 'none', padding: '4px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 'bold', fontFamily: 'inherit' }}>حذف</button>
                        <a href={`/promote?adId=${ad._id}&title=${encodeURIComponent(ad.title)}`}
                          style={{
                            display:'inline-block', background: ad.isFeatured ? '#FFD700' : '#002f34',
                            color: ad.isFeatured ? '#000' : '#fff',
                            padding:'4px 12px', borderRadius:8, fontSize:12, fontWeight:'bold',
                            textDecoration:'none',
                          }}>
                          {ad.isFeatured ? '⭐ مميز حتى ' + new Date(ad.featuredUntil).toLocaleDateString('ar-EG') : '🚀 روّج'}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'expired' && (
            <div>
              {expiredAds.length > 0 && (
                <div style={{ background: '#fff8e0', border: '1px solid #ffd700', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                  ⚠️ إعلاناتك المنتهية متاحة لإعادة النشر خلال <strong>7 أيام</strong> فقط.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {expiredAds.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 60, color: '#999', background: 'white', borderRadius: 16 }}>
                    <div style={{ fontSize: 48 }}>✅</div>
                    <p>لا توجد إعلانات منتهية</p>
                  </div>
                )}
                {expiredAds.map(ad => {
                  const canReshare = ad.daysLeftToReshare > 0;
                  return (
                    <div key={ad._id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', gap: 14, opacity: canReshare ? 1 : 0.6, border: `2px solid ${canReshare ? '#ffd700' : '#eee'}` }}>
                      <div style={{ width: 80, height: 80, borderRadius: 10, background: '#f0f0f0', overflow: 'hidden', flexShrink: 0, filter: 'grayscale(50%)' }}>
                        {ad.media?.[0] ? <img loading="lazy" src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📦</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 'bold', margin: 0, fontSize: 15, color: '#555' }}>{ad.title}</p>
                        <p style={{ color: '#888', margin: '4px 0', fontSize: 14 }}>{ad.price} {ad.currency}</p>
                        {canReshare ? (
                          <div style={{ background: '#fff8e0', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#aa7700', marginBottom: 8, display: 'inline-block' }}>
                            ⏳ {ad.daysLeftToReshare} يوم للإعادة
                          </div>
                        ) : (
                          <div style={{ background: '#fff0f0', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#cc0000', marginBottom: 8, display: 'inline-block' }}>
                            ❌ انتهت فرصة الإعادة
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {canReshare ? (
                            <button onClick={() => republish(ad._id)}
                              style={{ background: '#002f34', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 'bold', fontFamily: 'inherit' }}>
                              🔄 إعادة النشر (45 يوم)
                            </button>
                          ) : (
                            <a href="/sell" style={{ background: '#00b09b', color: 'white', padding: '8px 16px', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 'bold' }}>
                              + إنشاء إعلان جديد
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}