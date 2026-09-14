// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,

  // Listings
  LISTINGS: `${API_BASE_URL}/listings`,
  LISTING_DETAIL: (id) => `${API_BASE_URL}/listings/${id}`,
  
  // Brokers
  BROKER_PROFILE: (id) => `${API_BASE_URL}/brokers/${id}`,
  
  // Admin
  ADMIN_REGISTRATIONS: `${API_BASE_URL}/admin/registrations`,
  APPROVE_REGISTRATION: (id) => `${API_BASE_URL}/admin/registrations/${id}/approve`,
  REJECT_REGISTRATION: (id) => `${API_BASE_URL}/admin/registrations/${id}/reject`,
};

export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'شقة' },
  { value: 'villa', label: 'فيلا' },
  { value: 'duplex', label: 'دوبلكس' },
  { value: 'shop', label: 'محل' },
  { value: 'office', label: 'مكتب' },
  { value: 'warehouse', label: 'مخزن' }
];

export const PROPERTY_SUBTYPES = {
  apartment: ['furnished', 'unfurnished', 'semi_furnished'],
  villa: ['standalone', 'semi_detached'],
  duplex: ['ground_floor', 'upper_floor'],
  shop: ['street_front', 'inside_mall'],
  office: ['small', 'large'],
  warehouse: ['small', 'large']
};

export const OFFER_TYPES = [
  { value: 'sale', label: 'للبيع' },
  { value: 'rent', label: 'للإيجار' }
];

export const USER_ROLES = [
  { value: 'broker', label: 'مسوق' },
  { value: 'seeker', label: 'باحث' },
  { value: 'admin', label: 'إدارة' }
];

export const CITIES = [
  'القاهرة',
  'الإسكندرية',
  'الجيزة',
  'المنصورة',
  'طنطا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شرم الشيخ',
  'الغردقة',
  'مرسى مطروح',
  'كفر الشيخ',
  'دمياط',
  'بني سويف'
];
