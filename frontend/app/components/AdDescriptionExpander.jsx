'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * AdDescriptionExpander
 * Collapsible ad description with "Read more / Read less" in Arabic & English.
 * Props:
 *   text     {string}  – the full description text
 *   lang     {string}  – 'ar' | 'en' | 'de' | 'fr' (default: 'ar')
 *   maxLines {number}  – lines to show when collapsed (default: 4)
 */
export default function AdDescriptionExpander({ text = '', lang = 'ar', maxLines = 4 }) {
  const [expanded, setExpanded] = useState(false);
  const [needsExpander, setNeedsExpander] = useState(false);
  const textRef = useRef(null);

  const isRTL = ['ar', 'ar-EG', 'ar-SA', 'ar-AE', 'ar-MA'].includes(lang);
  const dir = isRTL ? 'rtl' : 'ltr';
  const fontFamily = "'Cairo', 'Tajawal', sans-serif";

  const FONT_SIZE = 15;
  const LINE_HEIGHT = 1.75;
  const MAX_HEIGHT_PX = FONT_SIZE * LINE_HEIGHT * maxLines;

  const labels = {
    ar: { more: 'اقرأ المزيد', less: 'اقرأ أقل', arrowDown: '▼', arrowUp: '▲' },
    en: { more: 'Read more',   less: 'Read less',  arrowDown: '▼', arrowUp: '▲' },
    de: { more: 'Mehr lesen',  less: 'Weniger',    arrowDown: '▼', arrowUp: '▲' },
    fr: { more: 'Lire plus',   less: 'Lire moins', arrowDown: '▼', arrowUp: '▲' },
  };
  const t = labels[lang] || labels['ar'];

  useEffect(() => {
    if (!textRef.current) return;
    const { scrollHeight } = textRef.current;
    if (scrollHeight > MAX_HEIGHT_PX + 4) {
      setNeedsExpander(true);
    }
  }, [text, MAX_HEIGHT_PX]);

  const toggle = () => setExpanded(prev => !prev);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&family=Tajawal:wght@400;500&display=swap');

        .xtox-expander-wrap {
          font-family: 'Cairo', 'Tajawal', sans-serif;
        }

        .xtox-expander-text {
          font-size: 15px;
          line-height: 1.75;
          color: #374151;
          white-space: pre-wrap;
          word-break: break-word;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .xtox-expander-text.collapsed {
          max-height: ${MAX_HEIGHT_PX}px;
          -webkit-mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
        }

        .xtox-expander-text.expanded-state {
          max-height: 5000px;
          -webkit-mask-image: none;
          mask-image: none;
        }

        .xtox-expander-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Cairo', 'Tajawal', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #2563eb;
          padding: 2px 0;
          transition: color 0.2s ease;
          text-decoration: none;
        }

        .xtox-expander-btn:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        .xtox-expander-btn:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
          border-radius: 3px;
        }

        .xtox-expander-arrow {
          font-size: 11px;
          display: inline-block;
          transition: transform 0.3s ease;
          line-height: 1;
        }

        .xtox-expander-arrow.up {
          transform: rotate(180deg);
        }
      `}</style>

      <div
        className="xtox-expander-wrap"
        dir={dir}
        style={{
          fontFamily,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {/* Description text */}
        <div
          ref={textRef}
          className={`xtox-expander-text ${needsExpander && !expanded ? 'collapsed' : 'expanded-state'}`}
          lang={lang}
        >
          {text}
        </div>

        {/* Toggle button — only shown when text overflows */}
        {needsExpander && (
          <button
            className="xtox-expander-btn"
            onClick={toggle}
            aria-expanded={expanded}
            type="button"
          >
            {expanded ? t.less : t.more}
            <span
              className={`xtox-expander-arrow${expanded ? ' up' : ''}`}
              aria-hidden="true"
            >
              ▼
            </span>
          </button>
        )}
      </div>
    </>
  );
}
