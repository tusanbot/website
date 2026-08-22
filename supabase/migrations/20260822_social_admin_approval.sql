-- Require admin approval before a successfully paid social order is sent to FJPanel.
-- Run once in Supabase SQL Editor.

alter table public.social_orders
    add column if not exists admin_approved boolean not null default false,
    add column if not exists admin_approved_at timestamptz,
    add column if not exists admin_approved_by uuid references auth.users(id);

create index if not exists idx_social_orders_admin_approval
on public.social_orders(admin_approved, status, created_at desc);

notify pgrst, 'reload schema';
