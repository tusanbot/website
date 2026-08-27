-- Allow the public social catalog to be read through Supabase/PostgREST.
-- RLS policies on these tables continue to restrict rows to active public records.

GRANT SELECT ON TABLE public.social_services TO anon, authenticated;
GRANT SELECT ON TABLE public.social_platforms TO anon, authenticated;
GRANT SELECT ON TABLE public.social_categories TO anon, authenticated;
