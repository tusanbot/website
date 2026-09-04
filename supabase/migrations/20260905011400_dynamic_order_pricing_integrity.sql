-- Keep the database pricing authority in sync with the shared pricing engine.
-- Dynamic service/form prices must survive order insertion and be the amount used by payment.

create or replace function public.calculate_order_price_from_rules(p_base numeric, p_rules jsonb, p_data jsonb)
returns bigint language plpgsql immutable security definer set search_path = pg_catalog, public as $$
declare v_price numeric:=greatest(0,coalesce(p_base,0)); r jsonb; c jsonb; v_match boolean; v_actual text; v_expected text; v_field text; v_count numeric; v_threshold numeric; v_unit numeric; v_amount numeric; v_mode text; v_conditions jsonb;
begin
 if jsonb_typeof(coalesce(p_rules,'[]'::jsonb))<>'array' then return round(v_price)::bigint; end if;
 for r in select value from jsonb_array_elements(p_rules) loop
  if coalesce((r->>'enabled')::boolean,true)=false then continue; end if;
  v_match:=true; v_conditions:=r->'conditions';
  if jsonb_typeof(v_conditions)='array' and jsonb_array_length(v_conditions)>0 then
   if upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match:=false; end if;
   for c in select value from jsonb_array_elements(v_conditions) loop
    v_field:=coalesce(c->>'field',c->>'fieldId',''); v_actual:=coalesce(p_data->>v_field,''); v_expected:=coalesce(c->>'value','');
    case coalesce(c->>'operator','equals')
     when 'equals' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or v_actual=v_expected else v_match and v_actual=v_expected end;
     when 'not_equals' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or v_actual<>v_expected else v_match and v_actual<>v_expected end;
     when 'contains' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or position(lower(v_expected) in lower(v_actual))>0 else v_match and position(lower(v_expected) in lower(v_actual))>0 end;
     when 'not_contains' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or position(lower(v_expected) in lower(v_actual))=0 else v_match and position(lower(v_expected) in lower(v_actual))=0 end;
     when 'is_true' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or lower(v_actual) in ('true','1','yes') else v_match and lower(v_actual) in ('true','1','yes') end;
     when 'is_false' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or lower(v_actual) in ('false','0','no','') else v_match and lower(v_actual) in ('false','0','no','') end;
     when 'gt' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or v_actual::numeric>v_expected::numeric else v_match and v_actual::numeric>v_expected::numeric end;
     when 'gte' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or v_actual::numeric>=v_expected::numeric else v_match and v_actual::numeric>=v_expected::numeric end;
     when 'lt' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or v_actual::numeric<v_expected::numeric else v_match and v_actual::numeric<v_expected::numeric end;
     when 'lte' then v_match:=case when upper(coalesce(r->>'conditionLogic','AND'))='OR' then v_match or v_actual::numeric<=v_expected::numeric else v_match and v_actual::numeric<=v_expected::numeric end;
     else null;
    end case;
   end loop;
  elsif r ? 'field' and r ? 'operator' then
   v_field:=r->>'field'; v_actual:=coalesce(p_data->>v_field,''); v_expected:=coalesce(r->>'value','');
   case r->>'operator' when 'equals' then v_match:=v_actual=v_expected when 'not_equals' then v_match:=v_actual<>v_expected when 'contains' then v_match:=position(lower(v_expected) in lower(v_actual))>0 when 'not_contains' then v_match:=position(lower(v_expected) in lower(v_actual))=0 when 'is_true' then v_match:=lower(v_actual) in ('true','1','yes') when 'is_false' then v_match:=lower(v_actual) in ('false','0','no','') when 'gt' then v_match:=v_actual::numeric>v_expected::numeric when 'gte' then v_match:=v_actual::numeric>=v_expected::numeric when 'lt' then v_match:=v_actual::numeric<v_expected::numeric when 'lte' then v_match:=v_actual::numeric<=v_expected::numeric else v_match:=false end case;
  end if;
  if not v_match then continue; end if;
  if r ? 'base_price' then v_price:=greatest(0,coalesce((r->>'base_price')::numeric,v_price)); end if;
  if r ? 'additional_per_unit' then
   v_field:=r->'additional_per_unit'->>'field'; v_count:=case when jsonb_typeof(p_data->v_field)='array' then jsonb_array_length(p_data->v_field) else coalesce((p_data->>v_field)::numeric,0) end; v_threshold:=greatest(0,coalesce((r->'additional_per_unit'->>'threshold')::numeric,0)); v_unit:=greatest(0,coalesce((r->'additional_per_unit'->>'unit_price')::numeric,0)); v_price:=v_price+greatest(0,v_count-v_threshold)*v_unit;
  end if;
  if r ? 'amount' and not (r ? 'conditions' or r ? 'base_price' or r ? 'additional_per_unit') then
   v_amount:=coalesce((r->>'amount')::numeric,0); v_mode:=coalesce(r->>'mode','set'); if v_mode='set' then v_price:=greatest(0,v_amount); elsif v_mode='add' then v_price:=v_price+v_amount; elsif v_mode='per_item' then v_field:=coalesce(r->>'field',''); v_count:=case when jsonb_typeof(p_data->v_field)='array' then jsonb_array_length(p_data->v_field) else coalesce((p_data->>v_field)::numeric,0) end; v_price:=v_price+greatest(0,v_count-greatest(0,coalesce((r->>'includedItems')::numeric,0)))*v_amount; end if;
  end if;
 end loop;
 return greatest(0,round(v_price))::bigint;
