import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsService } from '../services';
import ListingCard from '../components/ListingCard';
import FilterPanel from '../components/FilterPanel';
import { CITIES } from '../constants/api';

const QUICK_TYPES = [
  { value: '', label: 'الكل', icon: '🏘️' },
  { value: 'apartment', label: 'شقة', icon: '🏢' },
  { value: 'villa', label: 'فيلا', icon: '🏡' },
  { value: 'duplex', label: 'دوبلكس', icon: '🏠' },
  { value: 'shop', label: 'محل', icon: '🛍️' },
  { value: 'office', label: 'مكتب', icon: '🏬' },
  { value: 'warehouse', label: 'مخزن', icon: '🏭' }
];

const TRUST_ITEMS = [
  { icon: '🛡️', label: 'مسوقون مرخصون', value: '100%' },
  { icon: '✅', label: 'إعلانات موثقة', value: 'كل إعلان' },
  { icon: '⚡', label: 'تواصل مباشر', value: 'فوري' },
  { icon: '🇪🇬', label: 'تغطية', value: 'كل مصر' }
];

function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-12" />
        </div>
        <div className="skeleton h-5 w-1/3" />
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    property_type: '',
    offer_type: '',
    min_price: '',
    max_price: '',
    sort: 'newest',
    q: ''
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await listingsService.getAll(filters);
        if (!cancelled && response.data.success) setListings(response.data.listings);
      } catch (error) {
        if (!cancelled) { console.error('Error fetching listings:', error); setListings([]); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [filters]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, q: searchQuery }));
  };

  const setQuickType = (type) => {
    setFilters((prev) => ({ ...prev, property_type: type }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilters({
      city: '',
      property_type: '',
      offer_type: '',
      min_price: '',
      max_price: '',
      sort: 'newest',
      q: ''
    });
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-900 to-brand-800">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px, 60px 60px'
          }}
        />
        <div className="page-container relative py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-inset ring-white/20 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              ١٠٠٪ إعلانات موثقة • مسوقون مرخصون
            </span>

            <h1 className="heading-hero mt-5 text-balance text-white">
              عقارك الجديد
              <br />
              <span className="bg-gradient-to-l from-brand-200 to-white bg-clip-text text-transparent">
                على بُعد ضغطة زر
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
              منصة التسويق العقاري الوحيدة في مصر التي تضمن أن كل مسوق موثق رسمياً وكل إعلان مربوط برخصة حكومية.
            </p>

            {/* Search bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-8 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-white/20 sm:flex-row sm:items-center"
            >
              <div className="flex flex-1 items-center gap-2 rounded-xl px-3 sm:py-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن عقار، حي، أو وصف..."
                  className="w-full bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block" />
              <select
                value={filters.city}
                onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))}
                className="rounded-xl bg-transparent px-3 py-2.5 text-sm text-slate-700 focus:outline-none"
              >
                <option value="">كل المدن</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button type="submit" className="btn-brand btn-lg sm:!py-2.5">
                بحث
              </button>
            </form>

            {/* Quick property type chips */}
            <div className="mt-6 -mb-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {QUICK_TYPES.map((t) => {
                const active = filters.property_type === t.value;
                return (
                  <button
                    key={t.value || 'all'}
                    onClick={() => setQuickType(t.value)}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-white text-slate-900 shadow'
                        : 'bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/20'
                    }`}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="page-container grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
          {TRUST_ITEMS.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{s.value}</p>
                <p className="truncate text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section className="page-container page-section">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filters */}
          <aside>
            <FilterPanel filters={filters} setFilters={setFilters} />
          </aside>

          {/* Listings grid */}
          <div>
            <header className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="heading-section">أحدث الإعلانات</h2>
                <p className="mt-1 text-meta">
                  {loading
                    ? 'جاري البحث...'
                    : `${listings.length} ${listings.length === 1 ? 'عقار متاح' : 'عقارات متاحة'}`}
                </p>
              </div>
            </header>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : listings.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onClick={() => navigate(`/listings/${listing.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                  🏠
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  لا توجد إعلانات تطابق بحثك
                </h3>
                <p className="mt-1 text-meta">
                  جرّب تعديل الفلاتر أو إعادة تعيينها لرؤية المزيد من النتائج.
                </p>
                <button onClick={resetFilters} className="btn-secondary mt-6">
                  إعادة تعيين الفلاتر
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
