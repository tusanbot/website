-- Complete remaining 1405 Sanjesh-related services, keep medical exams separate, and normalize the malformed slug.
-- Site policy: these services are listed with price 0; only national_code and mobile are required.

DO $$
DECLARE
  v_sanjesh uuid;
  v_farhangian uuid;
  v_medical uuid;
BEGIN
  SELECT id INTO v_sanjesh FROM public.services WHERE slug='khadamat-sazman-sanjesh' LIMIT 1;
  SELECT id INTO v_farhangian FROM public.services WHERE title='خدمات فرهنگیان' LIMIT 1;

  IF v_sanjesh IS NULL OR v_farhangian IS NULL THEN
    RAISE EXCEPTION 'Required parent service is missing';
  END IF;

  UPDATE public.services
  SET slug='alagemandi-payam-noor-gheyrenteafaei'
  WHERE slug='alagemandi-payam-noor-gheyrenteفاعi';

  INSERT INTO public.services (title,category,description,price,icon,form_schema,is_active,parent_service_id,service_type,slug)
  SELECT x.title,'آزمون و سنجش',x.description,0,'graduation-cap',
    jsonb_build_object('fields',jsonb_build_array(
      jsonb_build_object('id','national_code','name','national_code','type','national_code','label','کد ملی','required',true),
      jsonb_build_object('id','mobile','name','mobile','type','phone','label','شماره موبایل','required',true),
      jsonb_build_object('id','full_name','name','full_name','type','text','label','نام و نام خانوادگی','required',false),
      jsonb_build_object('id','exam_year','name','exam_year','type','text','label','سال آزمون','required',false),
      jsonb_build_object('id','notes','name','notes','type','textarea','label','توضیحات','required',false)
    )),true,v_sanjesh,'normal',x.slug
  FROM (VALUES
    ('بسندگی زبان عربی','خدمات ثبت درخواست و پیگیری آزمون بسندگی زبان عربی.','basandegi-zaban-arabi'),
    ('ثبت درخواست جذب بدون آزمون دانشگاه فرهنگیان برای استعدادهای برتر ملی','ثبت درخواست و آماده‌سازی مدارک جذب بدون آزمون دانشگاه فرهنگیان برای استعدادهای برتر ملی.','jazb-bedoon-azmoon-farhangian-estedad-bartar')
  ) AS x(title,description,slug)
  WHERE NOT EXISTS (SELECT 1 FROM public.services s WHERE s.slug=x.slug);

  INSERT INTO public.services (title,category,description,price,icon,form_schema,is_active,parent_service_id,service_type,slug)
  SELECT x.title,'خدمات فرهنگیان',x.description,0,'graduation-cap',
    jsonb_build_object('fields',jsonb_build_array(
      jsonb_build_object('id','national_code','name','national_code','type','national_code','label','کد ملی','required',true),
      jsonb_build_object('id','mobile','name','mobile','type','phone','label','شماره موبایل','required',true),
      jsonb_build_object('id','full_name','name','full_name','type','text','label','نام و نام خانوادگی','required',false),
      jsonb_build_object('id','exam_year','name','exam_year','type','text','label','سال آزمون','required',false),
      jsonb_build_object('id','notes','name','notes','type','textarea','label','توضیحات','required',false)
    )),true,v_farhangian,'normal',x.slug
  FROM (VALUES
    ('ثبت‌نام آزمون اختصاصی پذیرش دانشجو-معلم دانشگاه فرهنگیان و تربیت دبیر شهید رجایی','ثبت‌نام آزمون اختصاصی پذیرش دانشجو-معلم دانشگاه فرهنگیان و تربیت دبیر شهید رجایی.','azmoon-ekhtesasi-farhangian'),
    ('مصاحبه عمومی و بررسی صلاحیت‌های عمومی دانشگاه فرهنگیان و تربیت دبیر شهید رجایی','ثبت درخواست و آماده‌سازی مدارک مصاحبه عمومی و بررسی صلاحیت‌های عمومی.','mosahabe-salahiyat-omoomi-farhangian')
  ) AS x(title,description,slug)
  WHERE NOT EXISTS (SELECT 1 FROM public.services s WHERE s.slug=x.slug);

  SELECT id INTO v_medical FROM public.services WHERE slug='azmoon-haye-oloom-pezeshki' LIMIT 1;
  IF v_medical IS NULL THEN
    INSERT INTO public.services (title,category,description,price,icon,form_schema,is_active,service_type,slug)
    VALUES (
      'آزمون‌های علوم پزشکی','آزمون و سنجش',
      'خدمات مرتبط با مرکز سنجش آموزش پزشکی؛ این گروه از خدمات از سازمان سنجش آموزش کشور تفکیک شده است.',
      0,'stethoscope',
      jsonb_build_object('fields',jsonb_build_array(
        jsonb_build_object('id','national_code','name','national_code','type','national_code','label','کد ملی','required',true),
        jsonb_build_object('id','mobile','name','mobile','type','phone','label','شماره موبایل','required',true),
        jsonb_build_object('id','full_name','name','full_name','type','text','label','نام و نام خانوادگی','required',false),
        jsonb_build_object('id','exam_year','name','exam_year','type','text','label','سال آزمون','required',false),
        jsonb_build_object('id','notes','name','notes','type','textarea','label','توضیحات','required',false)
      )),true,'parent','azmoon-haye-oloom-pezeshki'
    ) RETURNING id INTO v_medical;
  END IF;

  INSERT INTO public.services (title,category,description,price,icon,form_schema,is_active,parent_service_id,service_type,slug)
  SELECT x.title,'آزمون و سنجش',x.description,0,'stethoscope',
    jsonb_build_object('fields',jsonb_build_array(
      jsonb_build_object('id','national_code','name','national_code','type','national_code','label','کد ملی','required',true),
      jsonb_build_object('id','mobile','name','mobile','type','phone','label','شماره موبایل','required',true),
      jsonb_build_object('id','full_name','name','full_name','type','text','label','نام و نام خانوادگی','required',false),
      jsonb_build_object('id','exam_year','name','exam_year','type','text','label','سال آزمون','required',false),
      jsonb_build_object('id','notes','name','notes','type','textarea','label','توضیحات','required',false)
    )),true,v_medical,'normal',x.slug
  FROM (VALUES
    ('آزمون دکتری تخصصی پزشکی، لیسانس به پزشکی و دکتری حرفه‌ای فیزیوتراپی','ثبت‌نام و پیگیری آزمون‌های دکتری تخصصی پزشکی، لیسانس به پزشکی و دکتری حرفه‌ای فیزیوتراپی.','azmoon-phd-medical-lisans-bepezeshki-physiotherapy'),
    ('آزمون پذیرش دستیار تخصصی پزشکی و دندانپزشکی','ثبت‌نام و پیگیری آزمون پذیرش دستیار تخصصی پزشکی و دندانپزشکی.','azmoon-dastyari-takhasosi-pezeshki-dandpezeshki'),
    ('آزمون پذیرش دستیار فوق تخصصی پزشکی','ثبت‌نام و پیگیری آزمون پذیرش دستیار فوق تخصصی پزشکی.','azmoon-dastyari-foq-takhasosi-pezeshki'),
    ('آزمون دانشنامه تخصصی و فوق تخصصی پزشکی و دندانپزشکی','ثبت‌نام و پیگیری آزمون دانشنامه تخصصی و فوق تخصصی پزشکی و دندانپزشکی.','azmoon-daneshname-takhasosi-pezeshki'),
    ('آزمون مصاحبه بررسی صلاحیت‌های تخصصی پزشکی و دندانپزشکی و فوریت‌های پزشکی','ثبت درخواست و پیگیری مصاحبه و بررسی صلاحیت‌های تخصصی پزشکی و دندانپزشکی و فوریت‌های پزشکی.','mosahabe-salahiyat-takhasosi-pezeshki'),
    ('آزمون شفاهی دانشنامه تخصصی و فوق تخصصی پزشکی و دندانپزشکی','ثبت درخواست و پیگیری آزمون شفاهی دانشنامه تخصصی و فوق تخصصی پزشکی و دندانپزشکی.','azmoon-shafahi-daneshname-pezeshki'),
    ('آزمون صلاحیت بالینی پزشکی عمومی و دندانپزشکی','ثبت‌نام و پیگیری آزمون صلاحیت بالینی پزشکی عمومی و دندانپزشکی.','azmoon-salahiyat-balini-pezeshki-dandpezeshki'),
    ('آزمون صلاحیت حرفه‌ای گروه پرستاری، اتاق عمل و هوشبری','ثبت‌نام و پیگیری آزمون صلاحیت حرفه‌ای گروه پرستاری، اتاق عمل و هوشبری.','azmoon-salahiyat-herfei-parastari-otagh-amal-hooshbari'),
    ('آزمون‌های دانش‌آموختگان و دانشجویان دانشگاه‌های خارج از کشور','ثبت‌نام و پیگیری آزمون‌های مرتبط با دانشجویان و دانش‌آموختگان رشته‌های علوم پزشکی خارج از کشور.','azmoon-danesh-amokhtegan-kharej-pezeshki'),
    ('آزمون پذیرش دوره تکمیلی پزشکی و علوم آزمایشگاهی','ثبت‌نام و پیگیری آزمون پذیرش دوره تکمیلی پزشکی و علوم آزمایشگاهی.','azmoon-takmili-pezeshki-azmayeshgahi'),
    ('آزمون بهیاری','ثبت‌نام و پیگیری آزمون بهیاری.','azmoon-behyari'),
    ('مصاحبه علمی و سنجش عملی علوم آزمایشگاهی و دکتری تخصصی','ثبت درخواست و پیگیری مصاحبه علمی و سنجش عملی علوم آزمایشگاهی و دکتری تخصصی.','mosahabe-senjesh-amali-azmayeshgahi-phd')
  ) AS x(title,description,slug)
  WHERE NOT EXISTS (SELECT 1 FROM public.services s WHERE s.slug=x.slug);
END $$;
