# Campus Study Spot Finder

Find the best places to study on campus by noise level, Wi-Fi, outlets and how busy they are. Students sign in with their school account, rate spots, upload photos, and keep hours and amenities up to date.

**Stack:** Next.js 16 (App Router, TypeScript) · Google Maps JavaScript API (`@vis.gl/react-google-maps`) · PostgreSQL (`pg`, plain SQL) · Auth.js (Google / Microsoft sign-in) · `sharp` for images

## Quick start

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL, AUTH_SECRET and (optionally) your Maps key
createdb studyspots
psql -d studyspots -f db/schema.sql
psql -d studyspots -f db/seed.sql # optional: 6 sample spots at Queen's with a month of ratings
npm run dev                       # http://localhost:3000
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

With `AUTH_DEV_LOGIN=true` (the default in `.env.example`) the sign-in page has an email-only form, so you can test everything locally before setting up Google or Microsoft. It is ignored in production builds.

**Upgrading an existing database:** just re-run `psql -d studyspots -f db/schema.sql`. It adds the new tables and columns without touching your data.

### Google Maps key

1. In Google Cloud Console, create a project and enable **Maps JavaScript API**.
2. Create an API key, restrict it to **HTTP referrers** (`localhost:3000/*` plus your deployed domain).
3. Put it in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. `DEMO_MAP_ID` works for development; create a real Map ID for production.

Without a key the app still works; the map area shows a placeholder.

### School sign-in

Set `ALLOWED_EMAIL_DOMAINS` (e.g. `queensu.ca`) so only students can sign in, then add one or both providers:

- **Microsoft** (most universities, including Queen's, use Microsoft 365): in the Azure portal create an *App registration*, add the redirect URI `http://localhost:3000/api/auth/callback/microsoft-entra-id`, create a client secret, and fill in the three `AUTH_MICROSOFT_ENTRA_ID_*` values. Your school's IT may need to approve the app for its tenant; `.../common/v2.0` as the issuer lets you test with any Microsoft account.
- **Google**: in Google Cloud, *APIs & Services → Credentials → OAuth client ID* (Web application), redirect URI `http://localhost:3000/api/auth/callback/google`, then fill in `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

Add your deployed URL's callback too when you go live.

## Features

- **Finder (`/`)**: list + map side by side (stacked on mobile). Search, quick filters ("Silent study", "Need to charge", "Video calls", "Seats free now"), toggles for **Open now**, **Accessible**, **Bookable rooms** and **Food nearby**, per-metric filters, and sorting. Pins are coloured by quiet + uncrowded.
- **Live busyness**: ratings from the last 2 hours drive a "right now" busy level (green dot); otherwise the average is used.
- **Busy-by-hour chart**: average "busy" rating for each hour of the day over the last 90 days, with a summary like *"Usually packed 11 AM–3 PM. Quietest around 8 AM."* Includes a table view. Needs 8+ ratings.
- **Hours & amenities**: weekly opening hours (closed days, 24 h, and past-midnight closing all supported), today highlighted, "Open now" badge; accessible / food nearby / bookable rooms with a booking link. Any signed-in student can correct them via **Edit details**.
- **Sign-in**: Google and/or Microsoft, optionally limited to your school's email domain. Ratings, photos and new spots are tied to the account; students can still post a rating without showing their name.
- **Limits** (in `lib/limits.ts`): one rating per spot per hour, 20 ratings / 10 photos / 5 new spots / 20 edits / 30 reports per user per day.
- **Moderation**: a *Report* link on every photo and comment. Reports from `REPORT_HIDE_THRESHOLD` different students (default 3), or one admin, hide the item automatically. Admins (`ADMIN_EMAILS`) review everything at **`/admin`** and can keep, hide or delete.
- **Photos**: resized to max 1600 px and re-encoded as WebP with `sharp`, which also fixes phone rotation and **removes EXIF data, including GPS location**. Uploads up to 12 MB.

## How it's built

```
auth.ts                         Auth.js config: providers, domain check, users table sync
app/
  page.tsx                      Finder (server-renders the first list)
  signin/page.tsx               Sign-in page
  spots/[id]/page.tsx           Spot details, chart, hours, ratings, photos
  spots/[id]/edit/page.tsx      Edit details, hours & amenities
  spots/new/page.tsx            Add a spot
  admin/page.tsx                Moderation queue (admins only)
  api/auth/[...nextauth]/       Auth.js routes
  api/spots/route.ts            GET (filters/sort) · POST (create)
  api/spots/[id]/route.ts       GET one spot · PATCH (edit)
  api/spots/[id]/reviews/       POST a rating
  api/spots/[id]/photos/        POST photo upload (resized with sharp)
  api/photos/[id]/route.ts      GET image
  api/reports/route.ts          POST a report
components/                     Finder, SpotMap, SpotForm, BusyChart, SpotInfo, ReportButton, …
lib/
  db.ts                         pg Pool
  spots.ts                      queries, filters, "best" score, busy-by-hour
  hours.ts                      opening hours + "open now" in the campus time zone
  limits.ts                     per-user rate limits, report threshold
  session.ts                    current user helper
  labels.ts / validate.ts       1-5 scale words, input checks
db/schema.sql, db/seed.sql
```

**Ratings** are 1–5 for each metric. Noise and busyness are "lower is better"; Wi-Fi and outlets are "higher is better". The `spot_stats` view averages them per spot (hidden ratings excluded). "Best overall" normalises all four to 0–1 and sums them.

**Photos** are stored as `BYTEA` in Postgres so the app runs on any host without a writable disk. For production at scale, move them to S3/Cloudinary/Vercel Blob and store only URLs.

### API examples

Reads are public; writes need a signed-in session cookie.

```bash
curl "localhost:3000/api/spots?maxNoise=2&minOutlets=3&openNow=1&accessible=1&sort=quiet"
curl -X POST localhost:3000/api/spots/1/reviews -H 'content-type: application/json' \
     -d '{"noise":1,"wifi":5,"outlets":4,"busyness":2,"comment":"Great","anonymous":false}'
curl -X POST localhost:3000/api/spots/1/photos -F photo=@desk.jpg -F caption="Window seats"
curl -X POST localhost:3000/api/reports -H 'content-type: application/json' -d '{"type":"photo","id":3,"reason":"Not this spot"}'
```

## Deploying

Vercel + Neon/Supabase Postgres works with no code changes. Set `DATABASE_URL`, `AUTH_SECRET` and your provider keys in the host's environment, add the deployed callback URLs to Google/Microsoft, and leave `AUTH_DEV_LOGIN` unset.
