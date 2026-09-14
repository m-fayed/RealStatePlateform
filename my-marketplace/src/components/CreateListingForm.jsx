import { useState } from 'react';
import { listingsService } from '../services';
import { CITIES } from '../constants/api';
import { ImageDropzone } from './UploadFields';

const PROPERTY_OPTIONS = [
  { value: 'apartment', label: 'شقة' },
  { value: 'villa', label: 'فيلا' },
  { value: 'duplex', label: 'دوبلكس' },
  { value: 'penthouse', label: 'بنتهاوس' },
  { value: 'studio', label: 'استوديو' },
  { value: 'shop', label: 'محل' },
  { value: 'office', label: 'مكتب' },
  { value: 'clinic', label: 'عيادة' },
  { value: 'warehouse', label: 'مخزن' },
  { value: 'land', label: 'أرض' }
];

function FormSection({ label, children }) {
  return (
    <section>
      <h3 className="eyebrow mb-4">{label}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function CreateListingForm({ onCancel, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: '',
    area: '',
    property_type: '',
    offer_type: 'sale',
    price: '',
    size_sqm: '',
    rooms: '',
    floor: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = {
        ...formData,
        price: parseInt(formData.price),
        size_sqm: formData.size_sqm ? parseInt(formData.size_sqm) : null,
        rooms: formData.rooms ? parseInt(formData.rooms) : null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        images: imageUrls
      };

      const response = await listingsService.create(data);
      if (response.data.success) {
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في إضافة الإعلان');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 bg-slate-50/60 px-6 py-5 sm:px-8">
        <div>
          <h2 className="heading-section">إضافة إعلان جديد</h2>
          <p className="mt-1 text-meta">املأ التفاصيل التالية لنشر إعلانك على المنصة.</p>
        </div>
        <button onClick={onCancel} className="btn-ghost btn-sm" aria-label="إغلاق">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 p-6 sm:p-8">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <FormSection label="المعلومات الأساسية">
          <div>
            <label className="label-base">العنوان *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="مثال: شقة فاخرة 150م في التجمع الخامس"
              required
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">الوصف</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="وصف مفصل للعقار: التشطيب، المرافق، المميزات..."
              rows="4"
              className="input-base resize-none"
            />
          </div>
        </FormSection>

        <FormSection label="النوع والعرض">
          <div>
            <label className="label-base">نوع العرض *</label>
            <div className="segmented grid-cols-2">
              {[
                { v: 'sale', l: 'للبيع' },
                { v: 'rent', l: 'للإيجار' }
              ].map((o) => {
                const active = formData.offer_type === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, offer_type: o.v }))}
                    className={`segmented-item ${active ? 'segmented-item-active' : ''}`}
                  >
                    {o.l}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label-base">نوع العقار *</label>
            <select
              name="property_type"
              value={formData.property_type}
              onChange={handleChange}
              required
              className="input-base"
            >
              <option value="">اختر النوع</option>
              {PROPERTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </FormSection>

        <FormSection label="الموقع">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label-base">المدينة *</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="input-base"
              >
                <option value="">اختر المدينة</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">الحي / المنطقة *</label>
              <input
                type="text"
                name="area"
                value={formData.area}
                onChange={handleChange}
                placeholder="مثال: التجمع الخامس"
                required
                className="input-base"
              />
            </div>
          </div>
        </FormSection>

        <FormSection label="المواصفات والسعر">
          <div>
            <label className="label-base">السعر (جنيه مصري) *</label>
            <input
              type="number"
              inputMode="numeric"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="1000000"
              required
              className="input-base"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label-base">المساحة (م²)</label>
              <input
                type="number"
                inputMode="numeric"
                name="size_sqm"
                value={formData.size_sqm}
                onChange={handleChange}
                placeholder="150"
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">عدد الغرف</label>
              <input
                type="number"
                inputMode="numeric"
                name="rooms"
                value={formData.rooms}
                onChange={handleChange}
                placeholder="3"
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">الدور</label>
              <input
                type="number"
                inputMode="numeric"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                placeholder="2"
                className="input-base"
              />
            </div>
          </div>
        </FormSection>

        <FormSection label="الصور">
          <ImageDropzone urls={imageUrls} onUrlsChange={setImageUrls} />
        </FormSection>

        <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-6 sm:flex-row">
          <button type="submit" disabled={loading} className="btn-brand btn-lg flex-1">
            {loading ? 'جاري النشر...' : 'نشر الإعلان'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary btn-lg flex-1">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
