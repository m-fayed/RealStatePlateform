import { CITIES } from '../constants/api';

const PROPERTY_TYPES = [
  { value: '', label: 'الكل' },
  { value: 'apartment', label: 'شقة' },
  { value: 'villa', label: 'فيلا' },
  { value: 'duplex', label: 'دوبلكس' },
  { value: 'shop', label: 'محل' },
  { value: 'office', label: 'مكتب' },
  { value: 'warehouse', label: 'مخزن' }
];

const OFFER_TYPES = [
  { value: '', label: 'الكل' },
  { value: 'sale', label: 'للبيع' },
  { value: 'rent', label: 'للإيجار' }
];

export default function FilterPanel({ filters, setFilters }) {
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
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

  const activeCount = [
    filters.city,
    filters.property_type,
    filters.offer_type,
    filters.min_price,
    filters.max_price,
    filters.q
  ].filter(Boolean).length;

  return (
    <div className="card-padded sticky-top">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">الفلاتر</h2>
        {activeCount > 0 && (
          <span className="badge-brand">{activeCount} نشط</span>
        )}
      </div>

      {/* Offer type — segmented control */}
      <div className="mb-5">
        <label className="label-base">نوع العرض</label>
        <div className="segmented grid-cols-3">
          {OFFER_TYPES.map((o) => {
            const active = filters.offer_type === o.value;
            return (
              <button
                key={o.value || 'all'}
                onClick={() => handleFilterChange('offer_type', o.value)}
                className={`segmented-item ${active ? 'segmented-item-active' : ''}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5">
        <label className="label-base">المدينة</label>
        <select
          value={filters.city}
          onChange={(e) => handleFilterChange('city', e.target.value)}
          className="input-base"
        >
          <option value="">كل المدن</option>
          {CITIES.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="label-base">نوع العقار</label>
        <select
          value={filters.property_type}
          onChange={(e) => handleFilterChange('property_type', e.target.value)}
          className="input-base"
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value || 'all'} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="label-base">نطاق السعر <span className="font-normal text-slate-400">(ج.م)</span></label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="من"
            value={filters.min_price}
            onChange={(e) => handleFilterChange('min_price', e.target.value)}
            className="input-base"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="إلى"
            value={filters.max_price}
            onChange={(e) => handleFilterChange('max_price', e.target.value)}
            className="input-base"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="label-base">الترتيب</label>
        <select
          value={filters.sort}
          onChange={(e) => handleFilterChange('sort', e.target.value)}
          className="input-base"
        >
          <option value="newest">الأحدث أولاً</option>
          <option value="price_asc">السعر: الأقل</option>
          <option value="price_desc">السعر: الأعلى</option>
        </select>
      </div>

      <button onClick={handleReset} className="btn-secondary w-full">
        إعادة تعيين
      </button>
    </div>
  );
}
