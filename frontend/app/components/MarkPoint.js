'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const OWNER_EMAIL = 'ahmed_sharnou@yahoo.com';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// Get a readable CSS selector path for an element
function getSelectorPath(el) {
  if (!el || el === document.body) return 'body';
  const parts = [];
  let current = el;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += '#' + current.id;
      parts.unshift(selector);
      break;
    }
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) selector += '.' + classes;
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  return parts.join(' > ').slice(0, 200);
}

export default function MarkPoint() {
  const [isOwner, setIsOwner] = useState(false);
  const [markMode, setMarkMode] = useState(false);
  const [popup, setPopup] = useState(null); // { x, y, elementInfo, note }
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const hoveredRef = useRef(null);

  // Check if current user is the owner
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user') || localStorage.getItem('xtox_user') || 
                       localStorage.getItem('xtox_admin_user') || '{}';
      const user = JSON.parse(userData);
      if (user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        setIsOwner(true);
      }
    } catch {}
  }, []);

  // Mark mode: hover highlight + click capture
  useEffect(() => {
    if (!markMode) return;

    const handleMouseOver = (e) => {
      // Skip our own UI elements
      if (e.target.closest('[data-markpoint-ui]')) return;
      if (hoveredRef.current && hoveredRef.current !== e.target) {
        hoveredRef.current.style.outline = '';
        hoveredRef.current.style.outlineOffset = '';
      }
      e.target.style.outline = '2px dashed #ef4444';
      e.target.style.outlineOffset = '2px';
      hoveredRef.current = e.target;
    };

    const handleMouseOut = (e) => {
      if (e.target.closest('[data-markpoint-ui]')) return;
      e.target.style.outline = '';
      e.target.style.outlineOffset = '';
    };

    const handleClick = (e) => {
      if (e.target.closest('[data-markpoint-ui]')) return;
      e.preventDefault();
      e.stopPropagation();

      // Clear hover outline
      if (hoveredRef.current) {
        hoveredRef.current.style.outline = '';
        hoveredRef.current.style.outlineOffset = '';
      }

      const el = e.target;
      const rect = el.getBoundingClientRect();
      const elementInfo = {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: (el.className && typeof el.className === 'string') ? el.className.slice(0, 100) : null,
        text: el.textContent?.trim().slice(0, 150) || null,
        selector: getSelectorPath(el),
        url: location.href,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        position: { x: Math.round(rect.left + rect.width/2), y: Math.round(rect.top + rect.height/2) },
      };

      // Place popup near click but keep in viewport
      const px = Math.min(e.clientX, window.innerWidth - 320);
      const py = Math.min(e.clientY + 10, window.innerHeight - 200);

      setPopup({ x: px, y: py, elementInfo, note: '' });
      setMarkMode(false); // exit mark mode after capture
    };

    document.body.style.cursor = 'crosshair';
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('click', handleClick, true);
      if (hoveredRef.current) {
        hoveredRef.current.style.outline = '';
        hoveredRef.current.style.outlineOffset = '';
        hoveredRef.current = null;
      }
    };
  }, [markMode]);

  const submitMark = async () => {
    if (!popup) return;
    setSending(true);
    try {
      const message = '[MARKED] ' + popup.elementInfo.selector + ' — ' + (popup.note || 'لا يوجد وصف');
      await fetch(API + '/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          stack: JSON.stringify(popup.elementInfo, null, 2),
          url: popup.elementInfo.url,
          component: popup.elementInfo.selector,
          type: 'marked_issue',
          userAgent: navigator.userAgent,
        }),
      });
      setSent(true);
      setTimeout(() => { setPopup(null); setSent(false); }, 1500);
    } catch (e) {
      console.error('MarkPoint submit failed:', e);
    } finally {
      setSending(false);
    }
  };

  if (!isOwner) return null;

  return (
    <>
      {/* Floating mark button */}
      <button
        data-markpoint-ui="true"
        onClick={() => { setMarkMode(m => !m); setPopup(null); }}
        title={markMode ? 'إلغاء وضع التمييز' : 'تمييز خطأ'}
        style={{
          position: 'fixed', bottom: 80, left: 20, zIndex: 9998,
          width: 44, height: 44, borderRadius: '50%',
          background: markMode ? '#ef4444' : '#6366f1',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'background 0.2s, transform 0.1s',
        }}
      >
        {markMode ? '✕' : '📍'}
      </button>

      {/* Mark mode banner */}
      {markMode && (
        <div data-markpoint-ui="true" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'rgba(239,68,68,0.92)', color: 'white',
          textAlign: 'center', padding: '8px', fontSize: 14, fontWeight: 'bold',
          backdropFilter: 'blur(4px)',
        }}>
          📍 وضع التمييز نشط — انقر على أي عنصر به مشكلة
        </div>
      )}

      {/* Popup form */}
      {popup && (
        <div data-markpoint-ui="true" style={{
          position: 'fixed', left: popup.x, top: popup.y, zIndex: 10000,
          background: 'white', borderRadius: 12, padding: 16, width: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)', border: '2px solid #ef4444',
        }}>
          <p style={{ margin: '0 0 8px', fontWeight: 'bold', fontSize: 13, color: '#ef4444' }}>
            📍 تمييز مشكلة
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: '#888', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {popup.elementInfo.selector}
          </p>
          <textarea
            placeholder="اشرح المشكلة هنا (اختياري)..."
            value={popup.note}
            onChange={e => setPopup(p => ({ ...p, note: e.target.value }))}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd',
              fontSize: 13, minHeight: 60, marginBottom: 10, boxSizing: 'border-box',
              resize: 'vertical', fontFamily: 'inherit', direction: 'rtl' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submitMark} disabled={sending}
              style={{ flex: 1, background: sent ? '#10b981' : '#ef4444', color: 'white',
                border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: 13 }}>
              {sent ? '✅ تم الإرسال' : sending ? '⏳...' : '🤖 أرسل للذكاء الاصطناعي'}
            </button>
            <button onClick={() => setPopup(null)}
              style={{ padding: '8px 12px', background: '#f3f4f6', border: 'none',
                borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
