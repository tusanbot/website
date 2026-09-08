create or replace function public.set_order_canonical_price()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_service_price numeric;
  v_rules jsonb;
  v_form_price numeric;
  v_form_schema jsonb;
  v_pricing_data jsonb;
begin
  if new.form_id is not null then
    select coalesce(cf.price,0), cf.schema into v_form_price,v_form_schema
    from public.custom_forms cf
    where cf.id=new.form_id and cf.service_id=new.service_id and cf.form_type='normal' and cf.is_public=true;
    if not found then raise exception 'فرم انتخاب‌شده با خدمت سفارش مطابقت ندارد.'; end if;
    select coalesce(s.price,0),coalesce(s.pricing_rules,'[]'::jsonb) into v_service_price,v_rules
    from public.services s where s.id=new.service_id and s.is_active=true;
    if not found then raise exception 'خدمت انتخاب‌شده فعال یا معتبر نیست.'; end if;
    v_pricing_data := public.build_order_pricing_data(coalesce(new.form_schema_snapshot, v_form_schema), coalesce(new.form_data,'{}'::jsonb));
    new.price := public.calculate_order_price_from_rules(v_form_price,v_rules,v_pricing_data);
  else
    select coalesce(s.price,0),coalesce(s.pricing_rules,'[]'::jsonb) into v_service_price,v_rules
    from public.services s where s.id=new.service_id and s.is_active=true;
    if not found then raise exception 'خدمت انتخاب‌شده فعال یا معتبر نیست.'; end if;
    if exists(select 1 from public.services child where child.parent_service_id=new.service_id and child.is_active=true) then raise exception 'برای این خدمت باید یکی از زیرخدمت‌ها انتخاب شود.'; end if;
    v_pricing_data := public.build_order_pricing_data(coalesce(new.form_schema_snapshot,'{}'::jsonb), coalesce(new.form_data,'{}'::jsonb));
    new.price := public.calculate_order_price_from_rules(v_service_price,v_rules,v_pricing_data);
  end if;
  return new;
end;
$function$;
