# ابزار خروجی‌گیری Supabase به MariaDB — وب‌سایت توسن

این ابزار SQLها را به‌صورت محلی تولید می‌کند. **هیچ dump واقعی یا اطلاعات کاربران/سفارش‌ها در GitHub قرار نمی‌گیرد.**

## اجرا
1. Python 3.10+ نصب باشد.
2. نصب وابستگی: `python -m pip install "psycopg[binary]"`
3. اجرا: `python export_supabase_to_mariadb.py ./tosan_sql_export`
4. رشته اتصال PostgreSQL در ورودی مخفی درخواست می‌شود. آن را در چت یا GitHub قرار ندهید.

## خروجی
- 00_schema.sql: ساخت جدول‌ها، کلیدهای اصلی و unique
- 01_services_forms.sql تا 08_other_tables.sql: داده‌ها در فایل‌های جداگانه
- 09_foreign_keys.sql: کلیدهای خارجی پس از ورود داده‌ها
- manifest.json: تعداد رکوردهای استخراج‌شده

## ترتیب ورود
فقط به دیتابیس **جدید و خالی** وارد کنید: schema، فایل‌های داده به ترتیب شماره، سپس foreign keys. دیتابیس موجود tusancni_main را هدف نگیرید.

## محدودیت‌ها
این ابزار جداول پایه public را استخراج می‌کند. جدول‌های داخلی auth و storage، فایل‌های Storage، RLS، توابع، تریگرها، مجوزها، defaultها و check constraintهای PostgreSQL به‌طور کامل تبدیل نمی‌شوند. قبل از استفاده عملیاتی، خروجی را در دیتابیس آزمایشی بررسی کنید. ابزار روی Supabase هیچ تغییری اعمال نمی‌کند.
