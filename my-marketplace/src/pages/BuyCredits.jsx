import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { creditsService } from '../services';
import { downloadPrivateDocument } from '../services/documents';
import { ReceiptUploadField } from '../components/UploadFields';
import { formatDate } from '../utils/formatters';

// Mirrors server/src/lib/credits.js — the wallet brokers transfer to.
const VODAFONE_WALLET = '01066329241';

// Display mirror of server CREDIT_PACKAGES. The server is the source of truth
// and re-validates the price/credits, so these are presentation-only.
const PACKAGES = [
  { id: 'small', label: 'الحزمة الصغيرة', credits: 5, price: 50, tagline: 'ابدأ بخطوات صغيرة' },
  { id: 'medium', label: 'الحزمة المتوسطة', credits: 10, price: 90, tagline: 'الأكثر شيوعاً', recommended: true },
  { id: 'large', label: 'الحزمة الكبيرة', credits: 20, price: 150, tagline: 'أفضل قيمة للمسوقين النشطين' },
];

const PAYMENT_METHODS = [
  { id: 'vodafone_cash', label: 'فودافون كاش', desc: 'تحويل يدوي — يُراجَع من الإدارة', instant: false },
  { id: 'card', label: 'بطاقة بنكية', desc: 'بيئة اختبار — إضافة فورية', instant: true },
  { id: 'fawry', label: 'فوري', desc: 'بيئة اختبار — إضافة فورية', instant: true },
];

const METHOD_LABELS = {
  vodafone_cash: 'فودافون كاش',
  card: 'بطاقة بنكية (تجريبي)',
  fawry: 'فوري (تجريبي)',
};

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StatusBadge({ status }) {
  if (status === 'completed') return <span className="badge-success">مكتمل</span>;
  if (status === 'pending') return <span className="badge-warning">قيد المراجعة</span>;
  if (status === 'rejected')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
        مرفوض
      </span>
    );
  return <span className="badge-slate">{status}</span>;
}

