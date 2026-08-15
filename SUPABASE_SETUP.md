# Connecting MovieVault to your own Supabase project

This app no longer depends on any third-party managed Supabase project. Follow
these steps to point it at a Supabase project you own.

## 1. Create a Supabase project

Go to [supabase.com](https://supabase.com/dashboard), create an account if
needed, and create a new project. Pick any region and set a database
password (you won't need the password directly — Supabase manages the
connection for you).

## 2. Find your Supabase URL and publishable (anon) key

In your project dashboard: **Settings → API**.

- **Project URL** → this is `VITE_SUPABASE_URL` / `SUPABASE_URL`
- **Publishable key** (sometimes shown as "anon" / "public" key, starts with
  `sb_publishable_...` on newer projects or an `eyJ...` JWT on older ones) →
  this is `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`
- **Service role key** (starts with `sb_secret_...` or an `eyJ...` JWT,
  labeled "service_role" — keep this secret) → this is
  `SUPABASE_SERVICE_ROLE_KEY`

## 3. Configure your `.env` file

Copy the template and fill in the values from step 2:

```sh
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxx

TMDB_API_KEY=your-tmdb-key-or-read-access-token
```

The `VITE_`-prefixed values are bundled into client-side JavaScript by Vite —
only the publishable/anon key belongs there. The service role key and TMDB
key are read with `process.env` on the server only and are never sent to the
browser. `.env` is already excluded in `.gitignore` — never commit it.

## 4. Run the database schema

In your Supabase dashboard: **SQL Editor → New query**. Paste in the full
contents of `supabase/migrations/20260812123226_89a2abcc-beb6-48c1-ad6a-c2d2d0fd96e0.sql`
and run it. This creates:

- `public.profiles` — one row per user, auto-created on signup
- `public.movies` — each user's watched/watchlist entries
- Row Level Security policies on both tables, scoped to `auth.uid()`
- A trigger (`handle_new_user`) that creates a `profiles` row whenever
  someone signs up
- Storage policies for an `avatars` bucket (see step 6 — the bucket itself
  still needs to be created through the dashboard, SQL can only add
  policies to it)

The second migration file in that folder is empty — nothing to run there.

## 5. Configure authentication

**Authentication → Providers → Email** is enabled by default; the app's
sign-up/sign-in forms use it as-is.

**Google sign-in:** the "Continue with Google" / "Sign up with Google"
buttons now call Supabase's own OAuth flow directly (this app no longer
routes through any third-party auth proxy). To make them work:

1. **Authentication → Providers → Google** in your Supabase dashboard →
   enable it.
2. Create OAuth credentials in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   and add the **Authorized redirect URI** Supabase shows you on that
   provider page (it looks like
   `https://your-project-ref.supabase.co/auth/v1/callback`).
3. Paste the resulting Client ID and Client Secret into the Supabase Google
   provider settings and save.

If you don't need Google sign-in, leave it disabled — email/password will
keep working either way, the Google button will just show a sign-in error
until configured.

**Redirect URLs:** under **Authentication → URL Configuration**, add your
local dev URL (e.g. `http://localhost:3000`) and your production URL to
the allow list, since the app passes `redirectTo`/`emailRedirectTo` for
password reset and OAuth.

## 6. Create the avatars storage bucket

The SQL migration adds RLS _policies_ for a bucket named `avatars`, but the
bucket itself has to be created through the dashboard or API:

**Storage → New bucket** → name it exactly `avatars` → set it however you'd
like (private is fine, since the policies already restrict access to each
user's own folder).

## 7. Verify RLS is working

**Authentication → Policies** (or **Table Editor → movies/profiles → RLS**)
should show 3–4 policies per table, all referencing `auth.uid()`. With RLS
enabled and no policies for a role, that role gets zero access by default —
so if you ever see "policies: 0" here, no signed-in user will be able to
read or write anything until you re-run the migration.

## 8. Test it end to end

1. `npm install && npm run dev`
2. Register a new account — confirm a row appears in `profiles` (Table
   Editor).
3. Search for a movie and add it — confirm a row appears in `movies` with
   your `user_id`.
4. Register a second test account and confirm it cannot see the first
   account's movies (that's RLS doing its job).
