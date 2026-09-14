# 📦 تثبيت PostgreSQL على Windows

## الطريقة السهلة - Chocolatey

إذا عندك **Chocolatey** مثبت:

```powershell
# اتفتح PowerShell كـ Admin
choco install postgresql
```

---

## الطريقة الكلاسيكية - التحميل المباشر

### الخطوة 1️⃣ - التحميل

زور الموقع الرسمي:
```
https://www.postgresql.org/download/windows/
```

اختر **PostgreSQL 15.x** (آخر إصدار)

### الخطوة 2️⃣ - التثبيت

1. اتفتح الملف المُحمّل (`postgresql-15.x-x64-setup.exe`)
2. اضغط **Next** عدة مرات
3. عند سؤالك عن **Password**:
   ```
   postgres (استخدم كلمة السر هذي - نفس اللي في .env)
   ```
4. **Port**: `5432` (الافتراضي)
5. **Locale**: اختر لغتك
6. أكمل حتى النهاية

### الخطوة 3️⃣ - تحديث PATH (مهم جداً!)

بعد التثبيت، أضف PostgreSQL لـ Windows PATH:

1. اتفتح **Environment Variables**:
   - اضغط `Win + R`
   - اكتب `sysdm.cpl`
   - روح **Advanced tab** → **Environment Variables**

2. تحت **System Variables**، ابحث عن `Path`

3. اضغط **Edit** وأضف:
   ```
   C:\Program Files\PostgreSQL\15\bin
   ```

4. اضغط **OK** و **Apply**

5. **أغلق وأعد فتح Terminal** (مهم!)

---

## الخطوة 4️⃣ - التحقق من التثبيت

بعد إعادة فتح Terminal، اكتب:

```powershell
psql --version
```

يجب تشوف:
```
psql (PostgreSQL) 15.x
```

---

## الخطوة 5️⃣ - إنشاء Database تلقائياً

قلنا للـ Backend يقدر يُنشئ الـ Database بنفسه 🎉

شغّل هذا الأمر:

```bash
cd d:\realEstate\backend
npm run setup-db
```

سيعمل على:
1. ✅ إنشاء Database `real_estate`
2. ✅ إنشاء جميع الجداول
3. ✅ إضافة Indexes
4. ✅ إضافة بيانات تطوير (Admin user)

---

## ✨ إذا كل شيء تمام

بعد نجاح التثبيت والـ setup، يجب تشوف:

```
✅ Database connection pool created
✅ Database connected successfully!
📍 Connected to: real_estate at localhost:5432
```

---

## 🆘 المشاكل الشائعة

### ❌ "The term 'psql' is not recognized"
- تأكد أن أضفت PostgreSQL في PATH
- أعد فتح Terminal
- جرب في Command Prompt بدل PowerShell

### ❌ "Connection refused"
- تأكد أن PostgreSQL service شغّال:
  ```powershell
  Get-Service postgresql-x64-15
  ```
- لو مش شغّال:
  ```powershell
  Start-Service postgresql-x64-15
  ```

### ❌ "password authentication failed"
- Password يجب يكون `postgres` (نفس اللي وضعت عند التثبيت)
- أو تحديث في `.env`:
  ```env
  DB_PASSWORD=your_actual_password
  ```

---

## ⏭️ بعد التثبيت الناجح

شغّل:

```bash
# Terminal 1 - Backend Server
cd backend
npm run dev

# Terminal 2 - Frontend Server  
cd my-marketplace
npm run dev
```

يجب تشوف:
- Backend: `🚀 Server running on port 5000`
- Frontend: `http://localhost:5173`

---

## 📝 الملخص

1. ✅ ثبّت PostgreSQL
2. ✅ أضفه في PATH
3. ✅ أعد فتح Terminal
4. ✅ شغّل `npm run setup-db`
5. ✅ خلصنا! ✨
