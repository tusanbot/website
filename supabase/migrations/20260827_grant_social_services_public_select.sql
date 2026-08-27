-- Allow the public social-services catalog view to be queried by the customer-facing /social page.
grant select on table public.social_services_public to anon, authenticated;
