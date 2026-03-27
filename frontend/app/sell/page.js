'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const CATEGORIES = ['Vehicles', 'Electronics', 'Real Estate', 'Jobs', 'Services', 'Supermarket', 'Pharmacy', 'Fast Food', 'Fashion'];

export default function SellPage() {
  const [step, setStep] = useState('start');
  const [form, setForm] = useState({ title: '', description: '', category: '', price: '', city: '', currency: 'EGP' });
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setToken(localStorage.getItem('token') || '');
  }, []);

  async function aiGenerate(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      try {
        const res = await axios.post(`${API}/api/ads/ai-generate`, { image: base64 }, { headers: { Authorization: `Bearer ${token}` } });
        setForm(f => ({ ...f, title: res.data.title || '', description: res.data.description || '', category: res.data.category || '', price: res.data.suggestedPrice || '' }));
        setStep('form');
      } catch { setStep('form'); }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    setLoading(true);
    try {
      await axios.post(`${API}/api/ads`, form, { headers: { Authorization: `Bearer ${token}` } });
      alert('تم نشر الإعلان!');
      if (typeof window !== 'undefined') window.location.href = '/';
    } catch (e) { alert(e.response?.data?.error || 'خطأ في النشر'); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <button onClick={() => typeof window !== 'undefined' && history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>← رجوع</button>
      <h1 style={{ color: '#002f34', marginBottom: 24 }}>نشر إعلان</h1>
      {step === 'start' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'block', background: '#002f34', color: 'white', textAlign: 'center', padding: '24px', borderRadius: 16, cursor: 'pointer', fontSize: 18, fontWeight: 'bold' }}>
            🤖 بيع بالذكاء الاصطناعي
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={aiGenerate} />
          </label>
          {loading && <p style={{ textAlign: 'center', color: '#666' }}>جار التحليل...</p>}
          <button onClick={() => setStep('form')} style={{ padding: '16px', borderRadius: 16, border: '2px solid #002f34', background: 'white', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>✍️ إضافة يدوي</button>
        </div>
      )}
      {step === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[['title', 'العنوان'], ['description', 'الوصف'], ['price', 'السعر'], ['city', 'المدينة']].map(([f, label]) => (
            <div key={f}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14 }}>{label}</label>
              <input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14 }}>الفئة</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14 }}>
              <option value="">اختر الفئة</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={submit} disabled={loading}
            style={{ padding: '14px', borderRadius: 12, border: 'none', background: '#002f34', color: 'white', fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'جار النشر...' : 'نشر الإعلان'}
          </button>
        </div>
      )}
    </div>
  );
}
