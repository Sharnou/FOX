'use client';

import { useState } from 'react';

/**
 * SellerQnAWidget
 * Public Q&A section on ad pages.
 * Buyers can ask questions; sellers answer publicly — visible to all visitors.
 *
 * Props:
 *   adId       {string}   - Ad identifier
 *   lang       {string}   - 'ar' | 'en' | 'de'
 *   isSeller   {boolean}  - true if current user owns this ad
 *   initialQA  {Array}    - [{id, question, askedAt, answer, answeredAt}]
 *   onAsk      {Function} - (adId, question) => Promise
 *   onAnswer   {Function} - (adId, qaId, answer) => Promise  [seller only]
 */

const LABELS = {
  ar: {
    title: 'الأسئلة والأجوبة',
    noQA: 'لا توجد أسئلة بعد — كن أول من يسأل!',
    askPlaceholder: 'اسأل سؤالاً عن هذا الإعلان…',
    askBtn: 'إرسال السؤال',
    answerPlaceholder: 'اكتب إجابتك هنا…',
    answerBtn: 'نشر الإجابة',
    replyBtn: 'رد البائع',
    unanswered: 'في انتظار إجابة البائع',
    charLeft: 'حرف متبقي',
    sellerBadge: 'البائع',
    askedLabel: 'سُئل',
    answeredLabel: 'أُجيب',
    cancelBtn: 'إلغاء',
  },
  en: {
    title: 'Questions & Answers',
    noQA: 'No questions yet — be the first to ask!',
    askPlaceholder: 'Ask a question about this listing…',
    askBtn: 'Submit Question',
    answerPlaceholder: 'Type your answer here…',
    answerBtn: 'Post Answer',
    replyBtn: "Seller's Reply",
    unanswered: 'Awaiting seller answer',
    charLeft: 'chars left',
    sellerBadge: 'Seller',
    askedLabel: 'Asked',
    answeredLabel: 'Answered',
    cancelBtn: 'Cancel',
  },
  de: {
    title: 'Fragen & Antworten',
    noQA: 'Noch keine Fragen — sei der Erste!',
    askPlaceholder: 'Stelle eine Frage zu dieser Anzeige…',
    askBtn: 'Frage absenden',
    answerPlaceholder: 'Schreibe deine Antwort hier…',
    answerBtn: 'Antwort veröffentlichen',
    replyBtn: 'Verkäuferantwort',
    unanswered: 'Warte auf Verkäuferantwort',
    charLeft: 'Zeichen übrig',
    sellerBadge: 'Verkäufer',
    askedLabel: 'Gefragt',
    answeredLabel: 'Beantwortet',
    cancelBtn: 'Abbrechen',
  },
};

const MAX_QUESTION = 300;
const MAX_ANSWER = 600;

function toArabicIndic(n, lang) {
  if (lang !== 'ar') return String(n);
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function RelativeTime({ iso, lang }) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  let label = '';
  const labels = {
    ar: { s: 'منذ ثوانٍ', m: 'منذ دقيقة', h: 'منذ {n} ساعة', d: 'منذ {n} يوم' },
    en: { s: 'just now', m: '1 min ago', h: '{n} hr ago', d: '{n} day ago' },
    de: { s: 'gerade eben', m: 'vor 1 Min', h: 'vor {n} Std', d: 'vor {n} Tag' },
  }[lang] || { s: 'just now', m: '1 min ago', h: '{n} hr ago', d: '{n} day ago' };
  if (diff < 60) label = labels.s;
  else if (diff < 3600) label = labels.m;
  else if (diff < 86400) label = labels.h.replace('{n}', toArabicIndic(Math.floor(diff / 3600), lang));
  else label = labels.d.replace('{n}', toArabicIndic(Math.floor(diff / 86400), lang));
  return <span className="text-xs text-gray-400">{label}</span>;
}

