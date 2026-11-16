import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services';
import { LicenseUploadField } from '../components/UploadFields';

const MODES = [
  { id: 'login', label: 'تسجيل الدخول' },
  { id: 'register-seeker', label: 'حساب باحث' },
  { id: 'register-broker', label: 'حساب مسوق' }
];

const VALUE_PROPS = [
  'كل مسوق على المنصة يحمل رخصة رسمية',
  'كل إعلان مربوط برقم رخصة إعلانية',
  'تواصل مباشر مع المسوق عبر واتساب',
  'مراجعة يدوية من فريق الإدارة'
];

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    name: '',
    email: '',
    license_image_url: '',
    license_upload_token: '',
    ad_license_no: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authService.login(formData.phone, formData.password);
      if (response.data.success) {
        login(response.data.user, response.data.token);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSeeker = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authService.registerSeeker({
        phone: formData.phone,
        name: formData.name,
        password: formData.password,
        email: formData.email
      });
      if (response.data.success) {
        login(response.data.user, response.data.token);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذّر إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBroker = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await authService.registerBroker({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        license_image_url: formData.license_image_url,
        license_upload_token: formData.license_upload_token,
        ad_license_no: formData.ad_license_no
      });
      if (response.data.success) {
        setSuccess('تم استلام طلبك بنجاح! سيتم مراجعة الرخصة من قبل الإدارة وإبلاغك بالنتيجة قريباً.');
        setMode('login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذّر إنشاء حساب المسوق');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (id) => {
    setMode(id);
    setError('');
    setSuccess('');
  };

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-brand-50" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(60% 40% at 80% 0%, rgba(37,99,235,0.18), transparent 70%), radial-gradient(40% 30% at 0% 100%, rgba(16,185,129,0.15), transparent 70%)'
        }}
      />

      <div className="page-container grid min-h-[calc(100vh-4rem)] items-center gap-12 py-12 lg:grid-cols-2">
        {/* Marketing copy */}
        <div className="hidden lg:block">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
                <path d="M10 21v-6h4v6" />
              </svg>
            </span>
            <span className="text-xl font-extrabold text-slate-900">عقاري</span>
          </Link>

          <h1 className="mt-10 text-balance text-4xl font-extrabold leading-[1.15] text-slate-900 lg:text-[2.75rem]">
            انضمّ إلى أكبر شبكة من
            <span className="text-brand-700"> المسوقين العقاريين الموثقين </span>
            في مصر.
          </h1>

          <p className="mt-5 max-w-md text-base text-slate-600">
            رخص رسمية موثقة، إعلانات بدون وهم، وتواصل آمن بين الباحث والمسوق — مكان واحد لكل احتياجاتك العقارية.
          </p>

          <ul className="mt-8 space-y-3.5">
            {VALUE_PROPS.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-slate-700">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div className="mx-auto w-full max-w-md">
          <div className="card p-6 sm:p-8">
            <div className="mb-6 lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10.5 12 3l9 7.5" />
                    <path d="M5 9.5V21h14V9.5" />
                    <path d="M10 21v-6h4v6" />
                  </svg>
                </span>
                <span className="text-lg font-extrabold text-slate-900">عقاري</span>
              </Link>
            </div>

            {/* Tabs */}
            <div className="segmented mb-6 grid-cols-3">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => switchMode(m.id)}
                  className={`segmented-item ${mode === m.id ? 'segmented-item-active' : ''}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h2 className="heading-page">
                {mode === 'login'
                  ? 'مرحباً بعودتك'
                  : mode === 'register-seeker'
                  ? 'إنشاء حساب باحث'
                  : 'إنشاء حساب مسوق'}
              </h2>
              <p className="mt-1.5 text-meta">
                {mode === 'login'
                  ? 'سجّل دخولك للمتابعة وعرض إعلاناتك.'
                  : mode === 'register-seeker'
                  ? 'سجّل ببيانات بسيطة وتواصل مع المسوقين فوراً.'
                  : 'سجّل برخصتك الرسمية لتبدأ نشر الإعلانات.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label-base">رقم الموبايل</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+201234567890" required className="input-base" />
                </div>
                <div>
                  <label className="label-base">كلمة المرور</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required className="input-base" />
                </div>
                <button type="submit" disabled={loading} className="btn-brand btn-lg w-full">
                  {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                </button>
                <p className="text-center text-xs text-slate-500">
                  لا تملك حساب؟{' '}
                  <button type="button" onClick={() => switchMode('register-seeker')} className="font-semibold text-brand-700 hover:underline">
                    أنشئ حساباً جديداً
                  </button>
                </p>
              </form>
            )}

            {mode === 'register-seeker' && (
              <form onSubmit={handleRegisterSeeker} className="space-y-4">
                <div>
                  <label className="label-base">الاسم</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="أحمد محمد" required className="input-base" />
                </div>
                <div>
                  <label className="label-base">رقم الموبايل</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+201234567890" required className="input-base" />
                </div>
                <div>
                  <label className="label-base">البريد الإلكتروني <span className="font-normal text-slate-400">(اختياري)</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@gmail.com" className="input-base" />
                </div>
                <div>
                  <label className="label-base">كلمة المرور</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" minLength={8} maxLength={72} required className="input-base" />
                </div>
                <button type="submit" disabled={loading} className="btn-brand btn-lg w-full">
                  {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
                </button>
              </form>
            )}

            {mode === 'register-broker' && (
              <form onSubmit={handleRegisterBroker} className="space-y-4">
                <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                  حساب المسوق يحتاج موافقة الإدارة بعد التسجيل والتحقق من الرخصة.
                </div>
                <div>
                  <label className="label-base">الاسم</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="محمد أحمد" required className="input-base" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label-base">رقم الموبايل</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+201234567890" required className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">البريد الإلكتروني</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="broker@example.com" required className="input-base" />
                  </div>
                </div>
                <div>
                  <label className="label-base">كلمة المرور</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" minLength={8} maxLength={72} required className="input-base" />
                </div>
                <LicenseUploadField
                  value={formData.license_image_url}
                  onChange={(url) => setFormData((prev) => ({ ...prev, license_image_url: url }))}
                  onTokenChange={(token) => setFormData((prev) => ({ ...prev, license_upload_token: token }))}
                />
                <div>
                  <label className="label-base">رقم رخصة الإعلان</label>
                  <input type="text" name="ad_license_no" value={formData.ad_license_no} onChange={handleChange} placeholder="LIC-2024-001" required className="input-base" />
                </div>
                <button type="submit" disabled={loading} className="btn-brand btn-lg w-full">
                  {loading ? 'جاري التسجيل...' : 'تقديم الطلب'}
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            بإنشائك حساباً فأنت توافق على شروط الاستخدام وسياسة الخصوصية.
          </p>
        </div>
      </div>
    </div>
  );
}
