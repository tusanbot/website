-- Tusan Website - Phase 1 COMPLETE service/form seed
-- Scope: registration systems + exams/sanjesh
-- Parent/child hierarchy and conditional rules are intentionally excluded.
-- New services get price=0; existing service prices are preserved.
-- Existing services are updated by exact title; custom form schema is synchronized.
-- Passwords, OTPs and bank-card credentials are intentionally not collected.

DO $$
DECLARE
  item jsonb;
  v_service_id uuid;
  v_schema jsonb;
BEGIN
  FOR item IN
    SELECT value FROM jsonb_array_elements($services$
[
  {
    "title":"ثبت‌نام سامانه ثنا",
    "category":"خدمات قضایی",
    "description":"ثبت‌نام و تکمیل اطلاعات لازم برای استفاده از سامانه ثنا.",
    "icon":"⚖️",
    "form_schema":[
      {"id":"sana_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","placeholder":"نام و نام خانوادگی","required":true},
      {"id":"sana_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"sana_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"sana_birth_certificate_no","type":"text","label":"شماره شناسنامه","name":"birth_certificate_no","required":true},
      {"id":"sana_birth_certificate_series","type":"text","label":"سری شناسنامه","name":"birth_certificate_series","required":true},
      {"id":"sana_birth_certificate_serial","type":"text","label":"سریال شناسنامه","name":"birth_certificate_serial","required":true},
      {"id":"sana_father_name","type":"text","label":"نام پدر","name":"father_name","required":true},
      {"id":"sana_gender","type":"select","label":"جنسیت","name":"gender","required":true,"options":[{"label":"مرد","value":"male"},{"label":"زن","value":"female"}]},
      {"id":"sana_marital_status","type":"select","label":"وضعیت تأهل","name":"marital_status","required":true,"options":[{"label":"مجرد","value":"single"},{"label":"متأهل","value":"married"}]},
      {"id":"sana_education","type":"select","label":"مقطع تحصیلی","name":"education","required":true,"options":[{"label":"زیر دیپلم","value":"below_diploma"},{"label":"دیپلم","value":"diploma"},{"label":"کاردانی","value":"associate"},{"label":"کارشناسی","value":"bachelor"},{"label":"کارشناسی ارشد","value":"master"},{"label":"دکتری","value":"phd"}]},
      {"id":"sana_job","type":"text","label":"شغل","name":"job","required":true},
      {"id":"sana_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"sana_postal_code","type":"text","label":"کد پستی","name":"postal_code","required":true},
      {"id":"sana_address","type":"textarea","label":"آدرس","name":"address","required":true}
    ]
  },
  {
    "title":"ثبت‌نام سجام","category":"خدمات مالی و سرمایه‌گذاری","description":"ثبت‌نام و تکمیل اطلاعات پروفایل سجام.","icon":"📈",
    "form_schema":[
      {"id":"sejam_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","required":true},
      {"id":"sejam_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"sejam_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"sejam_birth_certificate_no","type":"text","label":"شماره شناسنامه","name":"birth_certificate_no","required":true},
      {"id":"sejam_father_name","type":"text","label":"نام پدر","name":"father_name","required":true},
      {"id":"sejam_gender","type":"select","label":"جنسیت","name":"gender","required":true,"options":[{"label":"مرد","value":"male"},{"label":"زن","value":"female"}]},
      {"id":"sejam_marital_status","type":"select","label":"وضعیت تأهل","name":"marital_status","required":true,"options":[{"label":"مجرد","value":"single"},{"label":"متأهل","value":"married"}]},
      {"id":"sejam_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"sejam_postal_code","type":"text","label":"کد پستی","name":"postal_code","required":true},
      {"id":"sejam_address","type":"textarea","label":"آدرس","name":"address","required":true},
      {"id":"sejam_bank","type":"text","label":"نام بانک","name":"bank_name","required":true},
      {"id":"sejam_account","type":"text","label":"شماره حساب","name":"account_number","required":true},
      {"id":"sejam_iban","type":"text","label":"شماره شبا","name":"iban","placeholder":"IR...","required":true},
      {"id":"sejam_occupation","type":"text","label":"شغل","name":"occupation","required":true},
      {"id":"sejam_education","type":"select","label":"تحصیلات","name":"education","required":true,"options":[{"label":"زیر دیپلم","value":"below_diploma"},{"label":"دیپلم","value":"diploma"},{"label":"کاردانی","value":"associate"},{"label":"کارشناسی","value":"bachelor"},{"label":"کارشناسی ارشد","value":"master"},{"label":"دکتری","value":"phd"}]}
    ]
  },
  {
    "title":"احراز هویت سجام","category":"خدمات مالی و سرمایه‌گذاری","description":"آماده‌سازی اطلاعات لازم برای احراز هویت سجام.","icon":"🔐",
    "form_schema":[
      {"id":"sejam_verify_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"sejam_verify_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"sejam_verify_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"sejam_verify_tracking","type":"text","label":"کد رهگیری سجام","name":"tracking_code","required":true}
    ]
  },
  {
    "title":"ثبت‌نام سامانه امتا","category":"خدمات خودرو","description":"ایجاد یا تکمیل حساب کاربری در سامانه امتا.","icon":"🪪",
    "form_schema":[
      {"id":"emta_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"emta_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"emta_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true}
    ]
  },
  {
    "title":"ثبت‌نام سامانه سخا","category":"خدمات دولتی و انتظامی","description":"ثبت‌نام اولیه سامانه سخا پلیس.","icon":"🛡️",
    "form_schema":[
      {"id":"sakha_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"sakha_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"sakha_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true}
    ]
  },
  {
    "title":"ثبت‌نام سامانه میخک","category":"خدمات سفر و کنسولی","description":"ایجاد و تکمیل پروفایل کاربر در سامانه میخک.","icon":"🌐",
    "form_schema":[
      {"id":"mikhak_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","required":true},
      {"id":"mikhak_father_name","type":"text","label":"نام پدر","name":"father_name","required":true},
      {"id":"mikhak_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"mikhak_birth_certificate_no","type":"text","label":"شماره شناسنامه","name":"birth_certificate_no","required":true},
      {"id":"mikhak_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"mikhak_gender","type":"select","label":"جنسیت","name":"gender","required":true,"options":[{"label":"مرد","value":"male"},{"label":"زن","value":"female"}]},
      {"id":"mikhak_marital_status","type":"select","label":"وضعیت تأهل","name":"marital_status","required":true,"options":[{"label":"مجرد","value":"single"},{"label":"متأهل","value":"married"}]},
      {"id":"mikhak_education","type":"select","label":"تحصیلات","name":"education","required":true,"options":[{"label":"زیر دیپلم","value":"below_diploma"},{"label":"دیپلم","value":"diploma"},{"label":"کاردانی","value":"associate"},{"label":"کارشناسی","value":"bachelor"},{"label":"کارشناسی ارشد","value":"master"},{"label":"دکتری","value":"phd"}]},
      {"id":"mikhak_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"mikhak_email","type":"email","label":"ایمیل","name":"email","required":true},
      {"id":"mikhak_country","type":"text","label":"کشور محل اقامت","name":"residence_country","required":true},
      {"id":"mikhak_province","type":"text","label":"استان/ایالت محل اقامت","name":"residence_province","required":true},
      {"id":"mikhak_city","type":"text","label":"شهر محل اقامت","name":"residence_city","required":true},
      {"id":"mikhak_postal_code","type":"text","label":"کد پستی","name":"postal_code","required":true},
      {"id":"mikhak_address","type":"textarea","label":"آدرس محل اقامت","name":"address","required":true}
    ]
  },
  {
    "title":"ثبت‌نام سامانه سماح","category":"خدمات زیارتی و سفر","description":"ثبت اطلاعات زائر و برنامه سفر برای ثبت‌نام سماح.","icon":"🕋",
    "form_schema":[
      {"id":"samah_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","required":true},
      {"id":"samah_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"samah_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"samah_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"samah_passport_no","type":"text","label":"شماره گذرنامه","name":"passport_number","required":true},
      {"id":"samah_passport_expiry","type":"date","label":"تاریخ انقضای گذرنامه","name":"passport_expiry","required":true},
      {"id":"samah_departure_border","type":"text","label":"مرز خروج پیشنهادی","name":"departure_border","required":true},
      {"id":"samah_return_border","type":"text","label":"مرز ورود پیشنهادی","name":"return_border","required":true},
      {"id":"samah_departure_date","type":"date","label":"تاریخ رفت","name":"departure_date","required":true},
      {"id":"samah_return_date","type":"date","label":"تاریخ بازگشت","name":"return_date","required":true},
      {"id":"samah_transport","type":"select","label":"وسیله نقلیه","name":"transport","required":true,"options":[{"label":"اتوبوس","value":"bus"},{"label":"خودرو شخصی","value":"private_car"},{"label":"سایر","value":"other"}]},
      {"id":"samah_notes","type":"textarea","label":"توضیحات","name":"notes","required":false}
    ]
  },
  {
    "title":"ثبت‌نام کنکور سراسری","category":"آزمون و سنجش","description":"جمع‌آوری اطلاعات لازم برای ثبت‌نام آزمون سراسری؛ جزئیات وابسته به دفترچه همان سال است.","icon":"🎓",
    "form_schema":[
      {"id":"konkur_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","required":true},
      {"id":"konkur_father_name","type":"text","label":"نام پدر","name":"father_name","required":true},
      {"id":"konkur_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"konkur_birth_certificate_no","type":"text","label":"شماره شناسنامه","name":"birth_certificate_no","required":true},
      {"id":"konkur_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"konkur_gender","type":"select","label":"جنسیت","name":"gender","required":true,"options":[{"label":"مرد","value":"male"},{"label":"زن","value":"female"}]},
      {"id":"konkur_marital_status","type":"select","label":"وضعیت تأهل","name":"marital_status","required":true,"options":[{"label":"مجرد","value":"single"},{"label":"متأهل","value":"married"}]},
      {"id":"konkur_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"konkur_phone","type":"text","label":"تلفن ثابت","name":"phone","required":false},
      {"id":"konkur_postal_code","type":"text","label":"کد پستی","name":"postal_code","required":true},
      {"id":"konkur_address","type":"textarea","label":"آدرس","name":"address","required":true},
      {"id":"konkur_education","type":"select","label":"نوع مدرک/نظام آموزشی","name":"education_system","required":true,"options":[{"label":"نظام جدید","value":"new"},{"label":"نظام قدیم","value":"old"}]},
      {"id":"konkur_diploma_field","type":"text","label":"رشته دیپلم","name":"diploma_field","required":true},
      {"id":"konkur_diploma_year","type":"number","label":"سال اخذ دیپلم","name":"diploma_year","required":true},
      {"id":"konkur_diploma_gpa","type":"number","label":"معدل دیپلم","name":"diploma_gpa","required":true},
      {"id":"konkur_academic_record_code","type":"text","label":"کد سوابق تحصیلی","name":"academic_record_code","required":false},
      {"id":"konkur_region","type":"text","label":"منطقه آموزشی","name":"education_region","required":true},
      {"id":"konkur_quota","type":"text","label":"نوع سهمیه","name":"quota","required":true},
      {"id":"konkur_military_status","type":"select","label":"وضعیت نظام وظیفه","name":"military_status","required":false,"options":[{"label":"مشمول نیستم","value":"not_applicable"},{"label":"پایان خدمت","value":"completed"},{"label":"معافیت","value":"exempt"},{"label":"سایر","value":"other"}]},
      {"id":"konkur_registration_serial","type":"text","label":"سریال/شماره ثبت‌نام","name":"registration_serial","required":true}
    ]
  },
  {
    "title":"ثبت‌نام آزمون کارشناسی ارشد","category":"آزمون و سنجش","description":"جمع‌آوری اطلاعات لازم برای ثبت‌نام آزمون کارشناسی ارشد؛ اطلاعات تخصصی رشته طبق دفترچه سال مربوط تکمیل می‌شود.","icon":"📚",
    "form_schema":[
      {"id":"master_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","required":true},
      {"id":"master_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"master_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"master_birth_certificate_no","type":"text","label":"شماره شناسنامه","name":"birth_certificate_no","required":true},
      {"id":"master_father_name","type":"text","label":"نام پدر","name":"father_name","required":true},
      {"id":"master_gender","type":"select","label":"جنسیت","name":"gender","required":true,"options":[{"label":"مرد","value":"male"},{"label":"زن","value":"female"}]},
      {"id":"master_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"master_postal_code","type":"text","label":"کد پستی","name":"postal_code","required":true},
      {"id":"master_address","type":"textarea","label":"آدرس","name":"address","required":true},
      {"id":"master_bachelor_field","type":"text","label":"رشته کارشناسی","name":"bachelor_field","required":true},
      {"id":"master_bachelor_university","type":"text","label":"دانشگاه محل تحصیل کارشناسی","name":"bachelor_university","required":true},
      {"id":"master_bachelor_gpa","type":"number","label":"معدل کارشناسی","name":"bachelor_gpa","required":true},
      {"id":"master_graduation_year","type":"number","label":"سال فراغت از تحصیل","name":"graduation_year","required":true},
      {"id":"master_quota","type":"text","label":"نوع سهمیه","name":"quota","required":true},
      {"id":"master_military_status","type":"select","label":"وضعیت نظام وظیفه","name":"military_status","required":false,"options":[{"label":"مشمول نیستم","value":"not_applicable"},{"label":"پایان خدمت","value":"completed"},{"label":"معافیت","value":"exempt"},{"label":"سایر","value":"other"}]},
      {"id":"master_registration_serial","type":"text","label":"سریال ثبت‌نام","name":"registration_serial","required":true}
    ]
  },
  {
    "title":"ثبت‌نام آزمون دکتری","category":"آزمون و سنجش","description":"جمع‌آوری اطلاعات پایه برای ثبت‌نام آزمون دکتری؛ جزئیات تخصصی طبق دفترچه همان سال بررسی می‌شود.","icon":"🔬",
    "form_schema":[
      {"id":"phd_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","required":true},
      {"id":"phd_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"phd_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"phd_birth_certificate_no","type":"text","label":"شماره شناسنامه","name":"birth_certificate_no","required":true},
      {"id":"phd_father_name","type":"text","label":"نام پدر","name":"father_name","required":true},
      {"id":"phd_gender","type":"select","label":"جنسیت","name":"gender","required":true,"options":[{"label":"مرد","value":"male"},{"label":"زن","value":"female"}]},
      {"id":"phd_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"phd_postal_code","type":"text","label":"کد پستی","name":"postal_code","required":true},
      {"id":"phd_address","type":"textarea","label":"آدرس","name":"address","required":true},
      {"id":"phd_bachelor_field","type":"text","label":"رشته کارشناسی","name":"bachelor_field","required":true},
      {"id":"phd_master_field","type":"text","label":"رشته کارشناسی ارشد","name":"master_field","required":true},
      {"id":"phd_master_university","type":"text","label":"دانشگاه کارشناسی ارشد","name":"master_university","required":true},
      {"id":"phd_master_gpa","type":"number","label":"معدل کارشناسی ارشد","name":"master_gpa","required":true},
      {"id":"phd_graduation_status","type":"select","label":"وضعیت تحصیل","name":"graduation_status","required":true,"options":[{"label":"فارغ‌التحصیل","value":"graduated"},{"label":"در حال تحصیل","value":"studying"}]},
      {"id":"phd_quota","type":"text","label":"نوع سهمیه","name":"quota","required":true},
      {"id":"phd_military_status","type":"select","label":"وضعیت نظام وظیفه","name":"military_status","required":false,"options":[{"label":"مشمول نیستم","value":"not_applicable"},{"label":"پایان خدمت","value":"completed"},{"label":"معافیت","value":"exempt"},{"label":"سایر","value":"other"}]},
      {"id":"phd_registration_serial","type":"text","label":"سریال ثبت‌نام","name":"registration_serial","required":true}
    ]
  },
  {
    "title":"ثبت‌نام آزمون استخدامی","category":"آزمون و استخدام","description":"ثبت اطلاعات پایه برای انجام ثبت‌نام آزمون‌های استخدامی؛ جزئیات بسته به دستگاه و دفترچه آزمون متغیر است.","icon":"💼",
    "form_schema":[
      {"id":"employment_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","required":true},
      {"id":"employment_father_name","type":"text","label":"نام پدر","name":"father_name","required":true},
      {"id":"employment_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"employment_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"employment_gender","type":"select","label":"جنسیت","name":"gender","required":true,"options":[{"label":"مرد","value":"male"},{"label":"زن","value":"female"}]},
      {"id":"employment_marital_status","type":"select","label":"وضعیت تأهل","name":"marital_status","required":true,"options":[{"label":"مجرد","value":"single"},{"label":"متأهل","value":"married"}]},
      {"id":"employment_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"employment_postal_code","type":"text","label":"کد پستی","name":"postal_code","required":true},
      {"id":"employment_address","type":"textarea","label":"آدرس","name":"address","required":true},
      {"id":"employment_degree","type":"text","label":"مدرک تحصیلی","name":"degree","required":true},
      {"id":"employment_field","type":"text","label":"رشته تحصیلی","name":"field_of_study","required":true},
      {"id":"employment_gpa","type":"number","label":"معدل","name":"gpa","required":true},
      {"id":"employment_quota","type":"text","label":"نوع سهمیه","name":"quota","required":true},
      {"id":"employment_military_status","type":"select","label":"وضعیت نظام وظیفه","name":"military_status","required":false,"options":[{"label":"مشمول نیستم","value":"not_applicable"},{"label":"پایان خدمت","value":"completed"},{"label":"معافیت","value":"exempt"},{"label":"سایر","value":"other"}]},
      {"id":"employment_exam_title","type":"text","label":"عنوان آزمون استخدامی","name":"exam_title","required":true},
      {"id":"employment_job_title","type":"text","label":"عنوان شغل/رشته شغلی","name":"job_title","required":true}
    ]
  },
  {
    "title":"ثبت‌نام دانشگاه آزاد","category":"آموزشی و دانشگاهی","description":"ثبت اطلاعات پایه متقاضی برای فرآیند ثبت‌نام دانشگاه آزاد.","icon":"🏫",
    "form_schema":[
      {"id":"azad_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","required":true},
      {"id":"azad_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"azad_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
      {"id":"azad_birth_certificate_no","type":"text","label":"شماره شناسنامه","name":"birth_certificate_no","required":true},
      {"id":"azad_father_name","type":"text","label":"نام پدر","name":"father_name","required":true},
      {"id":"azad_gender","type":"select","label":"جنسیت","name":"gender","required":true,"options":[{"label":"مرد","value":"male"},{"label":"زن","value":"female"}]},
      {"id":"azad_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
      {"id":"azad_degree","type":"text","label":"مدرک تحصیلی","name":"degree","required":true},
      {"id":"azad_field","type":"text","label":"رشته تحصیلی","name":"field_of_study","required":true},
      {"id":"azad_gpa","type":"number","label":"معدل","name":"gpa","required":true},
      {"id":"azad_province","type":"text","label":"استان","name":"province","required":true},
      {"id":"azad_city","type":"text","label":"شهر","name":"city","required":true}
    ]
  },
  {
    "title":"دریافت کارت ورود به جلسه آزمون","category":"آزمون و سنجش","description":"جمع‌آوری شناسه‌های لازم برای دریافت کارت ورود به جلسه آزمون.","icon":"🎫",
    "form_schema":[
      {"id":"card_exam_title","type":"text","label":"عنوان آزمون","name":"exam_title","required":true},
      {"id":"card_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"card_candidate_no","type":"text","label":"شماره داوطلبی","name":"candidate_number","required":false},
      {"id":"card_file_no","type":"text","label":"شماره پرونده","name":"file_number","required":false},
      {"id":"card_registration_serial","type":"text","label":"سریال ثبت‌نام","name":"registration_serial","required":false},
      {"id":"card_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":false}
    ]
  },
  {
    "title":"دریافت نتایج آزمون","category":"آزمون و سنجش","description":"جمع‌آوری شناسه‌های لازم برای دریافت نتیجه آزمون.","icon":"📊",
    "form_schema":[
      {"id":"result_exam_title","type":"text","label":"عنوان آزمون","name":"exam_title","required":true},
      {"id":"result_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"result_candidate_no","type":"text","label":"شماره داوطلبی","name":"candidate_number","required":false},
      {"id":"result_file_no","type":"text","label":"شماره پرونده","name":"file_number","required":false},
      {"id":"result_registration_serial","type":"text","label":"سریال ثبت‌نام","name":"registration_serial","required":false}
    ]
  },
  {
    "title":"ویرایش اطلاعات ثبت‌نام آزمون","category":"آزمون و سنجش","description":"ثبت مشخصات و مورد اصلاح برای پیگیری و انجام ویرایش اطلاعات ثبت‌نام.","icon":"✏️",
    "form_schema":[
      {"id":"edit_exam_title","type":"text","label":"عنوان آزمون","name":"exam_title","required":true},
      {"id":"edit_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
      {"id":"edit_file_no","type":"text","label":"شماره پرونده","name":"file_number","required":false},
      {"id":"edit_candidate_no","type":"text","label":"شماره داوطلبی","name":"candidate_number","required":false},
      {"id":"edit_registration_serial","type":"text","label":"سریال ثبت‌نام","name":"registration_serial","required":false},
      {"id":"edit_request","type":"textarea","label":"شرح اطلاعاتی که باید اصلاح شود","name":"edit_request","required":true}
    ]
  }
]
$services$::jsonb) LOOP
    v_schema := item->'form_schema';
    SELECT id INTO v_service_id FROM services WHERE title = item->>'title' LIMIT 1;

    IF v_service_id IS NULL THEN
      INSERT INTO services (title, category, description, price, icon, is_active, form_schema, parent_service_id)
      VALUES (
        item->>'title', item->>'category', item->>'description', 0,
        NULLIF(item->>'icon',''), true, v_schema, NULL
      ) RETURNING id INTO v_service_id;
    ELSE
      UPDATE services
      SET category = item->>'category',
          description = item->>'description',
          icon = NULLIF(item->>'icon',''),
          is_active = true,
          form_schema = v_schema,
          parent_service_id = NULL
      WHERE id = v_service_id;
    END IF;

    UPDATE custom_forms
    SET description = item->>'description',
        schema = v_schema,
        is_public = true,
        form_type = 'normal',
        parent_form_id = NULL,
        sort_order = 0
    WHERE service_id = v_service_id AND title = item->>'title';

    IF NOT FOUND THEN
      INSERT INTO custom_forms
        (title, description, schema, created_by, is_public, form_type, parent_form_id, service_id, sort_order)
      VALUES
        (item->>'title', item->>'description', v_schema, NULL, true, 'normal', NULL, v_service_id, 0);
    END IF;
  END LOOP;
END $$;

-- Notes:
-- 1) Parent/child relations are intentionally NULL and must be configured from the admin UI.
-- 2) Conditional fields are intentionally not seeded; they can be configured later in ServiceFormBuilder.
-- 3) Prices of existing services are preserved. New services start at 0 تومان.
-- 4) Exact exam fields must be reviewed against the current year's official booklet before the corresponding registration window.
