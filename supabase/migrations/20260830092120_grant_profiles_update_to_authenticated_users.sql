-- Allow signed-in users to update only editable profile fields.
-- Row-level security remains responsible for restricting updates to the user's own row.
grant update (full_name, phone, national_code, birth_date, address)
on table public.profiles
to authenticated;
