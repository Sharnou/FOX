'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://fox-production.up.railway.app';
const CATS = ['Vehicles','Electronics','Real Estate','Jobs','Services','Supermarket','Pharmacy','Fast Food','Fashion','General'];

export default function SellPage() {
  const [step, setStep] = useState('start');
  const [form, setForm] = useState({ title: '', description: '', category: '', price: '', city: '', currency: 'EGP' });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [token, setToken] = useState('');
  const [country, setCountry] = useState('EG');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('token');
    if (!t) { window.location.href = '/login'; return; }
    setToken(t);
    setCountry(localStorage.getItem('country') || 'EG');
  }, []);

  async function aiFromImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiLoading(true); setError('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      try {
        const res = await fetch(`${API}/api/ads/ai-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image: base64 })
        });
        const data = await res.json();
        if (data.title) setForm(f => ({
          ...f,
          title: data.title || f.title,
          description: data.description || f.description,
          category: data.category || f.category,
          price: data.suggestedPrice ? String(data.suggestedPrice) : f.price
        }));
      } catch {}
      setStep('form');
      setAiLoading(false);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    setError('');
    if (!form.title.trim()) { setError('العنوان مطلوب'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, price: Number(form.price) || 0, country, media: preview ? [preview] : [] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل النشر');
      alert('تم نشر الإعلان! ✅');
      window.location.href = '/';
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 20, fontFamily: 'Cairo, system-ui', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => step === 'form' ? setStep('start') : history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ color: '#002f34', margin: 0, fontSize: 22 }}>نشر إعلان</h1>
      </div>

      {error && <div style={{ background: '#fff0f0', border: '1px solid #fcc', borderRadius: 10, padding: 12, marginBottom: 16, color: '#c00', fontSize: 14 }}>⚠️ {error}</div>}

      {step === 'start' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'block', background: '#002f34', color: 'white', textAlign: 'center', padding: 28, borderRadius: 18, cursor: 'pointer', fontSize: 18, fontWeight: 'bold' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📸</div>
            صوّر المنتج — الذكاء الاصطناعي يكمل
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={aiFromImage} />
          </label>
          <button onClick={() => setStep('form')} style={{ background: 'white', color: '#002f34', padding: 20, borderRadius: 18, cursor: 'pointer', fontSize: 16, fontWeight: 'bold', border: '2px solid #002f34', fontFamily: 'inherit' }}>
            ✍️ إضافة يدوياً
          </button>
          {aiLoading && <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>🤖 الذكاء الاصطناعي يحلل...</div>}
        </div>
      )}

      {step === 'form' && (
        <div style={{ background: 'white', borderRadius: 18, padding: 20 }}>
          {preview && <img src={preview} style={{ maxHeight: 180, borderRadius: 12, maxWidth: '100%', objectFit: 'cover', marginBottom: 16 }} alt="" />}

          {[['title','العنوان *','text'],['description','الوصف','textarea'],['price','السعر','number'],['city','المدينة','text']].map(([k,l,t]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 5, fontSize: 14 }}>{l}</label>
              {t === 'textarea' ? (
                <textarea value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, resize: 'vertical', minHeight: 70, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              ) : (
                <input value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} type={t}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }} />
              )}
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 5, fontSize: 14 }}>الفئة</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14 }}>
              <option value="">اختر الفئة</option>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14 }}>
              {['EGP','SAR','AED','USD','EUR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={submit} disabled={loading}
              style={{ flex: 1, padding: '12px', background: loading ? '#ccc' : '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'جار النشر...' : '🚀 نشر الإعلان'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
