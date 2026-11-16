import { useEffect, useState } from 'react';
import { adminService } from '../services';

const LABELS = { pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض', hidden: 'مخفي', active: 'نشط', suspended: 'موقوف' };

export default function ModerationPanel() {
  const [brokers, setBrokers] = useState([]);
  const [listings, setListings] = useState([]);
  const [reasons, setReasons] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [brokers, listings] = await Promise.all([adminService.getBrokers(), adminService.getListings()]);
        if (!cancelled) {
          setBrokers(brokers.data.brokers);
          setListings(listings.data.listings);
        }
      } catch (error) { if (!cancelled) setError(error.response?.data?.message || 'تعذّر تحميل قائمة المراجعة'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [revision]);

  const perform = async (id, operation) => {
    setBusy(id);
    setError('');
    try { await operation(); setRevision((value) => value + 1); }
    catch (error) { setError(error.response?.data?.message || 'تعذّر تنفيذ الإجراء'); }
    finally { setBusy(null); }
  };
  return <div className="space-y-8">
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button className="btn-secondary" onClick={() => setRevision((value) => value + 1)}>تحديث</button>
    {loading ? <p>جاري التحميل...</p> : <>
      <section><h2 className="heading-section mb-4">إدارة المسوقين</h2>
        {!brokers.length && <p>لا يوجد مسوقون.</p>}
        <div className="space-y-3">{brokers.map((broker) => <div key={broker.id} className="card flex flex-wrap items-center gap-4 p-4">
          <span>{broker.name} — {broker.phone}</span><span>{LABELS[broker.status] || broker.status}</span>
          {['active', 'suspended'].includes(broker.status) && <button disabled={busy !== null} className="btn-secondary" onClick={() => perform(broker.id, () => adminService.setSuspension(broker.id, broker.status === 'active'))}>
            {broker.status === 'active' ? 'إيقاف المسوق' : 'إلغاء الإيقاف'}
          </button>}
        </div>)}</div>
      </section>
      <section><h2 className="heading-section mb-4">مراجعة الإعلانات</h2>
        {!listings.length && <p>لا توجد إعلانات.</p>}
        <div className="space-y-4">{listings.map((listing) => <article key={listing.id} className="card space-y-3 p-5">
          <h3 className="font-bold">{listing.title} — {listing.broker_name}</h3>
          <p>{listing.city} / {listing.area} — {listing.price} ج.م — {listing.status}</p>
          <p className="whitespace-pre-wrap">{listing.description}</p>
          <p>رخصة الإعلان: {listing.ad_license_no}</p>
          <div className="flex flex-wrap gap-2">{listing.images.map((url) => <img key={url} src={url} alt={listing.title} className="h-24 w-32 rounded object-cover" />)}</div>
          <p>{LABELS[listing.moderation_status]} {listing.moderation_reason && `— ${listing.moderation_reason}`}</p>
          <input aria-label={`سبب القرار: ${listing.title}`} className="input-base" placeholder="سبب الرفض أو الإخفاء" value={reasons[listing.id] || ''} onChange={(event) => setReasons((current) => ({ ...current, [listing.id]: event.target.value }))} />
          <div className="flex gap-2">{[['approve', 'موافقة'], ['reject', 'رفض'], ['hide', 'إخفاء']].map(([action, label]) => <button key={action} disabled={busy !== null} className="btn-secondary" onClick={() => perform(listing.id, () => adminService.moderateListing(listing.id, action, reasons[listing.id]))}>{label}</button>)}</div>
        </article>)}</div>
      </section>
    </>}
  </div>;
}
