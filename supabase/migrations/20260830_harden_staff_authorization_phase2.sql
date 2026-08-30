-- Phase 2: harden staff/customer authorization boundaries.
-- Browser clients must use the audited SECURITY DEFINER RPCs for these mutations.
REVOKE INSERT ON TABLE public.order_staff_requests FROM authenticated;
REVOKE INSERT ON TABLE public.support_conversation_participants FROM authenticated;
REVOKE UPDATE ON TABLE public.support_messages FROM authenticated;

-- Bank-account approval is an administrative control. Do not allow a staff member
-- to self-create or self-edit an approved bank account through PostgREST.
REVOKE ALL ON TABLE public.staff_bank_accounts FROM public;
REVOKE ALL ON TABLE public.staff_bank_accounts FROM authenticated;

-- Correct the staff-review RPC: the previous INSERT omitted p_rating and shifted
-- subsequent values into the wrong columns.
CREATE OR REPLACE FUNCTION public.submit_staff_review(
  p_order_id uuid,
  p_rating smallint,
  p_comment text DEFAULT NULL,
  p_strengths text[] DEFAULT '{}',
  p_weaknesses text[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_id uuid;
begin
  if v_uid is null then raise exception 'احراز هویت لازم است'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'امتیاز باید بین ۱ تا ۵ باشد'; end if;
  select * into v_order from public.orders where id=p_order_id;
  if v_order.id is null then raise exception 'سفارش پیدا نشد'; end if;
  if v_order.user_id<>v_uid then raise exception 'فقط مشتری سفارش می‌تواند نظر ثبت کند'; end if;
  if v_order.processing_status<>'completed' or v_order.assigned_staff_id is null then raise exception 'پس از تکمیل سفارش امکان ثبت نظر وجود دارد'; end if;
  if exists(select 1 from public.staff_reviews where order_id=p_order_id) then raise exception 'برای این سفارش قبلاً نظر ثبت شده است'; end if;
  insert into public.staff_reviews(order_id,staff_id,customer_id,rating,comment,strengths,weaknesses)
  values(p_order_id,v_order.assigned_staff_id,v_uid,p_rating,nullif(trim(coalesce(p_comment,'')),''),coalesce(p_strengths,'{}'),coalesce(p_weaknesses,'{}'))
  returning id into v_id;
  return v_id;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.submit_staff_review(uuid, smallint, text, text[], text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_staff_review(uuid, smallint, text, text[], text[]) TO authenticated;
