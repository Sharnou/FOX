'use client';
import { useState } from 'react';

const TRANSLATIONS = {
  ar: {
    title: 'الأسئلة الشائعة',
    addQuestion: 'إضافة سؤال',
    question: 'السؤال',
    answer: 'الإجابة',
    save: 'حفظ',
    cancel: 'إلغاء',
    noFAQ: 'لا توجد أسئلة شائعة بعد',
    addFirst: 'أضف أول سؤال لمساعدة المشترين',
    edit: 'تعديل',
    delete: 'حذف',
    questionPlaceholder: 'مثال: هل السعر قابل للتفاوض؟',
    answerPlaceholder: 'مثال: نعم، يمكن التفاوض على السعر',
    characters: 'حرف',
    faqCount: 'سؤال',
    helpful: 'مفيد',
    notHelpful: 'غير مفيد',
    votes: 'تصويت',
  },
  en: {
    title: 'FAQ',
    addQuestion: 'Add Question',
    question: 'Question',
    answer: 'Answer',
    save: 'Save',
    cancel: 'Cancel',
    noFAQ: 'No FAQs yet',
    addFirst: 'Add your first question to help buyers',
    edit: 'Edit',
    delete: 'Delete',
    questionPlaceholder: 'e.g. Is the price negotiable?',
    answerPlaceholder: 'e.g. Yes, price is negotiable',
    characters: 'chars',
    faqCount: 'questions',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    votes: 'votes',
  },
  de: {
    title: 'FAQ',
    addQuestion: 'Frage hinzufügen',
    question: 'Frage',
    answer: 'Antwort',
    save: 'Speichern',
    cancel: 'Abbrechen',
    noFAQ: 'Noch keine FAQs',
    addFirst: 'Fügen Sie Ihre erste Frage hinzu, um Käufern zu helfen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    questionPlaceholder: 'z.B. Ist der Preis verhandelbar?',
    answerPlaceholder: 'z.B. Ja, der Preis ist verhandelbar',
    characters: 'Zeichen',
    faqCount: 'Fragen',
    helpful: 'Hilfreich',
    notHelpful: 'Nicht hilfreich',
    votes: 'Stimmen',
  },
};

const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const MOCK_FAQS = [
  {
    id: 1,
    question: 'هل السعر قابل للتفاوض؟',
    questionEn: 'Is the price negotiable?',
    questionDe: 'Ist der Preis verhandelbar?',
    answer: 'نعم، يمكن التفاوض للمشترين الجادين.',
    answerEn: 'Yes, negotiable for serious buyers.',
    answerDe: 'Ja, für ernsthafte Käufer verhandelbar.',
    helpfulVotes: 12,
    notHelpfulVotes: 1,
    userVote: null,
  },
  {
    id: 2,
    question: 'هل يمكن الشحن خارج المحافظة؟',
    questionEn: 'Can you ship outside the governorate?',
    questionDe: 'Können Sie außerhalb des Gouvernements liefern?',
    answer: 'نعم، عبر شركات الشحن المعتمدة بتكلفة إضافية.',
    answerEn: 'Yes, via approved shipping companies at extra cost.',
    answerDe: 'Ja, über zugelassene Versandunternehmen gegen Aufpreis.',
    helpfulVotes: 8,
    notHelpfulVotes: 0,
    userVote: null,
  },
];

