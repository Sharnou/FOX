'use client';
import axios from 'axios';
const API = process.env.NEXT_PUBLIC_API_URL || '';
export default function AIGenerateButton({ onResult }) {
  async function handle(e) {
    const file = e.target.files[0]; if (!file) return;
    const token = localStorage.getItem('token');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target.result.split(',')[1];
        const res = await axios.post(`${API}/api/ads/ai-generate`, { image: base64 }, { headers: { Authorization: `Bearer ${token}` } });
        onResult?.(res.data);
      } catch (err) { alert('AI generation failed'); }
    };
    reader.readAsDataURL(file);
  }
  return (
    <label className="block w-full bg-brand text-white text-center py-4 rounded-2xl cursor-pointer font-bold">
      🤖 بيع بالذكاء الاصطناعي
      <input type="file" accept="image/*" className="hidden" onChange={handle} />
    </label>
  );
}
