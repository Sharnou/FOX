'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function EditProfilePage() {
  const [form, setForm] = useState({ name: '', city: '', avatar: '', phone: '', whatsapp: '', showPhone: false, showWhatsapp: false });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('token');
    if (!t) { window.location.href = '/login'; return; }
    setToken(t);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setForm(f => ({ ...f, name: user.name || '', city: user.city || '', avatar: user.avatar || '' }));
  }, []);

  function uploadAvatar(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, avatar: ev.target.result }));
    reader.readAsDataURL(file);
  }

  async function save() {
    setLoading(true); setSaved(false);
    try {
      const res = await axios.put(`${API}/api/users/me`, form, { headers: { Authorization: `Bearer ${token}` } });
      localStorage.setItem('user', JSON.stringify(res.data));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert(e.response?.data?.error || 'فشل الحفظ'); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ color: '#002f34', margin: 0, fontSize: 22, fontWeight: 'bold' }}>تعديل الملف الشخصي</h1>
      </div>

      <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <label style={{ cursor: 'pointer', display: 'inline-block' }}>
            {form.avatar ? (
              <img src={form.avatar} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #002f34' }} alt="" />
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'white' }}>
                {form.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <p style={{ color: '#002f34', fontSize: 13, marginTop: 8 }}>📷 تغيير الصورة</p>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
          </label>
        </div>

        {[['name','الاسم الكامل','text'],['city','المدينة','text']].map(([key, label, type]) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14 }}>{label}</label>
            <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} type={type}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
        ))}

        <div style={{ marginTop: 20, padding: '16px', background: '#f8f8f8', borderRadius: 14 }}>
          <h3 style={{ margin: '0 0 12px', color: '#002f34', fontSize: 16 }}>📞 معلومات التواصل</h3>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>يمكنك اختيار إظهار رقمك للمشترين</p>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14 }}>رقم الهاتف</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} type="tel" placeholder="+201234567890"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.showPhone} onChange={e => setForm(f => ({ ...f, showPhone: e.target.checked }))} />
              إظهار رقم الهاتف للمشترين
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14 }}>رقم واتساب</label>
            <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} type="tel" placeholder="+201234567890"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.showWhatsapp} onChange={e => setForm(f => ({ ...f, showWhatsapp: e.target.checked }))} />
              إظهار واتساب للمشترين
            </label>
          </div>
        </div>

        {saved && <div style={{ marginTop: 12, background: '#e8f8e8', border: '1px solid #00aa44', borderRadius: 10, padding: '10px 14px', color: '#00aa44', fontSize: 14, textAlign: 'center' }}>✅ تم حفظ التغييرات!</div>}

        <button onClick={save} disabled={loading}
          style={{ width: '100%', marginTop: 20, padding: '14px', background: '#002f34', color: 'white', border: 'none', borderRadius: 14, fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'جار الحفظ...' : '💾 حفظ التغييرات'}
        </button>
      </div>
    </div>
  );
}
