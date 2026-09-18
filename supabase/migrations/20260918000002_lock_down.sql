-- JalanKL F8, step 2 of 2: lock everything down (docs/PLAN.md section 9).
-- Run after 20260918000001_initial_tables.sql. Safe to run again.
--
-- The public key ships inside the app, so anyone can find it. After this file,
-- that key cannot read, write or list anything in these tables or the bucket.
-- Only the send-postcard function (F9), using the secret key, gets in.
--
-- Any new table added later must get the same two steps: enable row level
-- security, and revoke all from anon and authenticated.

-- 1. Row Level Security on, with NO policies = nobody using the public key
--    can see or change any row.
alter table public.reviews        enable row level security;
alter table public.postcards      enable row level security;
alter table public.postcard_sends enable row level security;

-- 2. Belt and braces: also take away the public roles' table permissions,
--    so a policy added by mistake later still would not open the tables.
revoke all on table public.reviews        from anon, authenticated;
revoke all on table public.postcards      from anon, authenticated;
revoke all on table public.postcard_sends from anon, authenticated;

-- 3. Storage: the 'postcards' bucket is private (public = false) and we add
--    no storage policies for it, so the public key cannot list, download or
--    upload files. The function sends time-limited signed links instead.
update storage.buckets set public = false where id = 'postcards';
