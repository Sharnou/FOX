// SellerCertificationWidget.jsx
// XTOX Arab Marketplace — Seller Professional Certification Display
// RTL-first layout with AR/EN/DE support and Hijri+Gregorian dates

import React, { useState } from "react";

// ─── Localization strings ────────────────────────────────────────────────────
const STRINGS = {
  ar: {
    title: "شهاداتي المهنية",
    addCert: "إضافة شهادة",
    cancel: "إلغاء",
    save: "حفظ",
    requestVerification: "طلب التحقق",
    verified: "موثّق",
    pending: "قيد الانتظار",
    expired: "منتهي الصلاحية",
    totalCerts: "إجمالي الشهادات",
    verifiedCount: "الموثّقة",
    pendingCount: "قيد الانتظار",
    issuedBy: "جهة الإصدار",
    issueDate: "تاريخ الإصدار",
    expiryDate: "تاريخ الانتهاء",
    uploadCert: "رفع صورة الشهادة",
    category: "التخصص",
    daysLeft: "يوم متبقٍّ",
    daysExpired: "يوم منذ الانتهاء",
    validity: "الصلاحية",
    hijri: "هجري",
    gregorian: "ميلادي",
    certName: "اسم الشهادة",
    selectCategory: "اختر التخصص",
    noExpiry: "بدون انتهاء",
  },
  en: {
    title: "My Professional Certifications",
    addCert: "Add Certification",
    cancel: "Cancel",
    save: "Save",
    requestVerification: "Request Verification",
    verified: "Verified",
    pending: "Pending",
    expired: "Expired",
    totalCerts: "Total Certs",
    verifiedCount: "Verified",
    pendingCount: "Pending",
    issuedBy: "Issuing Body",
    issueDate: "Issue Date",
    expiryDate: "Expiry Date",
    uploadCert: "Upload Certificate",
    category: "Category",
    daysLeft: "days left",
    daysExpired: "days ago",
    validity: "Validity",
    hijri: "Hijri",
    gregorian: "Gregorian",
    certName: "Certification Name",
    selectCategory: "Select Category",
    noExpiry: "No Expiry",
  },
  de: {
    title: "Meine Berufszertifikate",
    addCert: "Zertifikat hinzufügen",
    cancel: "Abbrechen",
    save: "Speichern",
    requestVerification: "Verifizierung beantragen",
    verified: "Verifiziert",
    pending: "Ausstehend",
    expired: "Abgelaufen",
    totalCerts: "Zertifikate gesamt",
    verifiedCount: "Verifiziert",
    pendingCount: "Ausstehend",
    issuedBy: "Ausstellende Stelle",
    issueDate: "Ausstellungsdatum",
    expiryDate: "Ablaufdatum",
    uploadCert: "Zertifikat hochladen",
    category: "Kategorie",
    daysLeft: "Tage verbleibend",
    daysExpired: "Tage vergangen",
    validity: "Gültigkeit",
    hijri: "Hijri",
    gregorian: "Gregorianisch",
    certName: "Zertifikatsname",
    selectCategory: "Kategorie wählen",
    noExpiry: "Kein Ablauf",
  },
};

