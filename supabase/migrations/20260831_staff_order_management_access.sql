drop policy if exists messages_staff_select_assigned on public.messages;
create policy messages_staff_select_assigned on public.messages for select to authenticated using (exists (select 1 from public.orders o where o.id=messages.order_id and (o.assigned_staff_id=auth.uid() or public.is_admin())));

drop policy if exists messages_staff_insert_assigned on public.messages;
create policy messages_staff_insert_assigned on public.messages for insert to authenticated with check (sender_id=auth.uid() and sender_role in ('order_manager','support_operator') and exists (select 1 from public.orders o where o.id=messages.order_id and o.assigned_staff_id=auth.uid()));

drop policy if exists messages_staff_update_read on public.messages;
create policy messages_staff_update_read on public.messages for update to authenticated using (exists (select 1 from public.orders o where o.id=messages.order_id and o.assigned_staff_id=auth.uid())) with check (exists (select 1 from public.orders o where o.id=messages.order_id and o.assigned_staff_id=auth.uid()));

drop policy if exists order_history_staff_select_assigned on public.order_history;
create policy order_history_staff_select_assigned on public.order_history for select to authenticated using (exists (select 1 from public.orders o where o.id=order_history.order_id and (o.assigned_staff_id=auth.uid() or public.is_admin())));

create or replace function public.get_staff_order_detail(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare v_uid uuid := auth.uid(); v_order jsonb; v_is_admin boolean;
begin
 if v_uid is null then raise exception 'ورود الزامی است'; end if;
 v_is_admin := public.is_admin();
 select jsonb_build_object('order',jsonb_build_object('id',o.id,'tracking_code',o.tracking_code,'user_id',o.user_id,'service_id',o.service_id,'status',o.status,'form_data',o.form_data,'admin_note',o.admin_note,'price',o.price,'created_at',o.created_at,'updated_at',o.updated_at,'form_id',o.form_id,'form_schema_snapshot',o.form_schema_snapshot,'form_version_id',o.form_version_id,'assigned_staff_id',o.assigned_staff_id,'assignment_status',o.assignment_status,'assigned_at',o.assigned_at,'assigned_by',o.assigned_by,'processing_status',o.processing_status,'result_submitted_at',o.result_submitted_at,'completed_at',o.completed_at,'completion_note',o.completion_note,'commission_percent',o.commission_percent,'commission_amount',o.commission_amount,'customer',jsonb_build_object('full_name',p.full_name,'phone',p.phone,'email',au.email),'service',jsonb_build_object('title',s.title,'icon',s.icon,'description',s.description,'form_schema',s.form_schema)),'history',(select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'old_status',h.old_status,'new_status',h.new_status,'description',h.description,'created_at',h.created_at) order by h.created_at),'[]'::jsonb) from public.order_history h where h.order_id=o.id),'files',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'file_title',f.file_title,'file_name',f.file_name,'file_path',f.file_path,'file_type',f.file_type,'file_size',f.file_size,'uploaded_by',f.uploaded_by,'created_at',f.created_at) order by f.created_at),'[]'::jsonb) from public.order_files f where f.order_id=o.id),'messages',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'sender_id',m.sender_id,'message',m.message,'is_read',m.is_read,'created_at',m.created_at,'sender_name',m.sender_name,'sender_role',m.sender_role) order by m.created_at),'[]'::jsonb) from public.messages m where m.order_id=o.id)) into v_order
 from public.orders o left join public.profiles p on p.id=o.user_id left join auth.users au on au.id=o.user_id left join public.services s on s.id=o.service_id
 where o.id=p_order_id and (v_is_admin or o.assigned_staff_id=v_uid);
 if v_order is null then raise exception 'سفارش پیدا نشد یا به این سفارش دسترسی ندارید'; end if;
 return v_order;
end; $$;
revoke all on function public.get_staff_order_detail(uuid) from public;
grant execute on function public.get_staff_order_detail(uuid) to authenticated;