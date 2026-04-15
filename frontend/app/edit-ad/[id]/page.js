'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export default function EditAdPage() {
  const router = useRouter();
  const params = useParams();
  const adId = params?.id;

  const [ad, setAd] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [subSubCategory, setSubSubCategory] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [images, setImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Load user from localStorage
    try {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  useEffect(() => {
    if (!adId) return;
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/'); return; }

    fetch(`${API}/api/ads/${adId}`)
      .then(r => r.json())
      .then(data => {
        const fetchedAd = data._id ? data : data.ad;
        if (!fetchedAd) { router.replace('/'); return; }

        // Check ownership
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = u._id || u.id;
        const sellerId = fetchedAd.seller?._id || fetchedAd.seller || fetchedAd.userId?._id || fetchedAd.userId;
        if (sellerId?.toString() !== userId?.toString()) {
          router.replace('/');
          return;
        }

        setAd(fetchedAd);
        setTitle(fetchedAd.title || '');
        setDescription(fetchedAd.description || '');
        setPrice(String(fetchedAd.price || ''));
        setLocation(fetchedAd.city || '');
        setSubCategory(fetchedAd.subcategory || '');
        setSubSubCategory(fetchedAd.subsub || '');
        setPhoneNumber(fetchedAd.phone || '');
        setImages(fetchedAd.images || fetchedAd.media || []);
        setLoading(false);
      })
      .catch(() => { router.replace('/'); });
  }, [adId]);

  function removeExistingImage(idx) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  function handleNewImages(e) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setNewImages(prev => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeNewImage(idx) {
    setNewImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { showToast('يرجى كتابة عنوان الإعلان', 'error'); return; }
    setSaving(true);
    setError(null);

    const token = localStorage.getItem('token');
    const allImages = [...images, ...newImages];

    try {
      const res = await fetch(`${API}/api/ads/${adId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: Number(price) || 0,
          location: location.trim(),
          subCategory: subCategory.trim(),
          subSubCategory: subSubCategory.trim(),
          phoneNumber: phoneNumber.trim(),
          images: allImages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء التعديل');
        showToast(data.error || 'حدث خطأ أثناء التعديل', 'error');
        setSaving(false);
        return;
      }

      showToast('✅ تم تعديل الإعلان بنجاح!');
      setTimeout(() => router.push('/ads/' + adId), 1500);
    } catch (err) {
      setError('فشل الاتصال بالخادم');
      showToast('فشل الاتصال بالخادم', 'error');
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: 12, color: '#e2e8f0',
    fontSize: 15, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    direction: 'rtl',
  };

  const labelStyle = {
    display: 'block', marginBottom: 6,
    fontSize: 13, fontWeight: 700,
    color: 'rgba(165,180,252,0.9)',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0a28', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0', fontFamily: "'Cairo', sans-serif" }}>
        <p>⏳ جاري التحميل...</p>
      </div>
    );
  }

  const userReputation = user?.reputationPoints || 0;

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0f0a28', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", paddingBottom: 60 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, left: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          color: 'white', padding: '14px 20px', borderRadius: 14,
          textAlign: 'center', fontWeight: 700, fontSize: 15,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1040, #0f0a28)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#a5b4fc', fontSize: 20, cursor: 'pointer', padding: 4 }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>
          ✏️ تعديل الإعلان
        </h1>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        {/* Warning Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))',
          border: '1.5px solid rgba(251,191,36,0.4)',
          borderRadius: 16, padding: '16px 20px', marginBottom: 24,
        }}>
          <p style={{ margin: 0, color: '#fbbf24', fontWeight: 700, fontSize: 15 }}>
            ⚠️ تعديل هذا الإعلان سيكلفك 10 نقاط سمعة
          </p>
          <p style={{ margin: '8px 0 0', color: 'rgba(251,191,36,0.7)', fontSize: 13 }}>
            رصيدك الحالي: <strong style={{ color: '#fbbf24' }}>{userReputation} نقطة</strong>
          </p>
          {userReputation < 10 && (
            <p style={{ margin: '8px 0 0', color: '#f87171', fontWeight: 700, fontSize: 13 }}>
              ❌ لا تملك نقاطاً كافية لتعديل الإعلان (تحتاج 10 نقاط على الأقل)
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#f87171', fontWeight: 600,
          }}>
            ❌ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>عنوان الإعلان *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder="عنوان الإعلان..."
              style={inputStyle}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>الوصف</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1500}
              placeholder="وصف الإعلان..."
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
            />
          </div>

          {/* Price */}
          <div>
            <label style={labelStyle}>السعر</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              min={0}
              placeholder="0"
              style={{ ...inputStyle, direction: 'ltr' }}
            />
          </div>

          {/* Location */}
          <div>
            <label style={labelStyle}>الموقع / المدينة</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              maxLength={60}
              placeholder="المدينة..."
              style={inputStyle}
            />
          </div>

          {/* SubCategory */}
          <div>
            <label style={labelStyle}>الفئة الفرعية</label>
            <input
              type="text"
              value={subCategory}
              onChange={e => setSubCategory(e.target.value)}
              maxLength={60}
              placeholder="الفئة الفرعية..."
              style={inputStyle}
            />
          </div>

          {/* SubSubCategory */}
          <div>
            <label style={labelStyle}>الفئة التفصيلية</label>
            <input
              type="text"
              value={subSubCategory}
              onChange={e => setSubSubCategory(e.target.value)}
              maxLength={60}
              placeholder="الفئة التفصيلية..."
              style={inputStyle}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>رقم الهاتف</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              maxLength={20}
              placeholder="+20..."
              style={{ ...inputStyle, direction: 'ltr' }}
            />
          </div>

          {/* Existing Images */}
          {images.length > 0 && (
            <div>
              <label style={labelStyle}>الصور الحالية</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 90, height: 90 }}>
                    <img
                      src={img}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#dc2626', color: 'white',
                        border: 'none', cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Images Upload */}
          <div>
            <label style={labelStyle}>إضافة صور جديدة</label>
            <label style={{
              display: 'block', padding: '12px', background: 'rgba(99,102,241,0.1)',
              border: '2px dashed rgba(99,102,241,0.4)', borderRadius: 12,
              textAlign: 'center', cursor: 'pointer', color: '#a5b4fc', fontSize: 14,
            }}>
              📷 اختر صوراً للرفع
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleNewImages}
                style={{ display: 'none' }}
              />
            </label>
            {newImages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                {newImages.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 90, height: 90 }}>
                    <img
                      src={img}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, border: '1.5px solid rgba(99,102,241,0.4)' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx)}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#dc2626', color: 'white',
                        border: 'none', cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || userReputation < 10}
            style={{
              padding: '16px',
              background: (saving || userReputation < 10)
                ? 'rgba(99,102,241,0.3)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', border: 'none', borderRadius: 14,
              fontSize: 16, fontWeight: 800, cursor: (saving || userReputation < 10) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: (saving || userReputation < 10) ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {saving ? '⏳ جاري الحفظ...' : '✅ حفظ التعديلات (يُخصم 10 نقاط)'}
          </button>
        </form>
      </div>
    </div>
  );
}
