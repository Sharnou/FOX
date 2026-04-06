/**
 * WishlistCollectionManager.jsx
 * XTOX Arab Marketplace - Wishlist Collections
 * Organize saved/favorite ads into named collections (like Pinterest boards).
 * Supports AR/EN/DE with full RTL layout.
 * Run 166
 */

"use client";
import { useState, useEffect, useCallback } from "react";

// ─── Translations ─────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  ar: {
    title: "مجموعاتي المفضلة",
    subtitle: "نظّم إعلاناتك المحفوظة في مجموعات",
    newCollection: "مجموعة جديدة",
    collectionName: "اسم المجموعة",
    collectionNamePlaceholder: "مثل: سيارات، إلكترونيات...",
    create: "إنشاء",
    cancel: "إلغاء",
    save: "حفظ",
    delete: "حذف",
    rename: "إعادة تسمية",
    addAd: "إضافة إعلان",
    noCollections: "لا توجد مجموعات بعد",
    noCollectionsDesc: "أنشئ مجموعتك الأولى لتنظيم إعلاناتك المفضلة",
    noAds: "لا توجد إعلانات في هذه المجموعة",
    ads: "إعلان",
    confirmDelete: "هل أنت متأكد من حذف هذه المجموعة؟",
    yes: "نعم",
    no: "لا",
    all: "الكل",
    items: "عناصر",
    created: "تم الإنشاء",
    editName: "تعديل الاسم",
    moveAd: "نقل الإعلان إلى",
    removeFromCollection: "إزالة من المجموعة",
    searchCollections: "ابحث في المجموعات",
    private: "خاص",
    shared: "مشترك",
    shareCollection: "مشاركة المجموعة",
    collectionCreated: "تم إنشاء المجموعة",
    sortBy: "ترتيب حسب",
    sortNewest: "الأحدث",
    sortOldest: "الأقدم",
    sortName: "الاسم",
    emptyIcon: "📂",
    defaultCollections: ["المفضلة", "قيد الدراسة", "تم الشراء"],
  },
  en: {
    title: "My Wishlists",
    subtitle: "Organize your saved ads into collections",
    newCollection: "New Collection",
    collectionName: "Collection Name",
    collectionNamePlaceholder: "e.g. Cars, Electronics...",
    create: "Create",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    rename: "Rename",
    addAd: "Add Ad",
    noCollections: "No collections yet",
    noCollectionsDesc: "Create your first collection to organize your favorites",
    noAds: "No ads in this collection",
    ads: "ads",
    confirmDelete: "Delete this collection?",
    yes: "Yes",
    no: "No",
    all: "All",
    items: "items",
    created: "Created",
    editName: "Edit Name",
    moveAd: "Move ad to",
    removeFromCollection: "Remove from collection",
    searchCollections: "Search collections",
    private: "Private",
    shared: "Shared",
    shareCollection: "Share Collection",
    collectionCreated: "Collection created",
    sortBy: "Sort by",
    sortNewest: "Newest",
    sortOldest: "Oldest",
    sortName: "Name",
    emptyIcon: "📂",
    defaultCollections: ["Favorites", "Considering", "Purchased"],
  },
  de: {
    title: "Meine Merklisten",
    subtitle: "Organisiere deine gespeicherten Anzeigen in Sammlungen",
    newCollection: "Neue Sammlung",
    collectionName: "Sammlungsname",
    collectionNamePlaceholder: "z.B. Autos, Elektronik...",
    create: "Erstellen",
    cancel: "Abbrechen",
    save: "Speichern",
    delete: "Löschen",
    rename: "Umbenennen",
    addAd: "Anzeige hinzufügen",
    noCollections: "Noch keine Sammlungen",
    noCollectionsDesc: "Erstelle deine erste Sammlung für deine Favoriten",
    noAds: "Keine Anzeigen in dieser Sammlung",
    ads: "Anzeigen",
    confirmDelete: "Sammlung wirklich löschen?",
    yes: "Ja",
    no: "Nein",
    all: "Alle",
    items: "Elemente",
    created: "Erstellt",
    editName: "Name bearbeiten",
    moveAd: "Anzeige verschieben nach",
    removeFromCollection: "Aus Sammlung entfernen",
    searchCollections: "Sammlungen suchen",
    private: "Privat",
    shared: "Geteilt",
    shareCollection: "Sammlung teilen",
    collectionCreated: "Sammlung erstellt",
    sortBy: "Sortieren nach",
    sortNewest: "Neueste",
    sortOldest: "Älteste",
    sortName: "Name",
    emptyIcon: "📂",
    defaultCollections: ["Favoriten", "In Betracht", "Gekauft"],
  },
};

