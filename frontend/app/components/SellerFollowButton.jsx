"use client";
import { useState } from "react";

/**
 * SellerFollowButton
 * Follow / unfollow a seller with animated feedback.
 *
 * Props:
 *  sellerId          string   – seller's MongoDB _id (for API calls)
 *  initialFollowing  bool     – whether the current user already follows
 *  followerCount     number   – total followers count
 *  lang              string   – "ar" | "en" | "de"  (default "ar")
 *  onToggle          func(newState: bool) – callback after toggle
 *  compact           bool     – icon-only mode (default false)
 */

const LABELS = {
  ar: { follow: "تابع البائع", following: "متابَع", followers: "متابع", followers_pl: "متابعون" },
  en: { follow: "Follow Seller", following: "Following", followers: "follower", followers_pl: "followers" },
  de: { follow: "Verkäufer folgen", following: "Wird verfolgt", followers: "Follower", followers_pl: "Follower" },
};

function toArabicIndic(n, lang) {
  if (lang !== "ar") return n.toLocaleString();
  return n.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function formatCount(count, lang) {
  const L = LABELS[lang] || LABELS.ar;
  const display = toArabicIndic(count, lang);
  if (lang === "ar") return display + ' ' + (count === 1 ? L.followers : L.followers_pl);
  return display + ' ' + (count === 1 ? L.followers : L.followers_pl);
}

export default function SellerFollowButton({
  sellerId,
  initialFollowing = false,
  followerCount = 0,
  lang = "ar",
  onToggle,
  compact = false,
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(followerCount);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);

  const isRTL = lang === "ar";
  const L = LABELS[lang] || LABELS.ar;

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    const newState = !following;

    // Optimistic UI
    setFollowing(newState);
    setCount((c) => (newState ? c + 1 : Math.max(0, c - 1)));
    setPulse(true);
    setTimeout(() => setPulse(false), 600);

    try {
      const res = await fetch('/api/sellers/' + sellerId + '/follow', {
        method: newState ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (data.followerCount !== undefined) setCount(data.followerCount);
      if (onToggle) onToggle(newState);
    } catch {
      // Rollback on error
      setFollowing(!newState);
      setCount((c) => (!newState ? c + 1 : Math.max(0, c - 1)));
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-label={following ? L.following : L.follow}
        title={following ? L.following : L.follow}
        className={[
          "relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1",
          following
            ? "border-emerald-500 bg-emerald-50 text-emerald-600 focus:ring-emerald-400"
            : "border-gray-300 bg-white text-gray-500 hover:border-emerald-400 hover:text-emerald-500 focus:ring-emerald-300",
          loading ? "opacity-60 cursor-wait" : "cursor-pointer",
          pulse ? "scale-110" : "scale-100",
        ].join(" ")}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <BellIcon filled={following} />
        )}
        {following && (
          <span className="absolute -top-1 -end-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
        )}
      </button>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="inline-flex flex-col items-center gap-1 font-[Cairo,Tajawal,sans-serif]"
    >
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={following}
        className={[
          "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none",
          following
            ? "bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-400"
            : "bg-white border-gray-300 text-gray-700 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-300",
          loading ? "opacity-60 cursor-wait" : "cursor-pointer",
          pulse ? "scale-105" : "scale-100",
        ].join(" ")}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <BellIcon filled={following} />
        )}
        <span>{following ? L.following : L.follow}</span>
        {following && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </button>

      {/* Follower count */}
      <span className="text-xs text-gray-500">
        {formatCount(count, lang)}
      </span>
    </div>
  );
}

function BellIcon({ filled }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}
