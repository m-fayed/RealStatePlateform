# 🚀 API Documentation

## Base URL
```
http://localhost:5000/api
```

---

## 🏥 Health Check

### GET /health
```bash
curl http://localhost:5000/api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2026-04-27T..."
}
```

---

## 🔐 Authentication Endpoints

### POST /auth/register/broker
ملف المسوق العقاري

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register/broker \
  -H "Content-Type: application/json" \
  -d '{
    "name": "أحمد محمد",
    "phone": "+201001234567",
    "email": "broker@example.com",
    "password": "password123",
    "license_image_url": "https://example.com/license.jpg",
    "ad_license_no": "LIC-12345"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Broker registration successful. Please wait for admin approval.",
  "user": {
    "id": "uuid",
    "name": "أحمد محمد",
    "phone": "+201001234567",
    "email": "broker@example.com",
    "role": "broker",
    "status": "pending"
  }
}
```

---

### POST /auth/register/seeker
تسجيل الباحث

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register/seeker \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+201009876543",
    "name": "فاطمة علي",
    "password": "password123",
    "email": "seeker@example.com"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Seeker registration successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "فاطمة علي",
    "phone": "+201009876543",
    "role": "seeker",
    "status": "active"
  }
}
```

---

### POST /auth/login
تسجيل الدخول

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+201001234567",
    "password": "password123"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "أحمد محمد",
    "phone": "+201001234567",
    "role": "broker",
    "status": "active"
  }
}
```

---

### GET /auth/me
الحصول على بيانات المستخدم الحالي

**Request:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "أحمد محمد",
    "phone": "+201001234567",
    "role": "broker",
    "status": "active"
  }
}
```

---

## 🏠 Listings Endpoints

### GET /listings
الحصول على الإعلانات مع الفلاتر

**Query Parameters:**
- `city` - المدينة (Cairo, Alexandria, etc)
- `property_type` - نوع العقار (apartment, villa, etc)
- `offer_type` - نوع العرض (sale, rent)
- `min_price` - الحد الأدنى للسعر
- `max_price` - الحد الأقصى للسعر
- `sort` - الترتيب (newest, price_asc, price_desc)

**Request:**
```bash
curl "http://localhost:5000/api/listings?city=Cairo&offer_type=sale&sort=newest"
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "listings": [
    {
      "id": "uuid",
      "title": "شقة فاخرة في مدينة نصر",
      "property_type": "apartment",
      "offer_type": "sale",
      "price": 1500000,
      "city": "Cairo",
      "area": "Nasr City",
      "broker_name": "أحمد محمد",
      "views_count": 42
    }
  ]
}
```

---

### GET /listings/:id
الحصول على تفاصيل إعلان واحد

**Request:**
```bash
curl http://localhost:5000/api/listings/uuid-here
```

**Response (200):**
```json
{
  "success": true,
  "listing": {
    "id": "uuid",
    "title": "شقة فاخرة",
    "description": "شقة جميلة...",
    "property_type": "apartment",
    "price": 1500000,
    "images": ["url1", "url2"],
    "views_count": 43
  }
}
```

---

### POST /listings
إنشاء إعلان جديد (للمسوقين فقط)

**Request:**
```bash
curl -X POST http://localhost:5000/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "شقة فاخرة في مدينة نصر",
    "description": "شقة جديدة وحديثة...",
    "property_type": "apartment",
    "offer_type": "sale",
    "city": "Cairo",
    "area": "Nasr City",
    "price": 1500000,
    "size_sqm": 150,
    "rooms": 3,
    "floor": 5,
    "ad_license_no": "LIC-12345",
    "images": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"]
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Listing created successfully",
  "listing": {
    "id": "new-uuid",
    "title": "شقة فاخرة...",
    "status": "active"
  }
}
```

---

## 👨‍💼 Brokers Endpoints

### GET /brokers/:id
الحصول على بروفايل مسوق

**Request:**
```bash
curl http://localhost:5000/api/brokers/broker-uuid
```

**Response (200):**
```json
{
  "success": true,
  "broker": {
    "id": "uuid",
    "name": "أحمد محمد",
    "phone": "+201001234567",
    "ad_license_no": "LIC-12345",
    "created_at": "2026-04-27...",
    "listings": [...],
    "active_listings_count": 5
  }
}
```

---

## 👨‍⚖️ Admin Endpoints

جميع Admin endpoints محمية بـ JWT و role verification

### GET /admin/registrations/pending
الحصول على طلبات التسجيل المعلقة

```bash
curl -X GET http://localhost:5000/api/admin/registrations/pending \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### POST /admin/registrations/:id/approve
الموافقة على تسجيل مسوق

```bash
curl -X POST http://localhost:5000/api/admin/registrations/broker-uuid/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### POST /admin/registrations/:id/reject
رفض تسجيل مسوق

```bash
curl -X POST http://localhost:5000/api/admin/registrations/broker-uuid/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "reason": "الرخصة غير واضحة"
  }'
```

---

### GET /admin/statistics
الحصول على إحصائيات المنصة

```bash
curl http://localhost:5000/api/admin/statistics \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "active_brokers": 5,
    "total_seekers": 42,
    "active_listings": 18,
    "pending_registrations": 2
  }
}
```

---

## 🧪 Testing with Postman

يمكنك استيراد هذه ملف الـ collection:

1. افتح Postman
2. اختر **Import**
3. اختر **Link** وضع الرابط (لاحقاً سننشر collection)

---

## ⚠️ Error Handling

### Validation Error
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "phone",
      "message": "phone must match pattern /^\\+?[0-9]{10,20}$/"
    }
  ]
}
```

### Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

### Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

---

## 🔒 Authentication

لاستخدام Protected endpoints:

1. سجل دخول أولاً واحصل على `token`
2. أضف الـ token في كل request:
```
Authorization: Bearer YOUR_TOKEN
```

---

## 📝 Status Codes

- **200** - OK
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **500** - Server Error
