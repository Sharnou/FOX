/**
 * ReferralProgramWidget.jsx
 * XTOX Marketplace — Referral Program Widget
 *
 * Props:
 *  - userId   {string}  Used to deterministically seed the referral code
 *  - lang     {string}  "ar" | "en" | "de"  (default "ar")
 *  - className {string} Optional Tailwind classes for the outer wrapper
 */

import { useState, useCallback, useEffect, useMemo } from "react";

/* ─── Google Fonts ─────────────────────────────────────────────────────────── */
const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700&display=swap";

/* ─── Translations ─────────────────────────────────────────────────────────── */
const T = {
  ar: {
    title: "برنامج الإحالة",
    subtitle: "شارك كودك واربح مكافآت حصرية",
    tabCode: "كودي",
    tabRewards: "المكافآت",
    yourCode: "كود الإحالة الخاص بك",
    copy: "نسخ الكود",
    copied: "تم النسخ ✓",
    shareLink: "مشاركة الرابط",
    linkCopied: "تم نسخ الرابط ✓",
    referralsCount: (n) => `${toArabicIndic(n)} إحالة`,
    progressLabel: (n, max) =>
      `${toArabicIndic(n)} من ${toArabicIndic(max)} إحالات`,
    milestones: [
      { count: 1,  reward: "بوست مجاني",        icon: "🚀" },
      { count: 3,  reward: "مكافأة ٥٠ نقطة",    icon: "⭐" },
      { count: 5,  reward: "خصم ١٠٪",            icon: "🎁" },
      { count: 10, reward: "إعلان مميز مجاني",   icon: "👑" },
    ],
    unlocked: "مفتوح ✓",
    locked: "مقفل",
    dir: "rtl",
  },
  en: {
    title: "Referral Program",
    subtitle: "Share your code and earn exclusive rewards",
    tabCode: "My Code",
    tabRewards: "Rewards",
    yourCode: "Your Referral Code",
    copy: "Copy Code",
    copied: "Copied ✓",
    shareLink: "Share Link",
    linkCopied: "Link Copied ✓",
    referralsCount: (n) => `${n} Referral${n !== 1 ? "s" : ""}`,
    progressLabel: (n, max) => `${n} / ${max} referrals`,
    milestones: [
      { count: 1,  reward: "Free Boost",         icon: "🚀" },
      { count: 3,  reward: "50 pt Bonus",         icon: "⭐" },
      { count: 5,  reward: "10% Discount",        icon: "🎁" },
      { count: 10, reward: "Free Featured Ad",    icon: "👑" },
    ],
    unlocked: "Unlocked ✓",
    locked: "Locked",
    dir: "ltr",
  },
  de: {
    title: "Empfehlungsprogramm",
    subtitle: "Code teilen und exklusive Prämien erhalten",
    tabCode: "Mein Code",
    tabRewards: "Prämien",
    yourCode: "Dein Empfehlungscode",
    copy: "Code kopieren",
    copied: "Kopiert ✓",
    shareLink: "Link teilen",
    linkCopied: "Link kopiert ✓",
    referralsCount: (n) => `${n} Empfehlung${n !== 1 ? "en" : ""}`,
    progressLabel: (n, max) => `${n} / ${max} Empfehlungen`,
    milestones: [
      { count: 1,  reward: "Gratis Boost",        icon: "🚀" },
      { count: 3,  reward: "50 Pkt. Bonus",        icon: "⭐" },
      { count: 5,  reward: "10% Rabatt",           icon: "🎁" },
      { count: 10, reward: "Gratis Featured-Ad",   icon: "👑" },
    ],
    unlocked: "Freigeschaltet ✓",
    locked: "Gesperrt",
    dir: "ltr",
  },
};

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

/** Convert Western digits → Arabic-Indic numerals (٠١٢…٩) */
function toArabicIndic(n) {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

/**
 * Deterministically derive a referral code from a userId string.
 * Uses a simple djb2-like hash so the code is stable across renders.
 * Output format: XTOX-{4-char hex}-{2-digit number}
 */
function generateReferralCode(userId = "guest") {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 33) ^ userId.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  const hex = hash.toString(16).toUpperCase().padStart(8, "0");
  const part1 = hex.slice(0, 4);
  const part2 = String(hash % 90 + 10); // 10-99
  return `XTOX-${part1}-${part2}`;
}

