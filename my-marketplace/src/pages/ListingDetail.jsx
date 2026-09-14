import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listingsService } from '../services';
import { formatCurrency, timeAgo } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';

const PROPERTY_LABELS = {
  apartment: 'شقة',
  villa: 'فيلا',
  duplex: 'دوبلكس',
  shop: 'محل',
  office: 'مكتب',
  warehouse: 'مخزن',
  penthouse: 'بنتهاوس',
  studio: 'استوديو',
  clinic: 'عيادة',
  land: 'أرض'
};

function DetailSkeleton() {
  return (
    <div className="page-container page-section">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="skeleton aspect-[16/10] rounded-2xl" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-20 w-24 rounded-xl" />
            ))}
          </div>
          <div className="mt-8 space-y-3">
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-4 w-1/3" />
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="skeleton h-20" />
              <div className="skeleton h-20" />
              <div className="skeleton h-20" />
            </div>
          </div>
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    </div>
  );
}

function SpecCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 text-lg font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const response = await listingsService.getById(id);
      if (response.data.success) {
        setListing(response.data.listing);
        setCurrentImageIndex(0);
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    const message = `مرحباً، رأيت إعلانك على منصة عقاري عن ${listing.title} في ${listing.city} — هل ما زال متاحاً؟`;
    const phoneNumber = String(listing.broker_phone || '').replace(/[^\d]/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) return <DetailSkeleton />;

  if (!listing) {
    return (
      <div className="page-container page-section text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">🔎</div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">الإعلان غير موجود</h2>
        <p className="mt-1 text-meta">قد يكون الإعلان قد تم حذفه أو أنه غير متاح حالياً.</p>
        <button onClick={() => navigate('/')} className="btn-brand mt-6">العودة للرئيسية</button>
      </div>
    );
  }

  const isSale = listing.offer_type === 'sale';
  const hasImages = listing.images && listing.images.length > 0;

  return (
    <div className="page-container py-6 sm:py-8">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate('/')} className="transition hover:text-slate-900">الرئيسية</button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700">{listing.city}</span>
        <span className="text-slate-300">/</span>
        <span className="line-clamp-1 text-slate-900">{listing.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Gallery */}
          <div>
            <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/70">
              <div className="relative aspect-[16/10] bg-slate-200">
                {hasImages ? (
                  <img
                    src={listing.images[currentImageIndex]}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.5-3.5L10 19" />
                    </svg>
                  </div>
                )}

                <div className="absolute right-4 top-4 flex gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ${
                    isSale ? 'bg-brand-600/90 text-white' : 'bg-emerald-600/90 text-white'
                  }`}>
                    {isSale ? 'للبيع' : 'للإيجار'}
                  </span>
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur-md">
                    {PROPERTY_LABELS[listing.property_type] || listing.property_type}
                  </span>
                </div>

                {hasImages && listing.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i - 1 + listing.images.length) % listing.images.length)}
                      className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md backdrop-blur transition hover:bg-white"
                      aria-label="السابق"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i + 1) % listing.images.length)}
                      className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md backdrop-blur transition hover:bg-white"
                      aria-label="التالي"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                    <span className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      {currentImageIndex + 1} / {listing.images.length}
                    </span>
                  </>
                )}
              </div>
            </div>

            {hasImages && listing.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {listing.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`shrink-0 overflow-hidden rounded-xl ring-2 transition ${
                      currentImageIndex === idx ? 'ring-brand-600' : 'ring-transparent hover:ring-slate-200'
                    }`}
                  >
                    <img src={img} alt={`صورة ${idx + 1}`} className="h-20 w-24 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title + meta */}
          <div>
            <h1 className="heading-page">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {listing.area} • {listing.city}
              </span>
              <span className="text-slate-300">•</span>
              <span>نُشر {timeAgo(listing.created_at)}</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {listing.views_count || 0} مشاهدة
              </span>
            </div>
          </div>

          {/* Spec cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SpecCard label="السعر" value={formatCurrency(listing.price)} />
            {listing.size_sqm && <SpecCard label="المساحة" value={`${listing.size_sqm} م²`} />}
            {listing.rooms && <SpecCard label="عدد الغرف" value={listing.rooms} />}
            {listing.floor && <SpecCard label="الدور" value={listing.floor} />}
          </div>

          {/* Description */}
          <section className="card-padded">
            <h2 className="heading-section">الوصف</h2>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-700">
              {listing.description || 'لا يوجد وصف متاح لهذا الإعلان.'}
            </p>
          </section>

          {/* Location */}
          <section className="card-padded">
            <h2 className="heading-section">الموقع</h2>
            <div className="mt-4 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-slate-900">{listing.area}</p>
                <p className="text-meta">{listing.city}</p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside>
          <div className="sticky-top space-y-4">
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/70">السعر</p>
                <p className="mt-1 text-3xl font-extrabold">{formatCurrency(listing.price)}</p>
                <p className="mt-1 text-sm text-white/80">
                  {isSale ? 'بيع كلي' : 'إيجار شهري'}
                </p>
              </div>

              <div className="p-6">
                <p className="eyebrow">المسوق العقاري</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white">
                    {(listing.broker_name || '؟')[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{listing.broker_name}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      مسوق موثق
                    </p>
                  </div>
                </div>

                <button onClick={handleContact} className="btn-success btn-lg mt-5 w-full">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  تواصل عبر واتساب
                </button>

                <button
                  onClick={() => navigate(`/brokers/${listing.broker_id}`)}
                  className="btn-secondary mt-3 w-full"
                >
                  عرض الملف الشخصي
                </button>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">إعلان موثق رسمياً</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    رقم الرخصة: <span className="font-mono">{listing.ad_license_no}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
