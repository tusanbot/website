do $$ begin alter publication supabase_realtime add table public.support_conversations; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.support_messages; exception when duplicate_object then null; end $$;
