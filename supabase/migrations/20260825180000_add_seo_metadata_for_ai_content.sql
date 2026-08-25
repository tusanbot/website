alter table public.services
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists seo_keywords text[];

alter table public.blog_posts
  add column if not exists primary_keyword text,
  add column if not exists seo_keywords text[];
