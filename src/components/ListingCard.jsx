import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, timeAgo } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { chatService } from '../services';

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

export default function ListingCard({ listing, onClick }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [chatLoading, setChatLoading] = useState(false);

  const isSale = listing.offer_type === 'sale';
  const showFeaturedBadge =
    listing.is_featured &&
    listing.feature_type === 'badge' &&
    (!listing.featured_until || new Date(listing.featured_until) > new Date());

  // Hide chat for the listing owner — you can't chat with yourself.
  const isOwner = user?.id === listing.broker_id;
  const canChat = !isOwner;

  const handleChat = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    try {
      setChatLoading(true);
      const response = await chatService.createOrFetch(listing.id);
      if (response.data.success) {
        navigate(`/chat/${response.data.conversation.id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذّر فتح المحادثة');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <article
      onClick={onClick}
      className="card-hover group flex h-full cursor-pointer flex-col overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {listing.images && listing.images.length > 0 ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.5-3.5L10 19" />
            </svg>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute right-3 top-3 flex flex-wrap gap-1.5">
          {showFeaturedBadge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2.5 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.39 6.95H22l-5.99 4.36L18.4 21 12 16.65 5.6 21l2.39-7.69L2 8.95h7.61z" />
              </svg>
              مميز
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md ${
              isSale ? 'bg-brand-600/90 text-white' : 'bg-emerald-600/90 text-white'
            }`}
          >
            {isSale ? 'للبيع' : 'للإيجار'}
          </span>
          {listing.property_type && (
            <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 backdrop-blur-md">
              {PROPERTY_LABELS[listing.property_type] || listing.property_type}
            </span>
          )}
        </div>

        {/* Verified ribbon */}
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-emerald-700 backdrop-blur-md">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          موثق
        </div>

        {/* Chat button — hidden for the listing owner */}
        {canChat && (
          <button
            onClick={handleChat}
            disabled={chatLoading}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-brand-600/95 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-md transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="بدء محادثة مع المسوق"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            {chatLoading ? 'جاري...' : 'محادثة'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="heading-card line-clamp-2 leading-snug group-hover:text-brand-700">
          {listing.title}
        </h3>

        <div className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate">
            {listing.area ? `${listing.area} • ` : ''}{listing.city}
          </span>
        </div>

        {/* Specs */}
        {(listing.size_sqm || listing.rooms || listing.floor) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
            {listing.size_sqm && (
              <span className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M3 9h18" />
                </svg>
                {listing.size_sqm} م²
              </span>
            )}
            {listing.rooms && (
              <span className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21V8l9-5 9 5v13" />
                  <path d="M9 21v-6h6v6" />
                </svg>
                {listing.rooms} غرف
              </span>
            )}
            {listing.floor && (
              <span className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="9" x2="20" y2="9" />
                  <line x1="4" y1="15" x2="20" y2="15" />
                  <line x1="10" y1="3" x2="8" y2="21" />
                  <line x1="16" y1="3" x2="14" y2="21" />
                </svg>
                الدور {listing.floor}
              </span>
            )}
          </div>
        )}

        {/* Price + meta — pinned to bottom */}
        <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-lg font-extrabold text-slate-900">
              {formatCurrency(listing.price)}
            </p>
            {!isSale && <p className="text-xs text-slate-500">/ شهرياً</p>}
          </div>
          <div className="text-left text-xs text-slate-500">
            <p className="font-medium text-slate-700">{listing.broker_name}</p>
            <p className="mt-0.5">{timeAgo(listing.created_at)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
