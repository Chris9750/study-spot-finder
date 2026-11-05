# Campus Study Spot Finder

Find the best places to study on campus by noise level, Wi-Fi, outlets and how busy they are. Students rate spots and upload photos.

**Stack:** Next.js 16 (App Router, TypeScript) · Google Maps JavaScript API (`@vis.gl/react-google-maps`) · PostgreSQL (`pg`, plain SQL)

## Quick start

```bash
npm install
cp .env.example .env.local        # then fill in DATABASE_URL and your Maps key
createdb studyspots
npm run db:setup                  # tables + spot_stats view
npm run db:seed                   # 6 sample spots at Queen's with ratings
npm run dev                       # http://localhost:3000
```

`db:setup` / `db:seed` read `DATABASE_URL` from your shell, so either `export` it first or run
`psql "postgres://..." -f db/schema.sql` directly.

### Google Maps key

1. In Google Cloud Console, create a project and enable **Maps JavaScript API**.
2. Create an API key, restrict it to **HTTP referrers** (`localhost:3000/*` plus your deployed domain).
3. Put it in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. `DEMO_MAP_ID` works for development; create a real Map ID for production.

Without a key the app still works; the map area shows a placeholder.

## Features

- **Finder (`/`)**: list + map side by side (stacked on mobile). Search, quick filters ("Silent study", "Need to charge", "Video calls", "Seats free now"), per-metric filters, and sorting. Pins are coloured green/amber/red by quiet + uncrowded.
- **Live busyness**: ratings from the last 2 hours drive a "right now" busy level (green dot); otherwise the all-time average is used.
- **Spot page (`/spots/:id`)**: score bars, photo gallery, recent ratings, mini-map, walking directions, rating form, photo upload.
- **Add a spot (`/spots/new`)**: click the map or use your device location to place it.

## How it's built

```
app/
  page.tsx                      Finder (server-renders the first list)
  spots/[id]/page.tsx           Spot details
  spots/new/page.tsx            Add-spot form
  api/spots/route.ts            GET (filters/sort) · POST (create)
  api/spots/[id]/route.ts       GET one spot + reviews + photos
  api/spots/[id]/reviews/       POST a rating
  api/spots/[id]/photos/        POST multipart photo upload (≤5 MB, jpg/png/webp/gif)
  api/photos/[id]/route.ts      GET image bytes
components/                     Finder, SpotMap, Meter, RatingInput, ReviewForm, PhotoUpload
lib/
  db.ts                         pg Pool
  spots.ts                      queries, filters, "best" score
  labels.ts                     1-5 scale words ("Silent", "Packed"…)
  validate.ts                   input checks
db/schema.sql, db/seed.sql
```

**Ratings** are 1–5 for each metric. Noise and busyness are "lower is better"; Wi-Fi and outlets are "higher is better". The `spot_stats` view averages them per spot. "Best overall" normalises all four to 0–1 and sums them.

**Photos** are stored as `BYTEA` in Postgres so the app runs on any host without a writable disk. For production at scale, move them to S3/Cloudinary/Vercel Blob and store only URLs.

### API examples

```bash
curl "localhost:3000/api/spots?maxNoise=2&minOutlets=3&sort=quiet"
curl -X POST localhost:3000/api/spots/1/reviews -H 'content-type: application/json' \
     -d '{"noise":1,"wifi":5,"outlets":4,"busyness":2,"comment":"Great"}'
curl -X POST localhost:3000/api/spots/1/photos -F photo=@desk.jpg -F caption="Window seats"
```

## Next steps worth adding

- **Auth** (NextAuth with your school's Google/Microsoft login) so ratings are tied to students, plus one-rating-per-hour limits.
- **Rate limiting & moderation**: report button for photos/comments; image resizing with `sharp`.
- **Hours & amenities**: opening hours, bookable rooms, food nearby, accessibility.
- **Busy-by-hour chart** from historical ratings ("usually packed 11–2").
- **Deploy**: Vercel + Neon/Supabase Postgres works with no code changes.
