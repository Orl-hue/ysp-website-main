# Youth Service Philippines Website

Vite + React 18 + TypeScript + TailwindCSS + Supabase website with public pages and role-based admin panel.

## Tech Stack

- Vite + React 18 + TypeScript (strict)
- TailwindCSS
- React Router DOM
- Supabase (`@supabase/supabase-js`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Fill in `.env` values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

4. Start development server:

```bash
npm run dev
```

If you change `.env`, stop and re-run `npm run dev` so Vite reloads new Supabase values.

5. Build for production:

```bash
npm run build
```

## Deploy to Vercel

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, create a new project and import this repository.
3. Vercel config is already included in `vercel.json`:
   - Framework preset: `vite`
   - Build command: `npm run build`
   - Output directory: `dist`
   - SPA rewrite fallback for React Router routes
4. Add these environment variables in Vercel Project Settings -> Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

## Supabase Schema

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Open `supabase/schema.sql` from this repository.
4. Run the full script.

The script creates required tables, default rows, helper role functions, and RLS policies.

### If You See `Could not find the table 'public.volunteer_opportunities'`

Your app is connected to a Supabase project that does not yet have the required table in the API schema cache.

1. Confirm your app and SQL Editor are using the same project:
   - `.env` `VITE_SUPABASE_URL` project ref must match your Supabase dashboard URL.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. If your older project still uses `public.opportunities`, run `supabase/fix-volunteer-opportunities.sql` after step 2.
4. Hard refresh browser and restart `npm run dev`.

### Required Tables

- `profiles`
- `site_stats`
- `contact_details`
- `programs`
- `chapters`
- `volunteer_opportunities`

### Seeded Defaults

- `site_stats`: `projects_count=0`, `chapters_count=0`, `members_count=0`
- `contact_details`:
  - `email`: `phyouthservice@gmail.com`
  - `facebook_url`: `https://www.facebook.com/YOUTHSERVICEPHILIPPINES`
  - `mobile`: `09177798413`

## Create Admin User

1. Create a user in Supabase Auth (Email/Password).
2. Get that user's `id` (UUID) from the `auth.users` table.
3. Insert the admin profile row:

```sql
insert into profiles (id, role, chapter_id)
values ('<AUTH_USER_UUID>', 'admin', null);
```

## Create Chapter Head User

```sql
insert into profiles (id, role, chapter_id)
values ('<AUTH_USER_UUID>', 'chapter_head', '<CHAPTER_UUID>');
```

## Routes

### Public

- `/` Home
- `/programs` Programs list
- `/programs/:slug` Program detail
- `/membership` Membership and Chapter
- `/volunteer` Volunteer Opportunities
- `/contact` Contact
- `/login` Admin/Chapter Head login

### Protected

- `/admin` Dashboard
- `/admin/programs` Programs CRUD (admin)
- `/admin/chapters` Chapters CRUD (admin)
- `/admin/volunteer-opportunities` Volunteer opportunities CRUD (admin + chapter_head)
- `/admin/contact` Contact details editor (admin)

