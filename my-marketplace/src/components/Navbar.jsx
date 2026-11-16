import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuLocationKey, setMobileMenuLocationKey] = useState(null);
  const mobileOpen = mobileMenuLocationKey === location.key;
  const setMobileOpen = (open) => setMobileMenuLocationKey((current) => {
    const next = typeof open === 'function' ? open(current === location.key) : open;
    return next ? location.key : null;
  });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabel = (role) =>
    role === 'broker' ? 'مسوق عقاري' : role === 'admin' ? 'إدارة' : 'باحث';

  const initials = (name) =>
    (name || '؟')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();

  const navLinkClass = (path) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      location.pathname === path
        ? 'bg-slate-100 text-slate-900'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all ${
        scrolled
          ? 'border-b border-slate-200 bg-white/85 shadow-sm backdrop-blur-md'
          : 'border-b border-transparent bg-white'
      }`}
    >
      <div className="page-container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M10 21v-6h4v6" />
            </svg>
          </span>
          <span className="text-lg font-extrabold text-slate-900">عقاري</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className={navLinkClass('/')}>الإعلانات</Link>
          {isAuthenticated && (
            <Link to="/inbox" className={navLinkClass('/inbox')}>محادثاتي</Link>
          )}
          {user?.role === 'broker' && (
            <>
              <Link to="/dashboard" className={navLinkClass('/dashboard')}>لوحة التحكم</Link>
              <Link to="/credits" className={navLinkClass('/credits')}>شراء رصيد</Link>
            </>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className={navLinkClass('/admin')}>الإدارة</Link>
          )}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="hidden items-center gap-3 md:flex">
              {user?.role === 'broker' && (
                <Link to="/dashboard" className="btn-brand btn-sm">
                  + إعلان جديد
                </Link>
              )}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                  {initials(user?.name)}
                </div>
                <div className="hidden text-right leading-tight lg:block">
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{roleLabel(user?.role)}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-ghost btn-sm" title="تسجيل الخروج">
                خروج
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/auth" className="btn-ghost btn-sm">دخول</Link>
              <Link to="/auth" className="btn-primary btn-sm">إنشاء حساب</Link>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="القائمة"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="page-container space-y-1 py-3">
            <Link to="/" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              الإعلانات
            </Link>
            {isAuthenticated && (
              <Link to="/inbox" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                محادثاتي
              </Link>
            )}
            {user?.role === 'broker' && (
              <Link to="/credits" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                شراء رصيد
              </Link>
            )}
            {isAuthenticated ? (
              <>
                {user?.role === 'broker' && (
                  <Link to="/dashboard" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    لوحة التحكم
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <Link to="/admin" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    الإدارة
                  </Link>
                )}
                <div className="my-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                    {initials(user?.name)}
                  </div>
                  <div className="text-right leading-tight">
                    <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500">{roleLabel(user?.role)}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="btn-secondary w-full">
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link to="/auth" className="btn-secondary w-full">تسجيل الدخول</Link>
                <Link to="/auth" className="btn-primary w-full">إنشاء حساب</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
