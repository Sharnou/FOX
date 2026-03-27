'use client';
import { useState } from 'react';
import axios from 'axios';
const API = process.env.NEXT_PUBLIC_API_URL || '';
export default function SellPage() {
  const [step, setStep] = useState('start');
  const [form, setForm] = useState({ title: '', description: '', category: '', price: '', city: '', currency: 'EGP' });
  const [loading, setLoading] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  async function aiGenerate(e) {
    const file = e.target.files[0]; if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      try {
        const res = await axios.post(`${API}/api/ads/ai-generate`, { image: base64 }, { headers: { Authorization: `Bearer ${token}` } });
        setForm(f => ({ ...f, title: res.data.title, description: res.data.description, category: res.data.category, price: res.data.suggestedPrice }));
        setStep('form');
      } catch {}
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }
  async function submit() {
    setLoading(true);
    try {
      await axios.post(`${API}/api/ads`, form, { headers: { Authorization: `Bearer ${token}` } });
      alert('تم نشر الإعلان!'); window.location.href = '/';
    } catch (e) { alert(e.response?.data?.error || 'خطأ'); }
    setLoading(false);
  }
  return (
    <div className="max-w-lg mx-auto p-6">
      <button onClick={() => history.back()} className="mb-4 text-brand font-bold">← رجوع</button>
      <h1 className="text-2xl font-bold mb-6 text-brand">نشر إعلان</h1>
      {step === 'start' && (
        <div className="space-y-4">
          <label className="block w-full bg-brand text-white text-center py-6 rounded-2xl cursor-pointer text-xl font-bold">
            🤖 بيع بالذكاء الاصطناعي
            <input type="file" accept="image/*" className="hidden" onChange={aiGenerate} />
          </label>
          {loading && <p className="text-center text-gray-500">جار التحليل...</p>}
          <button onClick={() => setStep('form')} className="w-full border-2 border-brand text-brand py-4 rounded-2xl font-bold">✍️ إضافة يدوي</button>
        </div>
      )}
      {step === 'form' && (
        <div className="space-y-4">
          {['title','description','category','price','city'].map(f => (
            <div key={f}>
              <label className="block text-sm font-bold mb-1 capitalize">{f === 'title' ? 'العنوان' : f === 'description' ? 'الوصف' : f === 'category' ? 'الفئة' : f === 'price' ? 'السعر' : 'المدينة'}</label>
              <input value={form[f]} onChange={e => setForm(p => ({...p, [f]: e.target.value}))} className="w-full border rounded-xl p-3" />
            </div>
          ))}
          <button onClick={submit} disabled={loading} className="w-full bg-brand text-white py-4 rounded-2xl font-bold">
            {loading ? 'جار النشر...' : 'نشر الإعلان'}
          </button>
        </div>
      )}
    </div>
  );
}
