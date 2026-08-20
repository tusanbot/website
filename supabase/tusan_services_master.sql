-- Tusan Website - MASTER services/custom_forms seed
-- Generated deterministically from Phase 1-5 seed catalogs.
-- Supabase SQL Editor compatible: no psql meta-commands and no file includes.
-- Idempotent by normalized service/form title.
-- Duplicate catalog entries are resolved by first appearance (Phase 1 > Phase 2 > Phase 3 > Phase 4 > Phase 5).
--
-- Duplicate catalog entries removed during generation:
--   ثبت‌نام دانشگاه آزاد: kept tusan_services_phase1_complete.sql; removed duplicate from tusan_services_phase2.sql
--   ثبت‌نام آزمون استخدامی: kept tusan_services_phase1_complete.sql; removed duplicate from tusan_services_phase4.sql

BEGIN;

-- Align services/custom_forms hierarchy with the production migrations.
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS parent_service_id uuid NULL;
ALTER TABLE public.custom_forms ADD COLUMN IF NOT EXISTS form_type text NOT NULL DEFAULT 'normal';
ALTER TABLE public.custom_forms ADD COLUMN IF NOT EXISTS parent_form_id uuid NULL;
ALTER TABLE public.custom_forms ADD COLUMN IF NOT EXISTS service_id uuid NULL;
ALTER TABLE public.custom_forms ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Recreate hierarchy constraints so an older/partial constraint cannot survive with incompatible semantics.
ALTER TABLE public.custom_forms DROP CONSTRAINT IF EXISTS custom_forms_form_type_check;
ALTER TABLE public.custom_forms ADD CONSTRAINT custom_forms_form_type_check CHECK (form_type IN ('normal', 'parent'));
ALTER TABLE public.custom_forms DROP CONSTRAINT IF EXISTS custom_forms_hierarchy_check;
ALTER TABLE public.custom_forms ADD CONSTRAINT custom_forms_hierarchy_check CHECK ((form_type = 'parent' AND parent_form_id IS NULL) OR (form_type = 'normal'));
ALTER TABLE public.custom_forms DROP CONSTRAINT IF EXISTS custom_forms_parent_form_id_fkey;
ALTER TABLE public.custom_forms ADD CONSTRAINT custom_forms_parent_form_id_fkey FOREIGN KEY (parent_form_id) REFERENCES public.custom_forms(id) ON DELETE CASCADE;
ALTER TABLE public.custom_forms DROP CONSTRAINT IF EXISTS custom_forms_service_id_fkey;
ALTER TABLE public.custom_forms ADD CONSTRAINT custom_forms_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_parent_service_id_fkey;
ALTER TABLE public.services ADD CONSTRAINT services_parent_service_id_fkey FOREIGN KEY (parent_service_id) REFERENCES public.services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_custom_forms_service_id ON public.custom_forms(service_id);
CREATE INDEX IF NOT EXISTS idx_custom_forms_parent_form_id ON public.custom_forms(parent_form_id);
CREATE INDEX IF NOT EXISTS idx_custom_forms_service_parent_sort ON public.custom_forms(service_id, parent_form_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_services_parent_service_id ON public.services(parent_service_id);
CREATE INDEX IF NOT EXISTS idx_services_active_parent_created ON public.services(is_active, parent_service_id, created_at DESC);

-- Canonical service/form seed.
-- Every catalog service is a standalone service with one normal root form.
-- Mother/child forms are intentionally not fabricated by this catalog seed.
DO $$
DECLARE
  item jsonb;
  v_service_id uuid;
  v_form_id uuid;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements($seed$
[
  {
    "title": "ثبت‌نام سامانه ثنا",
    "category": "خدمات قضایی",
    "description": "ثبت‌نام و تکمیل اطلاعات لازم برای استفاده از سامانه ثنا.",
    "icon": "⚖️",
    "form_schema": [
      {
        "id": "sana_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "placeholder": "نام و نام خانوادگی",
        "required": true
      },
      {
        "id": "sana_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "sana_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "sana_birth_certificate_no",
        "type": "text",
        "label": "شماره شناسنامه",
        "name": "birth_certificate_no",
        "required": true
      },
      {
        "id": "sana_birth_certificate_series",
        "type": "text",
        "label": "سری شناسنامه",
        "name": "birth_certificate_series",
        "required": true
      },
      {
        "id": "sana_birth_certificate_serial",
        "type": "text",
        "label": "سریال شناسنامه",
        "name": "birth_certificate_serial",
        "required": true
      },
      {
        "id": "sana_father_name",
        "type": "text",
        "label": "نام پدر",
        "name": "father_name",
        "required": true
      },
      {
        "id": "sana_gender",
        "type": "select",
        "label": "جنسیت",
        "name": "gender",
        "required": true,
        "options": [
          {
            "label": "مرد",
            "value": "male"
          },
          {
            "label": "زن",
            "value": "female"
          }
        ]
      },
      {
        "id": "sana_marital_status",
        "type": "select",
        "label": "وضعیت تأهل",
        "name": "marital_status",
        "required": true,
        "options": [
          {
            "label": "مجرد",
            "value": "single"
          },
          {
            "label": "متأهل",
            "value": "married"
          }
        ]
      },
      {
        "id": "sana_education",
        "type": "select",
        "label": "مقطع تحصیلی",
        "name": "education",
        "required": true,
        "options": [
          {
            "label": "زیر دیپلم",
            "value": "below_diploma"
          },
          {
            "label": "دیپلم",
            "value": "diploma"
          },
          {
            "label": "کاردانی",
            "value": "associate"
          },
          {
            "label": "کارشناسی",
            "value": "bachelor"
          },
          {
            "label": "کارشناسی ارشد",
            "value": "master"
          },
          {
            "label": "دکتری",
            "value": "phd"
          }
        ]
      },
      {
        "id": "sana_job",
        "type": "text",
        "label": "شغل",
        "name": "job",
        "required": true
      },
      {
        "id": "sana_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "sana_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "sana_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام سجام",
    "category": "خدمات مالی و سرمایه‌گذاری",
    "description": "ثبت‌نام و تکمیل اطلاعات پروفایل سجام.",
    "icon": "📈",
    "form_schema": [
      {
        "id": "sejam_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "sejam_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "sejam_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "sejam_birth_certificate_no",
        "type": "text",
        "label": "شماره شناسنامه",
        "name": "birth_certificate_no",
        "required": true
      },
      {
        "id": "sejam_father_name",
        "type": "text",
        "label": "نام پدر",
        "name": "father_name",
        "required": true
      },
      {
        "id": "sejam_gender",
        "type": "select",
        "label": "جنسیت",
        "name": "gender",
        "required": true,
        "options": [
          {
            "label": "مرد",
            "value": "male"
          },
          {
            "label": "زن",
            "value": "female"
          }
        ]
      },
      {
        "id": "sejam_marital_status",
        "type": "select",
        "label": "وضعیت تأهل",
        "name": "marital_status",
        "required": true,
        "options": [
          {
            "label": "مجرد",
            "value": "single"
          },
          {
            "label": "متأهل",
            "value": "married"
          }
        ]
      },
      {
        "id": "sejam_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "sejam_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "sejam_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      },
      {
        "id": "sejam_bank",
        "type": "text",
        "label": "نام بانک",
        "name": "bank_name",
        "required": true
      },
      {
        "id": "sejam_account",
        "type": "text",
        "label": "شماره حساب",
        "name": "account_number",
        "required": true
      },
      {
        "id": "sejam_iban",
        "type": "text",
        "label": "شماره شبا",
        "name": "iban",
        "placeholder": "IR...",
        "required": true
      },
      {
        "id": "sejam_occupation",
        "type": "text",
        "label": "شغل",
        "name": "occupation",
        "required": true
      },
      {
        "id": "sejam_education",
        "type": "select",
        "label": "تحصیلات",
        "name": "education",
        "required": true,
        "options": [
          {
            "label": "زیر دیپلم",
            "value": "below_diploma"
          },
          {
            "label": "دیپلم",
            "value": "diploma"
          },
          {
            "label": "کاردانی",
            "value": "associate"
          },
          {
            "label": "کارشناسی",
            "value": "bachelor"
          },
          {
            "label": "کارشناسی ارشد",
            "value": "master"
          },
          {
            "label": "دکتری",
            "value": "phd"
          }
        ]
      }
    ]
  },
  {
    "title": "احراز هویت سجام",
    "category": "خدمات مالی و سرمایه‌گذاری",
    "description": "آماده‌سازی اطلاعات لازم برای احراز هویت سجام.",
    "icon": "🔐",
    "form_schema": [
      {
        "id": "sejam_verify_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "sejam_verify_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "sejam_verify_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "sejam_verify_tracking",
        "type": "text",
        "label": "کد رهگیری سجام",
        "name": "tracking_code",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام سامانه امتا",
    "category": "خدمات خودرو",
    "description": "ایجاد یا تکمیل حساب کاربری در سامانه امتا.",
    "icon": "🪪",
    "form_schema": [
      {
        "id": "emta_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "emta_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "emta_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام سامانه سخا",
    "category": "خدمات دولتی و انتظامی",
    "description": "ثبت‌نام اولیه سامانه سخا پلیس.",
    "icon": "🛡️",
    "form_schema": [
      {
        "id": "sakha_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "sakha_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "sakha_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام سامانه میخک",
    "category": "خدمات سفر و کنسولی",
    "description": "ایجاد و تکمیل پروفایل کاربر در سامانه میخک.",
    "icon": "🌐",
    "form_schema": [
      {
        "id": "mikhak_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "mikhak_father_name",
        "type": "text",
        "label": "نام پدر",
        "name": "father_name",
        "required": true
      },
      {
        "id": "mikhak_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "mikhak_birth_certificate_no",
        "type": "text",
        "label": "شماره شناسنامه",
        "name": "birth_certificate_no",
        "required": true
      },
      {
        "id": "mikhak_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "mikhak_gender",
        "type": "select",
        "label": "جنسیت",
        "name": "gender",
        "required": true,
        "options": [
          {
            "label": "مرد",
            "value": "male"
          },
          {
            "label": "زن",
            "value": "female"
          }
        ]
      },
      {
        "id": "mikhak_marital_status",
        "type": "select",
        "label": "وضعیت تأهل",
        "name": "marital_status",
        "required": true,
        "options": [
          {
            "label": "مجرد",
            "value": "single"
          },
          {
            "label": "متأهل",
            "value": "married"
          }
        ]
      },
      {
        "id": "mikhak_education",
        "type": "select",
        "label": "تحصیلات",
        "name": "education",
        "required": true,
        "options": [
          {
            "label": "زیر دیپلم",
            "value": "below_diploma"
          },
          {
            "label": "دیپلم",
            "value": "diploma"
          },
          {
            "label": "کاردانی",
            "value": "associate"
          },
          {
            "label": "کارشناسی",
            "value": "bachelor"
          },
          {
            "label": "کارشناسی ارشد",
            "value": "master"
          },
          {
            "label": "دکتری",
            "value": "phd"
          }
        ]
      },
      {
        "id": "mikhak_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "mikhak_email",
        "type": "email",
        "label": "ایمیل",
        "name": "email",
        "required": true
      },
      {
        "id": "mikhak_country",
        "type": "text",
        "label": "کشور محل اقامت",
        "name": "residence_country",
        "required": true
      },
      {
        "id": "mikhak_province",
        "type": "text",
        "label": "استان/ایالت محل اقامت",
        "name": "residence_province",
        "required": true
      },
      {
        "id": "mikhak_city",
        "type": "text",
        "label": "شهر محل اقامت",
        "name": "residence_city",
        "required": true
      },
      {
        "id": "mikhak_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "mikhak_address",
        "type": "textarea",
        "label": "آدرس محل اقامت",
        "name": "address",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام سامانه سماح",
    "category": "خدمات زیارتی و سفر",
    "description": "ثبت اطلاعات زائر و برنامه سفر برای ثبت‌نام سماح.",
    "icon": "🕋",
    "form_schema": [
      {
        "id": "samah_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "samah_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "samah_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "samah_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "samah_passport_no",
        "type": "text",
        "label": "شماره گذرنامه",
        "name": "passport_number",
        "required": true
      },
      {
        "id": "samah_passport_expiry",
        "type": "date",
        "label": "تاریخ انقضای گذرنامه",
        "name": "passport_expiry",
        "required": true
      },
      {
        "id": "samah_departure_border",
        "type": "text",
        "label": "مرز خروج پیشنهادی",
        "name": "departure_border",
        "required": true
      },
      {
        "id": "samah_return_border",
        "type": "text",
        "label": "مرز ورود پیشنهادی",
        "name": "return_border",
        "required": true
      },
      {
        "id": "samah_departure_date",
        "type": "date",
        "label": "تاریخ رفت",
        "name": "departure_date",
        "required": true
      },
      {
        "id": "samah_return_date",
        "type": "date",
        "label": "تاریخ بازگشت",
        "name": "return_date",
        "required": true
      },
      {
        "id": "samah_transport",
        "type": "select",
        "label": "وسیله نقلیه",
        "name": "transport",
        "required": true,
        "options": [
          {
            "label": "اتوبوس",
            "value": "bus"
          },
          {
            "label": "خودرو شخصی",
            "value": "private_car"
          },
          {
            "label": "سایر",
            "value": "other"
          }
        ]
      },
      {
        "id": "samah_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ثبت‌نام کنکور سراسری",
    "category": "آزمون و سنجش",
    "description": "جمع‌آوری اطلاعات لازم برای ثبت‌نام آزمون سراسری؛ جزئیات وابسته به دفترچه همان سال است.",
    "icon": "🎓",
    "form_schema": [
      {
        "id": "konkur_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "konkur_father_name",
        "type": "text",
        "label": "نام پدر",
        "name": "father_name",
        "required": true
      },
      {
        "id": "konkur_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "konkur_birth_certificate_no",
        "type": "text",
        "label": "شماره شناسنامه",
        "name": "birth_certificate_no",
        "required": true
      },
      {
        "id": "konkur_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "konkur_gender",
        "type": "select",
        "label": "جنسیت",
        "name": "gender",
        "required": true,
        "options": [
          {
            "label": "مرد",
            "value": "male"
          },
          {
            "label": "زن",
            "value": "female"
          }
        ]
      },
      {
        "id": "konkur_marital_status",
        "type": "select",
        "label": "وضعیت تأهل",
        "name": "marital_status",
        "required": true,
        "options": [
          {
            "label": "مجرد",
            "value": "single"
          },
          {
            "label": "متأهل",
            "value": "married"
          }
        ]
      },
      {
        "id": "konkur_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "konkur_phone",
        "type": "text",
        "label": "تلفن ثابت",
        "name": "phone",
        "required": false
      },
      {
        "id": "konkur_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "konkur_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      },
      {
        "id": "konkur_education",
        "type": "select",
        "label": "نوع مدرک/نظام آموزشی",
        "name": "education_system",
        "required": true,
        "options": [
          {
            "label": "نظام جدید",
            "value": "new"
          },
          {
            "label": "نظام قدیم",
            "value": "old"
          }
        ]
      },
      {
        "id": "konkur_diploma_field",
        "type": "text",
        "label": "رشته دیپلم",
        "name": "diploma_field",
        "required": true
      },
      {
        "id": "konkur_diploma_year",
        "type": "number",
        "label": "سال اخذ دیپلم",
        "name": "diploma_year",
        "required": true
      },
      {
        "id": "konkur_diploma_gpa",
        "type": "number",
        "label": "معدل دیپلم",
        "name": "diploma_gpa",
        "required": true
      },
      {
        "id": "konkur_academic_record_code",
        "type": "text",
        "label": "کد سوابق تحصیلی",
        "name": "academic_record_code",
        "required": false
      },
      {
        "id": "konkur_region",
        "type": "text",
        "label": "منطقه آموزشی",
        "name": "education_region",
        "required": true
      },
      {
        "id": "konkur_quota",
        "type": "text",
        "label": "نوع سهمیه",
        "name": "quota",
        "required": true
      },
      {
        "id": "konkur_military_status",
        "type": "select",
        "label": "وضعیت نظام وظیفه",
        "name": "military_status",
        "required": false,
        "options": [
          {
            "label": "مشمول نیستم",
            "value": "not_applicable"
          },
          {
            "label": "پایان خدمت",
            "value": "completed"
          },
          {
            "label": "معافیت",
            "value": "exempt"
          },
          {
            "label": "سایر",
            "value": "other"
          }
        ]
      },
      {
        "id": "konkur_registration_serial",
        "type": "text",
        "label": "سریال/شماره ثبت‌نام",
        "name": "registration_serial",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام آزمون کارشناسی ارشد",
    "category": "آزمون و سنجش",
    "description": "جمع‌آوری اطلاعات لازم برای ثبت‌نام آزمون کارشناسی ارشد؛ اطلاعات تخصصی رشته طبق دفترچه سال مربوط تکمیل می‌شود.",
    "icon": "📚",
    "form_schema": [
      {
        "id": "master_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "master_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "master_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "master_birth_certificate_no",
        "type": "text",
        "label": "شماره شناسنامه",
        "name": "birth_certificate_no",
        "required": true
      },
      {
        "id": "master_father_name",
        "type": "text",
        "label": "نام پدر",
        "name": "father_name",
        "required": true
      },
      {
        "id": "master_gender",
        "type": "select",
        "label": "جنسیت",
        "name": "gender",
        "required": true,
        "options": [
          {
            "label": "مرد",
            "value": "male"
          },
          {
            "label": "زن",
            "value": "female"
          }
        ]
      },
      {
        "id": "master_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "master_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "master_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      },
      {
        "id": "master_bachelor_field",
        "type": "text",
        "label": "رشته کارشناسی",
        "name": "bachelor_field",
        "required": true
      },
      {
        "id": "master_bachelor_university",
        "type": "text",
        "label": "دانشگاه محل تحصیل کارشناسی",
        "name": "bachelor_university",
        "required": true
      },
      {
        "id": "master_bachelor_gpa",
        "type": "number",
        "label": "معدل کارشناسی",
        "name": "bachelor_gpa",
        "required": true
      },
      {
        "id": "master_graduation_year",
        "type": "number",
        "label": "سال فراغت از تحصیل",
        "name": "graduation_year",
        "required": true
      },
      {
        "id": "master_quota",
        "type": "text",
        "label": "نوع سهمیه",
        "name": "quota",
        "required": true
      },
      {
        "id": "master_military_status",
        "type": "select",
        "label": "وضعیت نظام وظیفه",
        "name": "military_status",
        "required": false,
        "options": [
          {
            "label": "مشمول نیستم",
            "value": "not_applicable"
          },
          {
            "label": "پایان خدمت",
            "value": "completed"
          },
          {
            "label": "معافیت",
            "value": "exempt"
          },
          {
            "label": "سایر",
            "value": "other"
          }
        ]
      },
      {
        "id": "master_registration_serial",
        "type": "text",
        "label": "سریال ثبت‌نام",
        "name": "registration_serial",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام آزمون دکتری",
    "category": "آزمون و سنجش",
    "description": "جمع‌آوری اطلاعات پایه برای ثبت‌نام آزمون دکتری؛ جزئیات تخصصی طبق دفترچه همان سال بررسی می‌شود.",
    "icon": "🔬",
    "form_schema": [
      {
        "id": "phd_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "phd_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "phd_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "phd_birth_certificate_no",
        "type": "text",
        "label": "شماره شناسنامه",
        "name": "birth_certificate_no",
        "required": true
      },
      {
        "id": "phd_father_name",
        "type": "text",
        "label": "نام پدر",
        "name": "father_name",
        "required": true
      },
      {
        "id": "phd_gender",
        "type": "select",
        "label": "جنسیت",
        "name": "gender",
        "required": true,
        "options": [
          {
            "label": "مرد",
            "value": "male"
          },
          {
            "label": "زن",
            "value": "female"
          }
        ]
      },
      {
        "id": "phd_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "phd_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "phd_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      },
      {
        "id": "phd_bachelor_field",
        "type": "text",
        "label": "رشته کارشناسی",
        "name": "bachelor_field",
        "required": true
      },
      {
        "id": "phd_master_field",
        "type": "text",
        "label": "رشته کارشناسی ارشد",
        "name": "master_field",
        "required": true
      },
      {
        "id": "phd_master_university",
        "type": "text",
        "label": "دانشگاه کارشناسی ارشد",
        "name": "master_university",
        "required": true
      },
      {
        "id": "phd_master_gpa",
        "type": "number",
        "label": "معدل کارشناسی ارشد",
        "name": "master_gpa",
        "required": true
      },
      {
        "id": "phd_graduation_status",
        "type": "select",
        "label": "وضعیت تحصیل",
        "name": "graduation_status",
        "required": true,
        "options": [
          {
            "label": "فارغ‌التحصیل",
            "value": "graduated"
          },
          {
            "label": "در حال تحصیل",
            "value": "studying"
          }
        ]
      },
      {
        "id": "phd_quota",
        "type": "text",
        "label": "نوع سهمیه",
        "name": "quota",
        "required": true
      },
      {
        "id": "phd_military_status",
        "type": "select",
        "label": "وضعیت نظام وظیفه",
        "name": "military_status",
        "required": false,
        "options": [
          {
            "label": "مشمول نیستم",
            "value": "not_applicable"
          },
          {
            "label": "پایان خدمت",
            "value": "completed"
          },
          {
            "label": "معافیت",
            "value": "exempt"
          },
          {
            "label": "سایر",
            "value": "other"
          }
        ]
      },
      {
        "id": "phd_registration_serial",
        "type": "text",
        "label": "سریال ثبت‌نام",
        "name": "registration_serial",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام آزمون استخدامی",
    "category": "آزمون و استخدام",
    "description": "ثبت اطلاعات پایه برای انجام ثبت‌نام آزمون‌های استخدامی؛ جزئیات بسته به دستگاه و دفترچه آزمون متغیر است.",
    "icon": "💼",
    "form_schema": [
      {
        "id": "employment_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "employment_father_name",
        "type": "text",
        "label": "نام پدر",
        "name": "father_name",
        "required": true
      },
      {
        "id": "employment_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "employment_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "employment_gender",
        "type": "select",
        "label": "جنسیت",
        "name": "gender",
        "required": true,
        "options": [
          {
            "label": "مرد",
            "value": "male"
          },
          {
            "label": "زن",
            "value": "female"
          }
        ]
      },
      {
        "id": "employment_marital_status",
        "type": "select",
        "label": "وضعیت تأهل",
        "name": "marital_status",
        "required": true,
        "options": [
          {
            "label": "مجرد",
            "value": "single"
          },
          {
            "label": "متأهل",
            "value": "married"
          }
        ]
      },
      {
        "id": "employment_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "employment_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "employment_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      },
      {
        "id": "employment_degree",
        "type": "text",
        "label": "مدرک تحصیلی",
        "name": "degree",
        "required": true
      },
      {
        "id": "employment_field",
        "type": "text",
        "label": "رشته تحصیلی",
        "name": "field_of_study",
        "required": true
      },
      {
        "id": "employment_gpa",
        "type": "number",
        "label": "معدل",
        "name": "gpa",
        "required": true
      },
      {
        "id": "employment_quota",
        "type": "text",
        "label": "نوع سهمیه",
        "name": "quota",
        "required": true
      },
      {
        "id": "employment_military_status",
        "type": "select",
        "label": "وضعیت نظام وظیفه",
        "name": "military_status",
        "required": false,
        "options": [
          {
            "label": "مشمول نیستم",
            "value": "not_applicable"
          },
          {
            "label": "پایان خدمت",
            "value": "completed"
          },
          {
            "label": "معافیت",
            "value": "exempt"
          },
          {
            "label": "سایر",
            "value": "other"
          }
        ]
      },
      {
        "id": "employment_exam_title",
        "type": "text",
        "label": "عنوان آزمون استخدامی",
        "name": "exam_title",
        "required": true
      },
      {
        "id": "employment_job_title",
        "type": "text",
        "label": "عنوان شغل/رشته شغلی",
        "name": "job_title",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام دانشگاه آزاد",
    "category": "آموزشی و دانشگاهی",
    "description": "ثبت اطلاعات پایه متقاضی برای فرآیند ثبت‌نام دانشگاه آزاد.",
    "icon": "🏫",
    "form_schema": [
      {
        "id": "azad_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "azad_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "azad_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "azad_birth_certificate_no",
        "type": "text",
        "label": "شماره شناسنامه",
        "name": "birth_certificate_no",
        "required": true
      },
      {
        "id": "azad_father_name",
        "type": "text",
        "label": "نام پدر",
        "name": "father_name",
        "required": true
      },
      {
        "id": "azad_gender",
        "type": "select",
        "label": "جنسیت",
        "name": "gender",
        "required": true,
        "options": [
          {
            "label": "مرد",
            "value": "male"
          },
          {
            "label": "زن",
            "value": "female"
          }
        ]
      },
      {
        "id": "azad_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "azad_degree",
        "type": "text",
        "label": "مدرک تحصیلی",
        "name": "degree",
        "required": true
      },
      {
        "id": "azad_field",
        "type": "text",
        "label": "رشته تحصیلی",
        "name": "field_of_study",
        "required": true
      },
      {
        "id": "azad_gpa",
        "type": "number",
        "label": "معدل",
        "name": "gpa",
        "required": true
      },
      {
        "id": "azad_province",
        "type": "text",
        "label": "استان",
        "name": "province",
        "required": true
      },
      {
        "id": "azad_city",
        "type": "text",
        "label": "شهر",
        "name": "city",
        "required": true
      }
    ]
  },
  {
    "title": "دریافت کارت ورود به جلسه آزمون",
    "category": "آزمون و سنجش",
    "description": "جمع‌آوری شناسه‌های لازم برای دریافت کارت ورود به جلسه آزمون.",
    "icon": "🎫",
    "form_schema": [
      {
        "id": "card_exam_title",
        "type": "text",
        "label": "عنوان آزمون",
        "name": "exam_title",
        "required": true
      },
      {
        "id": "card_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "card_candidate_no",
        "type": "text",
        "label": "شماره داوطلبی",
        "name": "candidate_number",
        "required": false
      },
      {
        "id": "card_file_no",
        "type": "text",
        "label": "شماره پرونده",
        "name": "file_number",
        "required": false
      },
      {
        "id": "card_registration_serial",
        "type": "text",
        "label": "سریال ثبت‌نام",
        "name": "registration_serial",
        "required": false
      },
      {
        "id": "card_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": false
      }
    ]
  },
  {
    "title": "دریافت نتایج آزمون",
    "category": "آزمون و سنجش",
    "description": "جمع‌آوری شناسه‌های لازم برای دریافت نتیجه آزمون.",
    "icon": "📊",
    "form_schema": [
      {
        "id": "result_exam_title",
        "type": "text",
        "label": "عنوان آزمون",
        "name": "exam_title",
        "required": true
      },
      {
        "id": "result_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "result_candidate_no",
        "type": "text",
        "label": "شماره داوطلبی",
        "name": "candidate_number",
        "required": false
      },
      {
        "id": "result_file_no",
        "type": "text",
        "label": "شماره پرونده",
        "name": "file_number",
        "required": false
      },
      {
        "id": "result_registration_serial",
        "type": "text",
        "label": "سریال ثبت‌نام",
        "name": "registration_serial",
        "required": false
      }
    ]
  },
  {
    "title": "ویرایش اطلاعات ثبت‌نام آزمون",
    "category": "آزمون و سنجش",
    "description": "ثبت مشخصات و مورد اصلاح برای پیگیری و انجام ویرایش اطلاعات ثبت‌نام.",
    "icon": "✏️",
    "form_schema": [
      {
        "id": "edit_exam_title",
        "type": "text",
        "label": "عنوان آزمون",
        "name": "exam_title",
        "required": true
      },
      {
        "id": "edit_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "edit_file_no",
        "type": "text",
        "label": "شماره پرونده",
        "name": "file_number",
        "required": false
      },
      {
        "id": "edit_candidate_no",
        "type": "text",
        "label": "شماره داوطلبی",
        "name": "candidate_number",
        "required": false
      },
      {
        "id": "edit_registration_serial",
        "type": "text",
        "label": "سریال ثبت‌نام",
        "name": "registration_serial",
        "required": false
      },
      {
        "id": "edit_request",
        "type": "textarea",
        "label": "شرح اطلاعاتی که باید اصلاح شود",
        "name": "edit_request",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام ایران‌خودرو",
    "category": "خدمات خودرو",
    "description": "ثبت اطلاعات متقاضی برای فرآیندهای فروش ایران‌خودرو.",
    "icon": "🚗",
    "form_schema": [
      {
        "id": "ikco_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "ikco_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "ikco_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "ikco_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "ikco_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      },
      {
        "id": "ikco_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "ikco_vehicle",
        "type": "text",
        "label": "خودرو/محصول موردنظر",
        "name": "vehicle",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام سایپا",
    "category": "خدمات خودرو",
    "description": "ثبت اطلاعات متقاضی برای فرآیندهای فروش سایپا.",
    "icon": "🚘",
    "form_schema": [
      {
        "id": "saipa_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "saipa_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "saipa_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "saipa_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "saipa_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      },
      {
        "id": "saipa_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "saipa_vehicle",
        "type": "text",
        "label": "خودرو/محصول موردنظر",
        "name": "vehicle",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام خودروهای وارداتی",
    "category": "خدمات خودرو",
    "description": "ثبت اطلاعات متقاضی برای فرآیندهای مربوط به خودروهای وارداتی.",
    "icon": "🌐",
    "form_schema": [
      {
        "id": "import_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "import_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "import_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "import_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "import_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "import_vehicle",
        "type": "text",
        "label": "خودرو/محصول موردنظر",
        "name": "vehicle",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام خودروهای برقی",
    "category": "خدمات خودرو",
    "description": "ثبت اطلاعات متقاضی برای طرح‌های فروش خودروهای برقی.",
    "icon": "🔋",
    "form_schema": [
      {
        "id": "ev_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "ev_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "ev_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "ev_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "ev_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "ev_vehicle",
        "type": "text",
        "label": "خودرو/محصول موردنظر",
        "name": "vehicle",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام طرح جوانی جمعیت خودرو",
    "category": "خدمات خودرو",
    "description": "ثبت درخواست در طرح حمایت از خانواده و جوانی جمعیت؛ شرایط اختصاصی طرح در زمان ثبت‌نام بررسی می‌شود.",
    "icon": "👨‍👩‍👧",
    "form_schema": [
      {
        "id": "young_national_code",
        "type": "national_code",
        "label": "کد ملی متقاضی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "young_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "young_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "young_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "young_child_birth_date",
        "type": "date",
        "label": "تاریخ تولد فرزند",
        "name": "child_birth_date",
        "required": true
      },
      {
        "id": "young_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "young_vehicle",
        "type": "text",
        "label": "خودرو/محصول موردنظر",
        "name": "vehicle",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام طرح فرسوده خودرو",
    "category": "خدمات خودرو",
    "description": "ثبت اطلاعات متقاضی طرح جایگزینی خودروهای فرسوده.",
    "icon": "♻️",
    "form_schema": [
      {
        "id": "scrap_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "scrap_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "scrap_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "scrap_vehicle_type",
        "type": "text",
        "label": "نوع خودرو فرسوده",
        "name": "vehicle_type",
        "required": true
      },
      {
        "id": "scrap_plate",
        "type": "text",
        "label": "شماره پلاک",
        "name": "plate",
        "required": true
      },
      {
        "id": "scrap_vin",
        "type": "text",
        "label": "VIN در صورت وجود",
        "name": "vin",
        "required": false
      }
    ]
  },
  {
    "title": "نوبت تعویض پلاک",
    "category": "خدمات خودرو",
    "description": "ثبت اطلاعات لازم برای دریافت نوبت مرکز تعویض پلاک.",
    "icon": "🔢",
    "form_schema": [
      {
        "id": "plate_national_code",
        "type": "national_code",
        "label": "کد ملی مالک",
        "name": "national_code",
        "required": true
      },
      {
        "id": "plate_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "plate_number",
        "type": "text",
        "label": "شماره پلاک",
        "name": "plate_number",
        "required": true
      },
      {
        "id": "plate_vehicle_type",
        "type": "text",
        "label": "نوع خودرو",
        "name": "vehicle_type",
        "required": true
      },
      {
        "id": "plate_city",
        "type": "text",
        "label": "شهر/استان مرکز",
        "name": "city",
        "required": true
      },
      {
        "id": "plate_preferred_date",
        "type": "date",
        "label": "تاریخ ترجیحی",
        "name": "preferred_date",
        "required": false
      }
    ]
  },
  {
    "title": "استعلام خلافی خودرو",
    "category": "خدمات خودرو",
    "description": "ثبت اطلاعات موردنیاز برای استعلام خلافی خودرو.",
    "icon": "📋",
    "form_schema": [
      {
        "id": "fine_national_code",
        "type": "national_code",
        "label": "کد ملی مالک",
        "name": "national_code",
        "required": true
      },
      {
        "id": "fine_plate",
        "type": "text",
        "label": "شماره پلاک",
        "name": "plate_number",
        "required": true
      }
    ]
  },
  {
    "title": "پرداخت خلافی خودرو",
    "category": "خدمات خودرو",
    "description": "ثبت درخواست پرداخت خلافی خودرو پس از دریافت مبلغ قابل پرداخت.",
    "icon": "💳",
    "form_schema": [
      {
        "id": "payfine_national_code",
        "type": "national_code",
        "label": "کد ملی مالک",
        "name": "national_code",
        "required": true
      },
      {
        "id": "payfine_plate",
        "type": "text",
        "label": "شماره پلاک",
        "name": "plate_number",
        "required": true
      },
      {
        "id": "payfine_reference",
        "type": "text",
        "label": "شناسه/کد قبض در صورت وجود",
        "name": "reference",
        "required": false
      }
    ]
  },
  {
    "title": "ثبت‌نام خدمات دولت الکترونیک",
    "category": "خدمات دولتی و اداری",
    "description": "ثبت درخواست ایجاد یا تکمیل حساب در یک سامانه دولتی مشخص.",
    "icon": "🏛️",
    "form_schema": [
      {
        "id": "gov_system",
        "type": "text",
        "label": "نام سامانه",
        "name": "system_name",
        "required": true
      },
      {
        "id": "gov_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "gov_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "gov_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "gov_request",
        "type": "textarea",
        "label": "شرح درخواست",
        "name": "request_description",
        "required": true
      }
    ]
  },
  {
    "title": "پیگیری درخواست دولتی",
    "category": "خدمات دولتی و اداری",
    "description": "پیگیری یک درخواست ثبت‌شده در سامانه دولتی مشخص.",
    "icon": "🔎",
    "form_schema": [
      {
        "id": "govtrack_system",
        "type": "text",
        "label": "نام سامانه",
        "name": "system_name",
        "required": true
      },
      {
        "id": "govtrack_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "govtrack_tracking",
        "type": "text",
        "label": "کد رهگیری/شماره درخواست",
        "name": "tracking_code",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام تأمین اجتماعی",
    "category": "خدمات تأمین اجتماعی",
    "description": "ثبت درخواست ایجاد حساب و انجام خدمات اولیه تأمین اجتماعی.",
    "icon": "🛡️",
    "form_schema": [
      {
        "id": "ss_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "ss_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "ss_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "ss_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "ss_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "ss_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      }
    ]
  },
  {
    "title": "دریافت سابقه بیمه تأمین اجتماعی",
    "category": "خدمات تأمین اجتماعی",
    "description": "ثبت درخواست دریافت سوابق بیمه‌شده.",
    "icon": "📑",
    "form_schema": [
      {
        "id": "history_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "history_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "history_insurance_no",
        "type": "text",
        "label": "شماره بیمه در صورت وجود",
        "name": "insurance_number",
        "required": false
      }
    ]
  },
  {
    "title": "دریافت فیش حقوقی تأمین اجتماعی",
    "category": "خدمات تأمین اجتماعی",
    "description": "ثبت درخواست دریافت فیش حقوقی.",
    "icon": "🧾",
    "form_schema": [
      {
        "id": "pension_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "pension_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "pension_month",
        "type": "text",
        "label": "ماه/دوره موردنظر",
        "name": "period",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام در سامانه مالیاتی",
    "category": "خدمات مالیاتی",
    "description": "ثبت درخواست ایجاد یا تکمیل پرونده مالیاتی.",
    "icon": "🧾",
    "form_schema": [
      {
        "id": "tax_national_code",
        "type": "national_code",
        "label": "کد ملی/شناسه ملی",
        "name": "national_or_entity_id",
        "required": true
      },
      {
        "id": "tax_full_name",
        "type": "text",
        "label": "نام شخص/نام شرکت",
        "name": "full_name",
        "required": true
      },
      {
        "id": "tax_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "tax_activity",
        "type": "text",
        "label": "نوع فعالیت",
        "name": "activity",
        "required": true
      },
      {
        "id": "tax_postal_code",
        "type": "text",
        "label": "کد پستی محل فعالیت",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "tax_address",
        "type": "textarea",
        "label": "آدرس محل فعالیت",
        "name": "address",
        "required": true
      }
    ]
  },
  {
    "title": "تشکیل پرونده مالیاتی",
    "category": "خدمات مالیاتی",
    "description": "ثبت اطلاعات لازم برای تشکیل پرونده مالیاتی.",
    "icon": "📂",
    "form_schema": [
      {
        "id": "case_id",
        "type": "text",
        "label": "کد ملی/شناسه ملی",
        "name": "national_or_entity_id",
        "required": true
      },
      {
        "id": "case_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "case_activity",
        "type": "text",
        "label": "نوع فعالیت",
        "name": "activity",
        "required": true
      },
      {
        "id": "case_start_date",
        "type": "date",
        "label": "تاریخ شروع فعالیت",
        "name": "activity_start_date",
        "required": true
      },
      {
        "id": "case_postal_code",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "case_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت اظهارنامه مالیاتی",
    "category": "خدمات مالیاتی",
    "description": "ثبت درخواست تهیه و ارسال اظهارنامه؛ نوع اظهارنامه باید در زمان سفارش مشخص شود.",
    "icon": "📊",
    "form_schema": [
      {
        "id": "decl_id",
        "type": "text",
        "label": "کد ملی/شناسه ملی",
        "name": "national_or_entity_id",
        "required": true
      },
      {
        "id": "decl_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "decl_type",
        "type": "select",
        "label": "نوع اظهارنامه",
        "name": "declaration_type",
        "required": true,
        "options": [
          {
            "label": "اشخاص حقیقی",
            "value": "individual"
          },
          {
            "label": "اشخاص حقوقی",
            "value": "legal"
          },
          {
            "label": "ارزش افزوده",
            "value": "vat"
          }
        ]
      },
      {
        "id": "decl_year",
        "type": "number",
        "label": "سال مالی",
        "name": "financial_year",
        "required": true
      },
      {
        "id": "decl_description",
        "type": "textarea",
        "label": "توضیحات",
        "name": "description",
        "required": false
      }
    ]
  },
  {
    "title": "ثبت‌نام سامانه مؤدیان",
    "category": "خدمات مالیاتی",
    "description": "ثبت درخواست فعال‌سازی/تکمیل کارپوشه و خدمات پایه سامانه مؤدیان.",
    "icon": "💼",
    "form_schema": [
      {
        "id": "mytax_id",
        "type": "text",
        "label": "کد ملی/شناسه ملی",
        "name": "national_or_entity_id",
        "required": true
      },
      {
        "id": "mytax_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "mytax_tax_number",
        "type": "text",
        "label": "شماره پرونده/شماره اقتصادی در صورت وجود",
        "name": "tax_number",
        "required": false
      },
      {
        "id": "mytax_request",
        "type": "textarea",
        "label": "شرح درخواست",
        "name": "request_description",
        "required": true
      }
    ]
  },
  {
    "title": "ارسال صورتحساب الکترونیکی",
    "category": "خدمات مالیاتی",
    "description": "ثبت درخواست آماده‌سازی/ارسال صورتحساب الکترونیکی.",
    "icon": "🧮",
    "form_schema": [
      {
        "id": "invoice_id",
        "type": "text",
        "label": "کد ملی/شناسه ملی مؤدی",
        "name": "national_or_entity_id",
        "required": true
      },
      {
        "id": "invoice_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "invoice_count",
        "type": "number",
        "label": "تعداد صورتحساب",
        "name": "invoice_count",
        "required": true
      },
      {
        "id": "invoice_description",
        "type": "textarea",
        "label": "توضیحات",
        "name": "description",
        "required": false
      }
    ]
  },
  {
    "title": "ثبت‌نام بیمه سلامت",
    "category": "خدمات بیمه",
    "description": "ثبت درخواست ثبت‌نام یا پیگیری پوشش بیمه سلامت.",
    "icon": "🏥",
    "form_schema": [
      {
        "id": "health_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "health_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "health_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "health_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "health_address",
        "type": "textarea",
        "label": "آدرس",
        "name": "address",
        "required": false
      }
    ]
  },
  {
    "title": "استعلام بیمه شخص ثالث",
    "category": "خدمات بیمه",
    "description": "ثبت اطلاعات لازم برای استعلام وضعیت بیمه شخص ثالث.",
    "icon": "🚗",
    "form_schema": [
      {
        "id": "third_party_plate",
        "type": "text",
        "label": "شماره پلاک",
        "name": "plate_number",
        "required": true
      },
      {
        "id": "third_party_national_code",
        "type": "national_code",
        "label": "کد ملی مالک",
        "name": "national_code",
        "required": true
      }
    ]
  },
  {
    "title": "تمدید بیمه خودرو",
    "category": "خدمات بیمه",
    "description": "ثبت درخواست تمدید بیمه خودرو.",
    "icon": "🛡️",
    "form_schema": [
      {
        "id": "renew_plate",
        "type": "text",
        "label": "شماره پلاک",
        "name": "plate_number",
        "required": true
      },
      {
        "id": "renew_national_code",
        "type": "national_code",
        "label": "کد ملی مالک",
        "name": "national_code",
        "required": true
      },
      {
        "id": "renew_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "renew_insurance",
        "type": "text",
        "label": "شماره بیمه‌نامه قبلی در صورت وجود",
        "name": "previous_policy_number",
        "required": false
      }
    ]
  },
  {
    "title": "ثبت‌نام دانشگاه پیام نور",
    "category": "خدمات آموزشی و دانشگاهی",
    "description": "ثبت اطلاعات اولیه متقاضی برای فرآیند ثبت‌نام دانشگاه پیام نور.",
    "icon": "🎓",
    "form_schema": [
      {
        "id": "pnu_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "pnu_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "pnu_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "pnu_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "pnu_degree",
        "type": "text",
        "label": "مقطع تحصیلی",
        "name": "degree",
        "required": true
      },
      {
        "id": "pnu_field",
        "type": "text",
        "label": "رشته تحصیلی",
        "name": "field_of_study",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام دانشگاه علمی‌کاربردی",
    "category": "خدمات آموزشی و دانشگاهی",
    "description": "ثبت اطلاعات اولیه متقاضی برای فرآیند ثبت‌نام دانشگاه علمی‌کاربردی.",
    "icon": "🎓",
    "form_schema": [
      {
        "id": "uast_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "uast_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "uast_birth_date",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "uast_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "uast_degree",
        "type": "text",
        "label": "مقطع تحصیلی",
        "name": "degree",
        "required": true
      },
      {
        "id": "uast_field",
        "type": "text",
        "label": "رشته تحصیلی",
        "name": "field_of_study",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت‌نام بدون کنکور",
    "category": "خدمات آموزشی و دانشگاهی",
    "description": "ثبت درخواست پذیرش بدون آزمون؛ دانشگاه و مقطع باید مشخص شود.",
    "icon": "📚",
    "form_schema": [
      {
        "id": "noc_exam_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "noc_exam_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "noc_exam_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "noc_exam_university",
        "type": "text",
        "label": "دانشگاه موردنظر",
        "name": "university",
        "required": true
      },
      {
        "id": "noc_exam_degree",
        "type": "text",
        "label": "مقطع",
        "name": "degree",
        "required": true
      },
      {
        "id": "noc_exam_field",
        "type": "text",
        "label": "رشته موردنظر",
        "name": "field_of_study",
        "required": true
      },
      {
        "id": "noc_exam_gpa",
        "type": "number",
        "label": "معدل",
        "name": "gpa",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت درخواست نقل‌وانتقال دانشگاه",
    "category": "خدمات آموزشی و دانشگاهی",
    "description": "ثبت اطلاعات اولیه برای درخواست انتقال یا مهمانی دانشگاه.",
    "icon": "🔄",
    "form_schema": [
      {
        "id": "transfer_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "transfer_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "transfer_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "transfer_current_university",
        "type": "text",
        "label": "دانشگاه مبدأ",
        "name": "current_university",
        "required": true
      },
      {
        "id": "transfer_target_university",
        "type": "text",
        "label": "دانشگاه مقصد",
        "name": "target_university",
        "required": true
      },
      {
        "id": "transfer_reason",
        "type": "textarea",
        "label": "دلیل درخواست",
        "name": "reason",
        "required": true
      }
    ]
  },
  {
    "title": "درخواست وام دانشجویی",
    "category": "خدمات دانشجویی",
    "description": "ثبت اطلاعات اولیه برای درخواست تسهیلات دانشجویی.",
    "icon": "💰",
    "form_schema": [
      {
        "id": "loan_national_code",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "loan_full_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "loan_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "loan_university",
        "type": "text",
        "label": "دانشگاه",
        "name": "university",
        "required": true
      },
      {
        "id": "loan_student_no",
        "type": "text",
        "label": "شماره دانشجویی",
        "name": "student_number",
        "required": true
      },
      {
        "id": "loan_type",
        "type": "text",
        "label": "نوع وام",
        "name": "loan_type",
        "required": true
      }
    ]
  },
  {
    "title": "تایپ فارسی",
    "category": "تایپ و خدمات متنی",
    "description": "تایپ و تبدیل محتوای فارسی به فایل قابل ویرایش.",
    "icon": "⌨️",
    "form_schema": [
      {
        "id": "type_fa_source",
        "type": "text",
        "label": "نوع فایل ورودی",
        "name": "source_type",
        "required": true
      },
      {
        "id": "type_fa_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "type_fa_output",
        "type": "select",
        "label": "خروجی",
        "name": "output",
        "required": true,
        "options": [
          {
            "label": "Word",
            "value": "word"
          },
          {
            "label": "Text",
            "value": "text"
          }
        ]
      },
      {
        "id": "type_fa_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "تایپ انگلیسی",
    "category": "تایپ و خدمات متنی",
    "description": "تایپ محتوای انگلیسی و تحویل فایل قابل ویرایش.",
    "icon": "⌨️",
    "form_schema": [
      {
        "id": "type_en_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "type_en_output",
        "type": "select",
        "label": "خروجی",
        "name": "output",
        "required": true,
        "options": [
          {
            "label": "Word",
            "value": "word"
          },
          {
            "label": "Text",
            "value": "text"
          }
        ]
      },
      {
        "id": "type_en_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "تایپ پایان‌نامه",
    "category": "تایپ و خدمات متنی",
    "description": "تایپ و آماده‌سازی متن پایان‌نامه برای ویرایش بعدی.",
    "icon": "🎓",
    "form_schema": [
      {
        "id": "thesis_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "thesis_language",
        "type": "select",
        "label": "زبان",
        "name": "language",
        "required": true,
        "options": [
          {
            "label": "فارسی",
            "value": "fa"
          },
          {
            "label": "انگلیسی",
            "value": "en"
          }
        ]
      },
      {
        "id": "thesis_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "تایپ دست‌نوشته",
    "category": "تایپ و خدمات متنی",
    "description": "تبدیل دست‌نوشته خوانا به متن دیجیتال.",
    "icon": "✍️",
    "form_schema": [
      {
        "id": "hand_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "hand_quality",
        "type": "select",
        "label": "کیفیت دست‌نوشته",
        "name": "quality",
        "required": true,
        "options": [
          {
            "label": "خوانا",
            "value": "clear"
          },
          {
            "label": "متوسط",
            "value": "medium"
          },
          {
            "label": "نیازمند بررسی",
            "value": "review"
          }
        ]
      },
      {
        "id": "hand_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ویراستاری فارسی",
    "category": "ویرایش متن",
    "description": "ویرایش نگارشی و زبانی متن فارسی.",
    "icon": "📝",
    "form_schema": [
      {
        "id": "edit_fa_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "edit_fa_level",
        "type": "select",
        "label": "سطح ویرایش",
        "name": "editing_level",
        "required": true,
        "options": [
          {
            "label": "نگارشی",
            "value": "copy"
          },
          {
            "label": "ادبی",
            "value": "literary"
          },
          {
            "label": "تخصصی",
            "value": "technical"
          }
        ]
      },
      {
        "id": "edit_fa_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ویراستاری انگلیسی",
    "category": "ویرایش متن",
    "description": "ویرایش زبانی و نگارشی متن انگلیسی.",
    "icon": "📝",
    "form_schema": [
      {
        "id": "edit_en_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "edit_en_level",
        "type": "select",
        "label": "سطح ویرایش",
        "name": "editing_level",
        "required": true,
        "options": [
          {
            "label": "گرامری",
            "value": "grammar"
          },
          {
            "label": "آکادمیک",
            "value": "academic"
          },
          {
            "label": "تخصصی",
            "value": "technical"
          }
        ]
      },
      {
        "id": "edit_en_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "قالب‌بندی Word",
    "category": "ویرایش متن",
    "description": "تنظیم قالب، فونت، فاصله، Heading و ساختار سند Word.",
    "icon": "📄",
    "form_schema": [
      {
        "id": "word_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "word_requirements",
        "type": "textarea",
        "label": "الزامات قالب‌بندی",
        "name": "requirements",
        "required": true
      }
    ]
  },
  {
    "title": "تحقیق دانش‌آموزی",
    "category": "تحقیق و پژوهش",
    "description": "پشتیبانی در گردآوری و تنظیم تحقیق دانش‌آموزی.",
    "icon": "🔬",
    "form_schema": [
      {
        "id": "research_school_topic",
        "type": "text",
        "label": "موضوع تحقیق",
        "name": "topic",
        "required": true
      },
      {
        "id": "research_school_grade",
        "type": "text",
        "label": "مقطع/پایه",
        "name": "grade",
        "required": true
      },
      {
        "id": "research_school_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "research_school_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "جستجوی منابع علمی",
    "category": "پژوهش",
    "description": "جستجو و فهرست‌کردن منابع علمی مرتبط با موضوع پژوهش.",
    "icon": "🔎",
    "form_schema": [
      {
        "id": "refs_topic",
        "type": "text",
        "label": "موضوع",
        "name": "topic",
        "required": true
      },
      {
        "id": "refs_count",
        "type": "number",
        "label": "تعداد منابع موردنظر",
        "name": "source_count",
        "required": true
      },
      {
        "id": "refs_language",
        "type": "select",
        "label": "زبان منابع",
        "name": "language",
        "required": true,
        "options": [
          {
            "label": "فارسی",
            "value": "fa"
          },
          {
            "label": "انگلیسی",
            "value": "en"
          },
          {
            "label": "هر دو",
            "value": "both"
          }
        ]
      },
      {
        "id": "refs_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "خلاصه‌سازی مقاله",
    "category": "پژوهش",
    "description": "خلاصه‌سازی و استخراج نکات اصلی مقاله.",
    "icon": "📚",
    "form_schema": [
      {
        "id": "summary_pages",
        "type": "number",
        "label": "تعداد صفحات مقاله",
        "name": "page_count",
        "required": true
      },
      {
        "id": "summary_output",
        "type": "select",
        "label": "نوع خروجی",
        "name": "output_type",
        "required": true,
        "options": [
          {
            "label": "خلاصه فارسی",
            "value": "fa"
          },
          {
            "label": "خلاصه انگلیسی",
            "value": "en"
          }
        ]
      },
      {
        "id": "summary_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "تدوین پروپوزال",
    "category": "پژوهش",
    "description": "خدمات نگارشی و ساختاری پروپوزال پژوهشی.",
    "icon": "📑",
    "form_schema": [
      {
        "id": "proposal_topic",
        "type": "text",
        "label": "عنوان/موضوع پژوهش",
        "name": "topic",
        "required": true
      },
      {
        "id": "proposal_field",
        "type": "text",
        "label": "رشته/گرایش",
        "name": "field",
        "required": true
      },
      {
        "id": "proposal_university",
        "type": "text",
        "label": "دانشگاه",
        "name": "university",
        "required": true
      },
      {
        "id": "proposal_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "طراحی پاورپوینت دانشجویی",
    "category": "طراحی پاورپوینت",
    "description": "طراحی ارائه دانشجویی با ساختار و قالب حرفه‌ای.",
    "icon": "📊",
    "form_schema": [
      {
        "id": "ppt_student_title",
        "type": "text",
        "label": "عنوان ارائه",
        "name": "title",
        "required": true
      },
      {
        "id": "ppt_student_slides",
        "type": "number",
        "label": "تعداد اسلاید",
        "name": "slide_count",
        "required": true
      },
      {
        "id": "ppt_student_language",
        "type": "select",
        "label": "زبان",
        "name": "language",
        "required": true,
        "options": [
          {
            "label": "فارسی",
            "value": "fa"
          },
          {
            "label": "انگلیسی",
            "value": "en"
          }
        ]
      },
      {
        "id": "ppt_student_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "پاورپوینت دفاع پایان‌نامه",
    "category": "طراحی پاورپوینت",
    "description": "طراحی ساختار ارائه دفاع پایان‌نامه.",
    "icon": "🎓",
    "form_schema": [
      {
        "id": "ppt_defense_title",
        "type": "text",
        "label": "عنوان پایان‌نامه",
        "name": "title",
        "required": true
      },
      {
        "id": "ppt_defense_slides",
        "type": "number",
        "label": "تعداد اسلاید تقریبی",
        "name": "slide_count",
        "required": true
      },
      {
        "id": "ppt_defense_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "طراحی پوستر",
    "category": "طراحی گرافیکی",
    "description": "طراحی پوستر تبلیغاتی یا اطلاع‌رسانی.",
    "icon": "🎨",
    "form_schema": [
      {
        "id": "poster_size",
        "type": "text",
        "label": "ابعاد",
        "name": "size",
        "required": true
      },
      {
        "id": "poster_title",
        "type": "text",
        "label": "عنوان/متن اصلی",
        "name": "title",
        "required": true
      },
      {
        "id": "poster_usage",
        "type": "select",
        "label": "کاربرد",
        "name": "usage",
        "required": true,
        "options": [
          {
            "label": "چاپ",
            "value": "print"
          },
          {
            "label": "شبکه اجتماعی",
            "value": "social"
          },
          {
            "label": "هر دو",
            "value": "both"
          }
        ]
      },
      {
        "id": "poster_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "طراحی کارت ویزیت",
    "category": "طراحی گرافیکی",
    "description": "طراحی کارت ویزیت شخصی یا سازمانی.",
    "icon": "💼",
    "form_schema": [
      {
        "id": "card_name",
        "type": "text",
        "label": "نام/نام مجموعه",
        "name": "name",
        "required": true
      },
      {
        "id": "card_phone",
        "type": "phone",
        "label": "شماره تماس",
        "name": "phone",
        "required": true
      },
      {
        "id": "card_role",
        "type": "text",
        "label": "سمت/عنوان",
        "name": "role",
        "required": false
      },
      {
        "id": "card_notes",
        "type": "textarea",
        "label": "اطلاعات تکمیلی",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "طراحی رزومه",
    "category": "طراحی گرافیکی",
    "description": "طراحی رزومه حرفه‌ای بر اساس اطلاعات ارائه‌شده.",
    "icon": "📄",
    "form_schema": [
      {
        "id": "design_cv_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "design_cv_role",
        "type": "text",
        "label": "عنوان شغلی",
        "name": "job_title",
        "required": true
      },
      {
        "id": "design_cv_language",
        "type": "select",
        "label": "زبان",
        "name": "language",
        "required": true,
        "options": [
          {
            "label": "فارسی",
            "value": "fa"
          },
          {
            "label": "انگلیسی",
            "value": "en"
          }
        ]
      },
      {
        "id": "design_cv_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "PDF به Word",
    "category": "خدمات فایل و کامپیوتر",
    "description": "تبدیل فایل PDF به سند Word قابل ویرایش.",
    "icon": "📄",
    "form_schema": [
      {
        "id": "pdfword_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "pdfword_quality",
        "type": "select",
        "label": "نوع PDF",
        "name": "pdf_type",
        "required": true,
        "options": [
          {
            "label": "متنی",
            "value": "text"
          },
          {
            "label": "اسکن‌شده",
            "value": "scan"
          }
        ]
      },
      {
        "id": "pdfword_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "PDF به Excel",
    "category": "خدمات فایل و کامپیوتر",
    "description": "تبدیل جداول یا داده‌های PDF به Excel.",
    "icon": "📊",
    "form_schema": [
      {
        "id": "pdfexcel_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "pdfexcel_tables",
        "type": "number",
        "label": "تعداد تقریبی جداول",
        "name": "table_count",
        "required": false
      },
      {
        "id": "pdfexcel_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ادغام PDF",
    "category": "خدمات فایل و کامپیوتر",
    "description": "ادغام چند فایل PDF در یک فایل.",
    "icon": "🔗",
    "form_schema": [
      {
        "id": "merge_pdf_count",
        "type": "number",
        "label": "تعداد فایل‌ها",
        "name": "file_count",
        "required": true
      },
      {
        "id": "merge_pdf_order",
        "type": "textarea",
        "label": "ترتیب فایل‌ها/توضیحات",
        "name": "order_notes",
        "required": false
      }
    ]
  },
  {
    "title": "تقسیم PDF",
    "category": "خدمات فایل و کامپیوتر",
    "description": "تقسیم یک PDF به چند فایل.",
    "icon": "✂️",
    "form_schema": [
      {
        "id": "split_pdf_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "split_pdf_ranges",
        "type": "textarea",
        "label": "بازه‌های صفحات",
        "name": "page_ranges",
        "required": true
      }
    ]
  },
  {
    "title": "فشرده‌سازی PDF",
    "category": "خدمات فایل و کامپیوتر",
    "description": "کاهش حجم PDF با حفظ کیفیت مناسب.",
    "icon": "🗜️",
    "form_schema": [
      {
        "id": "compress_pdf_size",
        "type": "number",
        "label": "حجم تقریبی فایل (MB)",
        "name": "file_size_mb",
        "required": true
      },
      {
        "id": "compress_pdf_target",
        "type": "number",
        "label": "حجم هدف تقریبی (MB)",
        "name": "target_size_mb",
        "required": false
      }
    ]
  },
  {
    "title": "خدمات Excel",
    "category": "خدمات فایل و کامپیوتر",
    "description": "ورود اطلاعات، فرمول‌نویسی و تنظیم فایل Excel.",
    "icon": "📊",
    "form_schema": [
      {
        "id": "excel_type",
        "type": "select",
        "label": "نوع خدمت",
        "name": "service_type",
        "required": true,
        "options": [
          {
            "label": "ورود اطلاعات",
            "value": "data_entry"
          },
          {
            "label": "فرمول‌نویسی",
            "value": "formula"
          },
          {
            "label": "مرتب‌سازی/پاک‌سازی",
            "value": "cleanup"
          },
          {
            "label": "نمودار",
            "value": "chart"
          }
        ]
      },
      {
        "id": "excel_rows",
        "type": "number",
        "label": "تعداد تقریبی ردیف",
        "name": "row_count",
        "required": false
      },
      {
        "id": "excel_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": true
      }
    ]
  },
  {
    "title": "ورود اطلاعات از PDF به Excel",
    "category": "خدمات داده و ورود اطلاعات",
    "description": "انتقال داده‌های ساختاریافته از PDF به Excel.",
    "icon": "📥",
    "form_schema": [
      {
        "id": "data_pdf_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "data_pdf_rows",
        "type": "number",
        "label": "تعداد تقریبی ردیف",
        "name": "row_count",
        "required": false
      },
      {
        "id": "data_pdf_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ورود اطلاعات محصولات",
    "category": "خدمات داده و ورود اطلاعات",
    "description": "ورود اطلاعات کالا یا محصولات به فایل یا فرم مشخص.",
    "icon": "📦",
    "form_schema": [
      {
        "id": "products_count",
        "type": "number",
        "label": "تعداد محصولات",
        "name": "product_count",
        "required": true
      },
      {
        "id": "products_source",
        "type": "text",
        "label": "منبع اطلاعات",
        "name": "source",
        "required": true
      },
      {
        "id": "products_fields",
        "type": "textarea",
        "label": "فیلدهای موردنیاز",
        "name": "fields_required",
        "required": true
      }
    ]
  },
  {
    "title": "پاک‌سازی داده",
    "category": "خدمات داده و ورود اطلاعات",
    "description": "پاک‌سازی، حذف موارد تکراری و استانداردسازی داده‌ها.",
    "icon": "🧹",
    "form_schema": [
      {
        "id": "clean_rows",
        "type": "number",
        "label": "تعداد تقریبی رکورد",
        "name": "row_count",
        "required": true
      },
      {
        "id": "clean_tasks",
        "type": "textarea",
        "label": "موارد موردنیاز",
        "name": "tasks",
        "required": true
      }
    ]
  },
  {
    "title": "تهیه گزارش داده",
    "category": "خدمات داده و ورود اطلاعات",
    "description": "ساخت گزارش از داده‌های ارائه‌شده.",
    "icon": "📈",
    "form_schema": [
      {
        "id": "report_rows",
        "type": "number",
        "label": "تعداد تقریبی رکورد",
        "name": "row_count",
        "required": true
      },
      {
        "id": "report_goal",
        "type": "textarea",
        "label": "هدف گزارش",
        "name": "goal",
        "required": true
      },
      {
        "id": "report_output",
        "type": "select",
        "label": "خروجی",
        "name": "output",
        "required": true,
        "options": [
          {
            "label": "Excel",
            "value": "excel"
          },
          {
            "label": "PDF",
            "value": "pdf"
          },
          {
            "label": "Excel و PDF",
            "value": "both"
          }
        ]
      }
    ]
  },
  {
    "title": "ثبت شرکت با مسئولیت محدود",
    "category": "خدمات کسب‌وکار",
    "description": "جمع‌آوری اطلاعات لازم برای شروع فرآیند ثبت شرکت با مسئولیت محدود.",
    "icon": "🏢",
    "form_schema": [
      {
        "id": "llc_name",
        "type": "text",
        "label": "نام پیشنهادی شرکت",
        "name": "company_name",
        "required": true
      },
      {
        "id": "llc_partners",
        "type": "number",
        "label": "تعداد شرکا",
        "name": "partner_count",
        "required": true
      },
      {
        "id": "llc_activity",
        "type": "textarea",
        "label": "موضوع فعالیت",
        "name": "activity",
        "required": true
      },
      {
        "id": "llc_address",
        "type": "textarea",
        "label": "آدرس مرکز اصلی",
        "name": "address",
        "required": true
      },
      {
        "id": "llc_postal",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "llc_mobile",
        "type": "phone",
        "label": "شماره تماس متقاضی",
        "name": "mobile",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت شرکت سهامی خاص",
    "category": "خدمات کسب‌وکار",
    "description": "جمع‌آوری اطلاعات لازم برای شروع فرآیند ثبت شرکت سهامی خاص.",
    "icon": "🏢",
    "form_schema": [
      {
        "id": "jsc_name",
        "type": "text",
        "label": "نام پیشنهادی شرکت",
        "name": "company_name",
        "required": true
      },
      {
        "id": "jsc_members",
        "type": "number",
        "label": "تعداد اعضا/سهامداران",
        "name": "member_count",
        "required": true
      },
      {
        "id": "jsc_activity",
        "type": "textarea",
        "label": "موضوع فعالیت",
        "name": "activity",
        "required": true
      },
      {
        "id": "jsc_capital",
        "type": "number",
        "label": "سرمایه ثبتی پیشنهادی",
        "name": "capital",
        "required": true
      },
      {
        "id": "jsc_address",
        "type": "textarea",
        "label": "آدرس مرکز اصلی",
        "name": "address",
        "required": true
      },
      {
        "id": "jsc_mobile",
        "type": "phone",
        "label": "شماره تماس",
        "name": "mobile",
        "required": true
      }
    ]
  },
  {
    "title": "تغییرات شرکت",
    "category": "خدمات کسب‌وکار",
    "description": "ثبت اطلاعات اولیه برای انجام تغییرات ثبتی شرکت.",
    "icon": "🔄",
    "form_schema": [
      {
        "id": "company_change_name",
        "type": "text",
        "label": "نام شرکت",
        "name": "company_name",
        "required": true
      },
      {
        "id": "company_change_id",
        "type": "text",
        "label": "شناسه ملی شرکت",
        "name": "national_entity_id",
        "required": true
      },
      {
        "id": "company_change_type",
        "type": "text",
        "label": "نوع تغییر",
        "name": "change_type",
        "required": true
      },
      {
        "id": "company_change_notes",
        "type": "textarea",
        "label": "شرح تغییرات",
        "name": "description",
        "required": true
      },
      {
        "id": "company_change_mobile",
        "type": "phone",
        "label": "شماره تماس",
        "name": "mobile",
        "required": true
      }
    ]
  },
  {
    "title": "درخواست مجوز کسب‌وکار",
    "category": "خدمات مجوز",
    "description": "ثبت اطلاعات اولیه برای پیگیری مجوز کسب‌وکار مشخص.",
    "icon": "📜",
    "form_schema": [
      {
        "id": "permit_national",
        "type": "text",
        "label": "کد ملی/شناسه ملی",
        "name": "national_or_entity_id",
        "required": true
      },
      {
        "id": "permit_business",
        "type": "text",
        "label": "نوع کسب‌وکار",
        "name": "business_type",
        "required": true
      },
      {
        "id": "permit_title",
        "type": "text",
        "label": "عنوان مجوز",
        "name": "permit_title",
        "required": true
      },
      {
        "id": "permit_city",
        "type": "text",
        "label": "شهر محل فعالیت",
        "name": "city",
        "required": true
      },
      {
        "id": "permit_mobile",
        "type": "phone",
        "label": "شماره تماس",
        "name": "mobile",
        "required": true
      },
      {
        "id": "permit_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ثبت درخواست افتتاح حساب",
    "category": "خدمات بانکی و مالی",
    "description": "ثبت اطلاعات اولیه برای راهنمایی و انجام فرآیند افتتاح حساب آنلاین.",
    "icon": "🏦",
    "form_schema": [
      {
        "id": "bank_account_fullname",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "bank_account_national",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "bank_account_birth",
        "type": "date",
        "label": "تاریخ تولد",
        "name": "birth_date",
        "required": true
      },
      {
        "id": "bank_account_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "bank_account_bank",
        "type": "text",
        "label": "بانک موردنظر",
        "name": "bank",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت درخواست تسهیلات",
    "category": "تسهیلات و وام",
    "description": "ثبت اطلاعات اولیه برای پیگیری درخواست تسهیلات؛ شرایط نهایی وابسته به بانک/طرح است.",
    "icon": "💰",
    "form_schema": [
      {
        "id": "loanreq_fullname",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "loanreq_national",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "loanreq_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "loanreq_bank",
        "type": "text",
        "label": "بانک/مؤسسه",
        "name": "bank",
        "required": true
      },
      {
        "id": "loanreq_amount",
        "type": "number",
        "label": "مبلغ تقریبی تسهیلات",
        "name": "amount",
        "required": true
      },
      {
        "id": "loanreq_purpose",
        "type": "textarea",
        "label": "هدف/نوع تسهیلات",
        "name": "purpose",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت اطلاعات ملک در سامانه املاک",
    "category": "خدمات املاک",
    "description": "ثبت اطلاعات پایه ملک و مالک برای خدمات مرتبط با سامانه املاک و اسکان.",
    "icon": "🏠",
    "form_schema": [
      {
        "id": "amlak_national",
        "type": "national_code",
        "label": "کد ملی مالک/سرپرست",
        "name": "national_code",
        "required": true
      },
      {
        "id": "amlak_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "amlak_postal",
        "type": "text",
        "label": "کد پستی ملک",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "amlak_address",
        "type": "textarea",
        "label": "نشانی ملک",
        "name": "address",
        "required": true
      },
      {
        "id": "amlak_property_type",
        "type": "text",
        "label": "نوع ملک",
        "name": "property_type",
        "required": true
      }
    ]
  },
  {
    "title": "ثبت اقامتگاه",
    "category": "خدمات املاک",
    "description": "ثبت اطلاعات اقامتگاه و محل سکونت.",
    "icon": "🏡",
    "form_schema": [
      {
        "id": "residence_national",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "residence_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "residence_postal",
        "type": "text",
        "label": "کد پستی",
        "name": "postal_code",
        "required": true
      },
      {
        "id": "residence_address",
        "type": "textarea",
        "label": "نشانی",
        "name": "address",
        "required": true
      },
      {
        "id": "residence_status",
        "type": "select",
        "label": "وضعیت سکونت",
        "name": "residence_status",
        "required": true,
        "options": [
          {
            "label": "مالک",
            "value": "owner"
          },
          {
            "label": "مستأجر",
            "value": "tenant"
          },
          {
            "label": "سایر",
            "value": "other"
          }
        ]
      }
    ]
  },
  {
    "title": "آماده‌سازی قرارداد اجاره",
    "category": "خدمات اجاره و قرارداد",
    "description": "تنظیم و آماده‌سازی متن قرارداد اجاره بر اساس اطلاعات طرفین و ملک.",
    "icon": "📄",
    "form_schema": [
      {
        "id": "rent_landlord",
        "type": "text",
        "label": "نام موجر",
        "name": "landlord",
        "required": true
      },
      {
        "id": "rent_tenant",
        "type": "text",
        "label": "نام مستأجر",
        "name": "tenant",
        "required": true
      },
      {
        "id": "rent_property",
        "type": "textarea",
        "label": "مشخصات ملک",
        "name": "property_description",
        "required": true
      },
      {
        "id": "rent_amount",
        "type": "number",
        "label": "مبلغ ودیعه",
        "name": "deposit",
        "required": true
      },
      {
        "id": "rent_monthly",
        "type": "number",
        "label": "اجاره ماهانه",
        "name": "monthly_rent",
        "required": true
      },
      {
        "id": "rent_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "خدمات بلیت سفر",
    "category": "خدمات سفر و گردشگری",
    "description": "ثبت درخواست جستجو و رزرو بلیت؛ نوع وسیله و مسیر باید مشخص شود.",
    "icon": "✈️",
    "form_schema": [
      {
        "id": "travel_passenger",
        "type": "text",
        "label": "نام و نام خانوادگی مسافر",
        "name": "passenger_name",
        "required": true
      },
      {
        "id": "travel_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "travel_mode",
        "type": "select",
        "label": "نوع سفر",
        "name": "mode",
        "required": true,
        "options": [
          {
            "label": "هواپیما",
            "value": "flight"
          },
          {
            "label": "قطار",
            "value": "train"
          },
          {
            "label": "اتوبوس",
            "value": "bus"
          }
        ]
      },
      {
        "id": "travel_origin",
        "type": "text",
        "label": "مبدأ",
        "name": "origin",
        "required": true
      },
      {
        "id": "travel_destination",
        "type": "text",
        "label": "مقصد",
        "name": "destination",
        "required": true
      },
      {
        "id": "travel_date",
        "type": "date",
        "label": "تاریخ سفر",
        "name": "travel_date",
        "required": true
      }
    ]
  },
  {
    "title": "پیگیری گذرنامه",
    "category": "خدمات گذرنامه",
    "description": "ثبت اطلاعات لازم برای پیگیری وضعیت گذرنامه.",
    "icon": "🛂",
    "form_schema": [
      {
        "id": "passport_national",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "passport_mobile",
        "type": "phone",
        "label": "شماره موبایل",
        "name": "mobile",
        "required": true
      },
      {
        "id": "passport_tracking",
        "type": "text",
        "label": "کد رهگیری/شماره درخواست",
        "name": "tracking_code",
        "required": true
      }
    ]
  },
  {
    "title": "عکس پرسنلی ۳×۴",
    "category": "خدمات عکس و مدارک",
    "description": "آماده‌سازی عکس پرسنلی با ابعاد و استاندارد موردنظر.",
    "icon": "📸",
    "form_schema": [
      {
        "id": "photo34_count",
        "type": "number",
        "label": "تعداد خروجی",
        "name": "count",
        "required": true
      },
      {
        "id": "photo34_usage",
        "type": "text",
        "label": "کاربرد عکس",
        "name": "usage",
        "required": true
      },
      {
        "id": "photo34_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "آماده‌سازی عکس پاسپورت/ویزا",
    "category": "خدمات عکس و مدارک",
    "description": "تنظیم ابعاد و خروجی عکس مطابق نیاز مدرک یا سامانه.",
    "icon": "📷",
    "form_schema": [
      {
        "id": "passportphoto_usage",
        "type": "text",
        "label": "کشور/نوع مدرک",
        "name": "document_type",
        "required": true
      },
      {
        "id": "passportphoto_count",
        "type": "number",
        "label": "تعداد خروجی",
        "name": "count",
        "required": true
      },
      {
        "id": "passportphoto_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ویرایش و حذف پس‌زمینه عکس",
    "category": "ویرایش عکس",
    "description": "حذف یا اصلاح پس‌زمینه و آماده‌سازی تصویر.",
    "icon": "🖼️",
    "form_schema": [
      {
        "id": "bgedit_usage",
        "type": "text",
        "label": "کاربرد تصویر",
        "name": "usage",
        "required": true
      },
      {
        "id": "bgedit_background",
        "type": "text",
        "label": "پس‌زمینه موردنظر",
        "name": "background",
        "required": false
      },
      {
        "id": "bgedit_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "اسکن و تبدیل مدارک به PDF",
    "category": "خدمات مدارک",
    "description": "مرتب‌سازی و آماده‌سازی تصاویر/اسکن مدارک در قالب PDF.",
    "icon": "📄",
    "form_schema": [
      {
        "id": "scan_doc_count",
        "type": "number",
        "label": "تعداد مدارک/صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "scan_order",
        "type": "textarea",
        "label": "ترتیب مدارک",
        "name": "order_notes",
        "required": false
      },
      {
        "id": "scan_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "مرتب‌سازی و ادغام مدارک",
    "category": "خدمات مدارک",
    "description": "مرتب‌سازی چند تصویر یا PDF و تولید فایل نهایی.",
    "icon": "📑",
    "form_schema": [
      {
        "id": "docs_count",
        "type": "number",
        "label": "تعداد فایل/مدرک",
        "name": "file_count",
        "required": true
      },
      {
        "id": "docs_order",
        "type": "textarea",
        "label": "ترتیب موردنظر",
        "name": "order_notes",
        "required": true
      }
    ]
  },
  {
    "title": "آماده‌سازی مدارک برای سامانه",
    "category": "خدمات مدارک",
    "description": "تنظیم حجم، فرمت و ترتیب مدارک برای بارگذاری در سامانه مشخص.",
    "icon": "📤",
    "form_schema": [
      {
        "id": "upload_system",
        "type": "text",
        "label": "نام سامانه",
        "name": "system_name",
        "required": true
      },
      {
        "id": "upload_docs",
        "type": "textarea",
        "label": "نوع مدارک",
        "name": "documents",
        "required": true
      },
      {
        "id": "upload_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "طراحی رزومه فارسی",
    "category": "رزومه و استخدام",
    "description": "طراحی رزومه فارسی بر اساس اطلاعات حرفه‌ای مشتری.",
    "icon": "💼",
    "form_schema": [
      {
        "id": "cvfa_name",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "cvfa_job",
        "type": "text",
        "label": "عنوان شغلی",
        "name": "job_title",
        "required": true
      },
      {
        "id": "cvfa_experience",
        "type": "textarea",
        "label": "سوابق کاری",
        "name": "experience",
        "required": true
      },
      {
        "id": "cvfa_education",
        "type": "textarea",
        "label": "سوابق تحصیلی",
        "name": "education",
        "required": true
      }
    ]
  },
  {
    "title": "طراحی رزومه انگلیسی",
    "category": "رزومه و استخدام",
    "description": "طراحی رزومه انگلیسی برای کاربرد شغلی یا تحصیلی.",
    "icon": "🌍",
    "form_schema": [
      {
        "id": "cven_name",
        "type": "text",
        "label": "Full Name",
        "name": "full_name",
        "required": true
      },
      {
        "id": "cven_job",
        "type": "text",
        "label": "Job Title",
        "name": "job_title",
        "required": true
      },
      {
        "id": "cven_experience",
        "type": "textarea",
        "label": "Work Experience",
        "name": "experience",
        "required": true
      },
      {
        "id": "cven_education",
        "type": "textarea",
        "label": "Education",
        "name": "education",
        "required": true
      }
    ]
  },
  {
    "title": "چاپ سیاه‌وسفید",
    "category": "خدمات چاپ و خروجی",
    "description": "ثبت سفارش چاپ سیاه‌وسفید.",
    "icon": "🖨️",
    "form_schema": [
      {
        "id": "bw_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "bw_copies",
        "type": "number",
        "label": "تعداد نسخه",
        "name": "copies",
        "required": true
      },
      {
        "id": "bw_size",
        "type": "select",
        "label": "اندازه کاغذ",
        "name": "paper_size",
        "required": true,
        "options": [
          {
            "label": "A4",
            "value": "A4"
          },
          {
            "label": "A3",
            "value": "A3"
          }
        ]
      },
      {
        "id": "bw_sides",
        "type": "select",
        "label": "چاپ",
        "name": "sides",
        "required": true,
        "options": [
          {
            "label": "یک‌رو",
            "value": "single"
          },
          {
            "label": "دو‌رو",
            "value": "double"
          }
        ]
      }
    ]
  },
  {
    "title": "چاپ رنگی",
    "category": "خدمات چاپ و خروجی",
    "description": "ثبت سفارش چاپ رنگی.",
    "icon": "🖨️",
    "form_schema": [
      {
        "id": "color_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "color_copies",
        "type": "number",
        "label": "تعداد نسخه",
        "name": "copies",
        "required": true
      },
      {
        "id": "color_size",
        "type": "select",
        "label": "اندازه کاغذ",
        "name": "paper_size",
        "required": true,
        "options": [
          {
            "label": "A4",
            "value": "A4"
          },
          {
            "label": "A3",
            "value": "A3"
          }
        ]
      },
      {
        "id": "color_sides",
        "type": "select",
        "label": "چاپ",
        "name": "sides",
        "required": true,
        "options": [
          {
            "label": "یک‌رو",
            "value": "single"
          },
          {
            "label": "دو‌رو",
            "value": "double"
          }
        ]
      }
    ]
  },
  {
    "title": "چاپ پایان‌نامه",
    "category": "خدمات چاپ دانشگاهی",
    "description": "ثبت سفارش چاپ پایان‌نامه.",
    "icon": "🎓",
    "form_schema": [
      {
        "id": "thprint_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "thprint_copies",
        "type": "number",
        "label": "تعداد نسخه",
        "name": "copies",
        "required": true
      },
      {
        "id": "thprint_binding",
        "type": "text",
        "label": "نوع صحافی",
        "name": "binding",
        "required": true
      },
      {
        "id": "thprint_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ثبت دامنه",
    "category": "خدمات دامنه و سایت",
    "description": "ثبت درخواست ثبت دامنه با پسوند مشخص.",
    "icon": "🌐",
    "form_schema": [
      {
        "id": "domain_name",
        "type": "text",
        "label": "نام دامنه پیشنهادی",
        "name": "domain",
        "required": true
      },
      {
        "id": "domain_extension",
        "type": "text",
        "label": "پسوند",
        "name": "extension",
        "required": true
      },
      {
        "id": "domain_owner",
        "type": "text",
        "label": "نام مالک دامنه",
        "name": "owner_name",
        "required": true
      },
      {
        "id": "domain_mobile",
        "type": "phone",
        "label": "شماره تماس",
        "name": "mobile",
        "required": true
      }
    ]
  },
  {
    "title": "تنظیم DNS و اتصال دامنه",
    "category": "خدمات دامنه و سایت",
    "description": "تنظیم رکوردهای DNS و اتصال دامنه به سرویس مقصد.",
    "icon": "🔗",
    "form_schema": [
      {
        "id": "dns_domain",
        "type": "text",
        "label": "دامنه",
        "name": "domain",
        "required": true
      },
      {
        "id": "dns_target",
        "type": "text",
        "label": "سرویس/مقصد",
        "name": "target",
        "required": true
      },
      {
        "id": "dns_records",
        "type": "textarea",
        "label": "رکوردهای موردنیاز",
        "name": "records",
        "required": false
      }
    ]
  },
  {
    "title": "راه‌اندازی ایمیل سازمانی",
    "category": "خدمات دامنه و سایت",
    "description": "ثبت درخواست ایجاد ایمیل سازمانی روی دامنه.",
    "icon": "✉️",
    "form_schema": [
      {
        "id": "email_domain",
        "type": "text",
        "label": "دامنه",
        "name": "domain",
        "required": true
      },
      {
        "id": "email_count",
        "type": "number",
        "label": "تعداد حساب‌ها",
        "name": "account_count",
        "required": true
      },
      {
        "id": "email_names",
        "type": "textarea",
        "label": "نام حساب‌ها",
        "name": "account_names",
        "required": true
      }
    ]
  },
  {
    "title": "خدمات Microsoft Office",
    "category": "خدمات نرم‌افزاری",
    "description": "کمک در تنظیم، قالب‌بندی و رفع مشکلات Word/Excel/PowerPoint.",
    "icon": "💻",
    "form_schema": [
      {
        "id": "office_app",
        "type": "select",
        "label": "نرم‌افزار",
        "name": "application",
        "required": true,
        "options": [
          {
            "label": "Word",
            "value": "word"
          },
          {
            "label": "Excel",
            "value": "excel"
          },
          {
            "label": "PowerPoint",
            "value": "powerpoint"
          }
        ]
      },
      {
        "id": "office_task",
        "type": "textarea",
        "label": "شرح مشکل/درخواست",
        "name": "task",
        "required": true
      }
    ]
  },
  {
    "title": "تولید متن با هوش مصنوعی",
    "category": "خدمات هوش مصنوعی",
    "description": "تولید و بازنویسی محتوای متنی برای کاربردهای مجاز.",
    "icon": "🤖",
    "form_schema": [
      {
        "id": "ai_text_topic",
        "type": "text",
        "label": "موضوع",
        "name": "topic",
        "required": true
      },
      {
        "id": "ai_text_type",
        "type": "select",
        "label": "نوع محتوا",
        "name": "content_type",
        "required": true,
        "options": [
          {
            "label": "مقاله",
            "value": "article"
          },
          {
            "label": "کپشن",
            "value": "caption"
          },
          {
            "label": "متن تبلیغاتی",
            "value": "ad"
          },
          {
            "label": "توضیحات محصول",
            "value": "product"
          }
        ]
      },
      {
        "id": "ai_text_length",
        "type": "number",
        "label": "طول تقریبی (کلمه)",
        "name": "word_count",
        "required": false
      },
      {
        "id": "ai_text_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "خلاصه‌سازی و تحلیل فایل",
    "category": "خدمات هوش مصنوعی",
    "description": "استخراج نکات، خلاصه و تحلیل محتوای فایل‌های مجاز.",
    "icon": "🧠",
    "form_schema": [
      {
        "id": "ai_file_type",
        "type": "text",
        "label": "نوع فایل",
        "name": "file_type",
        "required": true
      },
      {
        "id": "ai_file_goal",
        "type": "textarea",
        "label": "هدف تحلیل",
        "name": "goal",
        "required": true
      },
      {
        "id": "ai_file_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "راهنمای بازیابی حساب کاربری",
    "category": "امنیت و حساب‌های کاربری",
    "description": "راهنمایی و انجام مراحل مجاز بازیابی حساب کاربری.",
    "icon": "🔐",
    "form_schema": [
      {
        "id": "account_platform",
        "type": "text",
        "label": "نام سرویس/سامانه",
        "name": "platform",
        "required": true
      },
      {
        "id": "account_username",
        "type": "text",
        "label": "شناسه کاربری/ایمیل",
        "name": "username",
        "required": true
      },
      {
        "id": "account_mobile",
        "type": "phone",
        "label": "شماره موبایل مرتبط",
        "name": "mobile",
        "required": false
      },
      {
        "id": "account_notes",
        "type": "textarea",
        "label": "شرح مشکل",
        "name": "problem",
        "required": true
      }
    ]
  },
  {
    "title": "فعال‌سازی احراز هویت دومرحله‌ای",
    "category": "امنیت و حساب‌های کاربری",
    "description": "راهنمای فعال‌سازی 2FA برای حساب کاربری.",
    "icon": "🔒",
    "form_schema": [
      {
        "id": "twofa_platform",
        "type": "text",
        "label": "نام سرویس",
        "name": "platform",
        "required": true
      },
      {
        "id": "twofa_method",
        "type": "select",
        "label": "روش موردنظر",
        "name": "method",
        "required": true,
        "options": [
          {
            "label": "برنامه Authenticator",
            "value": "authenticator"
          },
          {
            "label": "پیامک",
            "value": "sms"
          },
          {
            "label": "سایر روش‌های رسمی",
            "value": "other"
          }
        ]
      },
      {
        "id": "twofa_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "نگارش مقاله",
    "category": "مقاله و پژوهش",
    "description": "خدمات نگارشی و ساختاری مقاله برای کاربردهای مجاز پژوهشی.",
    "icon": "📝",
    "form_schema": [
      {
        "id": "article_topic",
        "type": "text",
        "label": "موضوع مقاله",
        "name": "topic",
        "required": true
      },
      {
        "id": "article_field",
        "type": "text",
        "label": "رشته/حوزه",
        "name": "field",
        "required": true
      },
      {
        "id": "article_type",
        "type": "select",
        "label": "نوع مقاله",
        "name": "article_type",
        "required": true,
        "options": [
          {
            "label": "مروری",
            "value": "review"
          },
          {
            "label": "پژوهشی",
            "value": "research"
          },
          {
            "label": "علمی-تخصصی",
            "value": "technical"
          }
        ]
      },
      {
        "id": "article_notes",
        "type": "textarea",
        "label": "توضیحات و الزامات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ویرایش مقاله",
    "category": "مقاله و پژوهش",
    "description": "ویرایش نگارشی، ساختاری و قالب‌بندی مقاله.",
    "icon": "✏️",
    "form_schema": [
      {
        "id": "article_edit_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "article_edit_type",
        "type": "select",
        "label": "نوع ویرایش",
        "name": "editing_type",
        "required": true,
        "options": [
          {
            "label": "نگارشی",
            "value": "copy"
          },
          {
            "label": "علمی/ساختاری",
            "value": "academic"
          },
          {
            "label": "قالب‌بندی",
            "value": "formatting"
          }
        ]
      },
      {
        "id": "article_edit_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "قالب‌بندی مقاله برای ارسال",
    "category": "مقاله و پژوهش",
    "description": "تنظیم مقاله مطابق راهنمای نویسندگان نشریه/همایش.",
    "icon": "📄",
    "form_schema": [
      {
        "id": "format_journal",
        "type": "text",
        "label": "نام نشریه/همایش",
        "name": "journal",
        "required": true
      },
      {
        "id": "format_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "format_notes",
        "type": "textarea",
        "label": "الزامات قالب",
        "name": "requirements",
        "required": false
      }
    ]
  },
  {
    "title": "تبدیل پایان‌نامه به مقاله",
    "category": "مقاله و پژوهش",
    "description": "استخراج و تنظیم ساختار مقاله از پایان‌نامه با رویکرد آموزشی/نگارشی.",
    "icon": "🎓",
    "form_schema": [
      {
        "id": "thesis_article_title",
        "type": "text",
        "label": "عنوان پایان‌نامه",
        "name": "thesis_title",
        "required": true
      },
      {
        "id": "thesis_article_field",
        "type": "text",
        "label": "رشته",
        "name": "field",
        "required": true
      },
      {
        "id": "thesis_article_pages",
        "type": "number",
        "label": "تعداد صفحات پایان‌نامه",
        "name": "page_count",
        "required": true
      },
      {
        "id": "thesis_article_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "ترجمه مقاله",
    "category": "مقاله و پژوهش",
    "description": "ترجمه مقاله یا متن تخصصی.",
    "icon": "🌐",
    "form_schema": [
      {
        "id": "translate_article_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "translate_article_from",
        "type": "select",
        "label": "زبان مبدأ",
        "name": "source_language",
        "required": true,
        "options": [
          {
            "label": "فارسی",
            "value": "fa"
          },
          {
            "label": "انگلیسی",
            "value": "en"
          },
          {
            "label": "سایر",
            "value": "other"
          }
        ]
      },
      {
        "id": "translate_article_to",
        "type": "select",
        "label": "زبان مقصد",
        "name": "target_language",
        "required": true,
        "options": [
          {
            "label": "فارسی",
            "value": "fa"
          },
          {
            "label": "انگلیسی",
            "value": "en"
          },
          {
            "label": "سایر",
            "value": "other"
          }
        ]
      },
      {
        "id": "translate_article_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "طراحی تراکت",
    "category": "طراحی گرافیکی",
    "description": "طراحی تراکت تبلیغاتی یا اطلاع‌رسانی.",
    "icon": "🎨",
    "form_schema": [
      {
        "id": "flyer_size",
        "type": "text",
        "label": "ابعاد",
        "name": "size",
        "required": true
      },
      {
        "id": "flyer_title",
        "type": "text",
        "label": "عنوان",
        "name": "title",
        "required": true
      },
      {
        "id": "flyer_content",
        "type": "textarea",
        "label": "متن و اطلاعات",
        "name": "content",
        "required": true
      },
      {
        "id": "flyer_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "طراحی بنر",
    "category": "طراحی گرافیکی",
    "description": "طراحی بنر برای چاپ یا استفاده دیجیتال.",
    "icon": "🖼️",
    "form_schema": [
      {
        "id": "banner_size",
        "type": "text",
        "label": "ابعاد",
        "name": "size",
        "required": true
      },
      {
        "id": "banner_title",
        "type": "text",
        "label": "عنوان",
        "name": "title",
        "required": true
      },
      {
        "id": "banner_content",
        "type": "textarea",
        "label": "متن بنر",
        "name": "content",
        "required": true
      },
      {
        "id": "banner_usage",
        "type": "select",
        "label": "کاربرد",
        "name": "usage",
        "required": true,
        "options": [
          {
            "label": "چاپ",
            "value": "print"
          },
          {
            "label": "وب",
            "value": "web"
          },
          {
            "label": "شبکه اجتماعی",
            "value": "social"
          }
        ]
      }
    ]
  },
  {
    "title": "طراحی پست اینستاگرام",
    "category": "طراحی شبکه اجتماعی",
    "description": "طراحی گرافیکی پست برای شبکه اجتماعی.",
    "icon": "📱",
    "form_schema": [
      {
        "id": "igpost_size",
        "type": "text",
        "label": "ابعاد/نسبت تصویر",
        "name": "size",
        "required": true
      },
      {
        "id": "igpost_title",
        "type": "text",
        "label": "موضوع/عنوان",
        "name": "title",
        "required": true
      },
      {
        "id": "igpost_content",
        "type": "textarea",
        "label": "متن روی طرح",
        "name": "content",
        "required": false
      },
      {
        "id": "igpost_count",
        "type": "number",
        "label": "تعداد طرح",
        "name": "count",
        "required": true
      }
    ]
  },
  {
    "title": "طراحی استوری",
    "category": "طراحی شبکه اجتماعی",
    "description": "طراحی استوری برای شبکه اجتماعی.",
    "icon": "📱",
    "form_schema": [
      {
        "id": "story_title",
        "type": "text",
        "label": "موضوع",
        "name": "title",
        "required": true
      },
      {
        "id": "story_content",
        "type": "textarea",
        "label": "متن/اطلاعات",
        "name": "content",
        "required": true
      },
      {
        "id": "story_count",
        "type": "number",
        "label": "تعداد استوری",
        "name": "count",
        "required": true
      }
    ]
  },
  {
    "title": "طراحی Thumbnail",
    "category": "طراحی شبکه اجتماعی",
    "description": "طراحی تصویر کاور ویدیو/محتوا.",
    "icon": "▶️",
    "form_schema": [
      {
        "id": "thumb_title",
        "type": "text",
        "label": "عنوان محتوا",
        "name": "title",
        "required": true
      },
      {
        "id": "thumb_platform",
        "type": "text",
        "label": "پلتفرم",
        "name": "platform",
        "required": true
      },
      {
        "id": "thumb_count",
        "type": "number",
        "label": "تعداد طرح",
        "name": "count",
        "required": true
      }
    ]
  },
  {
    "title": "تنظیم صفحه Word",
    "category": "خدمات Word",
    "description": "تنظیم حاشیه، اندازه کاغذ، فونت و صفحه‌بندی Word.",
    "icon": "📄",
    "form_schema": [
      {
        "id": "wordsetup_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "wordsetup_requirements",
        "type": "textarea",
        "label": "الزامات",
        "name": "requirements",
        "required": true
      }
    ]
  },
  {
    "title": "ایجاد فهرست خودکار Word",
    "category": "خدمات Word",
    "description": "تنظیم Heading و فهرست مطالب خودکار.",
    "icon": "📑",
    "form_schema": [
      {
        "id": "toc_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "toc_levels",
        "type": "number",
        "label": "تعداد سطوح فهرست",
        "name": "heading_levels",
        "required": false
      }
    ]
  },
  {
    "title": "تنظیم منابع پایان‌نامه",
    "category": "خدمات Word",
    "description": "تنظیم و یکدست‌سازی بخش منابع پایان‌نامه.",
    "icon": "📚",
    "form_schema": [
      {
        "id": "refs_count2",
        "type": "number",
        "label": "تعداد منابع",
        "name": "source_count",
        "required": true
      },
      {
        "id": "refs_style",
        "type": "text",
        "label": "شیوه استناد",
        "name": "citation_style",
        "required": true
      },
      {
        "id": "refs_notes2",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "فرمول‌نویسی Excel",
    "category": "خدمات Excel",
    "description": "طراحی و اصلاح فرمول‌های Excel.",
    "icon": "📊",
    "form_schema": [
      {
        "id": "formula_cells",
        "type": "number",
        "label": "تعداد تقریبی سلول/ردیف",
        "name": "cell_count",
        "required": false
      },
      {
        "id": "formula_goal",
        "type": "textarea",
        "label": "شرح محاسبات",
        "name": "goal",
        "required": true
      }
    ]
  },
  {
    "title": "ساخت نمودار Excel",
    "category": "خدمات Excel",
    "description": "ساخت نمودار و گزارش تصویری از داده‌های Excel.",
    "icon": "📈",
    "form_schema": [
      {
        "id": "chart_type",
        "type": "text",
        "label": "نوع نمودار",
        "name": "chart_type",
        "required": true
      },
      {
        "id": "chart_goal",
        "type": "textarea",
        "label": "هدف نمودار",
        "name": "goal",
        "required": true
      }
    ]
  },
  {
    "title": "تکمیل فرم‌های بانکی",
    "category": "خدمات بانکی و مالی",
    "description": "کمک در تکمیل فرم‌های بانکی با اطلاعات ارائه‌شده توسط مشتری.",
    "icon": "🏦",
    "form_schema": [
      {
        "id": "bankform_bank",
        "type": "text",
        "label": "نام بانک",
        "name": "bank",
        "required": true
      },
      {
        "id": "bankform_type",
        "type": "text",
        "label": "نوع فرم",
        "name": "form_type",
        "required": true
      },
      {
        "id": "bankform_fullname",
        "type": "text",
        "label": "نام و نام خانوادگی",
        "name": "full_name",
        "required": true
      },
      {
        "id": "bankform_national",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "bankform_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "پیگیری درخواست تسهیلات",
    "category": "تسهیلات و وام",
    "description": "پیگیری درخواست ثبت‌شده تسهیلات.",
    "icon": "🔎",
    "form_schema": [
      {
        "id": "loantrack_bank",
        "type": "text",
        "label": "بانک/مؤسسه",
        "name": "bank",
        "required": true
      },
      {
        "id": "loantrack_national",
        "type": "national_code",
        "label": "کد ملی",
        "name": "national_code",
        "required": true
      },
      {
        "id": "loantrack_reference",
        "type": "text",
        "label": "شماره درخواست/رهگیری",
        "name": "tracking_code",
        "required": true
      }
    ]
  },
  {
    "title": "تبدیل قرارداد به PDF",
    "category": "خدمات املاک",
    "description": "تبدیل و آماده‌سازی قرارداد برای خروجی PDF.",
    "icon": "📄",
    "form_schema": [
      {
        "id": "contractpdf_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "contractpdf_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "راه‌اندازی سایت ساده",
    "category": "خدمات وب",
    "description": "طراحی/راه‌اندازی سایت ساده یا صفحه معرفی.",
    "icon": "🌐",
    "form_schema": [
      {
        "id": "site_title",
        "type": "text",
        "label": "نام سایت",
        "name": "site_name",
        "required": true
      },
      {
        "id": "site_pages",
        "type": "number",
        "label": "تعداد صفحات",
        "name": "page_count",
        "required": true
      },
      {
        "id": "site_domain",
        "type": "text",
        "label": "دامنه در صورت وجود",
        "name": "domain",
        "required": false
      },
      {
        "id": "site_features",
        "type": "textarea",
        "label": "امکانات موردنیاز",
        "name": "features",
        "required": true
      }
    ]
  },
  {
    "title": "طراحی Landing Page",
    "category": "خدمات وب",
    "description": "طراحی صفحه فرود برای معرفی یا کمپین.",
    "icon": "🖥️",
    "form_schema": [
      {
        "id": "landing_title",
        "type": "text",
        "label": "عنوان پروژه",
        "name": "title",
        "required": true
      },
      {
        "id": "landing_goal",
        "type": "textarea",
        "label": "هدف صفحه",
        "name": "goal",
        "required": true
      },
      {
        "id": "landing_sections",
        "type": "number",
        "label": "تعداد بخش‌ها",
        "name": "section_count",
        "required": false
      },
      {
        "id": "landing_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "رفع خطای سایت",
    "category": "خدمات فنی",
    "description": "بررسی و رفع خطاهای عمومی سایت در محدوده دسترسی مجاز.",
    "icon": "🛠️",
    "form_schema": [
      {
        "id": "bug_url",
        "type": "text",
        "label": "آدرس سایت",
        "name": "url",
        "required": true
      },
      {
        "id": "bug_error",
        "type": "textarea",
        "label": "شرح خطا",
        "name": "error_description",
        "required": true
      },
      {
        "id": "bug_environment",
        "type": "text",
        "label": "محیط/فناوری در صورت اطلاع",
        "name": "environment",
        "required": false
      }
    ]
  },
  {
    "title": "خدمات HTML/CSS",
    "category": "خدمات برنامه‌نویسی و فنی",
    "description": "اصلاح یا پیاده‌سازی تغییرات HTML/CSS.",
    "icon": "💻",
    "form_schema": [
      {
        "id": "htmlcss_task",
        "type": "textarea",
        "label": "شرح تغییر",
        "name": "task",
        "required": true
      },
      {
        "id": "htmlcss_url",
        "type": "text",
        "label": "آدرس پروژه در صورت وجود",
        "name": "url",
        "required": false
      }
    ]
  },
  {
    "title": "اتوماسیون ساده فایل و Excel",
    "category": "خدمات برنامه‌نویسی و فنی",
    "description": "ساخت اتوماسیون ساده برای پردازش فایل یا داده.",
    "icon": "⚙️",
    "form_schema": [
      {
        "id": "auto_goal",
        "type": "textarea",
        "label": "هدف اتوماسیون",
        "name": "goal",
        "required": true
      },
      {
        "id": "auto_input",
        "type": "text",
        "label": "نوع فایل ورودی",
        "name": "input_type",
        "required": true
      },
      {
        "id": "auto_output",
        "type": "text",
        "label": "خروجی موردنظر",
        "name": "output_type",
        "required": true
      }
    ]
  },
  {
    "title": "بازنویسی متن با AI",
    "category": "خدمات هوش مصنوعی",
    "description": "بازنویسی و بهبود متن با توجه به لحن و هدف مشخص.",
    "icon": "🤖",
    "form_schema": [
      {
        "id": "rewrite_goal",
        "type": "text",
        "label": "هدف بازنویسی",
        "name": "goal",
        "required": true
      },
      {
        "id": "rewrite_tone",
        "type": "text",
        "label": "لحن موردنظر",
        "name": "tone",
        "required": true
      },
      {
        "id": "rewrite_notes",
        "type": "textarea",
        "label": "توضیحات",
        "name": "notes",
        "required": false
      }
    ]
  },
  {
    "title": "تولید محتوای شبکه اجتماعی با AI",
    "category": "تولید محتوای AI",
    "description": "تولید ایده، کپشن و محتوای متنی شبکه اجتماعی.",
    "icon": "✨",
    "form_schema": [
      {
        "id": "a_social_platform",
        "type": "text",
        "label": "پلتفرم",
        "name": "platform",
        "required": true
      },
      {
        "id": "a_social_topic",
        "type": "text",
        "label": "موضوع",
        "name": "topic",
        "required": true
      },
      {
        "id": "a_social_count",
        "type": "number",
        "label": "تعداد محتوا",
        "name": "count",
        "required": true
      },
      {
        "id": "a_social_tone",
        "type": "text",
        "label": "لحن",
        "name": "tone",
        "required": false
      }
    ]
  },
  {
    "title": "تولید توضیحات محصول با AI",
    "category": "تولید محتوای AI",
    "description": "تولید متن معرفی و توضیحات محصول.",
    "icon": "🛍️",
    "form_schema": [
      {
        "id": "a_product_name",
        "type": "text",
        "label": "نام محصول",
        "name": "product_name",
        "required": true
      },
      {
        "id": "a_product_features",
        "type": "textarea",
        "label": "ویژگی‌های محصول",
        "name": "features",
        "required": true
      },
      {
        "id": "a_product_length",
        "type": "number",
        "label": "طول تقریبی متن",
        "name": "word_count",
        "required": false
      }
    ]
  },
  {
    "title": "ساخت ارائه با AI",
    "category": "خدمات هوش مصنوعی",
    "description": "کمک در ساخت ساختار و محتوای ارائه با ابزارهای هوش مصنوعی.",
    "icon": "🧠",
    "form_schema": [
      {
        "id": "ai_presentation_topic",
        "type": "text",
        "label": "موضوع ارائه",
        "name": "topic",
        "required": true
      },
      {
        "id": "ai_presentation_slides",
        "type": "number",
        "label": "تعداد اسلاید",
        "name": "slide_count",
        "required": true
      },
      {
        "id": "ai_presentation_audience",
        "type": "text",
        "label": "مخاطب",
        "name": "audience",
        "required": false
      }
    ]
  },
  {
    "title": "رفع خطاهای ثبت‌نام و احراز هویت",
    "category": "امنیت و حساب‌های کاربری",
    "description": "بررسی خطاهای عمومی فرآیند ثبت‌نام و احراز هویت در سامانه‌های مجاز.",
    "icon": "🔐",
    "form_schema": [
      {
        "id": "auth_platform",
        "type": "text",
        "label": "نام سامانه",
        "name": "platform",
        "required": true
      },
      {
        "id": "auth_national",
        "type": "national_code",
        "label": "کد ملی در صورت نیاز",
        "name": "national_code",
        "required": false
      },
      {
        "id": "auth_error",
        "type": "textarea",
        "label": "شرح خطا",
        "name": "error",
        "required": true
      }
    ]
  }
]
$seed$::jsonb) LOOP
    SELECT id INTO v_service_id
    FROM public.services
    WHERE lower(trim(title)) = lower(trim(item->>'title'))
    ORDER BY created_at NULLS FIRST, id
    LIMIT 1;

    IF v_service_id IS NULL THEN
      INSERT INTO public.services
        (title, category, description, price, icon, is_active, form_schema, parent_service_id)
      VALUES
        (item->>'title', item->>'category', item->>'description', 0, NULLIF(item->>'icon',''), true, item->'form_schema', NULL)
      RETURNING id INTO v_service_id;
    ELSE
      UPDATE public.services
      SET category = item->>'category',
          description = item->>'description',
          icon = NULLIF(item->>'icon',''),
          is_active = true,
          form_schema = item->'form_schema'
      WHERE id = v_service_id;
    END IF;

    -- Prefer an already-linked standalone form; never convert a parent form into a normal form.
    SELECT id INTO v_form_id
    FROM public.custom_forms
    WHERE service_id = v_service_id
      AND parent_form_id IS NULL
      AND form_type = 'normal'
      AND lower(trim(title)) = lower(trim(item->>'title'))
    ORDER BY created_at NULLS FIRST, id
    LIMIT 1;

    -- Recover a legacy standalone form that has the same exact title but no service link.
    IF v_form_id IS NULL THEN
      SELECT id INTO v_form_id
      FROM public.custom_forms
      WHERE service_id IS NULL
        AND parent_form_id IS NULL
        AND form_type = 'normal'
        AND lower(trim(title)) = lower(trim(item->>'title'))
      ORDER BY created_at NULLS FIRST, id
      LIMIT 1;

      IF v_form_id IS NOT NULL THEN
        UPDATE public.custom_forms
        SET service_id = v_service_id
        WHERE id = v_form_id;
      END IF;
    END IF;

    IF v_form_id IS NULL THEN
      INSERT INTO public.custom_forms
        (title, description, schema, created_by, is_public, form_type, parent_form_id, service_id, sort_order)
      VALUES
        (item->>'title', item->>'description', item->'form_schema', NULL, true, 'normal', NULL, v_service_id, 0);
    ELSE
      UPDATE public.custom_forms
      SET description = item->>'description',
          schema = item->'form_schema',
          is_public = true,
          form_type = 'normal',
          parent_form_id = NULL,
          service_id = v_service_id,
          sort_order = 0
      WHERE id = v_form_id;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Validation 1: duplicate normalized service titles.
SELECT lower(trim(title)) AS normalized_title, count(*) AS service_count
FROM public.services
GROUP BY lower(trim(title))
HAVING count(*) > 1
ORDER BY service_count DESC, normalized_title;

-- Validation 2: active canonical services missing their standalone normal form.
SELECT s.title
FROM public.services s
LEFT JOIN public.custom_forms f
  ON f.service_id = s.id
 AND f.parent_form_id IS NULL
 AND f.form_type = 'normal'
 AND lower(trim(f.title)) = lower(trim(s.title))
WHERE s.is_active = true
  AND f.id IS NULL
ORDER BY s.title;

-- Validation 3: forms whose service link points at a different service title.
SELECT f.id, f.title AS form_title, s.title AS service_title
FROM public.custom_forms f
JOIN public.services s ON s.id = f.service_id
WHERE f.parent_form_id IS NULL
  AND f.form_type = 'normal'
  AND lower(trim(f.title)) <> lower(trim(s.title))
ORDER BY f.title;
