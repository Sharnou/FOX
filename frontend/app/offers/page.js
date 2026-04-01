'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app';

const LABELS = {
  ar: {
    title: 'العروض',
    asBuyer: 'عروضي (مشتري)',
    asSeller: 'العروض الواردة (بائع)',
    pending: 'قيد الانتظار',
    accepted: 'مقبول',
    rejected: 'مرفوض',
    countered: 'عرض مضاد',
    accept: 'قبول',
    reject: 'رفض',
    counter: 'عرض مضاد',
    counterAmount: 'المبلغ المضاد',
    send: 'إرسال',
    cancel: 'إلغاء',
    noOffers: 'لا توجد عروض بعد',
    adLabel: 'الإعلان:',
    amountLabel: 'المبلغ:',
    messageLabel: 'الرسالة:',
    currency: 'ج.م',
    loading: 'جارٍ التحميل...',
    error: 'خطأ في تحميل العروض',
    actionSuccess: 'تم تحديث العرض',
    actionError: 'فشل التحديث',
    login: 'يرجى تسجيل الدخول',
  },
  en: {
    title: 'Offers',
    asBuyer: 'My Offers (Buyer)',
    asSeller: 'Received Offers (Seller)',
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    countered: 'Countered',
    accept: 'Accept',
    reject: 'Reject',
    counter: 'Counter',
    counterAmount: 'Counter Amount',
    send: 'Send',
    cancel: 'Cancel',
    noOffers: 'No offers yet',
    adLabel: 'Ad:',
    amountLabel: 'Amount:',
    messageLabel: 'Message:',
    currency: 'EGP',
    loading: 'Loading...',
    error: 'Failed to load offers',
    actionSuccess: 'Offer updated',
    actionError: 'Update failed',
    login: 'Please log in',
  },
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  countered: 'bg-blue-100 text-blue-800',
};

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl p-4 shadow-sm space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded w-20" />
        <div className="h-8 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
}

export default function OffersPage() {
  const router = useRouter();
  const [lang, setLang] = useState('ar');
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState('seller');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [counterTarget, setCounterTarget] = useState(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [acting, setActing] = useState(null);

  const t = LABELS[lang];
  const isRTL = lang === 'ar';

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!storedToken) { router.push('/login'); return; }
    setToken(storedToken);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserId(parsed._id || parsed.id);
      } catch {}
    }
    const country = localStorage.getItem('country') || '';
    const arabicCountries = ['EG','SA','AE','KW','BH','QA','OM','JO','LB','SY','IQ','YE','LY','TN','DZ','MA'];
    setLang(arabicCountries.includes(country) ? 'ar' : 'en');
  }, [router]);

  const fetchOffers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/offers/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : []);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [token, t.error]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAction = async (offerId, action, amount) => {
    setActing(offerId);
    try {
      const body = { action };
      if (action === 'counter' && amount) body.counterAmount = Number(amount);
      const res = await fetch(`${API}/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast(t.actionSuccess);
      setCounterTarget(null);
      setCounterAmount('');
      fetchOffers();
    } catch {
      showToast(t.actionError);
    } finally {
      setActing(null);
    }
  };

  const myOffers = offers.filter(o => String(o.buyer?._id || o.buyer) === String(userId));
  const receivedOffers = offers.filter(o => String(o.seller?._id || o.seller) === String(userId));
  const displayed = tab === 'buyer' ? myOffers : receivedOffers;

  const statusLabel = (s) => t[s] || s;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`min-h-screen bg-gray-50 pb-24 ${isRTL ? 'font-arabic' : ''}`}>
      <header className="sticky top-0 z-40 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">{t.title}</h1>
        <button
          onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
          className="text-sm text-emerald-600 border border-emerald-200 rounded-full px-3 py-1"
        >
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </header>

      <div className="flex border-b bg-white sticky top-14 z-30">
        {['seller', 'buyer'].map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === tb ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}
          >
            {tb === 'seller' ? t.asSeller : t.asBuyer}
            {tb === 'seller' && receivedOffers.filter(o => o.status === 'pending').length > 0 && (
              <span className="ms-1 inline-flex items-center justify-center w-5 h-5 text-xs bg-emerald-500 text-white rounded-full">
                {receivedOffers.filter(o => o.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {loading && [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}

        {!loading && error && (
          <p className="text-center text-red-500 py-12">{error}</p>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🤝</div>
            <p className="text-lg">{t.noOffers}</p>
          </div>
        )}

        {!loading && displayed.map(offer => {
          const adTitle = offer.ad?.title || offer.adTitle || '—';
          const adId = offer.ad?._id || offer.ad;
          const isSeller = tab === 'seller';
          const isPending = offer.status === 'pending';
          const isCountering = counterTarget === offer._id;

          return (
            <div key={offer._id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{t.adLabel}</p>
                  <button
                    onClick={() => router.push(`/ads/${adId}`)}
                    className="text-emerald-600 font-medium text-sm hover:underline line-clamp-1 text-start"
                  >
                    {adTitle}
                  </button>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[offer.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel(offer.status)}
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400">{t.amountLabel}</p>
                  <p className="font-bold text-gray-800">
                    {offer.amount?.toLocaleString()} {t.currency}
                  </p>
                </div>
                {offer.counterAmount && (
                  <div>
                    <p className="text-xs text-gray-400">{t.counterAmount}</p>
                    <p className="font-bold text-blue-600">
                      {offer.counterAmount?.toLocaleString()} {t.currency}
                    </p>
                  </div>
                )}
              </div>

              {offer.message && (
                <div>
                  <p className="text-xs text-gray-400">{t.messageLabel}</p>
                  <p className="text-sm text-gray-700">{offer.message}</p>
                </div>
              )}

              {isSeller && isPending && (
                <div className="space-y-2">
                  {!isCountering ? (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleAction(offer._id, 'accept')}
                        disabled={!!acting}
                        className="flex-1 bg-emerald-500 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-emerald-600 transition-colors"
                      >
                        {acting === offer._id ? '...' : t.accept}
                      </button>
                      <button
                        onClick={() => handleAction(offer._id, 'reject')}
                        disabled={!!acting}
                        className="flex-1 bg-red-100 text-red-600 text-sm py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-red-200 transition-colors"
                      >
                        {t.reject}
                      </button>
                      <button
                        onClick={() => { setCounterTarget(offer._id); setCounterAmount(''); }}
                        className="flex-1 bg-blue-100 text-blue-600 text-sm py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                      >
                        {t.counter}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={counterAmount}
                        onChange={e => setCounterAmount(e.target.value)}
                        placeholder={t.counterAmount}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(offer._id, 'counter', counterAmount)}
                          disabled={!counterAmount || !!acting}
                          className="flex-1 bg-blue-500 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-blue-600 transition-colors"
                        >
                          {acting === offer._id ? '...' : t.send}
                        </button>
                        <button
                          onClick={() => setCounterTarget(null)}
                          className="flex-1 bg-gray-100 text-gray-600 text-sm py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
