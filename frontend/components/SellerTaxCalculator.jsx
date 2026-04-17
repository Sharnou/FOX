'use client';
import { useState, useCallback } from 'react';

// SellerTaxCalculator.jsx
// Arab marketplace seller tax & fee calculator
// Countries: Egypt (14%), Saudi Arabia (15%), UAE (5%), Jordan (16%),
//            Morocco (20%), Algeria (19%), Tunisia (19%), Kuwait (0%), Qatar (0%)
// Props: initialPrice, initialCountry, lang, className
// RTL-first, Arabic-Indic numerals, Tailwind only, Zero deps, ~300 lines

const COUNTRIES = {
  EG: { name: { ar: '\u0645\u0635\u0631', en: 'Egypt', de: '\u00c4gypten' }, vat: 14, currency: 'EGP', symbol: '\u062c.\u0645', flag: '\ud83c\uddea\ud83c\uddec', note: { ar: '\u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0661\u0664\u066a', en: 'VAT 14%', de: 'MwSt. 14%' } },
  SA: { name: { ar: '\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629', en: 'Saudi Arabia', de: 'Saudi-Arabien' }, vat: 15, currency: 'SAR', symbol: '\u0631.\u0633', flag: '\ud83c\uddf8\ud83c\udde6', note: { ar: '\u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0661\u0665\u066a', en: 'VAT 15%', de: 'MwSt. 15%' } },
  AE: { name: { ar: '\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a', en: 'UAE', de: 'VAE' }, vat: 5, currency: 'AED', symbol: '\u062f.\u0625', flag: '\ud83c\udde6\ud83c\uddea', note: { ar: '\u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0665\u066a', en: 'VAT 5%', de: 'MwSt. 5%' } },
  JO: { name: { ar: '\u0627\u0644\u0623\u0631\u062f\u0646', en: 'Jordan', de: 'Jordanien' }, vat: 16, currency: 'JOD', symbol: '\u062f.\u0623', flag: '\ud83c\uddef\ud83c\uddf4', note: { ar: '\u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0661\u0666\u066a', en: 'GST 16%', de: 'GST 16%' } },
  MA: { name: { ar: '\u0627\u0644\u0645\u063a\u0631\u0628', en: 'Morocco', de: 'Marokko' }, vat: 20, currency: 'MAD', symbol: '\u062f.\u0645', flag: '\ud83c\uddf2\ud83c\udde6', note: { ar: '\u0636\u0631\u064a\u0628\u0629 \u0639\u0644\u0649 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0662\u0660\u066a', en: 'TVA 20%', de: 'MwSt. 20%' } },
  DZ: { name: { ar: '\u0627\u0644\u062c\u0632\u0627\u0626\u0631', en: 'Algeria', de: 'Algerien' }, vat: 19, currency: 'DZD', symbol: '\u062f.\u062c', flag: '\ud83c\udde9\ud83c\uddff', note: { ar: '\u0627\u0644\u0631\u0633\u0645 \u0639\u0644\u0649 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0661\u0669\u066a', en: 'TVA 19%', de: 'MwSt. 19%' } },
  TN: { name: { ar: '\u062a\u0648\u0646\u0633', en: 'Tunisia', de: 'Tunesien' }, vat: 19, currency: 'TND', symbol: '\u062f.\u062a', flag: '\ud83c\uddf9\ud83c\uddf3', note: { ar: '\u0627\u0644\u0623\u062f\u0627\u0621 \u0639\u0644\u0649 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0661\u0669\u066a', en: 'TVA 19%', de: 'MwSt. 19%' } },
  KW: { name: { ar: '\u0627\u0644\u0643\u0648\u064a\u062a', en: 'Kuwait', de: 'Kuwait' }, vat: 0, currency: 'KWD', symbol: '\u062f.\u0643', flag: '\ud83c\uddf0\ud83c\uddfc', note: { ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0631\u064a\u0628\u0629 \u0642\u064a\u0645\u0629 \u0645\u0636\u0627\u0641\u0629', en: 'No VAT', de: 'Keine MwSt.' } },
  QA: { name: { ar: '\u0642\u0637\u0631', en: 'Qatar', de: 'Katar' }, vat: 0, currency: 'QAR', symbol: '\u0631.\u0642', flag: '\ud83c\uddf6\ud83c\udde6', note: { ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0631\u064a\u0628\u0629 \u0642\u064a\u0645\u0629 \u0645\u0636\u0627\u0641\u0629', en: 'No VAT', de: 'Keine MwSt.' } },
};

const PLATFORM_FEE_PCT = 2.5;
const HANDLING_FEE_PCT = 1.0;

const T = {
  title:         { ar: '\u062d\u0627\u0633\u0628\u0629 \u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u0631\u0633\u0648\u0645', en: 'Tax & Fee Calculator', de: 'Steuer- & Geb\u00fchrenrechner' },
  subtitle:      { ar: '\u0627\u062d\u0633\u0628 \u0635\u0627\u0641\u064a \u0623\u0631\u0628\u0627\u062d\u0643 \u0628\u0639\u062f \u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u0631\u0633\u0648\u0645', en: 'Calculate your net earnings after taxes & fees', de: 'Nettogewinn nach Steuern berechnen' },
  country:       { ar: '\u0627\u062e\u062a\u0631 \u0627\u0644\u062f\u0648\u0644\u0629', en: 'Select Country', de: 'Land w\u00e4hlen' },
  salePrice:     { ar: '\u0633\u0639\u0631 \u0627\u0644\u0628\u064a\u0639', en: 'Sale Price', de: 'Verkaufspreis' },
  currency:      { ar: '\u0627\u0644\u0639\u0645\u0644\u0629', en: 'Currency', de: 'W\u00e4hrung' },
  calculate:     { ar: '\u0627\u062d\u0633\u0628 \u0627\u0644\u0622\u0646', en: 'Calculate Now', de: 'Jetzt berechnen' },
  saleAmount:    { ar: '\u0645\u0628\u0644\u063a \u0627\u0644\u0628\u064a\u0639', en: 'Sale Amount', de: 'Verkaufsbetrag' },
  vatAmount:     { ar: '\u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629', en: 'VAT Amount', de: 'MwSt.-Betrag' },
  platformFee:   { ar: '\u0631\u0633\u0648\u0645 \u0627\u0644\u0645\u0646\u0635\u0629', en: 'Platform Fee', de: 'Plattformgeb\u00fchr' },
  handlingFee:   { ar: '\u0631\u0633\u0648\u0645 \u0627\u0644\u062a\u0634\u063a\u064a\u0644', en: 'Handling Fee', de: 'Bearbeitungsgeb\u00fchr' },
  totalDed:      { ar: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062e\u0635\u0648\u0645\u0627\u062a', en: 'Total Deductions', de: 'Gesamtabz\u00fcge' },
  netEarnings:   { ar: '\u0635\u0627\u0641\u064a \u0627\u0644\u0623\u0631\u0628\u0627\u062d', en: 'Net Earnings', de: 'Nettoverdienst' },
  profitMargin:  { ar: '\u0647\u0627\u0645\u0634 \u0627\u0644\u0631\u0628\u062d', en: 'Profit Margin', de: 'Gewinnmarge' },
  taxNote:       { ar: '\u0645\u0644\u0627\u062d\u0638\u0629: \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u062a\u0642\u062f\u064a\u0631\u064a\u0629', en: 'Note: Figures are estimates', de: 'Hinweis: Sch\u00e4tzwerte' },
  enterPrice:    { ar: '\u0623\u062f\u062e\u0644 \u0627\u0644\u0633\u0639\u0631', en: 'Enter price', de: 'Preis eingeben' },
  arabicNums:    { ar: '\u0623\u0631\u0642\u0627\u0645 \u0639\u0631\u0628\u064a\u0629', en: 'Arabic Numerals', de: 'Arab. Ziffern' },
  excellent:     { ar: '\u0645\u0645\u062a\u0627\u0632', en: 'Excellent', de: 'Ausgezeichnet' },
  good:          { ar: '\u062c\u064a\u062f', en: 'Good', de: 'Gut' },
  fair:          { ar: '\u0645\u0642\u0628\u0648\u0644', en: 'Fair', de: 'Akzeptabel' },
  poor:          { ar: '\u0636\u0639\u064a\u0641', en: 'Poor', de: 'Schwach' },
  noVat:         { ar: '\u0647\u0630\u0647 \u0627\u0644\u062f\u0648\u0644\u0629 \u0644\u0627 \u062a\u0637\u0628\u0642 \u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629', en: 'This country applies no VAT', de: 'Kein MwSt. in diesem Land' },
};

const ARABIC_INDIC = ['\u0660','\u0661','\u0662','\u0663','\u0664','\u0665','\u0666','\u0667','\u0668','\u0669'];
function toAI(n) { return String(n).replace(/\d/g, d => ARABIC_INDIC[d]); }
function fmt(val, dec = 2, ai = false) {
  const s = Number(val).toFixed(dec);
  return ai ? toAI(s) : s;
}

const CURRENCIES = ['EGP', 'SAR', 'AED', 'USD'];

export default function SellerTaxCalculator({
  initialPrice = '',
  initialCountry = 'EG',
  lang: propLang = 'ar',
  className = '',
}) {
  const [lang, setLang] = useState(propLang);
  const [price, setPrice] = useState(initialPrice);
  const [country, setCountry] = useState(initialCountry);
  const [currency, setCurrency] = useState(COUNTRIES[initialCountry]?.currency || 'EGP');
  const [useAI, setUseAI] = useState(propLang === 'ar');
  const [result, setResult] = useState(null);

  const isRTL = lang === 'ar';
  const t = key => T[key]?.[lang] || T[key]?.en || key;

  const handleCountry = code => {
    setCountry(code);
    setCurrency(COUNTRIES[code]?.currency || 'EGP');
    setResult(null);
  };

  const calculate = useCallback(() => {
    const p = parseFloat(price);
    if (!p || p <= 0) return;
    const cd = COUNTRIES[country];
    const vat = p * (cd.vat / 100);
    const pf  = p * (PLATFORM_FEE_PCT / 100);
    const hf  = p * (HANDLING_FEE_PCT / 100);
    const tot = vat + pf + hf;
    const net = p - tot;
    const pct = (net / p) * 100;
    let verdict, color;
    if (pct >= 85) { verdict = 'excellent'; color = 'text-green-600'; }
    else if (pct >= 75) { verdict = 'good'; color = 'text-blue-600'; }
    else if (pct >= 60) { verdict = 'fair'; color = 'text-yellow-600'; }
    else { verdict = 'poor'; color = 'text-red-600'; }
    setResult({ p, vat, pf, hf, tot, net, pct, verdict, color, cd });
  }, [price, country]);


  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden font-['Cairo','Tajawal',sans-serif] ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{t('title')}</h2>
            <p className="text-green-100 text-sm mt-0.5">{t('subtitle')}</p>
          </div>
          <span className="text-4xl">&#x1F9EE;</span>
        </div>
        <div className="flex gap-1 mt-3">
          {['ar','en','de'].map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                lang === l ? 'bg-white text-green-700' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {l === 'ar' ? '\u0639' : l === 'en' ? 'EN' : 'DE'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Country grid */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('country')}</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(COUNTRIES).map(([code, c]) => (
              <button
                key={code}
                onClick={() => handleCountry(code)}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-xl border text-sm font-medium transition-all ${
                  country === code
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <span>{c.flag}</span>
                <span className="truncate">{c.name[lang] || c.name.en}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Price + currency */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('salePrice')}</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={price}
              onChange={e => { setPrice(e.target.value); setResult(null); }}
              placeholder={t('enterPrice')}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-400"
              dir="ltr"
            />
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-3 bg-white font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Arabic numerals toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setUseAI(!useAI)}
            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
              useAI ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              useAI
                ? (isRTL ? 'right-0.5' : 'translate-x-5')
                : (isRTL ? 'right-5' : 'translate-x-0.5')
            }`} />
          </div>
          <span className="text-sm text-gray-600">{t('arabicNums')} (\u0661\u0662\u0663)</span>
        </label>

        {/* Calculate */}
        <button
          onClick={calculate}
          disabled={!price || parseFloat(price) <= 0}
          className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-lg transition-all"
        >
          {t('calculate')} &#x1F9EE;
        </button>

        {/* Results */}
        {result && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {result.cd.vat === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
                <span>&#x2139;&#xFE0F;</span>
                <span>{t('noVat')} &mdash; {result.cd.note[lang] || result.cd.note.en}</span>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-600">{t('saleAmount')}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 text-right">{fmt(result.p, 2, useAI)} {currency}</td>
                  </tr>
                  {result.cd.vat > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 text-red-600">{t('vatAmount')} ({fmt(result.cd.vat, 0, useAI)}%)</td>
                      <td className="px-4 py-3 font-bold text-red-600 text-right">- {fmt(result.vat, 2, useAI)} {currency}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-orange-600">{t('platformFee')} ({fmt(PLATFORM_FEE_PCT, 1, useAI)}%)</td>
                    <td className="px-4 py-3 font-bold text-orange-600 text-right">- {fmt(result.pf, 2, useAI)} {currency}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-orange-500">{t('handlingFee')} ({fmt(HANDLING_FEE_PCT, 1, useAI)}%)</td>
                    <td className="px-4 py-3 font-bold text-orange-500 text-right">- {fmt(result.hf, 2, useAI)} {currency}</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-red-50">
                    <td className="px-4 py-3 text-red-700 font-semibold">{t('totalDed')}</td>
                    <td className="px-4 py-3 font-bold text-red-700 text-right">- {fmt(result.tot, 2, useAI)} {currency}</td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="px-4 py-3 text-green-700 font-bold text-lg">{t('netEarnings')}</td>
                    <td className="px-4 py-3 font-extrabold text-green-700 text-right text-lg">{fmt(result.net, 2, useAI)} {currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4">
              <div>
                <p className="text-sm text-gray-500">{t('profitMargin')}</p>
                <p className={`text-2xl font-extrabold ${result.color}`}>
                  {fmt(result.pct, 1, useAI)}%
                </p>
              </div>
              <div className="text-center">
                <div className={`text-3xl ${result.color}`}>
                  {result.verdict === 'excellent' ? '\u2B50' : result.verdict === 'good' ? '\u2705' : result.verdict === 'fair' ? '\u26A0\uFE0F' : '\u274C'}
                </div>
                <p className={`text-sm font-bold ${result.color}`}>{t(result.verdict)}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span>&#x26A0;&#xFE0F;</span>
              <span>{t('taxNote')} &bull; {result.cd.note[lang] || result.cd.note.en}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
