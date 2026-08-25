alter table public.services
  add column if not exists pricing_rules jsonb not null default '[]'::jsonb;

comment on column public.services.pricing_rules is
  'Conditional pricing rules evaluated against submitted service form data.';
