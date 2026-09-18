# Supabase setup (task F8)

The backend does one job: save reviews and email postcards (docs/PLAN.md section 9).
This folder holds everything that goes into the Supabase project. About 15 minutes.

## 1. Create the project

1. Sign in at [supabase.com](https://supabase.com) and click **New project**.
2. Name: `jalankl`. Region: **Southeast Asia (Singapore)**, the closest to KL.
3. Set a strong database password and keep it in a password manager. We do not need it
   for anything below, but you cannot see it again later.
4. Free plan limits are not checked yet (PLAN.md section 5, "Not verified"). Look at the
   pricing page before launch.

## 2. Create the tables and lock them down

In the project, open **SQL Editor** → **New query**, then:

1. Paste all of [`migrations/20260918000001_initial_tables.sql`](migrations/20260918000001_initial_tables.sql)
   and click **Run**. This creates `reviews`, `postcards`, `postcard_sends` and the private
   `postcards` file bucket.
2. New query again. Paste all of
   [`migrations/20260918000002_lock_down.sql`](migrations/20260918000002_lock_down.sql)
   and click **Run**. This switches on Row Level Security and takes away the public key's
   access.

Both files are safe to run again if something went wrong halfway.

## 3. Put the public key in your `.env`

Open **Project Settings** → **API Keys** (or **Connect**):

| Copy this                                                       | Into `.env` as           |
| --------------------------------------------------------------- | ------------------------ |
| Project URL (`https://xxxx.supabase.co`)                        | `VITE_SUPABASE_URL`      |
| **Publishable** key (`sb_publishable_…`), or the old "anon" key | `VITE_SUPABASE_ANON_KEY` |

**Never copy the secret key** (`sb_secret_…` or the old "service_role" key) into `.env`,
the app, GitHub or a chat. It bypasses every rule. It is only needed in F9, where it goes
into Supabase's own function secrets.

The public key is meant to be public: it ships inside the app. That is exactly why step 2
blocks it from everything.

## 4. Check that it is locked

```bash
npm run check:supabase
```

Every line should be ✅ and it ends with "All blocked". It tries, with the public key, to
read each table, write a review, list, upload and open postcard files. Every attempt must
be refused.

If a line is ❌, its message says what to do (usually: run step 2 again).

## Later tasks

- **F9** `functions/send-postcard/`: the only code that reads or writes these tables,
  using the secret key.
- **Before launch:** delete reviews older than 12 months automatically (the Privacy page
  promises this), for example with a scheduled job.
- **Adding a table later:** always enable Row Level Security and revoke access from
  `anon` and `authenticated`, like `20260918000002_lock_down.sql` does. Then run the check.