// ---------------------------------------------------------------------------
// Checkout modal — pick a payment method for the chosen package.
// ---------------------------------------------------------------------------
function CheckoutModal({ pkg, mockPaymentsEnabled, onClose, onCompleted, onPending }) {
  const [method, setMethod] = useState('vodafone_cash');
  const [senderNumber, setSenderNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const isVodafone = method === 'vodafone_cash';

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(VODAFONE_WALLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the number is visible anyway */
    }
  };

  const submit = async () => {
    setError('');
    if (isVodafone && senderNumber.trim().length < 6) {
      setError('يرجى إدخال رقم المحفظة المحوَّل منها (الرقم الذي أرسلت منه).');
      return;
    }

    const payload = { package: pkg.id, method };
    if (isVodafone) {
      payload.sender_number = senderNumber.trim();
      if (receiptUrl) payload.receipt_url = receiptUrl;
    }

    try {
      setSubmitting(true);
      const res = await creditsService.purchase(payload);
      if (res.data.success) {
        if (res.data.status === 'completed') onCompleted(res.data);
        else onPending(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذّر إتمام العملية، حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="card max-h-[92vh] w-full max-w-lg overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 bg-slate-50/60 px-6 py-5">
          <div>
            <h2 className="heading-section">إتمام الشراء</h2>
            <p className="mt-1 text-meta">
              {pkg.label} — <span className="font-semibold text-slate-900">{pkg.price} ج.م</span> مقابل {pkg.credits} رصيد
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm" aria-label="إغلاق">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Method picker */}
          <p className="label-base">اختر طريقة الدفع</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.filter((m) => !m.instant || mockPaymentsEnabled).map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`rounded-xl border p-3 text-right transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="block text-sm font-bold text-slate-900">{m.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-slate-500">{m.desc}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </div>
          )}

          {/* Vodafone Cash: instructions + sender number + optional receipt */}
          {isVodafone ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                <p className="text-sm leading-relaxed text-slate-700">
                  يرجى تحويل مبلغ <span className="font-bold text-slate-900">{pkg.price} ج.م</span> إلى محفظة فودافون
                  كاش رقم:
                </p>
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-white p-3 ring-1 ring-brand-200">
                  <span className="font-mono text-lg font-extrabold tracking-wider text-brand-800" dir="ltr">
                    {VODAFONE_WALLET}
                  </span>
                  <button type="button" onClick={copyWallet} className="btn-ghost btn-sm !px-3">
                    {copied ? 'تم النسخ ✓' : 'نسخ'}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  بعد التحويل، أدخل رقم المحفظة التي حوّلت منها (وأرفق صورة الإشعار إن أمكن) ثم أكّد الطلب — وسيضيف
                  فريق الإدارة الرصيد بعد التحقق من التحويل.
                </p>
              </div>

              <div>
                <label className="label-base">رقم المحفظة المحوَّل منها *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="input-base text-right"
                />
              </div>

              <ReceiptUploadField value={receiptUrl} onChange={setReceiptUrl} />
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
              وضع تجريبي (Sandbox): لا تتم أي عملية دفع حقيقية عبر {METHOD_LABELS[method]}. عند التأكيد سيُضاف الرصيد
              إلى حسابك فوراً — مخصّص للاختبار فقط.
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <button onClick={submit} disabled={submitting} className="btn-brand flex-1">
              {submitting
                ? 'جاري المعالجة...'
                : isVodafone
                ? 'تأكيد طلب الدفع'
                : `دفع تجريبي فوري — ${pkg.price} ج.م`}
            </button>
            <button onClick={onClose} disabled={submitting} className="btn-secondary flex-1">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BuyCredits() {
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkoutPkg, setCheckoutPkg] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [mockPaymentsEnabled, setMockPaymentsEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    creditsService.getPackages().then((res) => {
      if (!cancelled) setMockPaymentsEnabled(res.data.mock_payments_enabled === true);
    }).catch(() => {
      // Fail closed: mock methods stay hidden when configuration is unavailable.
    });
    return () => { cancelled = true; };
  }, []);

  const isBroker = isAuthenticated && user?.role === 'broker';
  const credits = isBroker ? (user.listingCredits ?? 0) : 0;

  const loadTransactions = useCallback(async () => {
    if (!isBroker) return;
    try {
      const res = await creditsService.myTransactions();
      if (res.data.success) setTransactions(res.data.transactions);
    } catch {
      /* non-blocking — history is a convenience panel */
    } finally {
      setLoadingTx(false);
    }
  }, [isBroker]);

  useEffect(() => {
    let cancelled = false;
    creditsService.myTransactions().then((response) => {
      if (!cancelled) setTransactions(response.data.transactions);
    }).catch(() => { /* Purchase controls remain usable if history is unavailable. */ })
      .finally(() => { if (!cancelled) setLoadingTx(false); });
    return () => { cancelled = true; };
  }, []);

  const startPurchase = (pkg) => {
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
    setCheckoutPkg(pkg);
  };

  const handleCompleted = (data) => {
    void refreshUser();
    setSuccess(
      `تمت إضافة ${data.credits_added} رصيد إعلانات بنجاح. رصيدك الحالي: ${data.user?.listingCredits ?? ''}.`
    );
    setCheckoutPkg(null);
    loadTransactions();
  };

  const handlePending = () => {
    setSuccess('تم استلام طلب الدفع عبر فودافون كاش. سيُضاف الرصيد بعد مراجعة الإدارة للتحويل.');
    setCheckoutPkg(null);
    loadTransactions();
  };

  return (
    <div className="page-container page-section">
      {/* Heading */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="badge-brand">شراء رصيد الإعلانات</span>
        <h1 className="heading-page mt-4">اشحن رصيدك وانشر إعلاناتك</h1>
        <p className="mt-3 text-meta">
          كل إعلان يُكلّف رصيداً واحداً. اختر الحزمة الأنسب، وادفع عبر فودافون كاش.
          {mockPaymentsEnabled && ' يمكنك أيضاً تجربة الدفع التجريبي.'}
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
        {PACKAGES.map((pkg) => (
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
              onClick={() => startPurchase(pkg)}
              className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                pkg.recommended
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {!isAuthenticated
                ? 'سجّل كمسوق'
                : user?.role !== 'broker'
                ? 'متاح للمسوقين فقط'
                : `اشترِ +${pkg.credits} رصيد`}
            </button>
          </div>
        ))}
      </div>

      {/* Transaction history */}
      {isBroker && (
        <div className="mx-auto mt-14 max-w-3xl">
          <header className="mb-4 flex items-end justify-between gap-4">
            <h2 className="heading-section">سجل عمليات الشحن</h2>
            {transactions.length > 0 && (
              <span className="text-meta">{transactions.length} عملية</span>
            )}
          </header>

          {loadingTx ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-2xl" />
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{tx.amount} ج.م</span>
                      <span className="text-sm text-slate-500">— {tx.credits} رصيد</span>
                      <StatusBadge status={tx.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {METHOD_LABELS[tx.method] || tx.method} • {formatDate(tx.created_at)}
                      {tx.sender_number && (
                        <>
                          {' '}• من <span dir="ltr">{tx.sender_number}</span>
                        </>
                      )}
                    </p>
                    {tx.status === 'rejected' && tx.rejection_reason && (
                      <p className="mt-1 text-xs text-red-600">سبب الرفض: {tx.rejection_reason}</p>
                    )}
                  </div>
                  {tx.receipt_url && (
                    <a
                      href={tx.receipt_url}
                      onClick={(event) => { event.preventDefault(); downloadPrivateDocument(tx.receipt_url); }}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-brand-700 hover:underline"
                    >
                      عرض الإيصال
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-meta">لا توجد عمليات شحن بعد. اختر حزمة لبدء أول عملية.</p>
            </div>
          )}
        </div>
      )}

      {/* Footnotes */}
      <div className="mx-auto mt-10 max-w-2xl text-center">
        <p className="text-xs text-slate-500">
          الدفع عبر فودافون كاش يُراجَع يدوياً من الإدارة.
          {mockPaymentsEnabled && ' خيارات البطاقة/فوري تجريبية حالياً وتضيف الرصيد فوراً.'}
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

      {checkoutPkg && (
        <CheckoutModal
          pkg={checkoutPkg}
          mockPaymentsEnabled={mockPaymentsEnabled}
          onClose={() => setCheckoutPkg(null)}
          onCompleted={handleCompleted}
          onPending={handlePending}
        />
      )}
    </div>
  );
}
