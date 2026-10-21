-- Standardize service forms: national code and mobile are the only required fields.
-- Existing field requirements are preserved only for these two identity/contact field types;
-- all other fields become optional. Missing national/mobile fields are added.

DO $$
DECLARE
  r record;
  field jsonb;
  new_fields jsonb;
  has_national boolean;
  has_mobile boolean;
  f_name text;
  f_type text;
BEGIN
  FOR r IN SELECT id, form_schema FROM public.services LOOP
    new_fields := '[]'::jsonb;
    has_national := false;
    has_mobile := false;

    IF jsonb_typeof(coalesce(r.form_schema, '[]'::jsonb)) = 'array' THEN
      FOR field IN SELECT value FROM jsonb_array_elements(coalesce(r.form_schema, '[]'::jsonb)) LOOP
        f_name := lower(coalesce(field->>'name', ''));
        f_type := lower(coalesce(field->>'type', ''));

        has_national := has_national OR f_type = 'national_code' OR f_name = 'national_code';
        has_mobile := has_mobile OR f_type = 'phone' OR f_name = 'mobile';

        IF jsonb_typeof(field->'fields') = 'array' THEN
          field := jsonb_set(field, '{fields}', (
            SELECT coalesce(jsonb_agg(
              CASE
                WHEN lower(coalesce(child->>'type', '')) = 'national_code'
                  OR lower(coalesce(child->>'name', '')) = 'national_code'
                  THEN jsonb_set(child, '{required}', 'true'::jsonb, true)
                WHEN lower(coalesce(child->>'type', '')) = 'phone'
                  OR lower(coalesce(child->>'name', '')) = 'mobile'
                  THEN jsonb_set(child, '{required}', 'true'::jsonb, true)
                ELSE jsonb_set(child, '{required}', 'false'::jsonb, true)
              END
            ), '[]'::jsonb)
            FROM jsonb_array_elements(field->'fields') child
          ), true);
        END IF;

        IF f_type = 'national_code' OR f_name = 'national_code'
          OR f_type = 'phone' OR f_name = 'mobile'
          THEN field := jsonb_set(field, '{required}', 'true'::jsonb, true);
          ELSE field := jsonb_set(field, '{required}', 'false'::jsonb, true);
        END IF;

        new_fields := new_fields || jsonb_build_array(field);
      END LOOP;
    END IF;

    IF NOT has_national THEN
      new_fields := new_fields || jsonb_build_array(jsonb_build_object(
        'id', 'tusan_required_national_code',
        'name', 'national_code',
        'type', 'national_code',
        'label', 'کد ملی',
        'required', true,
        'description', 'کد ملی متقاضی برای ثبت و پیگیری سفارش'
      ));
    END IF;

    IF NOT has_mobile THEN
      new_fields := new_fields || jsonb_build_array(jsonb_build_object(
        'id', 'tusan_required_mobile',
        'name', 'mobile',
        'type', 'phone',
        'label', 'شماره موبایل',
        'required', true,
        'description', 'شماره موبایل متقاضی برای ثبت و پیگیری سفارش'
      ));
    END IF;

    UPDATE public.services SET form_schema = new_fields WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, schema FROM public.custom_forms LOOP
    new_fields := '[]'::jsonb;
    has_national := false;
    has_mobile := false;

    IF jsonb_typeof(coalesce(r.schema, '[]'::jsonb)) = 'array' THEN
      FOR field IN SELECT value FROM jsonb_array_elements(coalesce(r.schema, '[]'::jsonb)) LOOP
        f_name := lower(coalesce(field->>'name', ''));
        f_type := lower(coalesce(field->>'type', ''));

        has_national := has_national OR f_type = 'national_code' OR f_name = 'national_code';
        has_mobile := has_mobile OR f_type = 'phone' OR f_name = 'mobile';

        IF jsonb_typeof(field->'fields') = 'array' THEN
          field := jsonb_set(field, '{fields}', (
            SELECT coalesce(jsonb_agg(
              CASE
                WHEN lower(coalesce(child->>'type', '')) = 'national_code'
                  OR lower(coalesce(child->>'name', '')) = 'national_code'
                  THEN jsonb_set(child, '{required}', 'true'::jsonb, true)
                WHEN lower(coalesce(child->>'type', '')) = 'phone'
                  OR lower(coalesce(child->>'name', '')) = 'mobile'
                  THEN jsonb_set(child, '{required}', 'true'::jsonb, true)
                ELSE jsonb_set(child, '{required}', 'false'::jsonb, true)
              END
            ), '[]'::jsonb)
            FROM jsonb_array_elements(field->'fields') child
          ), true);
        END IF;

        IF f_type = 'national_code' OR f_name = 'national_code'
          OR f_type = 'phone' OR f_name = 'mobile'
          THEN field := jsonb_set(field, '{required}', 'true'::jsonb, true);
          ELSE field := jsonb_set(field, '{required}', 'false'::jsonb, true);
        END IF;

        new_fields := new_fields || jsonb_build_array(field);
      END LOOP;
    END IF;

    IF NOT has_national THEN
      new_fields := new_fields || jsonb_build_array(jsonb_build_object(
        'id', 'tusan_required_national_code',
        'name', 'national_code',
        'type', 'national_code',
        'label', 'کد ملی',
        'required', true,
        'description', 'کد ملی متقاضی برای ثبت و پیگیری سفارش'
      ));
    END IF;

    IF NOT has_mobile THEN
      new_fields := new_fields || jsonb_build_array(jsonb_build_object(
        'id', 'tusan_required_mobile',
        'name', 'mobile',
        'type', 'phone',
        'label', 'شماره موبایل',
        'required', true,
        'description', 'شماره موبایل متقاضی برای ثبت و پیگیری سفارش'
      ));
    END IF;

    UPDATE public.custom_forms SET schema = new_fields WHERE id = r.id;
  END LOOP;
END $$;
