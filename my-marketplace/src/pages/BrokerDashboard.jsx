import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { listingsService } from '../services';
import ListingCard from '../components/ListingCard';
import CreateListingForm from '../components/CreateListingForm';
import BoostModal from '../components/BoostModal';

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default function BrokerDashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [boostingListing, setBoostingListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const credits = user?.listingCredits ?? 0;

  const handleBoosted = (response) => {
    if (response?.listing) {
      setListings((prev) => prev.map((l) => (l.id === response.listing.id ? response.listing : l)));
    }
    void refreshUser();
    setBoostingListing(null);
  };

  const fetchMyListings = useCallback(async () => {
    try {
      const response = await listingsService.getMine();
      if (response.data.success) {
        setListings(response.data.listings);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'تعذّر تحميل الإعلانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listingsService.getMine().then((response) => {
      if (!cancelled) setListings(response.data.listings);
    }).catch(() => { if (!cancelled) setError('تعذّر تحميل الإعلانات'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الإعلان؟')) return;
    try {
      await listingsService.delete(id);
      setListings(listings.filter((l) => l.id !== id));
    } catch {
      alert('فشل حذف الإعلان');
    }
  };

  const handleListingCreated = () => {
    setShowCreateForm(false);
    setEditingListing(null);
    fetchMyListings();
    void refreshUser();
  };

  const changeStatus = async (listing, status) => {
    setBusy(listing.id);
    setError('');
    try {
      await listingsService.setStatus(listing.id, status);
      await fetchMyListings();
    } catch (error) { setError(error.response?.data?.message || 'تعذّر تغيير الحالة'); }
    finally { setBusy(null); }
  };

  const totalViews = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);
  const activeCount = listings.filter((l) => l.is_active !== false).length;

  return (
    <div className="page-container page-section">
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="heading-page">لوحة التحكم</h1>
          <p className="mt-1.5 text-meta">
            مرحباً، <span className="font-semibold text-slate-700">{user.name}</span> — أدِر إعلاناتك من مكان واحد.
          </p>
        </div>
        {!showCreateForm && (
          <button onClick={() => { setEditingListing(null); setShowCreateForm(true); }} className="btn-brand w-full sm:w-auto">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            إضافة إعلان جديد
          </button>
        )}
      </div>

      {/* Listing credits */}
      <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </span>
          <div>
            <p className="eyebrow">رصيد الإعلانات</p>
            <p className="mt-0.5 text-base font-bold text-slate-900">
              {credits} {credits === 1 ? 'إعلان متاح' : 'إعلانات متاحة'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/credits')}
          className="btn-brand btn-sm"
        >
          شراء رصيد
        </button>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="إجمالي الإعلانات"
          value={listings.length}
          accent="bg-brand-50 text-brand-700"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />
        <StatCard
          label="إجمالي المشاهدات"
          value={totalViews.toLocaleString('ar-EG')}
          accent="bg-emerald-50 text-emerald-700"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />
        <StatCard
          label="الإعلانات النشطة"
          value={activeCount}
          accent="bg-amber-50 text-amber-700"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
      </div>

      {(showCreateForm || editingListing) && (
        <div className="mt-8">
          <CreateListingForm
            key={editingListing?.id || 'new'}
            listing={editingListing}
            onCancel={() => { setShowCreateForm(false); setEditingListing(null); }}
            onSuccess={handleListingCreated}
          />
        </div>
      )}

      {/* Listings */}
      <section className="mt-10">
        <header className="mb-5 flex items-end justify-between gap-4">
          <h2 className="heading-section">إعلاناتي</h2>
          {listings.length > 0 && <span className="text-meta">{listings.length} إعلان</span>}
        </header>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-80 rounded-2xl" />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <div key={listing.id} className="group relative">
                <ListingCard
                  listing={listing}
                  onClick={() => listing.moderation_status === 'approved' ? navigate(`/listings/${listing.id}`) : setEditingListing(listing)}
                />
                <div className="flex flex-wrap items-center gap-2 rounded-b-xl bg-white p-3">
                  <span className="text-xs">{({ pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض', hidden: 'مخفي' })[listing.moderation_status]}</span>
                  {listing.moderation_reason && <p className="w-full text-xs text-red-700">{listing.moderation_reason}</p>}
                  <button className="btn-secondary btn-sm" onClick={() => { setShowCreateForm(false); setEditingListing(listing); }}>تعديل</button>
                  <select aria-label="حالة الإعلان" value={listing.status} disabled={busy === listing.id} onChange={(event) => changeStatus(listing, event.target.value)} className="rounded border p-2 text-sm">
                    <option value="active">متاح</option>
                    {listing.offer_type === 'sale' ? <option value="sold">تم البيع</option> : <option value="rented">تم التأجير</option>}
                  </select>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBoostingListing(listing);
                    }}
                    className="rounded-lg bg-amber-500/95 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur hover:bg-amber-600"
                  >
                    رقّي
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(listing.id);
                    }}
                    className="rounded-lg bg-red-600/95 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur hover:bg-red-700"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">📋</div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              لم تُضف أي إعلانات بعد
            </h3>
            <p className="mt-1 text-meta">
              ابدأ بإضافة أول إعلان عقاري ليصل إلى آلاف الباحثين.
            </p>
            <button onClick={() => { setEditingListing(null); setShowCreateForm(true); }} className="btn-brand mt-6">
              إضافة إعلان الآن
            </button>
          </div>
        )}
      </section>

      {boostingListing && (
        <BoostModal
          listing={boostingListing}
          credits={credits}
          onClose={() => setBoostingListing(null)}
          onBoosted={handleBoosted}
        />
      )}
    </div>
  );
}
