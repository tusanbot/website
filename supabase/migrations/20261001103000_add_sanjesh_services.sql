-- Add missing Organization of Sanjesh services.
-- These services are intentionally without a service fee for now.
-- Only national_code and mobile are required.

DO $$
DECLARE parent_id uuid;
BEGIN
  SELECT id INTO parent_id FROM public.services
  WHERE is_active=true AND service_type='parent' AND title='خدمات سازمان سنجش'
  LIMIT 1;

  IF parent_id IS NULL THEN
    INSERT INTO public.services (
      title,category,description,price,icon,form_schema,is_active,parent_service_id,service_type,slug,pricing_rules,
      delivery_mode,meta_title,meta_description,seo_keywords,is_popular,seo_content,local_only,identity_verification_required
    ) VALUES (
      'خدمات سازمان سنجش','آزمون و سنجش',
      'خدمات ثبت‌نام و امور مرتبط با آزمون‌ها و پذیرش‌های سازمان سنجش آموزش کشور.',
      0,'graduation-cap',
      jsonb_build_array(
        jsonb_build_object('id','sanjesh_parent_national','name','national_code','type','national_code','label','کد ملی','required',true),
        jsonb_build_object('id','sanjesh_parent_mobile','name','mobile','type','phone','label','شماره موبایل','required',true),
        jsonb_build_object('id','sanjesh_parent_notes','name','notes','type','textarea','label','توضیحات','required',false)
      ),
      true,null,'parent','khadamat-sazman-sanjesh','[]'::jsonb,'online',
      'خدمات سازمان سنجش | ثبت‌نام آزمون‌ها',
      'ثبت‌نام و خدمات آزمون‌های سازمان سنجش آموزش کشور.',
      ARRAY['سازمان سنجش','ثبت نام آزمون','آزمون زبان','سامفا','ترمیم نمره','سوابق تحصیلی'],
      false,'{}'::jsonb,false,false
    ) RETURNING id INTO parent_id;
  END IF;

  INSERT INTO public.services (
    title,category,description,price,icon,form_schema,is_active,parent_service_id,service_type,slug,pricing_rules,
    delivery_mode,is_popular,seo_content,local_only,identity_verification_required
  )
  SELECT v.title,'آزمون و سنجش',v.description,0,'graduation-cap',
    jsonb_build_array(
      jsonb_build_object('id',v.key||'_national','name','national_code','type','national_code','label','کد ملی','required',true),
      jsonb_build_object('id',v.key||'_mobile','name','mobile','type','phone','label','شماره موبایل','required',true),
      jsonb_build_object('id',v.key||'_fullname','name','full_name','type','text','label','نام و نام خانوادگی','required',false),
      jsonb_build_object('id',v.key||'_year','name','exam_year','type','text','label','سال آزمون','required',false),
      jsonb_build_object('id',v.key||'_notes','name','notes','type','textarea','label','توضیحات','required',false)
    ),
    true,parent_id,'normal',v.slug,'[]'::jsonb,'online',false,'{}'::jsonb,false,false
  FROM (VALUES
    ('ثبت‌نام آزمون کاردانی پیوسته','ثبت‌نام آزمون کاردانی پیوسته و انجام مراحل ثبت‌نام.','kar-dani-peyvasteh','azmoon-kardani-peyvasteh'),
    ('ثبت‌نام آزمون کارشناسی ارشد دوره فراگیر پیام نور و دانشگاه آزاد','ثبت‌نام آزمون کارشناسی ارشد دوره‌های فراگیر پیام نور و دانشگاه آزاد.','arshad-faragir','arshad-faragir-payam-noor-azad'),
    ('ثبت‌نام آزمون زبان انگلیسی پیشرفته (TOLIMO)','ثبت‌نام آزمون زبان انگلیسی پیشرفته TOLIMO.','tolimo','azmoon-zaban-tolimo'),
    ('ثبت‌نام آزمون زبان انگلیسی پیشرفته الکترونیکی','ثبت‌نام آزمون زبان انگلیسی پیشرفته به صورت الکترونیکی.','tolimo-electronic','azmoon-zaban-electronic'),
    ('ثبت‌نام آزمون سنجش استاندارد مهارت‌های زبان فارسی (سامفا)','ثبت‌نام آزمون سنجش استاندارد مهارت‌های زبان فارسی سامفا.','samfa','azmoon-samfa'),
    ('ثبت‌نام آزمون عملی رشته تربیت بدنی','ثبت‌نام و پیگیری آزمون عملی رشته تربیت بدنی/علوم ورزشی.','physical-education','azmoon-amali-tarbiat-badani'),
    ('ثبت‌نام آزمون عملی رشته‌های هنر','ثبت‌نام و پیگیری آزمون عملی رشته‌های هنر.','arts-practical','azmoon-amali-honar'),
    ('ثبت‌نام آزمون سراسری برای متقاضیان خارج از کشور','ثبت‌نام آزمون سراسری برای داوطلبانی که حوزه امتحانی آنها خارج از کشور است.','foreign-sanjesh','azmoon-sarasari-kharej-keshvar'),
    ('خدمات سامانه راهنمای انتخاب رشته پیشنهادی','دریافت خدمات اختیاری سامانه راهنمای انتخاب رشته پیشنهادی.','choice-guide','rahnamaye-entekhab-reshteh-pishnahadi'),
    ('ثبت علاقه‌مندی به گزینش پیام نور و مؤسسات غیرانتفاعی','ثبت علاقه‌مندی به گزینش در دانشگاه‌های پیام نور و مؤسسات غیرانتفاعی.','interest-pnu-nonprofit','alagemandi-payam-noor-gheyrentefaei'),
    ('بررسی پرونده صلاحیت عمومی داوطلبان آزمون‌ها','خدمات مرتبط با بررسی پرونده‌های صلاحیت عمومی داوطلبان آزمون‌ها.','general-qualification','barresi-salahiyat-omoomi'),
    ('ثبت‌نام متأخر آزمون‌های سازمان سنجش','ثبت‌نام متأخر در آزمون‌ها در صورت فعال بودن مهلت قانونی.','late-registration','sabtenam-motaakher-sanjesh'),
    ('آزمون مجدد داوطلبان متخلف احتمالی','خدمات ثبت و پیگیری برگزاری آزمون مجدد داوطلبان مشمول مقررات تخلفات آزمون‌ها.','repeat-exam','azmoon-mojaddad-motakhalefin'),
    ('آزمون تناسب شغل و شخصیت','ثبت‌نام و انجام فرایند آزمون تناسب شغل و شخصیت.','job-personality-fit','azmoon-tanasob-shoghl-shakhsiyat'),
    ('مصاحبه و ارزیابی نهایی شایستگی‌های رفتاری و تخصصی','خدمات ثبت و پیگیری مصاحبه و ارزیابی نهایی شایستگی‌های رفتاری و تخصصی.','final-competency','mosahabe-arzyabi-nihayi-shayestegi'),
    ('صدور گواهی رتبه و تراز سابقه تحصیلی','درخواست صدور گواهی رتبه داوطلبان آزمون‌های سراسری و تراز سابقه تحصیلی.','rank-certificate','govahi-rotbe-taraz'),
    ('آزمون‌های نهایی، ایجاد سابقه و ترمیم نمره','ثبت درخواست خدمات آزمون‌های نهایی، ایجاد سابقه تحصیلی و ترمیم نمره.','grade-repair','azmoon-nahayi-tarmim-nomre'),
    ('تولید سوابق تحصیلی برای آزمون سراسری','خدمات تولید سوابق تحصیلی برای داوطلبان متقاضی شرکت در آزمون سراسری.','academic-record-create','tolid-savabegh-tahsili'),
    ('صدور سابقه تحصیلی برای پذیرش صرفاً بر اساس سوابق','درخواست صدور سابقه تحصیلی برای پذیرش صرفاً بر اساس سوابق تحصیلی.','academic-record-certificate','sodur-sabeghe-tahsili'),
    ('برگزاری آزمون نهایی مجدد داوطلبان متخلف احتمالی','خدمات آزمون نهایی مجدد برای داوطلبان مشمول مقررات تخلفات آزمون‌ها.','final-repeat','azmoon-nahayi-mojaddad')
  ) AS v(title,description,key,slug)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.services s WHERE s.is_active=true AND lower(trim(s.title))=lower(trim(v.title))
  );
END $$;
