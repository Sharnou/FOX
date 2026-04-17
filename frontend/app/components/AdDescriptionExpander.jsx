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
const FONT_SIZE = 15;
const LINE_HEIGHT = 1.75;

export default function AdDescriptionExpander({ text = '', lang = 'ar', maxLines = 4 }) {
  const [expanded, setExpanded] = useState(false);
  const [needsExpander, setNeedsExpander] = useState(false);
  const textRef = useRef(null);

  const isRTL = ['ar', 'ar-EG', 'ar-SA', 'ar-AE', 'ar-MA'].includes(lang);
  const dir = isRTL ? 'rtl' : 'ltr';
  const fontFamily = "'Cairo', 'Tajawal', sans-serif";

  const maxHeightPx = FONT_SIZE * LINE_HEIGHT * maxLines;

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
    if (scrollHeight > maxHeightPx + 4) {
      setNeedsExpander(true);
    }
  }, [text, maxHeightPx]);

  const toggle = () => setExpanded(prev => !prev);

  return (
    <>
      <style>{'\n        @import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&family=Tajawal:wght@400;500&display=swap\');\n\n        .xtox-expander-wrap {\n          font-family: \'Cairo\', \'Tajawal\', sans-serif;\n        }\n\n        .xtox-expander-text {\n          font-size: 15px;\n          line-height: 1.75;\n          color: #374151;\n          white-space: pre-wrap;\n          word-break: break-word;\n          overflow: hidden;\n          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);\n        }\n\n        .xtox-expander-text.collapsed {\n          max-height: ' + maxHeightPx + 'px;\n          -webkit-mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);\n          mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);\n        }\n\n        .xtox-expander-text.expanded-state {\n          max-height: 5000px;\n          -webkit-mask-image: none;\n          mask-image: none;\n        }\n\n        .xtox-expander-btn {\n          display: inline-flex;\n          align-items: center;\n          gap: 5px;\n          margin-top: 8px;\n          background: none;\n          border: none;\n          cursor: pointer;\n          font-family: \'Cairo\', \'Tajawal\', sans-serif;\n          font-size: 14px;\n          font-weight: 600;\n          color: #2563eb;\n          padding: 2px 0;\n          transition: color 0.2s ease;\n          text-decoration: none;\n        }\n\n        .xtox-expander-btn:hover {\n          color: #1d4ed8;\n          text-decoration: underline;\n        }\n\n        .xtox-expander-btn:focus-visible {\n          outline: 2px solid #2563eb;\n          outline-offset: 2px;\n          border-radius: 3px;\n        }\n\n        .xtox-expander-arrow {\n          font-size: 11px;\n          display: inline-block;\n          transition: transform 0.3s ease;\n          line-height: 1;\n        }\n\n        .xtox-expander-arrow.up {\n          transform: rotate(180deg);\n        }\n      '}</style>

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
          className={'xtox-expander-text ' + (needsExpander && !expanded ? 'collapsed' : 'expanded-state')}
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
              className={'xtox-expander-arrow' + (expanded ? ' up' : '')}
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
