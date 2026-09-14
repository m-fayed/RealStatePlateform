import { useRef, useState } from 'react';
import { uploadsService } from '../services';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_LICENSE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
} from '../constants/uploads';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Single-file upload button for the broker license (image or PDF).
// Uploads immediately on selection; onUpload(url) fires once with the
// stored file's URL so the parent form can submit it with registration.
export function LicenseUploadField({ value, onChange, error }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [fileName, setFileName] = useState('');

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after an error
    if (!file) return;

    setUploadError('');
    if (!ACCEPTED_LICENSE_TYPES.includes(file.type)) {
      setUploadError('الملف غير مدعوم — المسموح: صور أو PDF فقط');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(`حجم الملف كبير جداً (${formatBytes(file.size)}) — الحد الأقصى 5 ميجابايت`);
      return;
    }

    setUploading(true);
    try {
      const res = await uploadsService.uploadLicense(file);
      if (res.data.success) {
        setFileName(file.name);
        onChange(res.data.url);
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'فشل رفع الملف — حاول مرة أخرى');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="label-base">صورة رخصة التسويق *</label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_LICENSE_TYPES.join(',')}
        onChange={pickFile}
        className="hidden"
        data-testid="license-file-input"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm font-medium transition
          ${uploadError || error ? 'border-red-300 bg-red-50 text-red-700'
            : value ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700'}
          disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {uploading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            جاري رفع الرخصة...
          </>
        ) : value ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {fileName ? `تم الرفع: ${fileName}` : 'تم رفع الرخصة'}
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            ارفع صورة أو ملف PDF للرخصة
          </>
        )}
      </button>

      <p className="form-hint">صورة واضحة لرخصة التسويق (JPG / PNG / WebP / GIF / PDF) — حتى 5 ميجابايت. ستتم مراجعتها من الإدارة.</p>

      {(uploadError || error) && (
        <p className="mt-1.5 text-sm text-red-600">{uploadError || error}</p>
      )}
    </div>
  );
}

// Multi-file drag-and-drop uploader for listing photos.
// Uploads happen eagerly per selection; uploaded URLs accumulate in the
// parent's form state (onUrlsChange receives the full URL array).
export function ImageDropzone({ urls, onUrlsChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - urls.length;
    if (remaining <= 0) {
      setUploadError(`الحد الأقصى ${MAX_IMAGES} صور`);
      return;
    }

    const invalidType = files.find((f) => !ACCEPTED_IMAGE_TYPES.includes(f.type));
    if (invalidType) {
      setUploadError(`"${invalidType.name}" ليس صورة — المسموح: JPG / PNG / WebP / GIF`);
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) {
      setUploadError(`"${tooBig.name}" أكبر من 5 ميجابايت`);
      return;
    }

    const batch = files.slice(0, remaining);
    if (files.length > batch.length) {
      setUploadError(`تم تجاهل ${files.length - batch.length} صورة — الحد الأقصى ${MAX_IMAGES} صور`);
    } else {
      setUploadError('');
    }

    setUploading(true);
    try {
      const res = await uploadsService.uploadListingImages(batch);
      if (res.data.success) {
        onUrlsChange([...urls, ...res.data.urls]);
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'فشل رفع الصور — حاول مرة أخرى');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    onUrlsChange(urls.filter((_, i) => i !== index));
    setUploadError('');
  };

  const makeFirst = (index) => {
    if (index === 0) return;
    const next = [...urls];
    const [moved] = next.splice(index, 1);
    next.unshift(moved);
    onUrlsChange(next);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={(e) => {
          uploadFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
        data-testid="listing-images-input"
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!uploading) uploadFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition
          ${uploading ? 'border-brand-400 bg-brand-50'
            : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50'}`}
      >
        {uploading ? (
          <>
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            <p className="text-sm font-medium text-brand-700">جاري رفع الصور...</p>
          </>
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="text-sm font-medium text-slate-700">
              اسحب الصور هنا أو <span className="text-brand-700 underline">اختر من جهازك</span>
            </p>
            <p className="text-xs text-slate-500">JPG / PNG / WebP / GIF — حتى 5 ميجابايت للصورة — حتى {MAX_IMAGES} صور</p>
          </>
        )}
      </div>

      {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}

      {urls.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="form-hint">{urls.length} / {MAX_IMAGES} صور</p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {urls.map((url, i) => (
              <div key={url} className="group relative overflow-hidden rounded-lg ring-1 ring-slate-200">
                <img src={url} alt={`صورة ${i + 1}`} className="aspect-square w-full object-cover" />
                {i === 0 && (
                  <span className="absolute right-1 top-1 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    الغلاف
                  </span>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-slate-900/60 opacity-0 transition group-hover:opacity-100">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => makeFirst(i)}
                      title="اجعلها الغلاف"
                      className="rounded-md bg-white/90 p-1.5 text-slate-700 hover:bg-white"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    title="حذف الصورة"
                    className="rounded-md bg-white/90 p-1.5 text-red-600 hover:bg-white"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
