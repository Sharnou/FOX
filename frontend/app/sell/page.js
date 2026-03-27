'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const CATEGORIES = ['Vehicles', 'Electronics', 'Real Estate', 'Jobs', 'Services', 'Supermarket', 'Pharmacy', 'Fast Food', 'Fashion', 'General'];

export default function SellPage() {
  const [step, setStep] = useState('start');
  const [form, setForm] = useState({ title: '', description: '', category: '', price: '', city: '', currency: 'EGP' });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [token, setToken] = useState('');
  const [country, setCountry] = useState('EG');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

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
    setAiLoading(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      try {
        const res = await axios.post(`${API}/api/ads/ai-generate`,
          { image: base64 },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        const data = res.data;
        setForm(f => ({
          ...f,
          title: data.title || f.title,
          description: data.description || f.description,
          category: data.category || f.category,
          price: data.suggestedPrice ? String(data.suggestedPrice) : f.price
        }));
        setStep('form');
      } catch {
        setError('فشل تحليل الصورة — اكمل البيانات يدوياً');
        setStep('form');
      }
      setAiLoading(false);
    };
    reader.readAsDataURL(file);
  }

  async function aiFromVoice() {
    if (!navigator.mediaDevices) { setError('الميكروفون غير متاح'); return; }
    setAiLoading(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target.result.split(',')[1];
          try {
            const res = await axios.post(`${API}/api/ads/ai-generate`,
              { audio: base64 },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setForm(f => ({ ...f, title: res.data.title || f.title, description: res.data.description || f.description, category: res.data.category || f.category }));
            setStep('form');
          } catch { setError('فشل تحليل الصوت'); setStep('form'); }
          setAiLoading(false);
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setAiLoading(true);
      let seconds = 0;
      const countdown = setInterval(() => {
        seconds++;
        const btn = document.getElementById('voice-record-btn');
        if (btn) btn.textContent = `🔴 جار التسجيل... ${60 - seconds}ث`;
        if (seconds >= 60) {
          clearInterval(countdown);
          recorder.stop();
          stream.getTracks().forEach(t => t.stop());
        }
      }, 1000);
    } catch { setError('لا يمكن الوصول للميكروفون'); setAiLoading(false); }
  }

  async function submit() {
    setError('');
    if (!form.title) { setError('العنوان مطلوب'); return; }
    if (!form.price) { setError('السعر مطلوب'); return; }
    setLoading(true);
    try {
      const payload = { ...form, price: Number(form.price), country, media: preview ? [preview] : [] };
      await axios.post(`${API}/api/ads`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      alert('✅ تم نشر الإعلان بنجاح! (صالح 45 يوم)');
      if (typeof window !== 'undefined') window.location.href = '/';
    } catch (e) {
      setError(e.response?.data?.error || 'فشل نشر الإعلان — تأكد من تسجيل الدخول');
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => typeof window !== 'undefined' && history.back()}
          style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ color: '#002f34', margin: 0, fontSize: 22, fontWeight: 'bold' }}>نشر إعلان جديد</h1>
      </div>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#cc0000', fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {step === 'start' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ color: '#666', textAlign: 'center', marginBottom: 8 }}>كيف تريد إنشاء إعلانك؟</p>
          <label style={{ display: 'block', background: '#002f34', color: 'white', textAlign: 'center', padding: 28, borderRadius: 18, cursor: 'pointer', fontSize: 18, fontWeight: 'bold' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📸</div>
            صوّر المنتج — الذكاء الاصطناعي يكمل البقية
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={aiFromImage} />
          </label>
          <button id="voice-record-btn" onClick={aiFromVoice}
            style={{ background: '#00b09b', color: 'white', textAlign: 'center', padding: 20, borderRadius: 18, cursor: 'pointer', fontSize: 16, fontWeight: 'bold', border: 'none', fontFamily: 'inherit' }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🎤</div>
            تحدث عن المنتج (دقيقة كاملة)
          </button>
          <button onClick={() => setStep('form')}
            style={{ background: 'white', color: '#002f34', textAlign: 'center', padding: 20, borderRadius: 18, cursor: 'pointer', fontSize: 16, fontWeight: 'bold', border: '2px solid #002f34', fontFamily: 'inherit' }}>
            ✍️ إضافة يدوياً
          </button>
          {aiLoading && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 40, animation: 'spin 1s linear infinite', display: 'inline-block' }}>🤖</div>
              <p style={{ color: '#666', marginTop: 8 }}>الذكاء الاصطناعي يحلل...</p>
            </div>
          )}
        </div>
      )}

      {step === 'form' && (
        <div style={{ background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {preview ? (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <img src={preview} style={{ maxHeight: 200, borderRadius: 12, maxWidth: '100%', objectFit: 'cover' }} alt="preview" />
              <label style={{ display: 'block', marginTop: 8, color: '#002f34', fontSize: 13, cursor: 'pointer' }}>
                تغيير الصورة
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={aiFromImage} />
              </label>
            </div>
          ) : (
            <label style={{ display: 'block', border: '2px dashed #ddd', borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 16, color: '#999' }}>
              <div style={{ fontSize: 32 }}>📷</div>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>إضافة صورة (اختياري)</p>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={aiFromImage} />
            </label>
          )}

          {[
            { key: 'title', label: 'عنوان الإعلان *', placeholder: 'مثال: آيفون 14 للبيع', type: 'text' },
            { key: 'description', label: 'الوصف', placeholder: 'اوصف المنتج بالتفصيل...', type: 'textarea' },
            { key: 'price', label: 'السعر *', placeholder: '0', type: 'number' },
            { key: 'city', label: 'المدينة', placeholder: 'القاهرة', type: 'text' }
          ].map(({ key, label, placeholder, type }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14, color: '#333' }}>{label}</label>
              {type === 'textarea' ? (
                <textarea value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, resize: 'vertical', minHeight: 80, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              ) : (
                <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  type={type} placeholder={placeholder}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }} />
              )}
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14, color: '#333' }}>الفئة</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, background: 'white' }}>
              <option value="">اختر الفئة</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14, color: '#333' }}>العملة</label>
            <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, background: 'white' }}>
              {['EGP','SAR','AED','USD','EUR','GBP'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('start')}
              style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              ← رجوع
            </button>
            <button onClick={submit} disabled={loading}
              style={{ flex: 1, padding: '14px', background: loading ? '#ccc' : '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'جار النشر...' : '🚀 نشر الإعلان (45 يوم)'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
