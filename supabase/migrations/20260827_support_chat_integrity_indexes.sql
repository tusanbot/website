create index if not exists support_messages_sender_idx on public.support_messages(sender_id);
create unique index if not exists support_conversations_one_open_per_user_idx on public.support_conversations(user_id) where status = 'open';