export default function SellerFAQWidget({
  faqs: initialFaqs = MOCK_FAQS,
  lang = 'ar',
  isOwner = false,
  onAddFAQ,
  onDeleteFAQ,
  onVote,
  className = '',
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === 'ar';
  const [faqs, setFaqs] = useState(initialFaqs);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '' });
  const [errors, setErrors] = useState({});
  const [arabicNumerals, setArabicNumerals] = useState(isRTL);

  const fmt = (n) => (arabicNumerals && isRTL ? toArabicNumerals(n) : String(n));

  const getQuestion = (faq) => {
    if (lang === 'en') return faq.questionEn || faq.question;
    if (lang === 'de') return faq.questionDe || faq.question;
    return faq.question;
  };
  const getAnswer = (faq) => {
    if (lang === 'en') return faq.answerEn || faq.answer;
    if (lang === 'de') return faq.answerDe || faq.answer;
    return faq.answer;
  };

  const validate = () => {
    const e = {};
    if (!form.question.trim() || form.question.length < 5)
      e.question = isRTL ? 'السؤال قصير جداً' : 'Question too short';
    if (!form.answer.trim() || form.answer.length < 5)
      e.answer = isRTL ? 'الإجابة قصيرة جداً' : 'Answer too short';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editId !== null) {
      const updated = faqs.map((f) =>
        f.id === editId
          ? { ...f, question: form.question, answer: form.answer }
          : f
      );
      setFaqs(updated);
      setEditId(null);
    } else {
      const newFaq = {
        id: Date.now(),
        question: form.question,
        questionEn: form.question,
        questionDe: form.question,
        answer: form.answer,
        answerEn: form.answer,
        answerDe: form.answer,
        helpfulVotes: 0,
        notHelpfulVotes: 0,
        userVote: null,
      };
      const updated = [...faqs, newFaq];
      setFaqs(updated);
      if (onAddFAQ) onAddFAQ(newFaq);
    }
    setForm({ question: '', answer: '' });
    setShowForm(false);
    setErrors({});
  };

  const handleDelete = (id) => {
    setFaqs(faqs.filter((f) => f.id !== id));
    if (onDeleteFAQ) onDeleteFAQ(id);
  };

  const handleEdit = (faq) => {
    setEditId(faq.id);
    setForm({ question: getQuestion(faq), answer: getAnswer(faq) });
    setShowForm(true);
  };

  const handleVote = (id, type) => {
    setFaqs(
      faqs.map((f) => {
        if (f.id !== id) return f;
        if (f.userVote === type) {
          return {
            ...f,
            helpfulVotes: type === 'helpful' ? f.helpfulVotes - 1 : f.helpfulVotes,
            notHelpfulVotes: type === 'notHelpful' ? f.notHelpfulVotes - 1 : f.notHelpfulVotes,
            userVote: null,
          };
        }
        return {
          ...f,
          helpfulVotes:
            type === 'helpful'
              ? f.helpfulVotes + 1
              : f.userVote === 'helpful'
              ? f.helpfulVotes - 1
              : f.helpfulVotes,
          notHelpfulVotes:
            type === 'notHelpful'
              ? f.notHelpfulVotes + 1
              : f.userVote === 'notHelpful'
              ? f.notHelpfulVotes - 1
              : f.notHelpfulVotes,
          userVote: type,
        };
      })
    );
    if (onVote) onVote(id, type);
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">❓</span>
          <h2 className="text-lg font-bold text-gray-800">{t.title}</h2>
          {faqs.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {fmt(faqs.length)} {t.faqCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRTL && (
            <button
              onClick={() => setArabicNumerals(!arabicNumerals)}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5"
            >
              {arabicNumerals ? '123' : '١٢٣'}
            </button>
          )}
          {isOwner && !showForm && (
            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm({ question: '', answer: '' }); setErrors({}); }}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>+</span> {t.addQuestion}
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && isOwner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.question}</label>
            <textarea
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder={t.questionPlaceholder}
              rows={2}
              maxLength={200}
              className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.question ? 'border-red-400' : 'border-gray-300'}`}
            />
            <div className="flex justify-between mt-1">
              {errors.question && <p className="text-red-500 text-xs">{errors.question}</p>}
              <p className="text-gray-400 text-xs ms-auto">{fmt(form.question.length)}/200 {t.characters}</p>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.answer}</label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              placeholder={t.answerPlaceholder}
              rows={3}
              maxLength={500}
              className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.answer ? 'border-red-400' : 'border-gray-300'}`}
            />
            <div className="flex justify-between mt-1">
              {errors.answer && <p className="text-red-500 text-xs">{errors.answer}</p>}
              <p className="text-gray-400 text-xs ms-auto">{fmt(form.answer.length)}/500 {t.characters}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition-colors">
              {t.save}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setErrors({}); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-1.5 rounded-lg text-sm transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* FAQ List */}
      {faqs.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">🤔</div>
          <p className="font-semibold">{t.noFAQ}</p>
          {isOwner && <p className="text-sm mt-1">{t.addFirst}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.id} className="group border border-gray-100 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer px-4 py-3 bg-gray-50 hover:bg-amber-50 transition-colors list-none">
                <span className="font-semibold text-gray-800 text-sm flex-1">{getQuestion(faq)}</span>
                <div className="flex items-center gap-2 ms-2">
                  {isOwner && (
                    <>
                      <button
                        onClick={(e) => { e.preventDefault(); handleEdit(faq); }}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDelete(faq.id); }}
                        className="text-xs text-red-400 hover:text-red-600 font-medium"
                      >
                        {t.delete}
                      </button>
                    </>
                  )}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">▼</span>
                </div>
              </summary>
              <div className="px-4 py-3 bg-white">
                <p className="text-gray-700 text-sm leading-relaxed">{getAnswer(faq)}</p>
                {/* Voting */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleVote(faq.id, 'helpful')}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${faq.userVote === 'helpful' ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                  >
                    👍 {t.helpful} ({fmt(faq.helpfulVotes)})
                  </button>
                  <button
                    onClick={() => handleVote(faq.id, 'notHelpful')}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${faq.userVote === 'notHelpful' ? 'bg-red-100 text-red-700 font-bold' : 'text-gray-400 hover:bg-red-50 hover:text-red-600'}`}
                  >
                    👎 {t.notHelpful} ({fmt(faq.notHelpfulVotes)})
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
