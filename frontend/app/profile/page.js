'use client';
import { useState } from 'react';
export default function ProfilePage() {
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const [name, setName] = useState(user.name || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  function saveProfile() {
    const updated = { ...user, name, avatar };
    localStorage.setItem('user', JSON.stringify(updated));
    alert('تم الحفظ!');
  }
  function uploadAvatar(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  }
  return (
    <div className="max-w-md mx-auto p-6">
      <button onClick={() => history.back()} className="mb-4 text-brand font-bold">← رجوع</button>
      <h1 className="text-2xl font-bold text-brand mb-6">👤 الملف الشخصي</h1>
      <div className="text-center mb-6">
        <label className="cursor-pointer">
          <img src={avatar || '/favicon.svg'} className="w-24 h-24 rounded-full mx-auto border-4 border-brand object-cover" alt="avatar" />
          <p className="text-sm text-brand mt-2">اضغط لتغيير الصورة</p>
          <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </label>
      </div>
      <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-xl p-3 mb-4" placeholder="اسمك" />
      <p className="text-gray-500 text-sm mb-4">البلد: {user.country} (مقفل)</p>
      <button onClick={saveProfile} className="w-full bg-brand text-white py-3 rounded-xl font-bold">حفظ</button>
    </div>
  );
}
