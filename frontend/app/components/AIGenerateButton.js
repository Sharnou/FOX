'use client';
import { useState, useRef } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const TRANSLATIONS = {
  ar: {
    buttonIdle: '🤖 بيع بالذكاء الاصطناعي',
    buttonHint: 'اختر صورة المنتج',
    stageReading: '📖 جارٍ قراءة الصورة...',
    stageUploading: '☁️ جارٍ الرفع...',
    stageGenerating: '🤖 الذكاء الاصطناعي يحلل...',
    stageSuccess: '✅ تم التحليل بنجاح!',
    errSize: '❌ حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)',
    errType: '❌ يرجى اختيار صورة صالحة',
    errNetwork: '❌ خطأ في الاتصال، حاول مرة أخرى',
    errAI: '❌ فشل التحليل، حاول بصورة أخرى',
    retry: '🔄 صورة أخرى',
    cancel: 'إلغاء',
    preview: 'معاينة:',
    maxSize: 'الحد الأقصى: 5 ميجابايت',
  },
  en: {
    buttonIdle: '🤖 Sell with AI',
    buttonHint: 'Choose product photo',
    stageReading: '📖 Reading image...',
    stageUploading: '☁️ Uploading...',
    stageGenerating: '🤖 AI analyzing...',
    stageSuccess: '✅ Analysis complete!',
    errSize: '❌ Image too large (max 5 MB)',
    errType: '❌ Please choose a valid image',
    errNetwork: '❌ Connection error, please retry',
    errAI: '❌ AI failed, try a different photo',
    retry: '🔄 Try another',
    cancel: 'Cancel',
    preview: 'Preview:',
    maxSize: 'Max: 5 MB',
  },
};

const STAGES = ['reading', 'uploading', 'generating'];

export default function AIGenerateButton({ onResult }) {
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('xtox_lang') || 'ar';
    }
    return 'ar';
  });
  const [stage, setStage] = useState(null); // null | 'reading' | 'uploading' | 'generating' | 'success' | 'error'
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';
  const isLoading = STAGES.includes(stage);

  function reset() {
    setStage(null);
    setError('');
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handle(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setStage(null);

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError(t.errType);
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t.errSize);
      return;
    }

    // Show preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Stage 1: reading
    setStage('reading');
    const token = localStorage.getItem('token');

    const reader = new FileReader();
    reader.onerror = () => {
      setStage('error');
      setError(t.errNetwork);
    };
    reader.onload = async (ev) => {
      try {
        // Stage 2: uploading
        setStage('uploading');
        const base64 = ev.target.result.split(',')[1];

        // Stage 3: generating
        setStage('generating');
        const res = await axios.post(
          `${API}/api/ads/ai-generate`,
          { image: base64 },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000,
          }
        );

        setStage('success');
        onResult?.(res.data);

        // Auto-reset after success feedback
        setTimeout(reset, 2000);
      } catch (err) {
        setStage('error');
        if (err.code === 'ECONNABORTED' || !err.response) {
          setError(t.errNetwork);
        } else {
          setError(t.errAI);
        }
      }
    };
    reader.readAsDataURL(file);
  }

  const stageLabel = {
    reading: t.stageReading,
    uploading: t.stageUploading,
    generating: t.stageGenerating,
    success: t.stageSuccess,
  }[stage] || '';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ fontFamily: 'Cairo, sans-serif', width: '100%' }}
    >
      {/* Language toggle */}
      <div style={{ display: 'flex', justifyContent: isRtl ? 'flex-start' : 'flex-end', marginBottom: 6 }}>
        <button
          onClick={() => {
            const next = lang === 'ar' ? 'en' : 'ar';
            setLang(next);
            if (typeof window !== 'undefined') localStorage.setItem('xtox_lang', next);
          }}
          style={{
            background: 'none', border: '1px solid #ccc', borderRadius: 8,
            padding: '2px 10px', fontSize: 11, cursor: 'pointer', color: '#666',
          }}
        >
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>
      </div>

      {/* Image preview */}
      {preview && (
        <div style={{ marginBottom: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{t.preview}</div>
          <img
            src={preview}
            alt="preview"
            style={{
              width: 80, height: 80, objectFit: 'cover',
              borderRadius: 12, border: '2px solid #002f34',
              display: 'block', margin: '0 auto',
            }}
          />
        </div>
      )}

      {/* Progress stages */}
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
          {STAGES.map((s) => {
            const idx = STAGES.indexOf(s);
            const currentIdx = STAGES.indexOf(stage);
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            return (
              <div
                key={s}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: done ? '#16a34a' : active ? '#002f34' : '#e5e7eb',
                  transition: 'background 0.3s',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Status label */}
      {(isLoading || stage === 'success') && (
        <div style={{
          textAlign: 'center', fontSize: 13, color: stage === 'success' ? '#16a34a' : '#002f34',
          marginBottom: 8, fontWeight: 600,
        }}>
          {isLoading && (
            <span style={{ display: 'inline-block', marginInlineEnd: 6 }}>
              <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⏳</span>
            </span>
          )}
          {stageLabel}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ai-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.01); }
        .ai-btn:active:not(:disabled) { transform: scale(0.98); }
        .ai-btn { transition: opacity 0.2s, transform 0.15s; }
      `}</style>

      {/* Main button or error */}
      {stage === 'error' ? (
        <div>
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12,
            padding: '10px 14px', color: '#dc2626', fontSize: 13,
            textAlign: 'center', marginBottom: 8,
          }}>
            {error}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="ai-btn"
              onClick={() => { reset(); setTimeout(() => inputRef.current?.click(), 50); }}
              style={{
                flex: 1, background: '#002f34', color: '#fff', border: 'none',
                borderRadius: 12, padding: '12px 8px', fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t.retry}
            </button>
            <button
              className="ai-btn"
              onClick={reset}
              style={{
                flex: 1, background: '#f5f5f5', color: '#555', border: 'none',
                borderRadius: 12, padding: '12px 8px', fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <label
          className="ai-btn"
          style={{
            display: 'block', width: '100%',
            background: isLoading || stage === 'success'
              ? (stage === 'success' ? '#16a34a' : '#374151')
              : 'linear-gradient(135deg,#002f34,#005a5e)',
            color: '#fff',
            textAlign: 'center',
            padding: '14px 8px',
            borderRadius: 16,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: 15,
            boxShadow: '0 4px 16px rgba(0,47,52,0.25)',
            userSelect: 'none',
          }}
        >
          {isLoading || stage === 'success' ? stageLabel : (
            <>
              {t.buttonIdle}
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.75, marginTop: 2 }}>
                {t.buttonHint} · {t.maxSize}
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handle}
            disabled={isLoading}
          />
        </label>
      )}
    </div>
  );
}
