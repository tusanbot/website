drop policy if exists orders_select_own_or_admin on public.orders;

create policy orders_select_own_or_admin
on public.orders
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);