// ─── Color Palette for Collections ───────────────────────────────────────────
const COLLECTION_COLORS = [
  { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-700", dot: "bg-rose-400" },
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-700", dot: "bg-blue-400" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-700", dot: "bg-emerald-400" },
  { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-700", dot: "bg-amber-400" },
  { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-700", dot: "bg-purple-400" },
  { bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-700", dot: "bg-teal-400" },
];

// ─── Mock Ad Data ─────────────────────────────────────────────────────────────
const MOCK_ADS = [
  { id: "1", title: { ar: "آيفون 15 برو ماكس", en: "iPhone 15 Pro Max", de: "iPhone 15 Pro Max" }, price: "4,500 ر.س", image: "📱", city: { ar: "الرياض", en: "Riyadh", de: "Riad" } },
  { id: "2", title: { ar: "تويوتا كامري 2023", en: "Toyota Camry 2023", de: "Toyota Camry 2023" }, price: "89,000 ر.س", image: "🚗", city: { ar: "جدة", en: "Jeddah", de: "Dschidda" } },
  { id: "3", title: { ar: "شقة للإيجار - 3 غرف", en: "Apartment for Rent - 3 BR", de: "Wohnung zur Miete - 3 Zimmer" }, price: "2,200 ر.س/شهر", image: "🏠", city: { ar: "الدمام", en: "Dammam", de: "Dammam" } },
  { id: "4", title: { ar: "لابتوب ماك بوك برو", en: "MacBook Pro Laptop", de: "MacBook Pro Laptop" }, price: "6,800 ر.س", image: "💻", city: { ar: "أبوظبي", en: "Abu Dhabi", de: "Abu Dhabi" } },
  { id: "5", title: { ar: "كاميرا سوني a7 IV", en: "Sony a7 IV Camera", de: "Sony a7 IV Kamera" }, price: "12,500 ر.س", image: "📷", city: { ar: "دبي", en: "Dubai", de: "Dubai" } },
];

// ─── Utility: generate unique id ─────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-full shadow-xl flex items-center gap-2 animate-bounce">
      <span>✅</span>
      <span>{message}</span>
    </div>
  );
}

function ConfirmDialog({ message, onYes, onNo, t }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center">
        <p className="text-gray-800 font-semibold mb-5 text-base leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onYes}
            className="px-6 py-2 bg-red-500 text-white rounded-full font-bold text-sm hover:bg-red-600 transition-colors"
          >
            {t.yes}
          </button>
          <button
            onClick={onNo}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            {t.no}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdCard({ ad, lang, collectionId, collections, onRemove, onMove }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  return (
    <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image area */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 h-24 flex items-center justify-center text-4xl">
        {ad.image}
      </div>
      {/* Content */}
      <div className="p-3">
        <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">{ad.title[lang]}</p>
        <p className="text-xs text-emerald-600 font-bold mt-1">{ad.price}</p>
        <p className="text-xs text-gray-400 mt-0.5">📍 {ad.city[lang]}</p>
      </div>
      {/* Actions overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      {/* Remove btn */}
      <button
        onClick={() => onRemove(ad.id, collectionId)}
        className="absolute top-2 end-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
        title="Remove"
      >
        ×
      </button>
      {/* Move btn */}
      <button
        onClick={() => setShowMoveMenu((p) => !p)}
        className="absolute top-2 start-2 w-6 h-6 bg-white border border-gray-200 text-gray-600 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
        title="Move"
      >
        ⇄
      </button>
      {showMoveMenu && (
        <div className="absolute top-8 start-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-36 py-1 text-xs">
          {collections.filter((c) => c.id !== collectionId).map((c) => (
            <button
              key={c.id}
              onClick={() => { onMove(ad.id, collectionId, c.id); setShowMoveMenu(false); }}
              className="block w-full text-start px-3 py-2 hover:bg-gray-50 text-gray-700"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionCard({ collection, isActive, onClick, colorScheme, t }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-start rounded-2xl border-2 p-4 transition-all duration-200 ${
        isActive
          ? `${colorScheme.bg} ${colorScheme.border} shadow-md scale-[1.02]`
          : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${colorScheme.bg} ${colorScheme.border} border flex items-center justify-center text-xl flex-shrink-0`}>
          {collection.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-sm truncate ${isActive ? colorScheme.text : "text-gray-800"}`}>
            {collection.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {collection.ads.length} {t.ads}
          </p>
        </div>
        {collection.shared && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${colorScheme.bg} ${colorScheme.text} font-medium flex-shrink-0`}>
            🔗
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WishlistCollectionManager({ lang = "ar", userId = "user_demo" }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  // State
  const [collections, setCollections] = useState(() => {
    const stored = typeof window !== "undefined"
      ? localStorage.getItem(`xtox_wishlists_${userId}`)
      : null;
    if (stored) return JSON.parse(stored);
    // Default collections
    return [
      {
        id: uid(), name: t.defaultCollections[0], icon: "❤️",
        colorIndex: 0, shared: false, createdAt: Date.now(),
        ads: [MOCK_ADS[0], MOCK_ADS[1]],
      },
      {
        id: uid(), name: t.defaultCollections[1], icon: "🤔",
        colorIndex: 1, shared: false, createdAt: Date.now() - 86400000,
        ads: [MOCK_ADS[2], MOCK_ADS[3]],
      },
      {
        id: uid(), name: t.defaultCollections[2], icon: "✅",
        colorIndex: 2, shared: false, createdAt: Date.now() - 172800000,
        ads: [MOCK_ADS[4]],
      },
    ];
  });

  const [activeId, setActiveId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [toast, setToast] = useState(null);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`xtox_wishlists_${userId}`, JSON.stringify(collections));
    }
  }, [collections, userId]);

  // Derived: active collection
  const activeCollection = collections.find((c) => c.id === activeId) || null;

  // Derived: filtered + sorted collections
  const filteredCollections = collections
    .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "oldest") return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt; // newest
    });

  const showToast = useCallback((msg) => setToast(msg), []);

  // Create collection
  const handleCreate = () => {
    if (!newName.trim()) return;
    const newCol = {
      id: uid(),
      name: newName.trim(),
      icon: "📌",
      colorIndex: collections.length % COLLECTION_COLORS.length,
      shared: false,
      createdAt: Date.now(),
      ads: [],
    };
    setCollections((prev) => [newCol, ...prev]);
    setNewName("");
    setShowNewForm(false);
    setActiveId(newCol.id);
    showToast(t.collectionCreated);
  };

  // Delete collection
  const handleDelete = (id) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
    setConfirmDeleteId(null);
  };

  // Rename collection
  const handleRename = (id) => {
    if (!editName.trim()) return;
    setCollections((prev) =>
      prev.map((c) => c.id === id ? { ...c, name: editName.trim() } : c)
    );
    setEditingId(null);
    setEditName("");
  };

  // Remove ad from collection
  const handleRemoveAd = (adId, collectionId) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, ads: c.ads.filter((a) => a.id !== adId) } : c
      )
    );
  };

  // Move ad between collections
  const handleMoveAd = (adId, fromId, toId) => {
    const fromCol = collections.find((c) => c.id === fromId);
    const ad = fromCol?.ads.find((a) => a.id === adId);
    if (!ad) return;
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id === fromId) return { ...c, ads: c.ads.filter((a) => a.id !== adId) };
        if (c.id === toId) return { ...c, ads: [ad, ...c.ads] };
        return c;
      })
    );
  };

  // Toggle shared
  const handleToggleShared = (id) => {
    setCollections((prev) =>
      prev.map((c) => c.id === id ? { ...c, shared: !c.shared } : c)
    );
  };

  return (
    <div
      dir={dir}
      style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
      className="bg-gray-50 min-h-screen"
    >
      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Confirm Dialog */}
      {confirmDeleteId && (
        <ConfirmDialog
          message={t.confirmDelete}
          t={t}
          onYes={() => handleDelete(confirmDeleteId)}
          onNo={() => setConfirmDeleteId(null)}
        />
      )}

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* ─── Left Panel: Collections List ─────────────────────────── */}
          <div className="lg:w-72 flex-shrink-0 space-y-3">
            {/* Search + Sort Bar */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchCollections}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-2 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                <option value="newest">{t.sortNewest}</option>
                <option value="oldest">{t.sortOldest}</option>
                <option value="name">{t.sortName}</option>
              </select>
            </div>

            {/* New Collection Button */}
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl py-3 text-sm transition-colors shadow-md shadow-emerald-200"
              >
                <span className="text-lg">+</span>
                {t.newCollection}
              </button>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-emerald-300 p-4 shadow-md">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  {t.collectionName}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder={t.collectionNamePlaceholder}
                  autoFocus
                  maxLength={40}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="flex-1 bg-emerald-500 disabled:opacity-40 text-white rounded-xl py-2 text-sm font-bold hover:bg-emerald-600 transition-colors"
                  >
                    {t.create}
                  </button>
                  <button
                    onClick={() => { setShowNewForm(false); setNewName(""); }}
                    className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-bold hover:bg-gray-200 transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}

            {/* Collections */}
            {filteredCollections.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">{t.emptyIcon}</p>
                <p className="font-bold text-gray-500 text-sm">{t.noCollections}</p>
                <p className="text-xs mt-1">{t.noCollectionsDesc}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCollections.map((col) => {
                  const colorScheme = COLLECTION_COLORS[col.colorIndex % COLLECTION_COLORS.length];
                  return (
                    <div key={col.id} className="relative group/col">
                      <CollectionCard
                        collection={col}
                        isActive={activeId === col.id}
                        onClick={() => setActiveId(activeId === col.id ? null : col.id)}
                        colorScheme={colorScheme}
                        t={t}
                      />
                      {/* Quick action buttons */}
                      <div className={`absolute top-2 end-2 gap-1 hidden group-hover/col:flex`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingId(col.id); setEditName(col.name); }}
                          className="w-6 h-6 bg-white border border-gray-200 rounded-full text-xs flex items-center justify-center hover:bg-gray-50 shadow-sm"
                          title={t.rename}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(col.id); }}
                          className="w-6 h-6 bg-white border border-gray-200 rounded-full text-xs flex items-center justify-center hover:bg-red-50 hover:border-red-200 shadow-sm"
                          title={t.delete}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats summary */}
            {collections.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mt-4">
                <div className="flex justify-between text-center">
                  <div>
                    <p className="text-xl font-black text-emerald-600">{collections.length}</p>
                    <p className="text-xs text-gray-400">{t.all}</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-blue-600">
                      {collections.reduce((acc, c) => acc + c.ads.length, 0)}
                    </p>
                    <p className="text-xs text-gray-400">{t.items}</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-purple-600">
                      {collections.filter((c) => c.shared).length}
                    </p>
                    <p className="text-xs text-gray-400">{t.shared}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Right Panel: Collection Detail ───────────────────────── */}
          <div className="flex-1 min-w-0">
            {!activeCollection ? (
              <div className="h-full flex items-center justify-center py-20">
                <div className="text-center text-gray-400">
                  <p className="text-6xl mb-4">👈</p>
                  <p className="font-bold text-gray-500">{t.noCollections}</p>
                  <p className="text-sm mt-1">{t.noCollectionsDesc}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Collection header */}
                <div className={`bg-white rounded-2xl border-2 p-5 mb-4 ${
                  COLLECTION_COLORS[activeCollection.colorIndex % COLLECTION_COLORS.length].border
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl">{activeCollection.icon}</span>
                      <div className="min-w-0">
                        {editingId === activeCollection.id ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleRename(activeCollection.id); }}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-0"
                              autoFocus
                              maxLength={40}
                            />
                            <button
                              onClick={() => handleRename(activeCollection.id)}
                              className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600"
                            >
                              {t.save}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200"
                            >
                              {t.cancel}
                            </button>
                          </div>
                        ) : (
                          <h2 className="text-xl font-black text-gray-900 truncate">{activeCollection.name}</h2>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {activeCollection.ads.length} {t.ads} •{" "}
                          {new Date(activeCollection.createdAt).toLocaleDateString(
                            lang === "ar" ? "ar-SA" : lang === "de" ? "de-DE" : "en-US"
                          )}
                        </p>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleShared(activeCollection.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                          activeCollection.shared
                            ? "bg-blue-100 border-blue-300 text-blue-700"
                            : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {activeCollection.shared ? "🔗" : "🔒"}
                        {activeCollection.shared ? t.shared : t.private}
                      </button>
                      <button
                        onClick={() => { setEditingId(activeCollection.id); setEditName(activeCollection.name); }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold border border-gray-200 hover:bg-gray-200 transition-colors"
                      >
                        ✏️ {t.rename}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(activeCollection.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-500 rounded-full text-xs font-bold border border-red-200 hover:bg-red-100 transition-colors"
                      >
                        🗑️ {t.delete}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ads Grid */}
                {activeCollection.ads.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
                    <p className="text-5xl mb-4">📋</p>
                    <p className="font-bold text-gray-500 text-sm">{t.noAds}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {activeCollection.ads.map((ad) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        lang={lang}
                        collectionId={activeCollection.id}
                        collections={collections}
                        onRemove={handleRemoveAd}
                        onMove={handleMoveAd}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
