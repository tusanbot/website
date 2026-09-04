# اپلیکیشن اندروید توسن (TWA)

این پروژه یک Android Trusted Web Activity واقعی برای `https://www.tusancn.ir/` است؛ اپ به‌صورت یک APK/AAB نصب می‌شود و سایت را در محیط TWA اجرا می‌کند، نه به‌صورت Shortcut مرورگر.

## مشخصات

- Package: `ir.tusancn.app`
- Minimum SDK: 23
- Target SDK: 35
- Android Browser Helper: 2.7.3
- URL: `https://www.tusancn.ir/`

## وضعیت Digital Asset Links

برای حذف نوار/رابط مرورگر و فعال‌شدن TWA تأییدشده، فایل زیر باید روی سایت در مسیر `/.well-known/assetlinks.json` قرار گیرد و fingerprint گواهی امضای نسخه release را داشته باشد.

نمونه ساختار:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "ir.tusancn.app",
      "sha256_cert_fingerprints": ["RELEASE_CERT_SHA256_FINGERPRINT"]
    }
  }
]
```

**مهم:** fingerprint باید مربوط به همان certificateای باشد که APK/AAB نهایی با آن امضا می‌شود. کلید خصوصی هرگز نباید داخل GitHub قرار بگیرد.

## ساخت نسخه تست

Workflow زیر با GitHub Actions نسخه Debug را می‌سازد:

`Actions → Build Tusan Android TWA → Run workflow`

برای نسخه انتشار باید یک keystore اختصاصی ایجاد و اطلاعات signing به Secrets/Variables امن CI منتقل شود. پس از آن fingerprint همان certificate در `assetlinks.json` ثبت می‌شود.

## نسخه انتشار

برای انتشار مستقیم روی گوشی، APK قابل استفاده است. برای Google Play، خروجی AAB و signing release توصیه می‌شود.
