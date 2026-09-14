import { useState, useEffect } from 'react';
import { adminService } from '../services';

function StatTile({ label, value, color }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState('pending');
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState({});

  useEffect(() => {
    if (tab === 'pending') fetchPendingRegistrations();
    else fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const fetchPendingRegistrations = async () => {
    try {
      setLoading(true);
      const response = await adminService.getRegistrations();
      if (response.data.success) {
        setPendingRegistrations(response.data.registrations);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await adminService.getStatistics();
      if (response.data.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminService.approveRegistration(id);
      setPendingRegistrations(pendingRegistrations.filter((r) => r.id !== id));
    } catch (error) {
      alert('فشلت الموافقة على التسجيل');
    }
  };

  const handleReject = async (id) => {
    const reason = rejectReason[id] || 'لم يتم تحديد سبب';
    try {
      await adminService.rejectRegistration(id, reason);
      setPendingRegistrations(pendingRegistrations.filter((r) => r.id !== id));
      setRejectReason((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      alert('فشل رفض التسجيل');
    }
  };

  return (
    <div className="page-container page-section">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
        </span>
        <div>
          <h1 className="heading-page">لوحة الإدارة</h1>
          <p className="text-meta">إشراف ومراجعة على نشاط المنصة.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="segmented mt-6 inline-grid w-full grid-cols-2 sm:w-auto sm:grid-flow-col sm:grid-cols-none">
        <button
          onClick={() => setTab('pending')}
          className={`segmented-item !px-4 ${tab === 'pending' ? 'segmented-item-active' : ''}`}
        >
          طلبات التسجيل
          {pendingRegistrations.length > 0 && tab !== 'pending' && (
            <span className="mr-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {pendingRegistrations.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('statistics')}
          className={`segmented-item !px-4 ${tab === 'statistics' ? 'segmented-item-active' : ''}`}
        >
          الإحصائيات
        </button>
      </div>

      {/* Content */}
      <div className="mt-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        ) : tab === 'pending' ? (
          <div>
            <header className="mb-5 flex items-end justify-between gap-4">
              <h2 className="heading-section">طلبات التسجيل المعلقة</h2>
              <span className="text-meta">
                {pendingRegistrations.length} {pendingRegistrations.length === 1 ? 'طلب' : 'طلبات'}
              </span>
            </header>

            {pendingRegistrations.length > 0 ? (
              <div className="space-y-4">
                {pendingRegistrations.map((registration) => (
                  <div key={registration.id} className="card overflow-hidden">
                    <div className="border-r-4 border-amber-500 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white">
                            {(registration.name || '؟')[0]}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{registration.name}</h3>
                            <p className="text-meta">
                              {registration.phone}
                              {registration.email && ` • ${registration.email}`}
                            </p>
                          </div>
                        </div>
                        <span className="badge-warning">معلّق</span>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="eyebrow">رقم رخصة الإعلان</p>
                          <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                            {registration.ad_license_no || '—'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="eyebrow">صورة الرخصة</p>
                          {registration.license_image_url ? (
                            <button
                              onClick={() => window.open(registration.license_image_url, '_blank')}
                              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6" />
                                <path d="M10 14 21 3" />
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              </svg>
                              فتح الصورة
                            </button>
                          ) : (
                            <p className="mt-1 text-sm text-slate-400">غير متوفرة</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-5">
                        <label className="label-base">سبب الرفض <span className="font-normal text-slate-400">(اختياري)</span></label>
                        <textarea
                          placeholder="اشرح سبب الرفض ليُرسَل للمسوق..."
                          value={rejectReason[registration.id] || ''}
                          onChange={(e) =>
                            setRejectReason((prev) => ({
                              ...prev,
                              [registration.id]: e.target.value
                            }))
                          }
                          className="input-base resize-none"
                          rows="2"
                        />
                      </div>

                      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <button onClick={() => handleApprove(registration.id)} className="btn-success flex-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          موافقة
                        </button>
                        <button onClick={() => handleReject(registration.id)} className="btn-danger flex-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          رفض
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">✅</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  لا توجد طلبات معلّقة
                </h3>
                <p className="mt-1 text-meta">راجعت كل الطلبات الحالية. عمل ممتاز!</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="heading-section mb-5">إحصائيات المنصة</h2>
            {statistics && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="المسوقون النشطون" value={statistics.active_brokers ?? 0} color="text-brand-700" />
                <StatTile label="الباحثون" value={statistics.seekers ?? 0} color="text-emerald-600" />
                <StatTile label="إجمالي الإعلانات" value={statistics.total_listings ?? 0} color="text-amber-600" />
                <StatTile label="طلبات معلّقة" value={statistics.pending_registrations ?? 0} color="text-red-600" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
