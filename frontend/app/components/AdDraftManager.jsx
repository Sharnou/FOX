/**
 * AdDraftManager.jsx
 * XTOX Marketplace — Draft Ads Manager
 *
 * Tri-lingual (AR / EN / DE), RTL-aware, Tailwind only.
 * Props:
 *   drafts[]     – array of draft objects { id, title, category, price, currency, createdAt, updatedAt }
 *   lang         – "ar" | "en" | "de"  (default "ar")
 *   onResume     – (draftId) => void
 *   onDelete     – (draftId) => void
 *   onNewDraft   – () => void
 */

"use client";

import { useState, useEffect } from "react";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  ar: {
    title: "مسوداتي",
    newDraft: "مسودة جديدة",
    resume: "متابعة التعديل",
    delete: "حذف",
    confirmDelete: "هل أنت متأكد من حذف هذه المسودة؟",
    yes: "نعم، احذف",
    no: "إلغاء",
    emptyTitle: "لا توجد مسودات بعد",
    emptyMsg: "ابدأ إعلاناً جديداً واحفظه كمسودة لإيجاده هنا.",
    status: "مسودة",
    category: "الفئة",
    price: "السعر",
    age: (days) => 'منذ ' + (toArabicIndic(days)) + ' ' + (days === 1 ? "يوم" : "أيام"),
    draftCount: (n) => (toArabicIndic(n)) + ' ' + (n === 1 ? "مسودة" : "مسودات"),
  },
  en: {
    title: "My Drafts",
    newDraft: "New Draft",
    resume: "Resume Editing",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this draft?",
    yes: "Yes, delete",
    no: "Cancel",
    emptyTitle: "No drafts yet",
    emptyMsg: "Start a new ad and save it as a draft to find it here.",
    status: "Draft",
    category: "Category",
    price: "Price",
    age: (days) => (days) + ' ' + (days === 1 ? "day" : "days") + ' ago',
    draftCount: (n) => (n) + ' ' + (n === 1 ? "draft" : "drafts"),
  },
  de: {
    title: "Meine Entwürfe",
    newDraft: "Neuer Entwurf",
    resume: "Bearbeitung fortsetzen",
    delete: "Löschen",
    confirmDelete: "Möchten Sie diesen Entwurf wirklich löschen?",
    yes: "Ja, löschen",
    no: "Abbrechen",
    emptyTitle: "Noch keine Entwürfe",
    emptyMsg: "Starten Sie eine neue Anzeige und speichern Sie sie als Entwurf.",
    status: "Entwurf",
    category: "Kategorie",
    price: "Preis",
    age: (days) => 'vor ' + (days) + ' ' + (days === 1 ? "Tag" : "Tagen"),
    draftCount: (n) => (n) + ' ' + (n === 1 ? "Entwurf" : "Entwürfe"),
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
function toArabicIndic(num) {
  return String(num)
    .split("")
    .map((d) => (d >= "0" && d <= "9" ? ARABIC_INDIC[parseInt(d)] : d))
    .join("");
}

function daysSince(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function EmptyState({ t, onNewDraft }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      {/* Illustration */}
      <svg
        className="w-32 h-32 text-gray-200 mb-6"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="120" height="120" rx="16" fill="currentColor" />
        <path
          d="M36 34h48M36 50h48M36 66h30"
          stroke="#9CA3AF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="84" cy="82" r="16" fill="#E5E7EB" />
        <path
          d="M84 75v7l4 4"
          stroke="#6B7280"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h3 className="text-lg font-bold text-gray-700 mb-2">{t.emptyTitle}</h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6">{t.emptyMsg}</p>
      <button
        onClick={onNewDraft}
        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow transition-colors"
      >
        <span>+</span>
        {t.newDraft}
      </button>
    </div>
  );
}

function ConfirmModal({ t, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center">
        <div className="text-4xl mb-3">🗑️</div>
        <p className="text-gray-700 font-medium mb-6">{t.confirmDelete}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {t.yes}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {t.no}
          </button>
        </div>
      </div>
    </div>
  );
}

function DraftCard({ draft, t, lang, onResume, onDeleteRequest }) {
  const age = daysSince(draft.updatedAt || draft.createdAt);
  const isRtl = lang === "ar";

  return (
    <li
      className="animate-fade-in group flex flex-col sm:flex-row gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4"
    >
      {/* Left accent */}
      <div className="hidden sm:flex flex-col items-center justify-center">
        <span className="w-1.5 h-14 bg-amber-400 rounded-full opacity-80" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={'font-bold text-gray-800 text-base truncate ' + (isRtl ? "font-cairo" : "")}
          >
            {draft.title || "—"}
          </h3>
          <span className="flex-shrink-0 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {t.status}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>
            <span className="font-medium text-gray-600">{t.category}:</span>{" "}
            {draft.category || "—"}
          </span>
          {draft.price != null && (
            <span>
              <span className="font-medium text-gray-600">{t.price}:</span>{" "}
              {draft.price.toLocaleString()}{" "}
              {draft.currency || ""}
            </span>
          )}
          <span className="text-gray-400">{t.age(age)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex sm:flex-col gap-2 justify-end items-end">
        <button
          onClick={() => onResume(draft.id)}
          className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          {t.resume}
        </button>
        <button
          onClick={() => onDeleteRequest(draft.id)}
          className="text-xs bg-red-50 hover:bg-red-100 text-red-500 font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          {t.delete}
        </button>
      </div>
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdDraftManager({
  drafts = [],
  lang = "ar",
  onResume,
  onDelete,
  onNewDraft,
}) {
  const t = T[lang] || T.ar;
  const isRtl = lang === "ar";
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [visible, setVisible] = useState(false);

  // Mount animation trigger
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleDeleteRequest(id) {
    setPendingDeleteId(id);
  }

  function handleConfirmDelete() {
    if (pendingDeleteId) {
      onDelete?.(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }

  function handleCancelDelete() {
    setPendingDeleteId(null);
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={'min-h-[200px] transition-opacity duration-500 ' + (visible ? "opacity-100" : "opacity-0")}
      style={{ fontFamily: isRtl ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
          {drafts.length > 0 && (
            <span className="bg-amber-400 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
              {lang === "ar" ? toArabicIndic(drafts.length) : drafts.length}
            </span>
          )}
        </div>
        {drafts.length > 0 && (
          <button
            onClick={onNewDraft}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors"
          >
            <span aria-hidden="true">+</span>
            {t.newDraft}
          </button>
        )}
      </div>

      {/* Sub-header count */}
      {drafts.length > 0 && (
        <p className="text-xs text-gray-400 mb-4">{t.draftCount(drafts.length)}</p>
      )}

      {/* List or Empty */}
      {drafts.length === 0 ? (
        <EmptyState t={t} onNewDraft={onNewDraft} />
      ) : (
        <ul className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              t={t}
              lang={lang}
              onResume={onResume}
              onDeleteRequest={handleDeleteRequest}
            />
          ))}
        </ul>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeleteId && (
        <ConfirmModal
          t={t}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {/* Fade-in keyframes (injected once via style tag) */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease both;
        }
        li.animate-fade-in:nth-child(2)  { animation-delay: 0.05s; }
        li.animate-fade-in:nth-child(3)  { animation-delay: 0.10s; }
        li.animate-fade-in:nth-child(4)  { animation-delay: 0.15s; }
        li.animate-fade-in:nth-child(5)  { animation-delay: 0.20s; }
        li.animate-fade-in:nth-child(6)  { animation-delay: 0.25s; }
      `}</style>
    </div>
  );
}
