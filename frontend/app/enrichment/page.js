'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export default function EnrichmentPage() {
  const [profile, setProfile] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  const getToken = () =>
    (typeof window !== 'undefined' &&
      (localStorage.getItem('xtox_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken'))) || '';

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoggedIn(false); setLoading(false); return; }
    Promise.all([
      fetch(`${API}/api/enrichment/profile`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/api/enrichment/insights`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([p, i]) => { setProfile(p); setInsights(i); setLoading(false); });
  }, []);

  const score = profile?.score ?? 0;
  const tier = profile?.tier || 'bronze';
  const tierAr = profile?.tierAr || 'برونزي';
  const emoji = profile?.emoji || '🥉';

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 text-right">
          <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-sm font-semibold mb-4">
            ✨ ميزة جديدة • New Feature
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
            إعلانات الإثراء
            <span className="block text-2xl md:text-3xl font-bold mt-2 text-white/90">
              Enrichment Ads — Smarter Targeting, Better Results
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-6">
            استهدف العملاء المناسبين بأقل تكلفة وأفضل عائد. نظامنا يحلّل بياناتك، يقيّم ملفك الشخصي،
            ويبني شرائح ذكية لإعلانات أكثر فعالية.
          </p>
          <p className="text-base text-white/80 max-w-3xl leading-relaxed mb-8">
            Reach the right audience with precision. Our enrichment engine evaluates your profile,
            builds smart segments, and powers ads that actually convert.
          </p>
          <Link href="/sell"
            className="inline-block bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all">
            🚀 ابدأ الآن — Start now
          </Link>
        </div>
      </section>

      {/* SCORE WIDGET */}
      <section className="max-w-6xl mx-auto px-6 -mt-10 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 border border-orange-100">
          {loading ? (
            <div className="animate-pulse py-8">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4 mx-auto"></div>
              <div className="h-20 bg-gray-200 rounded w-40 mb-4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : !loggedIn ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🔐</div>
              <p className="text-lg font-bold text-gray-700 mb-2">سجّل دخولك لعرض نقاط الإثراء</p>
              <p className="text-gray-500 mb-6 text-sm">Login to view your Enrichment Score and personalized segments</p>
              <a href="/login?redirect=/enrichment" className="inline-block bg-orange-500 text-white font-bold px-8 py-3 rounded-xl hover:bg-orange-600 transition-colors">
                🔑 تسجيل الدخول — Login
              </a>
              <div className="mt-4">
                <a href="/register" className="text-orange-500 text-sm hover:underline">أو أنشئ حساباً جديداً →</a>
              </div>
            </div>
          ) : profile ? (
            <div className="grid md:grid-cols-3 gap-6 items-center">
              <div className="text-center md:text-right">
                <div className="text-sm text-gray-500 font-semibold mb-1">نقاط الإثراء — Enrichment Score</div>
                <div className="text-6xl md:text-7xl font-black bg-gradient-to-br from-orange-500 to-amber-600 bg-clip-text text-transparent">
                  {score}<span className="text-3xl text-gray-400">/100</span>
                </div>
                <div className="text-xl font-bold mt-2">
                  {emoji} <span className="text-orange-600">{tierAr}</span>
                  <span className="text-sm text-gray-500 mr-2">({tier})</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-semibold text-gray-700 mb-2">شرائحك / Your Segments</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(profile.segments || []).slice(0, 8).map(s => (
                    <span key={s} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                  {(!profile.segments || profile.segments.length === 0) && (
                    <span className="text-gray-400 text-sm">لا توجد شرائح بعد — أكمل ملفك الشخصي</span>
                  )}
                </div>
                {(profile.recommendations || []).length > 0 && (
                  <>
                    <div className="text-sm font-semibold text-gray-700 mb-2">⚡ توصيات لرفع نقاطك</div>
                    <ul className="space-y-1">
                      {profile.recommendations.slice(0, 4).map(r => (
                        <li key={r.key} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-orange-500">→</span>
                          <span>{r.ar}</span>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold mr-auto">
                            +{r.boost}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-700 mb-4 text-lg">سجّل دخولك لرؤية ملفك الإثرائي</p>
              <Link href="/login" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl">
                تسجيل الدخول / Login
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 3 BENEFIT CARDS */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-3">
          لماذا إعلانات الإثراء؟
        </h2>
        <p className="text-center text-gray-600 mb-12">Three pillars of enriched advertising</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🎯',
              titleAr: 'استهداف دقيق',
              titleEn: 'Precise Targeting',
              descAr: 'وصول للجمهور الأنسب حسب الموقع، الاهتمامات، والديموغرافيا.',
              descEn: 'Reach the right audience by location, interests, and demographics.',
            },
            {
              icon: '📈',
              titleAr: 'تحويلات أعلى',
              titleEn: 'Higher Conversions',
              descAr: 'تحسين معدلات النقر والمبيعات بفضل الشرائح الذكية.',
              descEn: 'Boost click-through and sales rates via smart segmentation.',
            },
            {
              icon: '💰',
              titleAr: 'تكلفة أقل',
              titleEn: 'Lower Cost',
              descAr: 'دفع فقط مقابل من يهتمون فعلاً — لا هدر للميزانية.',
              descEn: 'Pay only for genuine interest — no wasted spend.',
            },
          ].map(c => (
            <div key={c.titleEn}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-orange-100 hover:-translate-y-1 transition-all">
              <div className="text-5xl mb-4">{c.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{c.titleAr}</h3>
              <h4 className="text-sm font-semibold text-orange-600 mb-3">{c.titleEn}</h4>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">{c.descAr}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{c.descEn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* INSIGHTS / STATS */}
      {insights && (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl p-8 border border-amber-200">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-right">
              📊 إحصائيات إعلاناتك / Your Ad Insights
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
                <div className="text-3xl font-black text-orange-600">{insights.totalAds || 0}</div>
                <div className="text-xs text-gray-600 mt-1">إعلانات / Ads</div>
              </div>
              <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
                <div className="text-3xl font-black text-amber-600">{insights.totalViews || 0}</div>
                <div className="text-xs text-gray-600 mt-1">مشاهدات / Views</div>
              </div>
              <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
                <div className="text-3xl font-black text-yellow-600">{insights.avgViews || 0}</div>
                <div className="text-xs text-gray-600 mt-1">متوسط / Avg</div>
              </div>
            </div>
            {(insights.tips || []).length > 0 && (
              <div className="bg-white/70 rounded-xl p-4">
                <h4 className="font-bold text-gray-800 mb-2 text-right">💡 نصائح / Tips</h4>
                <ul className="space-y-2">
                  {insights.tips.map((t, i) => (
                    <li key={i} className="text-sm text-gray-700 text-right">
                      <span className="block">{t.ar}</span>
                      <span className="block text-xs text-gray-500">{t.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ADVANCED STRATEGIES */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-3">
            استراتيجيات متقدمة
          </h2>
          <p className="text-center text-gray-600 mb-12">Advanced strategies for power sellers</p>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                emoji: '🧠',
                ar: 'إعادة الاستهداف الذكي',
                en: 'Smart Retargeting',
                bodyAr: 'استهدف مَن تفاعل سابقاً مع إعلاناتك — احتمالية الشراء أعلى بـ 3 أضعاف.',
                bodyEn: 'Target previous interactors — 3× more likely to convert.',
              },
              {
                emoji: '🌍',
                ar: 'استهداف جغرافي دقيق',
                en: 'Geo-Precision',
                bodyAr: 'حدد المدينة، الحي، وحتى نطاق الكيلومترات لإعلانك.',
                bodyEn: 'Pinpoint city, district, and km radius.',
              },
              {
                emoji: '⏰',
                ar: 'الجدولة الذكية',
                en: 'Smart Scheduling',
                bodyAr: 'انشر في الساعات التي يكون جمهورك فيها الأكثر نشاطاً.',
                bodyEn: 'Publish when your audience is most active.',
              },
              {
                emoji: '🎨',
                ar: 'A/B تجربة الإبداع',
                en: 'A/B Creative Tests',
                bodyAr: 'اختبر صوراً وعناوين متعددة لاختيار الأفضل أداءً.',
                bodyEn: 'Test images and titles to find what wins.',
              },
            ].map(s => (
              <div key={s.en} className="flex gap-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                <div className="text-4xl flex-shrink-0">{s.emoji}</div>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-lg text-gray-900">{s.ar}</h3>
                  <h4 className="text-sm text-orange-600 font-semibold mb-2">{s.en}</h4>
                  <p className="text-gray-700 text-sm">{s.bodyAr}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.bodyEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CASE STUDY: CAIRO FITNESS */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-orange-600 to-amber-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
          <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-3">
            📈 CASE STUDY • قصة نجاح
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold mb-3 text-right">
            Cairo Fitness Club — كيف ضاعفت اشتراكاتها 4 مرات
          </h2>
          <p className="text-white/90 text-right text-base md:text-lg leading-relaxed mb-6">
            أحد أكبر النوادي الرياضية في القاهرة استخدم نظام الإثراء لاستهداف الشباب 18–35 سنة
            في مناطق المعادي ومدينة نصر، مما أدى إلى:
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { num: '4×', label: 'اشتراكات\nSignups' },
              { num: '−62%', label: 'تكلفة الاكتساب\nCost / acquire' },
              { num: '8.4%', label: 'معدل التحويل\nConversion rate' },
            ].map(s => (
              <div key={s.num} className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 text-center">
                <div className="text-3xl md:text-5xl font-black mb-1">{s.num}</div>
                <div className="text-xs text-white/80 whitespace-pre-line">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-white/80 text-xs mt-6 text-right italic">
            "إعلانات الإثراء غيّرت طريقة وصولنا للعملاء — أصبح كل جنيه ينفق يعود بثمار حقيقية."
            — Cairo Fitness Marketing Director
          </p>
        </div>
      </section>

      {/* BEST PRACTICES */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-12">
            ✨ أفضل الممارسات / Best Practices
          </h2>
          <ul className="space-y-4">
            {[
              { ar: 'أكمل ملفك الشخصي 100% — تشمل الجنس، الصورة، النبذة.', en: 'Complete your profile 100% — including gender, photo, and bio.' },
              { ar: 'استخدم صوراً عالية الجودة — تزيد المشاهدات بنسبة 70%.', en: 'Use HD photos — 70% more views.' },
              { ar: 'أضف وصفاً تفصيلياً وكلمات مفتاحية ذات صلة.', en: 'Write detailed descriptions with relevant keywords.' },
              { ar: 'حدّث إعلاناتك أسبوعياً للحفاظ على ترتيبها.', en: 'Refresh ads weekly to maintain ranking.' },
              { ar: 'تواصل بسرعة مع المهتمين — الاستجابة السريعة ترفع نقاطك.', en: 'Respond quickly — speed boosts your enrichment score.' },
              { ar: 'احصل على تقييمات إيجابية لرفع تصنيفك.', en: 'Earn positive reviews to climb the ranks.' },
            ].map((p, i) => (
              <li key={i} className="flex gap-4 items-start bg-orange-50 rounded-xl p-4 border-r-4 border-orange-500">
                <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="text-right flex-1">
                  <div className="text-gray-900 font-semibold">{p.ar}</div>
                  <div className="text-gray-500 text-sm mt-1">{p.en}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-orange-500 to-amber-500 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
            جاهز لإعلانات أكثر ذكاءً؟
          </h2>
          <p className="text-xl text-white/90 mb-2">Ready for smarter ads?</p>
          <p className="text-white/80 mb-8">
            ارفع نقاط الإثراء، فعِّل الاستهداف الذكي، وابدأ تحقيق نتائج حقيقية اليوم.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sell"
              className="bg-white text-orange-600 font-extrabold px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all">
              🚀 ابدأ إعلاناً جديداً
            </Link>
            <Link href="/profile"
              className="bg-white/20 backdrop-blur-sm text-white border-2 border-white/40 font-bold px-8 py-4 rounded-2xl hover:bg-white/30 transition-all">
              👤 أكمل ملفك الشخصي
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
