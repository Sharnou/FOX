'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export default function MyAdsPage() {
  const { t: tr, language, isRTL } = useLanguage();
  const [data, setData] = useState({ active: [], expired: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [token, setToken] = useState('');

  // ── Bulk-delete state ──────────────────────────────────────────────────────
  const [selectedAds, setSelectedAds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const t = localStorage.getItem('xtox_token') || localStorage.getItem('token');
      if (!t) { window.location.href = '/login'; return; }
      setToken(t);
      fetchMyAds(t);
    } catch {
      window.location.href = '/login';
    }
  }, []);

  // Reset selection when switching tabs
  useEffect(() => {
    setSelectedAds(new Set());
  }, [tab]);

  async function fetchMyAds(t) {
    setLoading(true);
    try {
      const res = await axios.get(API + '/api/ads/my/all', {
        headers: { Authorization: 'Bearer ' + (t || token) }
      });
      setData(res.data);
    } catch { setData({ active: [], expired: [] }); }
    setLoading(false);
  }

  async function republish(adId) {
    try {
      await axios.post(API + '/api/ads/' + adId + '/republish', {}, {
        headers: { Authorization: 'Bearer ' + token }
      });
      alert(tr('my_ads_renew'));
      fetchMyAds(token);
    } catch (e) { alert(e.response?.data?.error || tr('my_ads_renew_fail')); }
  }

  async function deleteAd(adId) {
    if (!confirm(tr('my_ads_delete_confirm'))) return;
    try {
      await axios.delete(API + '/api/ads/' + adId, { headers: { Authorization: 'Bearer ' + token } });
      fetchMyAds(token);
    } catch { alert(tr('my_ads_delete_fail')); }
  }

  // ── Bulk-delete helpers ────────────────────────────────────────────────────
  function toggleSelectAd(adId) {
    setSelectedAds(prev => {
      const next = new Set(prev);
      if (next.has(adId)) next.delete(adId);
      else next.add(adId);
      return next;
    });
  }

  function toggleSelectAll() {
    const currentList = tab === 'active' ? activeAds : expiredAds;
    if (selectedAds.size === currentList.length && currentList.length > 0) {
      setSelectedAds(new Set());
    } else {
      setSelectedAds(new Set(currentList.map(ad => ad._id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedAds.size === 0) return;
    const n = selectedAds.size;
    const confirmed = window.confirm(
      'هل تريد حذف ' + n + ' إعلان محدد؟\nAre you sure you want to delete ' + n + ' selected ad(s)?\n\nلا يمكن التراجع عن هذا الإجراء.\nThis action cannot be undone.'
    );
    if (!confirmed) return;

    setBulkDeleting(true);
    const ids = Array.from(selectedAds);
    const failed = [];

    // Delete ads in parallel
    await Promise.all(
      ids.map(async (adId) => {
        try {
          await axios.delete(API + '/api/ads/' + adId, {
            headers: { Authorization: 'Bearer ' + token }
          });
        } catch {
          failed.push(adId);
        }
      })
    );

    // Remove successfully deleted ads from local state
    const deletedIds = new Set(ids.filter(id => !failed.includes(id)));
    setData(prev => ({
      active: prev.active.filter(ad => !deletedIds.has(ad._id)),
      expired: prev.expired.filter(ad => !deletedIds.has(ad._id)),
    }));
    setSelectedAds(new Set());
    setBulkDeleting(false);

    if (failed.length > 0) {
      alert('فشل حذف ' + failed.length + ' إعلان.\nFailed to delete ' + failed.length + ' ad(s).');
    } else {
      alert('✅ تم حذف ' + ids.length + ' إعلان بنجاح.\n✅ Successfully deleted ' + ids.length + ' ad(s).');
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  const activeAds = data.active || [];
  const expiredAds = data.expired || [];
  const currentList = tab === 'active' ? activeAds : expiredAds;
  const allSelected = currentList.length > 0 && selectedAds.size === currentList.length;

  // Performance stats for active ads
  const totalViews = activeAds.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const bestAd = activeAds.length > 0 ? activeAds.reduce((best, ad) => (ad.views || 0) > (best.views || 0) ? ad : best, activeAds[0]) : null;
  const featuredCount = activeAds.filter(ad => ad.isFeatured).length;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", minHeight: '100vh', background: '#f5f5f5', direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 20, cursor: 'pointer' }}>→</button>
        <h1 style={{ color: '#002f34', margin: 0, fontSize: 22, fontWeight: 'bold' }}>إعلاناتي</h1>
        <Link href="/sell" style={{ marginLeft: 'auto', background: '#002f34', color: 'white', padding: '8px 16px', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 'bold' }}>+ إعلان جديد</Link>
      </div>

      {/* Performance Stats Banner */}
      {!loading && activeAds.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #002f34 0%, #00514a 100%)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, color: 'white', boxShadow: '0 4px 12px rgba(0,47,52,0.25)' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.85 }}>📊 أداء إعلاناتك النشطة</p>
          <div style={{ display: 'flex', gap: 0, textAlign: 'center' }}>
            <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: 26, fontWeight: 'bold' }}>{activeAds.length}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>إعلان نشط</div>
            </div>
            <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.2)' }}>
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

      {/* ── Bulk-select toolbar ─────────────────────────────────────────────── */}
      {!loading && currentList.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 12, padding: '10px 14px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <input
            type="checkbox"
            id="selectAll"
            checked={allSelected}
            onChange={toggleSelectAll}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#002f34' }}
          />
          <label htmlFor="selectAll" style={{ fontSize: 13, fontWeight: 'bold', cursor: 'pointer', color: '#333', userSelect: 'none' }}>
            {allSelected ? 'إلغاء تحديد الكل | Deselect All' : 'تحديد الكل | Select All'}
          </label>
          {selectedAds.size > 0 && (
            <span style={{ marginRight: 'auto', fontSize: 12, color: '#555' }}>
              {selectedAds.size} محدد
            </span>
          )}
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────────────── */}

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
                  <Link href="/sell" style={{ color: '#002f34', fontWeight: 'bold' }}>انشر إعلانك الأول</Link>
                </div>
              )}
              {activeAds.map(ad => {
                const daysLeft = Math.max(0, Math.ceil((new Date(ad.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000)));
                const expiryPercent = Math.min(100, Math.round((daysLeft / 45) * 100));
                const isSelected = selectedAds.has(ad._id);
                return (
                  <div key={ad._id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', gap: 14, border: isSelected ? '2px solid #002f34' : '2px solid transparent', transition: 'border-color 0.15s' }}>
                    {/* Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectAd(ad._id)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#002f34', flexShrink: 0 }}
                      />
                    </div>
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
                        <div style={{ height: '100%', width: expiryPercent + '%', background: daysLeft <= 7 ? '#e44' : daysLeft <= 15 ? '#ffd700' : '#00aa44', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <a href={'/ads/' + ad._id} style={{ background: '#f0f0f0', color: '#333', padding: '4px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 'bold' }}>👁 عرض</a>
                        <a href={'/sell?edit=' + ad._id} style={{ background: '#e8f0fe', color: '#1a56db', padding: '4px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 'bold' }}>✏️ تعديل</a>
                        <button onClick={() => deleteAd(ad._id)} style={{ background: '#fff0f0', color: '#e44', border: 'none', padding: '4px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 'bold', fontFamily: 'inherit' }}>حذف</button>
                        <a href={'/promote?adId=' + ad._id + '&title=' + encodeURIComponent(ad.title)}
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
                  const isSelected = selectedAds.has(ad._id);
                  return (
                    <div key={ad._id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', gap: 14, opacity: canReshare ? 1 : 0.6, border: isSelected ? '2px solid #002f34' : '2px solid ' + (canReshare ? '#ffd700' : '#eee'), transition: 'border-color 0.15s' }}>
                      {/* Checkbox */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 4 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectAd(ad._id)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#002f34', flexShrink: 0 }}
                        />
                      </div>
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
                            <Link href="/sell" style={{ background: '#00b09b', color: 'white', padding: '8px 16px', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 'bold' }}>
                              + إنشاء إعلان جديد
                            </Link>
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

      {/* ── Sticky bulk-action bar (appears when ≥1 ad selected) ───────────── */}
      {selectedAds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#002f34',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
          direction: 'rtl',
        }}>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
            {selectedAds.size} إعلان محدد
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setSelectedAds(new Set())}
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 'bold', fontFamily: 'inherit' }}
            >
              إلغاء
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{ background: '#e44', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 10, cursor: bulkDeleting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 'bold', fontFamily: 'inherit', opacity: bulkDeleting ? 0.7 : 1 }}
            >
              {bulkDeleting ? '⏳ جار الحذف...' : '🗑 حذف المحدد (' + selectedAds.size + ')'}
            </button>
          </div>
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────────────── */}
    </div>
  );
}