/** Build share URL */
function buildShareUrl(code) {
  return `https://xtox.market/join?ref=${code}`;
}

/** localStorage key for referral count */
function storageKey(userId) {
  return `xtox_referrals_${userId}`;
}

/** Read referral count from localStorage */
function readCount(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

/** Persist referral count */
function writeCount(userId, count) {
  try {
    localStorage.setItem(storageKey(userId), String(count));
  } catch {
    /* silently fail in SSR / restricted contexts */
  }
}

/* ─── Sub-components ────────────────────────────────────────────────────────── */

function MilestoneCard({ milestone, referralCount, t }) {
  const unlocked = referralCount >= milestone.count;
  const pct = Math.min(100, Math.round((referralCount / milestone.count) * 100));

  return (
    <div
      className={`
        relative rounded-2xl p-4 transition-all duration-500 border-2
        ${unlocked
          ? "border-emerald-400 bg-gradient-to-br from-emerald-900/40 to-violet-900/40 shadow-lg shadow-emerald-500/20"
          : "border-violet-800/40 bg-violet-950/30"
        }
      `}
    >
      {/* unlock badge */}
      {unlocked && (
        <span className="absolute top-2 end-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
          {t.unlocked}
        </span>
      )}

      <div className="flex items-center gap-3 mb-3">
        <span
          className={`
            text-3xl transition-all duration-500
            ${unlocked ? "scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "grayscale opacity-50"}
          `}
        >
          {milestone.icon}
        </span>
        <div>
          <p className="text-white font-bold text-sm leading-tight">{milestone.reward}</p>
          <p className="text-violet-300 text-xs mt-0.5">
            {t.referralsCount(milestone.count)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-violet-900/50 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            unlocked
              ? "bg-gradient-to-r from-emerald-400 to-emerald-300"
              : "bg-gradient-to-r from-violet-600 to-violet-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-violet-400 text-xs mt-1.5 text-end">
        {t.progressLabel(Math.min(referralCount, milestone.count), milestone.count)}
      </p>
    </div>
  );
}

/* ─── Main Widget ────────────────────────────────────────────────────────────── */

export default function ReferralProgramWidget({
  userId = "guest",
  lang: initialLang = "ar",
  className = "",
}) {
  /* ── State ── */
  const [lang, setLang] = useState(
    ["ar", "en", "de"].includes(initialLang) ? initialLang : "ar"
  );
  const [activeTab, setActiveTab] = useState("code"); // "code" | "rewards"
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);

  const t = T[lang];
  const code = useMemo(() => generateReferralCode(userId), [userId]);
  const shareUrl = buildShareUrl(code);

  /* ── Load count from localStorage on mount ── */
  useEffect(() => {
    setReferralCount(readCount(userId));
  }, [userId]);

  /* ── Inject Google Fonts once ── */
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.querySelector(`link[href="${FONT_LINK}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_LINK;
      document.head.appendChild(link);
    }
  }, []);

  /* ── Copy helpers ── */
  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* fallback */
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [code]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareUrl]);

  /* ── Dev helper: simulate a referral (increment count) ── */
  const handleSimulateReferral = useCallback(() => {
    setReferralCount((prev) => {
      const next = prev + 1;
      writeCount(userId, next);
      return next;
    });
  }, [userId]);

  /* ─────────────────────────────────────────────────────────────────────────── */
  return (
    <div
      dir={t.dir}
      lang={lang}
      className={`
        font-[Cairo,Tajawal,sans-serif]
        w-full max-w-md mx-auto
        rounded-3xl overflow-hidden
        shadow-2xl shadow-violet-900/50
        bg-gradient-to-br from-[#0d0b1e] via-[#110d2a] to-[#0b1120]
        border border-violet-800/30
        select-none
        ${className}
      `}
    >
      {/* ── Header ── */}
      <div className="relative bg-gradient-to-r from-violet-700 via-violet-600 to-emerald-600 px-6 py-5 overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-6 -start-6 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="absolute -bottom-8 -end-4 w-32 h-32 rounded-full bg-emerald-400/10 blur-2xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-white font-black text-xl leading-tight tracking-tight">
              {t.title}
            </h2>
            <p className="text-violet-100/80 text-xs mt-0.5 font-medium">
              {t.subtitle}
            </p>
          </div>

          {/* Language switcher */}
          <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-1 backdrop-blur-sm">
            {["ar", "en", "de"].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`
                  text-xs font-bold px-2 py-0.5 rounded-full transition-all duration-200
                  ${lang === l
                    ? "bg-white text-violet-700 shadow"
                    : "text-white/70 hover:text-white"
                  }
                `}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Referral count badge */}
        <div className="relative mt-3 inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-bold text-sm">
            {lang === "ar"
              ? t.referralsCount(referralCount)
              : t.referralsCount(referralCount)}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-violet-800/40 bg-violet-950/20">
        {[
          { key: "code",    label: t.tabCode },
          { key: "rewards", label: t.tabRewards },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`
              flex-1 py-3 text-sm font-bold transition-all duration-200
              ${activeTab === key
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-violet-950/40"
                : "text-violet-400 hover:text-violet-200"
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="p-5">
        {/* ── "My Code" tab ── */}
        {activeTab === "code" && (
          <div className="space-y-4">
            <p className="text-violet-300 text-xs font-semibold uppercase tracking-widest">
              {t.yourCode}
            </p>

            {/* Code display */}
            <div className="relative group bg-gradient-to-r from-violet-900/60 to-emerald-900/30 border border-violet-600/40 rounded-2xl px-6 py-4 flex items-center justify-center">
              <span className="text-3xl font-black tracking-widest text-white drop-shadow-[0_0_12px_rgba(167,139,250,0.6)]">
                {code}
              </span>
              {/* subtle glow ring on hover */}
              <div className="absolute inset-0 rounded-2xl ring-2 ring-violet-500/0 group-hover:ring-violet-500/40 transition-all duration-300" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={copyCode}
                className={`
                  flex-1 relative overflow-hidden rounded-xl py-3 font-bold text-sm
                  transition-all duration-300 active:scale-95
                  ${codeCopied
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                    : "bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/20"
                  }
                `}
              >
                {codeCopied ? t.copied : t.copy}
                {codeCopied && (
                  <span className="absolute inset-0 flex items-center justify-center animate-ping rounded-xl bg-emerald-400 opacity-20" />
                )}
              </button>

              <button
                onClick={copyLink}
                className={`
                  flex-1 relative overflow-hidden rounded-xl py-3 font-bold text-sm
                  transition-all duration-300 active:scale-95
                  ${linkCopied
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                    : "bg-gradient-to-r from-emerald-700 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-500 shadow-lg shadow-emerald-500/20"
                  }
                `}
              >
                {linkCopied ? t.linkCopied : t.shareLink}
                {linkCopied && (
                  <span className="absolute inset-0 flex items-center justify-center animate-ping rounded-xl bg-emerald-400 opacity-20" />
                )}
              </button>
            </div>

            {/* Share URL display */}
            <div className="bg-violet-950/40 border border-violet-800/30 rounded-xl px-4 py-2.5 flex items-center gap-2 overflow-hidden">
              <span className="text-emerald-400 flex-shrink-0 text-sm">🔗</span>
              <span className="text-violet-300 text-xs truncate font-mono">
                {shareUrl}
              </span>
            </div>

            {/* Dev: simulate referral */}
            <button
              onClick={handleSimulateReferral}
              className="w-full mt-1 py-2 text-xs text-violet-500 hover:text-violet-300 border border-violet-800/30 hover:border-violet-600/50 rounded-xl transition-all duration-200"
            >
              {lang === "ar"
                ? `محاكاة إحالة جديدة (${toArabicIndic(referralCount)})`
                : lang === "de"
                ? `Empfehlung simulieren (${referralCount})`
                : `Simulate referral (${referralCount})`}
            </button>
          </div>
        )}

        {/* ── "Rewards" tab ── */}
        {activeTab === "rewards" && (
          <div className="space-y-3">
            {t.milestones.map((m) => (
              <MilestoneCard
                key={m.count}
                milestone={m}
                referralCount={referralCount}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 pb-4 text-center">
        <p className="text-violet-600/60 text-[10px]">
          XTOX Market · {lang === "ar" ? "برنامج الإحالة" : lang === "de" ? "Empfehlungsprogramm" : "Referral Program"} v1.0
        </p>
      </div>
    </div>
  );
}
