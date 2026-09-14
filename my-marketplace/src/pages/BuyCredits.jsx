import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { creditsService } from '../services';

const PACKAGES = [
  {
    id: 'small',
    label: 'الحزمة الصغيرة',
    credits: 5,
    price: 50,
    tagline: 'ابدأ بخطوات صغيرة',
  },
  {
    id: 'medium',
    label: 'الحزمة المتوسطة',
    credits: 10,
    price: 90,
    tagline: 'الأكثر شيوعاً',
    recommended: true,
  },
  {
    id: 'large',
    label: 'الحزمة الكبيرة',
    credits: 20,
    price: 150,
    tagline: 'أفضل قيمة للمسوقين النشطين',
  },
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function BuyCredits() {
  const navigate = useNavigate();
  const { isAuthenticated, user, updateUser } = useAuth();
  const [submitting, setSubmitting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isBroker = isAuthenticated && user?.role === 'broker';
  const credits = isBroker ? (user.listingCredits ?? 0) : 0;

  const handlePurchase = async (pkgId) => {
    setError('');
    setSuccess('');

    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (user?.role !== 'broker') {
      setError('شراء الرصيد متاح للمسوقين فقط.');
      return;
    }

    try {
      setSubmitting(pkgId);
      const response = await creditsService.purchase(pkgId);
      if (response.data.success) {
        updateUser(response.data.user);
        setSuccess(
          `تمت إضافة ${response.data.credits_added} رصيد إعلانات بنجاح. رصيدك الحالي: ${response.data.user.listingCredits}.`
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذّر إتمام الشراء، حاول مرة أخرى.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="page-container page-section">
      {/* Heading */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="badge-brand">شراء رصيد الإعلانات</span>
        <h1 className="heading-page mt-4">اشحن رصيدك وانشر إعلاناتك فوراً</h1>
        <p className="mt-3 text-meta">
          كل إعلان يُكلّف رصيداً واحداً. اختر الحزمة الأنسب لك واستمر في النشر.
        </p>
      </div>

      {/* Current credits */}
      {isBroker && (
        <div className="mx-auto mt-8 flex max-w-md items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <p className="eyebrow">رصيدك الحالي</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {credits} {credits === 1 ? 'إعلان' : 'إعلانات'} متبقٍ
            </p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </span>
        </div>
      )}

      {/* Status messages */}
      {(error || success) && (
        <div className="mx-auto mt-6 max-w-2xl">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {/* Package cards */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {PACKAGES.map((pkg) => {
          const disabled = submitting !== null;
          return (
            <div
              key={pkg.id}
              className={`card relative flex flex-col overflow-hidden p-6 sm:p-8 ${
                pkg.recommended ? 'ring-2 ring-brand-600' : ''
              }`}
            >
              {pkg.recommended && (
                <span className="absolute left-1/2 top-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  الأكثر شعبية
                </span>
              )}

              <div>
                <h3 className="text-lg font-bold text-slate-900">{pkg.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{pkg.tagline}</p>
              </div>

              <div className="mt-5 flex items-end gap-1.5">
                <span className="text-4xl font-extrabold text-slate-900">{pkg.price}</span>
                <span className="pb-1.5 text-sm text-slate-500">ج.م</span>
              </div>

              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckIcon />
                  </span>
                  <span>+{pkg.credits} رصيد إعلانات</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckIcon />
                  </span>
                  <span>الرصيد لا ينتهي بانتهاء الشهر</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckIcon />
                  </span>
                  <span>تستهلك الرصيد عند نشر الإعلان فقط</span>
                </li>
              </ul>

              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={disabled}
                className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  pkg.recommended
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {submitting === pkg.id
                  ? 'جاري الشراء...'
                  : !isAuthenticated
                  ? 'سجّل كمسوق'
                  : user?.role !== 'broker'
                  ? 'متاح للمسوقين فقط'
                  : `شراء +${pkg.credits} رصيد`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footnotes */}
      <div className="mx-auto mt-10 max-w-2xl text-center">
        <p className="text-xs text-slate-500">
          العملية تجريبية حالياً — لا توجد عمليات دفع حقيقية، يُضاف الرصيد فور الضغط.
        </p>
        {!isAuthenticated && (
          <p className="mt-2 text-sm text-slate-600">
            هل أنت مسوق عقاري؟{' '}
            <Link to="/auth" className="font-semibold text-brand-700 hover:underline">
              سجّل حسابك الآن
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