export default function SellerQnAWidget({
  adId,
  lang = 'ar',
  isSeller = false,
  initialQA = [],
  onAsk,
  onAnswer,
}) {
  const t = LABELS[lang] || LABELS.en;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const font = lang === 'ar' ? "'Cairo', 'Tajawal', sans-serif" : 'inherit';

  const [qaList, setQaList] = useState(initialQA);
  const [question, setQuestion] = useState('');
  const [answerMap, setAnswerMap] = useState({});
  const [openAnswerId, setOpenAnswerId] = useState(null);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingAnswerId, setLoadingAnswerId] = useState(null);

  async function handleAsk() {
    if (!question.trim()) return;
    setLoadingAsk(true);
    try {
      const newQA = await onAsk?.(adId, question.trim());
      if (newQA) {
        setQaList(prev => [newQA, ...prev]);
      } else {
        setQaList(prev => [
          { id: Date.now(), question: question.trim(), askedAt: new Date().toISOString(), answer: null },
          ...prev,
        ]);
      }
      setQuestion('');
    } catch (_) {}
    setLoadingAsk(false);
  }

  async function handleAnswer(qaId) {
    const ans = answerMap[qaId]?.trim();
    if (!ans) return;
    setLoadingAnswerId(qaId);
    try {
      await onAnswer?.(adId, qaId, ans);
      setQaList(prev =>
        prev.map(q =>
          q.id === qaId ? { ...q, answer: ans, answeredAt: new Date().toISOString() } : q
        )
      );
      setOpenAnswerId(null);
      setAnswerMap(prev => ({ ...prev, [qaId]: '' }));
    } catch (_) {}
    setLoadingAnswerId(null);
  }

  const qLeft = toArabicIndic(MAX_QUESTION - question.length, lang);
  const isRTL = lang === 'ar';

  return (
    <div dir={dir} style={{ fontFamily: font }} className="w-full rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 bg-emerald-50 px-5 py-4 border-b border-emerald-100">
        <span className="text-emerald-600 text-xl">💬</span>
        <h3 className="text-base font-bold text-emerald-700">{t.title}</h3>
        {qaList.length > 0 && (
          <span className="ms-auto bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {toArabicIndic(qaList.length, lang)}
          </span>
        )}
      </div>

      {/* Ask a question (non-sellers only) */}
      {!isSeller && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
            placeholder={t.askPlaceholder}
            rows={2}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{qLeft} {t.charLeft}</span>
            <button
              onClick={handleAsk}
              disabled={!question.trim() || loadingAsk}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              {loadingAsk ? '⏳' : t.askBtn}
            </button>
          </div>
        </div>
      )}

      {/* Q&A list */}
      <div className="divide-y divide-gray-50">
        {qaList.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
            <span className="text-4xl">🤔</span>
            <p className="text-sm">{t.noQA}</p>
          </div>
        ) : (
          qaList.map((qa, idx) => (
            <div
              key={qa.id}
              className="px-5 py-4 animate-fade-in"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Question row */}
              <div className="flex items-start gap-2 mb-2">
                <span className="mt-0.5 text-base">🙋</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 font-medium leading-snug">{qa.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{t.askedLabel}:</span>
                    <RelativeTime iso={qa.askedAt} lang={lang} />
                  </div>
                </div>
              </div>

              {/* Answer or unanswered */}
              {qa.answer ? (
                <div className={`${isRTL ? 'mr-6 border-r-2' : 'ml-6 border-l-2'} border-emerald-400 ${isRTL ? 'pr-3' : 'pl-3'} mt-2`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      ✅ {t.sellerBadge}
                    </span>
                    <RelativeTime iso={qa.answeredAt} lang={lang} />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{qa.answer}</p>
                </div>
              ) : (
                <div className={`${isRTL ? 'mr-6' : 'ml-6'} mt-2`}>
                  {/* Seller answer form */}
                  {isSeller ? (
                    openAnswerId === qa.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={answerMap[qa.id] || ''}
                          onChange={e =>
                            setAnswerMap(prev => ({ ...prev, [qa.id]: e.target.value.slice(0, MAX_ANSWER) }))
                          }
                          placeholder={t.answerPlaceholder}
                          rows={2}
                          className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setOpenAnswerId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 transition"
                          >
                            {t.cancelBtn}
                          </button>
                          <button
                            onClick={() => handleAnswer(qa.id)}
                            disabled={!answerMap[qa.id]?.trim() || loadingAnswerId === qa.id}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
                          >
                            {loadingAnswerId === qa.id ? '⏳' : t.answerBtn}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setOpenAnswerId(qa.id)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition"
                      >
                        ✏️ {t.replyBtn}
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-amber-500 italic">{t.unanswered}</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
