import { useState } from 'react';
import { listingsService } from '../services';

const BOOST_OPTIONS = [
  {
    id: 'top',
    label: 'الظهور في أعلى البحث',
    tagline: 'يظهر إعلانك في صدارة نتائج البحث',
    durations: [
      { days: 3, cost: 30 },
      { days: 7, cost: 60 },
    ],
  },
  {
    id: 'badge',
    label: 'شارة مميز',
    tagline: 'تُضاف شارة "مميز" على بطاقة الإعلان',
    fixed: { days: 7, cost: 20 },
  },
  {
    id: 'premium',
    label: 'الترقية المميزة',
    tagline: 'الأولوية القصوى — أعلى من كل الإعلانات الأخرى',
    fixed: { days: 7, cost: 80 },
  },
];

export default function BoostModal({ listing, credits, onClose, onBoosted }) {
  const [selectedDays, setSelectedDays] = useState({ top: 3 });
  const [submitting, setSubmitting] = useState(null);
  const [error, setError] = useState('');

  const handleActivate = async (option) => {
    setError('');
    const payload = { type: option.id };
    let cost;
    if (option.fixed) {
      cost = option.fixed.cost;
    } else {
      const days = selectedDays[option.id] ?? option.durations[0].days;
      payload.duration_days = days;
      cost = option.durations.find((d) => d.days === days)?.cost ?? 0;
    }

    if (credits < cost) {
      setError(`الرصيد غير كافٍ. تحتاج ${cost} رصيد ولديك ${credits} فقط.`);
      return;
    }

    try {
      setSubmitting(option.id);
      const response = await listingsService.boost(listing.id, payload);
      if (response.data.success) {
        onBoosted?.(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذّر تفعيل الترقية');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 bg-slate-50/60 px-6 py-5 sm:px-8">
          <div>
            <h2 className="heading-section">رقّي إعلانك</h2>
            <p className="mt-1 text-meta line-clamp-1">
              {listing?.title}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm" aria-label="إغلاق">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="eyebrow">رصيدك</p>
              <p className="mt-0.5 text-base font-bold text-slate-900">
                {credits} رصيد
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {BOOST_OPTIONS.map((option) => {
              const days = option.fixed?.days ?? (selectedDays[option.id] ?? option.durations[0].days);
              const cost = option.fixed?.cost
                ?? option.durations.find((d) => d.days === days)?.cost;
              const enough = credits >= cost;
              const isSubmitting = submitting === option.id;

              return (
                <div key={option.id} className="card flex flex-col p-5">
                  <h3 className="text-base font-bold text-slate-900">{option.label}</h3>
                  <p className="mt-1 text-xs text-slate-500">{option.tagline}</p>

                  <div className="mt-4 flex items-end gap-1.5">
                    <span className="text-3xl font-extrabold text-slate-900">{cost}</span>
                    <span className="pb-1 text-xs text-slate-500">رصيد</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">المدة: {days} أيام</p>

                  {option.durations && (
                    <div className="segmented mt-4 grid-cols-2">
                      {option.durations.map((d) => {
                        const active = days === d.days;
                        return (
                          <button
                            key={d.days}
                            type="button"
                            onClick={() => setSelectedDays((p) => ({ ...p, [option.id]: d.days }))}
                            className={`segmented-item ${active ? 'segmented-item-active' : ''}`}
                          >
                            {d.days} أيام
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={() => handleActivate(option)}
                    disabled={!enough || submitting !== null}
                    className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'جاري التفعيل...' : enough ? 'تفعيل' : 'الرصيد غير كافٍ'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