// ─── Certification Categories ────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "auto_mechanic",
    icon: "🔧",
    label: { ar: "ميكانيكي سيارات", en: "Auto Mechanic", de: "KFZ-Mechaniker" },
  },
  {
    id: "electronics_tech",
    icon: "⚡",
    label: { ar: "تقني إلكترونيات", en: "Electronics Technician", de: "Elektroniktechniker" },
  },
  {
    id: "real_estate",
    icon: "🏠",
    label: { ar: "مثمّن عقاري", en: "Real Estate Appraiser", de: "Immobiliengutachter" },
  },
  {
    id: "jewelry",
    icon: "💎",
    label: { ar: "تاجر مجوهرات", en: "Jewelry Trader", de: "Schmuckhändler" },
  },
  {
    id: "furniture",
    icon: "🪑",
    label: { ar: "خبير أثاث", en: "Furniture Expert", de: "Möbelexperte" },
  },
  {
    id: "clothing",
    icon: "👗",
    label: { ar: "متخصص ملابس", en: "Clothing Specialist", de: "Bekleidungsspezialist" },
  },
  {
    id: "mobile_expert",
    icon: "📱",
    label: { ar: "خبير جوالات", en: "Mobile Expert", de: "Mobilfachmann" },
  },
  {
    id: "computer_specialist",
    icon: "💻",
    label: { ar: "متخصص حاسوب", en: "Computer Specialist", de: "Computerspezialist" },
  },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_CERTIFICATIONS = [
  {
    id: 1,
    categoryId: "auto_mechanic",
    name: { ar: "شهادة ميكانيكا السيارات المعتمدة", en: "Certified Auto Mechanics", de: "Zertifizierte KFZ-Mechanik" },
    issuingBody: { ar: "هيئة تقييس الخليج", en: "Gulf Standards Authority", de: "Golf-Normungsbehörde" },
    issueDateGreg: "2022-03-15",
    issueDateHijri: "١٤٤٣/٠٨/١٢",
    expiryDateGreg: "2025-03-15",
    expiryDateHijri: "١٤٤٦/٠٩/١٥",
    status: "verified",
  },
  {
    id: 2,
    categoryId: "electronics_tech",
    name: { ar: "تقني إلكترونيات معتمد", en: "Certified Electronics Technician", de: "Zertifizierter Elektroniktechniker" },
    issuingBody: { ar: "معهد الهندسة الكهربائية", en: "Institute of Electrical Engineering", de: "Institut für Elektrotechnik" },
    issueDateGreg: "2023-07-01",
    issueDateHijri: "١٤٤٤/١٢/١٢",
    expiryDateGreg: "2026-07-01",
    expiryDateHijri: "١٤٤٧/١٢/٠٦",
    status: "pending",
  },
  {
    id: 3,
    categoryId: "jewelry",
    name: { ar: "خبير تقييم المجوهرات", en: "Jewelry Evaluation Expert", de: "Schmuckbewertungsexperte" },
    issuingBody: { ar: "مجلس الذهب والمجوهرات", en: "World Gold & Jewellery Council", de: "Welt-Gold- und Schmuckrat" },
    issueDateGreg: "2020-01-10",
    issueDateHijri: "١٤٤١/٠٥/١٥",
    expiryDateGreg: "2023-01-10",
    expiryDateHijri: "١٤٤٤/٠٦/١٧",
    status: "expired",
  },
];

// ─── Helper: convert Western digits to Arabic-Indic ──────────────────────────
function toArabicIndic(str) {
  return String(str).replace(/[0-9]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) + 0x0630)
  );
}

// ─── Helper: compute days between two ISO date strings ───────────────────────
function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ─── Helper: get category object by id ───────────────────────────────────────
function getCategoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

