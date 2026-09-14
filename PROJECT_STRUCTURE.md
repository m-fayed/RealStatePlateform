# منصة التسويق العقاري الموثوق

Real Estate Marketplace Platform - Egypt

---

## 📋 نظرة عامة على الهيكل

```
realEstate/
├── backend/                          # Backend Server (Node.js + Express)
│   ├── src/
│   │   ├── index.js                 # نقطة الدخول الرئيسية
│   │   ├── routes/                  # API Routes
│   │   │   ├── auth.js              # Authentication routes
│   │   │   ├── listings.js          # Listings management
│   │   │   ├── brokers.js           # Broker profiles
│   │   │   └── admin.js             # Admin operations
│   │   ├── controllers/             # Business Logic
│   │   ├── models/                  # Database Models
│   │   ├── middleware/              # Custom Middleware
│   │   ├── validators/              # Input Validation
│   │   ├── utils/                   # Utility Functions
│   │   └── config/                  # Configuration
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── my-marketplace/                   # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/                   # Page Components
│   │   │   ├── Home.jsx             # الصفحة الرئيسية
│   │   │   ├── Auth.jsx             # التسجيل والدخول
│   │   │   ├── ListingDetail.jsx    # تفاصيل الإعلان
│   │   │   ├── BrokerProfile.jsx    # بروفايل المسوق
│   │   │   ├── BrokerDashboard.jsx  # لوحة المسوق
│   │   │   └── AdminPanel.jsx       # لوحة الإدارة
│   │   ├── components/              # Reusable Components
│   │   │   ├── Navbar.jsx
│   │   │   ├── ListingCard.jsx
│   │   │   ├── FilterPanel.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── services/                # API Services
│   │   │   ├── api.js               # Axios client
│   │   │   └── index.js             # Service functions
│   │   ├── context/                 # React Context
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/                   # Custom Hooks
│   │   │   └── useAuth.js
│   │   ├── utils/                   # Utility Functions
│   │   │   └── formatters.js
│   │   ├── constants/               # Constants
│   │   │   └── api.js
│   │   ├── assets/                  # Static Assets
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── public/
│   ├── vite.config.js
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
└── file.md                           # وثيقة متطلبات المنتج
```

---

## 🚀 سريع البدء

### المتطلبات
- **Node.js** >= 14
- **PostgreSQL** >= 12
- **npm** أو **yarn**

### الخطوة 1: تثبيت Backend

```bash
cd backend
npm install

# نسخ ملف البيئة وتحديث البيانات
cp .env.example .env
# عدّل .env بـ Database credentials
```

### الخطوة 2: تثبيت Frontend

```bash
cd ../my-marketplace
npm install

# إضافة axios لـ HTTP requests
npm install axios

# نسخ ملف البيئة
cp .env.example .env
```

### الخطوة 3: تشغيل المشروع

#### Terminal 1 - Backend:
```bash
cd backend
npm run dev
# يشتغل على http://localhost:5000
```

#### Terminal 2 - Frontend:
```bash
cd my-marketplace
npm run dev
# يشتغل على http://localhost:5173
```

---

## 📚 بنية الميزات

### ✅ Phase 1 (MVP) - الأساس
- [x] نظام التسجيل والمصادقة (Authentication)
- [x] رفع الإعلانات العقارية (Listings)
- [x] صفحة التصفح مع الفلاتر (Browse & Filters)
- [x] بروفايل المسوق (Broker Profile)
- [ ] التواصل عبر WhatsApp (Chat Phase 1)

### 🔄 Phase 2 (التطوير)
- [ ] بروفايل متقدم للمسوق
- [ ] فلاتر متقدمة (سعر، مساحة، دور)
- [ ] صفحة تفاصيل الإعلان الكاملة
- [ ] نظام الإشعارات (SMS)
- [ ] Dashboard متطور للمسوق

### 🌟 Phase 3 (النمو)
- [ ] شات داخلي Real-time
- [ ] نظام تقييم المسوقين
- [ ] إعلانات مميزة مدفوعة
- [ ] تحقق أوتوماتيك من الرخص

---

## 🔗 API Endpoints

| الميزة | Method | Endpoint | الوصف |
|--------|--------|----------|-------|
| تسجيل | POST | `/api/auth/register` | إنشاء حساب جديد |
| دخول | POST | `/api/auth/login` | تسجيل الدخول |
| التحقق من OTP | POST | `/api/auth/verify-otp` | التحقق من الكود |
| الإعلانات | GET | `/api/listings` | جميع الإعلانات |
| إعلان واحد | GET | `/api/listings/:id` | تفاصيل إعلان |
| إنشاء إعلان | POST | `/api/listings` | إعلان جديد |
| بروفايل مسوق | GET | `/api/brokers/:id` | معلومات المسوق |
| طلبات التسجيل | GET | `/api/admin/registrations` | قائمة الطلبات |
| الموافقة | POST | `/api/admin/registrations/:id/approve` | موافقة على تسجيل |
| الرفض | POST | `/api/admin/registrations/:id/reject` | رفض تسجيل |

---

## 🛠️ Tech Stack

| الطبقة | التقنية | السبب |
|--------|---------|-------|
| Frontend | React.js + Vite | سريع - HMR - مجتمع كبير |
| Backend | Node.js + Express | سريع التطوير - REST API |
| Database | PostgreSQL | علاقات قوية - مجاني |
| Auth | JWT + OTP | آمن - مناسب |
| Storage | Cloudinary/S3 | سهل لتخزين الصور |
| Real-time Chat | Firebase/Socket.io | سريع في المرحلة الثانية |

---

## 📝 ملاحظات التطوير

### Frontend
- استخدم Context API للـ State Management
- Custom hooks لإعادة الاستخدام
- Tailwind CSS للـ Styling
- Axios للـ API Calls

### Backend
- JWT للمصادقة
- Middleware للتحقق من الصلاحيات
- Joi للـ Validation
- PostgreSQL للبيانات

---

## 🤝 المساهمة

1. اشتغل على فرع منفصل
2. اتبع نفس نمط الكود
3. أكتب تعليقات واضحة
4. اختبر الكود قبل ما تدفع

---

## 📄 الترخيص

داخلي فقط - سري

---

**آخر تحديث:** 27 أبريل 2026
