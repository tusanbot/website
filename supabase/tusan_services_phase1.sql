-- Tusan Website - Phase 1 service/form seed
-- Scope: registration systems + selected exam services
-- Intentionally excludes parent/child hierarchy and conditional rules.
-- Prices are initialized to 0 and should be set from the admin panel.
-- Existing services with the same title are updated instead of duplicated.

DO $$
DECLARE
  v_service_id uuid;
BEGIN
  -- 1. ثبت نام سامانه ثنا
  SELECT id INTO v_service_id FROM services WHERE title = 'ثبت‌نام سامانه ثنا' LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (title, category, description, price, icon, is_active, form_schema, parent_service_id)
    VALUES ('ثبت‌نام سامانه ثنا', 'خدمات قضایی', 'ثبت‌نام اولیه و تکمیل اطلاعات موردنیاز سامانه ثنا.', 0, '⚖️', true,
      '[
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
      ]'::jsonb, NULL)
    RETURNING id INTO v_service_id;
  ELSE
    UPDATE services SET category='خدمات قضایی', description='ثبت‌نام اولیه و تکمیل اطلاعات موردنیاز سامانه ثنا.', form_schema=(SELECT jsonb_agg(x) FROM jsonb_array_elements(form_schema) x) WHERE id=v_service_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM custom_forms WHERE service_id=v_service_id AND title='ثبت‌نام سامانه ثنا') THEN
    INSERT INTO custom_forms (title, description, schema, created_by, is_public, form_type, parent_form_id, service_id, sort_order)
    VALUES ('ثبت‌نام سامانه ثنا','فرم اطلاعات ثبت‌نام سامانه ثنا',(SELECT form_schema FROM services WHERE id=v_service_id),NULL,true,'normal',NULL,v_service_id,0);
  END IF;

  -- 2. ثبت نام سجام
  SELECT id INTO v_service_id FROM services WHERE title = 'ثبت‌نام سجام' LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (title, category, description, price, icon, is_active, form_schema, parent_service_id)
    VALUES ('ثبت‌نام سجام','خدمات ثبت‌نام و سامانه‌ها','ثبت‌نام و تکمیل اطلاعات پروفایل سجام.',0,'📈',true,
      '[
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
        {"id":"sejam_account_no","type":"text","label":"شماره حساب","name":"account_number","required":true},
        {"id":"sejam_iban","type":"text","label":"شماره شبا","name":"iban","placeholder":"IR...","required":true},
        {"id":"sejam_occupation","type":"text","label":"شغل","name":"occupation","required":true},
        {"id":"sejam_education","type":"select","label":"تحصیلات","name":"education","required":true,"options":[{"label":"زیر دیپلم","value":"below_diploma"},{"label":"دیپلم","value":"diploma"},{"label":"کاردانی","value":"associate"},{"label":"کارشناسی","value":"bachelor"},{"label":"کارشناسی ارشد","value":"master"},{"label":"دکتری","value":"phd"}]}
      ]'::jsonb,NULL)
    RETURNING id INTO v_service_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM custom_forms WHERE service_id=v_service_id AND title='ثبت‌نام سجام') THEN
    INSERT INTO custom_forms (title,description,schema,created_by,is_public,form_type,parent_form_id,service_id,sort_order)
    SELECT 'ثبت‌نام سجام','فرم اطلاعات ثبت‌نام سجام',form_schema,NULL,true,'normal',NULL,id,0 FROM services WHERE id=v_service_id;
  END IF;

  -- 3. احراز هویت سجام
  SELECT id INTO v_service_id FROM services WHERE title = 'احراز هویت سجام' LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (title,category,description,price,icon,is_active,form_schema,parent_service_id)
    VALUES ('احراز هویت سجام','خدمات ثبت‌نام و سامانه‌ها','پیگیری و انجام فرآیند احراز هویت سجام.',0,'🔐',true,
      '[
        {"id":"sejamverify_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
        {"id":"sejamverify_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
        {"id":"sejamverify_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
        {"id":"sejamverify_tracking_code","type":"text","label":"کد رهگیری سجام","name":"tracking_code","required":true}
      ]'::jsonb,NULL)
    RETURNING id INTO v_service_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM custom_forms WHERE service_id=v_service_id AND title='احراز هویت سجام') THEN
    INSERT INTO custom_forms (title,description,schema,created_by,is_public,form_type,parent_form_id,service_id,sort_order)
    SELECT 'احراز هویت سجام','فرم اطلاعات احراز هویت سجام',form_schema,NULL,true,'normal',NULL,id,0 FROM services WHERE id=v_service_id;
  END IF;

  -- 4. ثبت نام امتا
  SELECT id INTO v_service_id FROM services WHERE title = 'ثبت‌نام سامانه امتا' LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (title,category,description,price,icon,is_active,form_schema,parent_service_id)
    VALUES ('ثبت‌نام سامانه امتا','خدمات ثبت‌نام و سامانه‌ها','ایجاد حساب و ثبت اطلاعات اولیه در سامانه امتا.',0,'🪪',true,
      '[
        {"id":"emta_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
        {"id":"emta_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
        {"id":"emta_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true}
      ]'::jsonb,NULL)
    RETURNING id INTO v_service_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM custom_forms WHERE service_id=v_service_id AND title='ثبت‌نام سامانه امتا') THEN
    INSERT INTO custom_forms (title,description,schema,created_by,is_public,form_type,parent_form_id,service_id,sort_order)
    SELECT 'ثبت‌نام سامانه امتا','فرم اطلاعات اولیه امتا',form_schema,NULL,true,'normal',NULL,id,0 FROM services WHERE id=v_service_id;
  END IF;

  -- 5. ثبت نام سامانه سخا
  SELECT id INTO v_service_id FROM services WHERE title = 'ثبت‌نام سامانه سخا' LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (title,category,description,price,icon,is_active,form_schema,parent_service_id)
    VALUES ('ثبت‌نام سامانه سخا','خدمات ثبت‌نام و سامانه‌ها','ثبت‌نام اولیه سامانه سخا.',0,'🛡️',true,
      '[
        {"id":"sakha_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
        {"id":"sakha_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
        {"id":"sakha_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true}
      ]'::jsonb,NULL)
    RETURNING id INTO v_service_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM custom_forms WHERE service_id=v_service_id AND title='ثبت‌نام سامانه سخا') THEN
    INSERT INTO custom_forms (title,description,schema,created_by,is_public,form_type,parent_form_id,service_id,sort_order)
    SELECT 'ثبت‌نام سامانه سخا','فرم اطلاعات اولیه سخا',form_schema,NULL,true,'normal',NULL,id,0 FROM services WHERE id=v_service_id;
  END IF;

  -- 6. ثبت نام میخک
  SELECT id INTO v_service_id FROM services WHERE title = 'ثبت‌نام سامانه میخک' LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (title,category,description,price,icon,is_active,form_schema,parent_service_id)
    VALUES ('ثبت‌نام سامانه میخک','خدمات سفر و کنسولی','ایجاد و تکمیل پروفایل در سامانه میخک.',0,'🌐',true,
      '[
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
        {"id":"mikhak_residence_country","type":"text","label":"کشور محل اقامت","name":"residence_country","required":true},
        {"id":"mikhak_residence_city","type":"text","label":"شهر محل اقامت","name":"residence_city","required":true},
        {"id":"mikhak_postal_code","type":"text","label":"کد پستی","name":"postal_code","required":true},
        {"id":"mikhak_address","type":"textarea","label":"آدرس محل اقامت","name":"address","required":true},
        {"id":"mikhak_residence_type","type":"text","label":"نوع اقامت","name":"residence_type","required":true}
      ]'::jsonb,NULL)
    RETURNING id INTO v_service_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM custom_forms WHERE service_id=v_service_id AND title='ثبت‌نام سامانه میخک') THEN
    INSERT INTO custom_forms (title,description,schema,created_by,is_public,form_type,parent_form_id,service_id,sort_order)
    SELECT 'ثبت‌نام سامانه میخک','فرم اطلاعات پروفایل میخک',form_schema,NULL,true,'normal',NULL,id,0 FROM services WHERE id=v_service_id;
  END IF;

  -- 7. ثبت نام سماح
  SELECT id INTO v_service_id FROM services WHERE title = 'ثبت‌نام سامانه سماح' LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (title,category,description,price,icon,is_active,form_schema,parent_service_id)
    VALUES ('ثبت‌نام سامانه سماح','خدمات زیارتی','ثبت اطلاعات متقاضی سفر عتبات در سامانه سماح.',0,'🕌',true,
      '[
        {"id":"samah_full_name","type":"text","label":"نام و نام خانوادگی","name":"full_name","required":true},
        {"id":"samah_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
        {"id":"samah_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":true},
        {"id":"samah_mobile","type":"phone","label":"شماره موبایل","name":"mobile","required":true},
        {"id":"samah_passport_no","type":"text","label":"شماره گذرنامه","name":"passport_number","required":true},
        {"id":"samah_passport_expiry","type":"date","label":"تاریخ انقضای گذرنامه","name":"passport_expiry","required":true},
        {"id":"samah_departure_border","type":"text","label":"مرز خروج","name":"departure_border","required":true},
        {"id":"samah_return_border","type":"text","label":"مرز بازگشت","name":"return_border","required":true},
        {"id":"samah_departure_date","type":"date","label":"تاریخ رفت","name":"departure_date","required":true},
        {"id":"samah_return_date","type":"date","label":"تاریخ بازگشت","name":"return_date","required":true},
        {"id":"samah_transport","type":"select","label":"وسیله نقلیه","name":"transport","required":true,"options":[{"label":"شخصی","value":"private"},{"label":"عمومی","value":"public"},{"label":"کاروانی","value":"caravan"}]},
        {"id":"samah_group_size","type":"number","label":"تعداد افراد همراه","name":"group_size","required":false}
      ]'::jsonb,NULL)
    RETURNING id INTO v_service_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM custom_forms WHERE service_id=v_service_id AND title='ثبت‌نام سامانه سماح') THEN
    INSERT INTO custom_forms (title,description,schema,created_by,is_public,form_type,parent_form_id,service_id,sort_order)
    SELECT 'ثبت‌نام سامانه سماح','فرم اطلاعات اولیه سماح',form_schema,NULL,true,'normal',NULL,id,0 FROM services WHERE id=v_service_id;
  END IF;

  -- 8. دریافت کارت ورود به جلسه آزمون
  SELECT id INTO v_service_id FROM services WHERE title = 'دریافت کارت ورود به جلسه آزمون' LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (title,category,description,price,icon,is_active,form_schema,parent_service_id)
    VALUES ('دریافت کارت ورود به جلسه آزمون','آزمون و سنجش','دریافت یا پیگیری کارت ورود به جلسه آزمون.',0,'🎫',true,
      '[
        {"id":"examcard_exam_name","type":"text","label":"نام آزمون","name":"exam_name","required":true},
        {"id":"examcard_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
        {"id":"examcard_candidate_no","type":"text","label":"شماره داوطلبی","name":"candidate_number","required":false},
        {"id":"examcard_file_no","type":"text","label":"شماره پرونده","name":"file_number","required":false},
        {"id":"examcard_birth_date","type":"date","label":"تاریخ تولد","name":"birth_date","required":false}
      ]'::jsonb,NULL)
    RETURNING id INTO v_service_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM custom_forms WHERE service_id=v_service_id AND title='دریافت کارت ورود به جلسه آزمون') THEN
    INSERT INTO custom_forms (title,description,schema,created_by,is_public,form_type,parent_form_id,service_id,sort_order)
    SELECT 'دریافت کارت ورود به جلسه آزمون','فرم اطلاعات دریافت کارت آزمون',form_schema,NULL,true,'normal',NULL,id,0 FROM services WHERE id=v_service_id;
  END IF;

  -- 9. دریافت نتایج آزمون
  SELECT id INTO v_service_id FROM services WHERE title = 'دریافت نتایج آزمون' LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (title,category,description,price,icon,is_active,form_schema,parent_service_id)
    VALUES ('دریافت نتایج آزمون','آزمون و سنجش','دریافت یا پیگیری نتیجه آزمون.',0,'📊',true,
      '[
        {"id":"examresult_exam_name","type":"text","label":"نام آزمون","name":"exam_name","required":true},
        {"id":"examresult_national_code","type":"national_code","label":"کد ملی","name":"national_code","required":true},
        {"id":"examresult_candidate_no","type":"text","label":"شماره داوطلبی","name":"candidate_number","required":false},
        {"id":"examresult_file_no","type":"text","label":"شماره پرونده","name":"file_number","required":false},
        {"id":"examresult_tracking_no","type":"text","label":"شماره پیگیری/سریال","name":"tracking_number","required":false}
      ]'::jsonb,NULL)
    RETURNING id INTO v_service_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM custom_forms WHERE service_id=v_service_id AND title='دریافت نتایج آزمون') THEN
    INSERT INTO custom_forms (title,description,schema,created_by,is_public,form_type,parent_form_id,service_id,sort_order)
    SELECT 'دریافت نتایج آزمون','فرم اطلاعات دریافت نتیجه آزمون',form_schema,NULL,true,'normal',NULL,id,0 FROM services WHERE id=v_service_id;
  END IF;

END $$;

-- Note: upload/file fields are intentionally omitted because the current
-- ServiceFormBuilder supports text/textarea/number/phone/email/date/select/
-- multiselect/boolean/checkbox/password/national_code, but not file yet.
-- Conditional rules and parent/child form hierarchy are intentionally deferred.
