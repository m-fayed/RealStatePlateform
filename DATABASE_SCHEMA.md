# نموذج قاعدة البيانات

## جداول قاعدة البيانات الأساسية

### 1. جدول Users (المستخدمين)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('broker', 'seeker', 'admin') NOT NULL,
  status ENUM('pending', 'active', 'rejected', 'suspended') DEFAULT 'pending',
  license_image_url VARCHAR(500),
  ad_license_no VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. جدول Listings (الإعلانات)
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  property_type VARCHAR(50) NOT NULL,
  offer_type ENUM('sale', 'rent') NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  city VARCHAR(100) NOT NULL,
  area VARCHAR(100) NOT NULL,
  size_sqm DECIMAL(10, 2),
  rooms INT,
  floor INT,
  description TEXT,
  ad_license_no VARCHAR(100) NOT NULL,
  status ENUM('active', 'sold', 'rented', 'deleted') DEFAULT 'active',
  views_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. جدول ListingImages (صور الإعلانات)
```sql
CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. جدول Notifications (الإشعارات)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## الخطوات التالية

1. إنشاء database في PostgreSQL
2. تشغيل هذه الـ queries
3. إضافة Migrations في Backend
4. إضافة Seeds للبيانات الاختبارية