exception when invalid_text_representation or division_by_zero then return greatest(0,round(v_price))::bigint;
end; $$;

create or replace function public.set_order_canonical_price()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_base numeric; v_rules jsonb;
begin
 if new.form_id is not null then
  select coalesce(cf.price,0) into v_base from public.custom_forms cf where cf.id=new.form_id and cf.service_id=new.service_id and cf.form_type='normal' and cf.is_public=true;
  if not found then raise exception 'فرم انتخاب‌شده با خدمت سفارش مطابقت ندارد.'; end if;
 else
  select coalesce(s.price,0),coalesce(s.pricing_rules,'[]'::jsonb) into v_base,v_rules from public.services s where s.id=new.service_id and s.is_active=true;
  if not found then raise exception 'خدمت انتخاب‌شده فعال یا معتبر نیست.'; end if;
  if exists(select 1 from public.services child where child.parent_service_id=new.service_id and child.is_active=true) then raise exception 'برای این خدمت باید یکی از زیرخدمت‌ها انتخاب شود.'; end if;
 end if;
 if new.form_id is not null then select coalesce(s.pricing_rules,'[]'::jsonb) into v_rules from public.services s where s.id=new.service_id and s.is_active=true; end if;
 new.price:=public.calculate_order_price_from_rules(v_base,v_rules,coalesce(new.form_data,'{}'::jsonb));
 return new;
end; $$;

drop policy if exists orders_user_insert_own on public.orders;
create policy orders_user_insert_own on public.orders for insert to authenticated with check (
 auth.uid()=user_id and status='registered' and jsonb_typeof(coalesce(form_data,'{}'::jsonb))='object' and char_length(coalesce(tracking_code,'')) between 8 and 100 and (
  (form_id is null and exists(select 1 from public.services s where s.id=service_id and s.is_active=true) and not exists(select 1 from public.services child where child.parent_service_id=service_id and child.is_active=true) and price=public.calculate_order_price_from_rules((select coalesce(s.price,0) from public.services s where s.id=service_id and s.is_active=true),(select coalesce(s.pricing_rules,'[]'::jsonb) from public.services s where s.id=service_id and s.is_active=true),coalesce(form_data,'{}'::jsonb)))
  or
  (form_id is not null and exists(select 1 from public.custom_forms cf join public.services s on s.id=cf.service_id where cf.id=form_id and cf.service_id=service_id and cf.form_type='normal' and cf.is_public=true and s.is_active=true) and price=public.calculate_order_price_from_rules((select coalesce(cf.price,0) from public.custom_forms cf where cf.id=form_id and cf.service_id=service_id and cf.form_type='normal' and cf.is_public=true),(select coalesce(s.pricing_rules,'[]'::jsonb) from public.services s where s.id=service_id and s.is_active=true),(coalesce(form_data,'{}'::jsonb))))
 ));
