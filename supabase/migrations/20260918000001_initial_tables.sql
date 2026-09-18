-- JalanKL F8, step 1 of 2: tables and file storage (docs/PLAN.md section 9).
-- Run this first in the Supabase SQL Editor, then 20260918000002_lock_down.sql.
-- Safe to run again: it skips anything that already exists.
--
-- Privacy rules: no names, no coordinates. Email and nationality are personal
-- data (PDPA): only the send-postcard function (F9) ever reads or writes them.

-- Reviews sent from the Review form -----------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  place_id    text not null check (place_id ~ '^[a-z0-9-]{1,40}$'),
  stars       smallint not null check (stars between 1 and 5),
  text        text not null default '' check (char_length(text) <= 500),
  email       text not null check (
                char_length(email) <= 254
                and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
              ),
  nationality text check (char_length(nationality) <= 60),
  lang        text not null check (lang ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
  consent_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

comment on table public.reviews is
  'Reviews from the app. Personal data (email, nationality): kept 12 months, see the Privacy page.';

-- "One postcard per email per landmark": the function looks reviews up this way.
create index if not exists reviews_email_place_idx on public.reviews (lower(email), place_id);
-- For deleting reviews older than 12 months.
create index if not exists reviews_created_at_idx on public.reviews (created_at);

-- One row per landmark that has a postcard --------------------------------
create table if not exists public.postcards (
  place_id            text primary key check (place_id ~ '^[a-z0-9-]{1,40}$'),
  file_path           text not null, -- path inside the private 'postcards' bucket
  photographer_credit text not null,
  active              boolean not null default true
);

comment on table public.postcards is
  'Postcard files per landmark. Files live in the private storage bucket "postcards".';

-- Every postcard email we tried to send ------------------------------------
create table if not exists public.postcard_sends (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews (id) on delete cascade,
  place_id   text not null,
  status     text not null check (status in ('sent', 'failed')),
  created_at timestamptz not null default now()
);

comment on table public.postcard_sends is
  'Postcard emails sent or failed. Used to retry failures and count postcards.';

create index if not exists postcard_sends_review_idx on public.postcard_sends (review_id);

-- Private file storage for the postcard PDFs and JPG previews --------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('postcards', 'postcards', false, 20971520, array['application/pdf', 'image/jpeg'])
on conflict (id) do nothing;