// ─── StatusBadge sub-component ───────────────────────────────────────────────
function StatusBadge({ status, lang }) {
  const t = STRINGS[lang] || STRINGS.ar;
  const config = {
    verified: {
      icon: "✅",
      label: t.verified,
      classes: "bg-green-100 text-green-800 border border-green-300",
    },
    pending: {
      icon: "⏳",
      label: t.pending,
      classes: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    },
    expired: {
      icon: "❌",
      label: t.expired,
      classes: "bg-red-100 text-red-800 border border-red-300",
    },
  };
  const cfg = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

// ─── ValidityBar sub-component ───────────────────────────────────────────────
function ValidityBar({ cert, lang, arabicNumerals }) {
  const t = STRINGS[lang] || STRINGS.ar;
  const today = new Date().toISOString().split("T")[0];
  const totalDays = daysBetween(cert.issueDateGreg, cert.expiryDateGreg);
  const usedDays = daysBetween(cert.issueDateGreg, today);
  const daysLeft = daysBetween(today, cert.expiryDateGreg);
  const pct = Math.max(0, Math.min(100, ((totalDays - usedDays) / totalDays) * 100));

  const isExpired = daysLeft < 0;
  const barColor = isExpired
    ? "bg-red-400"
    : pct < 20
    ? "bg-orange-400"
    : pct < 50
    ? "bg-yellow-400"
    : "bg-green-400";

  const displayDays = arabicNumerals
    ? toArabicIndic(Math.abs(daysLeft))
    : Math.abs(daysLeft);

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
        <span>{t.validity}</span>
        <span>
          {displayDays} {isExpired ? t.daysExpired : t.daysLeft}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${isExpired ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── CertificationCard sub-component ─────────────────────────────────────────
function CertificationCard({ cert, lang, arabicNumerals, onRequestVerification }) {
  const t = STRINGS[lang] || STRINGS.ar;
  const cat = getCategoryById(cert.categoryId);
  const isRtl = lang === "ar";
  const certName = cert.name[lang] || cert.name.ar;
  const issuerName = cert.issuingBody[lang] || cert.issuingBody.ar;
  const showHijri = lang === "ar";

  // Format dates depending on numeral preference
  const fmtGreg = (d) =>
    arabicNumerals ? toArabicIndic(d) : d;
  const fmtHijri = (d) =>
    arabicNumerals ? d : d.replace(/[٠-٩]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x0630)
    );

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{cat.icon}</span>
          <div>
            <p className="text-xs text-gray-400 font-medium">{cat.label[lang] || cat.label.ar}</p>
            <p className="font-bold text-gray-800 text-sm leading-tight">{certName}</p>
          </div>
        </div>
        <StatusBadge status={cert.status} lang={lang} />
      </div>

      {/* Issuing Body */}
      <div className="text-xs text-gray-500">
        <span className="font-semibold text-gray-600">{t.issuedBy}: </span>
        {issuerName}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div>
          <p className="font-semibold text-gray-500">{t.issueDate}</p>
          {showHijri && (
            <p className="text-gray-700">{fmtHijri(cert.issueDateHijri)} {t.hijri}</p>
          )}
          <p className="text-gray-500">{fmtGreg(cert.issueDateGreg)} {!showHijri ? "" : t.gregorian}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-500">{t.expiryDate}</p>
          {showHijri && (
            <p className="text-gray-700">{fmtHijri(cert.expiryDateHijri)} {t.hijri}</p>
          )}
          <p className="text-gray-500">{fmtGreg(cert.expiryDateGreg)} {!showHijri ? "" : t.gregorian}</p>
        </div>
      </div>

      {/* Validity Progress Bar */}
      <ValidityBar cert={cert} lang={lang} arabicNumerals={arabicNumerals} />

      {/* Request Verification button for pending certs */}
      {cert.status === "pending" && (
        <button
          onClick={() => onRequestVerification && onRequestVerification(cert)}
          className="mt-1 w-full py-1.5 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold text-xs transition-colors"
        >
          {t.requestVerification}
        </button>
      )}
    </div>
  );
}

// ─── AddCertificationForm sub-component ──────────────────────────────────────
function AddCertificationForm({ lang, onSave, onCancel }) {
  const t = STRINGS[lang] || STRINGS.ar;
  const isRtl = lang === "ar";

  const [form, setForm] = useState({
    categoryId: "",
    certName: "",
    issuingBody: "",
    issueDate: "",
    expiryDate: "",
    file: null,
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(form);
  };

  const inputClass =
    "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <form
      dir={isRtl ? "rtl" : "ltr"}
      onSubmit={handleSubmit}
      className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col gap-3"
    >
      {/* Category Select */}
      <div>
        <label className={labelClass}>{t.category}</label>
        <select
          className={inputClass}
          value={form.categoryId}
          onChange={(e) => handleChange("categoryId", e.target.value)}
          required
        >
          <option value="">{t.selectCategory}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.label[lang] || cat.label.ar}
            </option>
          ))}
        </select>
      </div>

      {/* Certification Name */}
      <div>
        <label className={labelClass}>{t.certName}</label>
        <input
          type="text"
          className={inputClass}
          value={form.certName}
          onChange={(e) => handleChange("certName", e.target.value)}
          required
          placeholder={t.certName}
        />
      </div>

      {/* Issuing Body */}
      <div>
        <label className={labelClass}>{t.issuedBy}</label>
        <input
          type="text"
          className={inputClass}
          value={form.issuingBody}
          onChange={(e) => handleChange("issuingBody", e.target.value)}
          required
          placeholder={t.issuedBy}
        />
      </div>

      {/* Issue & Expiry Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t.issueDate}</label>
          <input
            type="date"
            className={inputClass}
            value={form.issueDate}
            onChange={(e) => handleChange("issueDate", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>{t.expiryDate}</label>
          <input
            type="date"
            className={inputClass}
            value={form.expiryDate}
            onChange={(e) => handleChange("expiryDate", e.target.value)}
          />
        </div>
      </div>

      {/* Certificate Upload (placeholder) */}
      <div>
        <label className={labelClass}>{t.uploadCert}</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-100 file:text-blue-700 file:font-semibold hover:file:bg-blue-200 cursor-pointer"
          onChange={(e) => handleChange("file", e.target.files[0])}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-100 transition-colors"
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          {t.save}
        </button>
      </div>
    </form>
  );
}

