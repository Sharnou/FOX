'use client';
// AIListingGenerator.js
// Generates a professional ad listing using the FOX AI backend
import { useState } from 'react';
import { FOX } from '@/lib/XTOXClient';

const SYSTEM_PROMPT = `أنت مساعد إعلانات محترف. بناءً على وصف المستخدم، اكتب إعلاناً احترافياً يتضمن:
- عنوان جذاب ومختصر (title)
- وصف تفصيلي مقنع (description)
- الفئة المناسبة (category) من: Electronics, Vehicles, Real Estate, Clothes, Furniture, Jobs, Services, Animals, Other
- السعر التقديري بالدولار (estimated_price_usd) كرقم فقط
أجب بـ JSON فقط بهذا الشكل:
{"title":"...","description":"...","category":"...","estimated_price_usd":0}`;

export default function AIListingGenerator({ onGenerated, category, subcategory }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    try {
      const fullPrompt = SYSTEM_PROMPT + '\n\nوصف المستخدم: ' + prompt.trim() +
        (category ? '\nالفئة المطلوبة: ' + category : '') +
        (subcategory ? '\nالفئة الفرعية: ' + subcategory : '');

      const response = await FOX.integrations.Core.InvokeLLM({ prompt: fullPrompt });
      const text = response?.text || '';

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response format');
      const result = JSON.parse(jsonMatch[0]);

      if (!result.title || !result.description) throw new Error('Incomplete AI response');
      if (onGenerated) onGenerated(result);
    } catch (e) {
      console.error('[AIListingGenerator] Error:', e.message);
      setError('فشل توليد الإعلان — تحقق من اتصالك أو حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ margin: '0 0 4px', fontWeight: '700', color: '#111827', fontSize: '16px', direction: 'rtl' }}>
        🤖 توليد إعلان بالذكاء الاصطناعي
      </h3>
      <p style={{ margin: '0 0 14px', color: '#6b7280', fontSize: '13px', direction: 'rtl' }}>
        AI Listing Generator — صِف منتجك بالعربية أو الإنجليزية
      </p>

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="مثال: أبيع جوال سامسونج S24 بحالة ممتازة، مستخدم 3 أشهر، اللون أسود، معه الكرتونة الأصلية..."
        rows={4}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '10px',
          fontSize: '14px',
          direction: 'rtl',
          resize: 'vertical',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          lineHeight: '1.6',
          outline: 'none',
        }}
        onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
        onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
      />

      {error && (
        <p style={{ color: '#ef4444', fontSize: '13px', margin: '6px 0 0', direction: 'rtl' }}>
          ⚠️ {error}
        </p>
      )}

      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '12px',
          background: loading || !prompt.trim()
            ? '#d1d5db'
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: loading || !prompt.trim() ? '#9ca3af' : 'white',
          border: 'none',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '14px',
          cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}
      >
        {loading ? '⏳ جارٍ التوليد...' : '✨ توليد الإعلان تلقائياً'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', margin: '10px 0 0', direction: 'rtl' }}>
        مدعوم بـ Gemini · Groq · OpenAI — نتائج قد تحتاج مراجعة
      </p>
    </div>
  );
}
