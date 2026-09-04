# اپلیکیشن اندروید توسن (TWA)

این پروژه یک Android Trusted Web Activity واقعی برای `https://www.tusancn.ir/` است؛ اپ به‌صورت APK/AAB نصب می‌شود و سایت را در محیط TWA اجرا می‌کند، نه به‌صورت Shortcut مرورگر.

## مشخصات

- Package: `ir.tusancn.app`
- Minimum SDK: 23
- Compile SDK: 36
- Target SDK: 36
- Android Browser Helper: 2.7.3
- URL: `https://www.tusancn.ir/`

## Digital Asset Links

برای اجرای TWA به‌صورت verified و حذف رابط مرورگر، فایل زیر باید روی سایت در مسیر `/.well-known/assetlinks.json` قرار گیرد و fingerprint گواهی امضای نسخه release را داشته باشد.

نمونه ساختار:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "ir.tusancn.app",
      "sha256_cert_fingerprints": ["REAL_RELEASE_CERT_SHA256_FINGERPRINT"]
    }
  }
]
```

**مهم:** fingerprint باید دقیقاً مربوط به همان certificateای باشد که APK/AAB نهایی با آن امضا می‌شود. کلید خصوصی هرگز نباید داخل repository قرار گیرد.

## CI و نسخه تست

Workflow `Build Tusan Android TWA` در GitHub Actions نسخه Debug را می‌سازد و به‌عنوان artifact منتشر می‌کند.

## نسخه انتشار

Workflow دستی علاوه بر Debug، در صورت وجود سه GitHub Secret زیر، APK و AAB امضاشده تولید می‌کند:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

Alias فعلی keystore در workflow: `tusan`.

Keystore فقط در زمان Build روی runner بازسازی می‌شود و پس از Build حذف می‌شود. **کلید خصوصی را در Git commit نکنید.**

برای Google Play، خروجی AAB مناسب است؛ برای نصب مستقیم روی گوشی می‌توان APK امضاشده را استفاده کرد.

پس از ایجاد keystore، SHA-256 certificate آن باید در `assetlinks.json` ثبت شود و سپس دامنه و deep-link روی دستگاه واقعی تست شوند.