// ─── StatsRow sub-component ───────────────────────────────────────────────────
function StatsRow({ certifications, lang, arabicNumerals }) {
  const t = STRINGS[lang] || STRINGS.ar;
  const total = certifications.length;
  const verified = certifications.filter((c) => c.status === "verified").length;
  const pending = certifications.filter((c) => c.status === "pending").length;
  const fmt = (n) => (arabicNumerals ? toArabicIndic(n) : n);

  const stats = [
    { label: t.totalCerts, value: fmt(total), color: "text-blue-700", bg: "bg-blue-50" },
    { label: t.verifiedCount, value: fmt(verified), color: "text-green-700", bg: "bg-green-50" },
    { label: t.pendingCount, value: fmt(pending), color: "text-yellow-700", bg: "bg-yellow-50" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
          <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main SellerCertificationWidget ──────────────────────────────────────────
export default function SellerCertificationWidget({
  certifications: certificationsProp,
  lang: langProp = "ar",
  onAddCertification,
  onRequestVerification,
  className = "",
}) {
  // Language state — AR/EN/DE inline switcher
  const [lang, setLang] = useState(langProp);
  // Arabic-Indic numeral toggle
  const [arabicNumerals, setArabicNumerals] = useState(langProp === "ar");
  // Whether the "Add Certification" form is open
  const [showAddForm, setShowAddForm] = useState(false);
  // Local certifications list (starts with mock data or prop)
  const [certifications, setCertifications] = useState(
    certificationsProp || MOCK_CERTIFICATIONS
  );

  const t = STRINGS[lang] || STRINGS.ar;
  const isRtl = lang === "ar";

  // Handle adding a new certification from the inline form
  const handleAddCertification = (formData) => {
    const cat = getCategoryById(formData.categoryId);
    const newCert = {
      id: Date.now(),
      categoryId: formData.categoryId,
      name: { ar: formData.certName, en: formData.certName, de: formData.certName },
      issuingBody: {
        ar: formData.issuingBody,
        en: formData.issuingBody,
        de: formData.issuingBody,
      },
      issueDateGreg: formData.issueDate,
      issueDateHijri: "",
      expiryDateGreg: formData.expiryDate || "2099-12-31",
      expiryDateHijri: "",
      status: "pending",
    };
    setCertifications((prev) => [newCert, ...prev]);
    setShowAddForm(false);
    if (onAddCertification) onAddCertification(newCert, formData.file);
  };

  // Handle verification request
  const handleRequestVerification = (cert) => {
    if (onRequestVerification) onRequestVerification(cert);
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`font-[Cairo,Tajawal,sans-serif] max-w-xl mx-auto bg-gray-50 rounded-3xl p-5 flex flex-col gap-4 ${className}`}
    >
      {/* ── Header row ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-gray-800">{t.title}</h2>

        {/* Language switcher */}
        <div className="flex items-center gap-1">
          {["ar", "en", "de"].map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                if (l === "ar") setArabicNumerals(true);
                else setArabicNumerals(false);
              }}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors ${
                lang === l
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Numeral toggle ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setArabicNumerals((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition-colors ${
            arabicNumerals
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          <span>{arabicNumerals ? "١٢٣" : "123"}</span>
          <span className="opacity-60">↔</span>
          <span>{arabicNumerals ? "123" : "١٢٣"}</span>
        </button>
      </div>

      {/* ── Stats Row ── */}
      <StatsRow
        certifications={certifications}
        lang={lang}
        arabicNumerals={arabicNumerals}
      />

      {/* ── Certification Cards ── */}
      <div className="flex flex-col gap-3">
        {certifications.map((cert) => (
          <CertificationCard
            key={cert.id}
            cert={cert}
            lang={lang}
            arabicNumerals={arabicNumerals}
            onRequestVerification={handleRequestVerification}
          />
        ))}
      </div>

      {/* ── Add Certification toggle / form ── */}
      {showAddForm ? (
        <AddCertificationForm
          lang={lang}
          onSave={handleAddCertification}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2.5 rounded-2xl border-2 border-dashed border-blue-300 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">＋</span>
          <span>{t.addCert}</span>
        </button>
      )}
    </div>
  );
}
