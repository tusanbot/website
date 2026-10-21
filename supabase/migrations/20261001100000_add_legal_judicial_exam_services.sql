-- Add legal/judicial exam registration services.
-- Registration services are temporarily priced at 250,000 تومان.
-- National code and mobile are the only required form fields.

DO $$
DECLARE
  parent_id uuid;
BEGIN
  SELECT id INTO parent_id
  FROM public.services
  WHERE is_active = true
    AND service_type = 'parent'
    AND title = 'آزمون‌های حقوقی و قضایی'
  LIMIT 1;

  IF parent_id IS NULL THEN
    INSERT INTO public.services (
      title, category, description, price, icon, form_schema,
      is_active, parent_service_id, service_type, slug, pricing_rules,
      delivery_mode, meta_title, meta_description, seo_keywords,
      is_popular, seo_content, local_only, identity_verification_required
    )
    VALUES (
      'آزمون‌های حقوقی و قضایی',
      'آزمون‌های حقوقی و قضایی',
      'خدمات ثبت‌نام و پیگیری آزمون‌های وکالت، کارشناسی رسمی، قضاوت، سردفتری و آزمون‌های مرتبط با قوه قضائیه و دادگستری.',
      0, 'scale',
      jsonb_build_array(
        jsonb_build_object('id','legal_parent_national','name','national_code','type','national_code','label','کد ملی','required',true),
        jsonb_build_object('id','legal_parent_mobile','name','mobile','type','phone','label','شماره موبایل','required',true),
        jsonb_build_object('id','legal_parent_request','name','request','type','textarea','label','شرح درخواست','required',false)
      ),
      true, null, 'parent', 'azmoon-haye-hoghooghi-va-ghazaei', '[]'::jsonb,
      'online',
      'آزمون‌های حقوقی و قضایی | ثبت‌نام و خدمات',
      'ثبت‌نام و خدمات آزمون‌های وکالت، کارشناسی رسمی، قضاوت، سردفتری و قوه قضائیه.',
      ARRAY['آزمون وکالت','قوه قضائیه','دادگستری','کارشناسی رسمی','قضاوت','سردفتری'],
      false, '{}'::jsonb, false, false
    )
    RETURNING id INTO parent_id;
  END IF;

  INSERT INTO public.services (
    title, category, description, price, icon, form_schema,
    is_active, parent_service_id, service_type, slug, pricing_rules,
    delivery_mode, is_popular, seo_content, local_only, identity_verification_required
  )
  SELECT v.title, 'آزمون‌های حقوقی و قضایی', v.description, 250000, 'scale',
    jsonb_build_array(
      jsonb_build_object('id', v.key || '_national_code','name','national_code','type','national_code','label','کد ملی','required',true),
      jsonb_build_object('id', v.key || '_mobile','name','mobile','type','phone','label','شماره موبایل','required',true),
      jsonb_build_object('id', v.key || '_full_name','name','full_name','type','text','label','نام و نام خانوادگی','required',false),
      jsonb_build_object('id', v.key || '_exam_year','name','exam_year','type','text','label','سال آزمون','required',false),
      jsonb_build_object('id', v.key || '_notes','name','notes','type','textarea','label','توضیحات','required',false)
    ),
    true, parent_id, 'normal', v.slug, '[]'::jsonb, 'online', false, '{}'::jsonb, false, false
  FROM (VALUES
    ('ثبت‌نام آزمون وکالت مرکز وکلای قوه قضائیه','ثبت‌نام آزمون وکالت مرکز وکلای قوه قضائیه و ثبت اطلاعات متقاضی.','vokalat_markaz_qoveh_ghazaei','vokalat-markaz-qoveh-ghazaei'),
    ('ثبت‌نام آزمون وکالت کانون‌های وکلای دادگستری','ثبت‌نام آزمون وکالت کانون‌های وکلای دادگستری (اسکودا).','vokalat_kanon_vokala','vokalat-kanon-vokala'),
    ('ثبت‌نام آزمون کارشناسی رسمی دادگستری','ثبت‌نام آزمون کارشناسی رسمی دادگستری در مسیرهای مربوط به کانون کارشناسان رسمی.','karshenasi_rasmi_dadgostari','karshenasi-rasmi-dadgostari'),
    ('ثبت‌نام آزمون کارشناسی رسمی مرکز وکلا و کارشناسان رسمی قوه قضائیه','ثبت‌نام آزمون کارشناسی رسمی مرکز وکلا، کارشناسان رسمی و مشاوران خانواده قوه قضائیه.','karshenasi_rasmi_markaz_vokala','karshenasi-rasmi-markaz-vokala'),
    ('ثبت‌نام آزمون تصدی منصب قضا','ثبت‌نام آزمون تصدی منصب قضا و خدمات مربوط به فرایند ثبت‌نام.','tasadi_mansab_ghaza','tasadi-mansab-ghaza'),
    ('ثبت‌نام آزمون استخدامی قوه قضائیه','ثبت‌نام آزمون استخدامی قوه قضائیه و تکمیل اطلاعات ثبت‌نام.','estekhdam_qoveh_ghazaei','estekhdam-qoveh-ghazaei'),
    ('ثبت‌نام آزمون سردفتری اسناد رسمی','ثبت‌نام آزمون سردفتری اسناد رسمی.','sardafteri_asnad_rasmi','sardafteri-asnad-rasmi'),
    ('ثبت‌نام آزمون دفتریاری اسناد رسمی','ثبت‌نام آزمون دفتریاری اسناد رسمی.','daftaryari_asnad_rasmi','daftaryari-asnad-rasmi'),
    ('ثبت‌نام آزمون سردفتری ازدواج و طلاق','ثبت‌نام آزمون سردفتری ازدواج و طلاق.','sardafteri_ezdevaj_talagh','sardafteri-ezdevaj-talagh'),
    ('ثبت‌نام آزمون مشاوران خانواده قوه قضائیه','ثبت‌نام آزمون اخذ پروانه مشاوره خانواده قوه قضائیه.','moshaveran_khanevadeh_qoveh_ghazaei','moshaveran-khanevadeh-qoveh-ghazaei')
  ) AS v(title, description, key, slug)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.is_active = true
      AND lower(trim(s.title)) = lower(trim(v.title))
  );
END $$;
