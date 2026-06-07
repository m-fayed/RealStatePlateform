import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { brokersService } from '../services';
import ListingCard from '../components/ListingCard';

function ProfileSkeleton() {
  return (
    <div className="page-container page-section">
      <div className="skeleton h-56 rounded-2xl" />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function BrokerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [broker, setBroker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrokerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBrokerProfile = async () => {
    try {
      setLoading(true);
      const response = await brokersService.getProfile(id);
      if (response.data.success) {
        setBroker(response.data.broker);
      }
    } catch (error) {
      console.error('Error fetching broker profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  if (!broker) {
    return (
      <div className="page-container page-section text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">👤</div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">المسوق غير موجود</h2>
        <button onClick={() => navigate('/')} className="btn-brand mt-6">العودة للرئيسية</button>
      </div>
    );
  }

  const initials = (broker.name || '؟')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="page-container page-section">
      {/* Header */}
      <div className="card overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-brand-700 via-brand-800 to-slate-900 sm:h-44" />

        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:gap-6">
            <div className="-mt-14 flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-3xl font-bold text-white shadow-lg ring-4 ring-white sm:-mt-16 sm:h-28 sm:w-28">
              {initials}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="heading-page">{broker.name}</h1>
                <span className="badge-success">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  مسوق موثق
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                {broker.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.91.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
                    </svg>
                    {broker.phone}
                  </span>
                )}
                {broker.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-10 5L2 7" />
                    </svg>
                    {broker.email}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {broker.active_listings_count || 0} إعلان نشط
                </span>
              </div>

              <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm ring-1 ring-slate-200">
                <span className="text-slate-500">رقم الرخصة:</span>
                <span className="font-mono font-semibold text-slate-900">{broker.ad_license_no}</span>
                {broker.license_image_url && (
                  <button
                    onClick={() => window.open(broker.license_image_url, '_blank')}
                    className="mr-2 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    عرض الرخصة
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <section className="mt-10">
        <header className="mb-5 flex items-end justify-between gap-4">
          <h2 className="heading-section">الإعلانات النشطة</h2>
          <span className="text-meta">
            {broker.listings?.length || 0} إعلان
          </span>
        </header>

        {broker.listings && broker.listings.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {broker.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => navigate(`/listings/${listing.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">📭</div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              لا توجد إعلانات نشطة لهذا المسوق حالياً
            </h3>
            <p className="mt-1 text-meta">تابع الصفحة لمعرفة الجديد فور إضافته.</p>
          </div>
        )}
      </section>
    </div>
  );
}
