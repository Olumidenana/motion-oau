# Motion

**Never run alone at Great Ife.**

Motion is a campus activity app for Obafemi Awolowo University (OAU), Ile-Ife. In v1, students can:

- find common campus running routes on a map (Road One, Sports Centre loop, Motion Ground, Amphitheatre steps, hostels run, staff quarters loop)
- schedule a group run on a route: date and time (Lagos time), pace, group size, meeting point and an optional women-only label
- join or leave other people's runs, see who's going (private profiles appear as "A runner"), and share a run on WhatsApp
- see what's coming next (reading spaces, ball games, trips and more) and tap "Notify me" to join a waitlist

It's built for cheap Android phones and slow data. The pages are small, the map code only downloads when the map scrolls into view, the Supabase client only downloads when Supabase is configured, and map tiles load at standard resolution.

## Stack

- Next.js 15 (App Router) + TypeScript, plain CSS, Archivo from Google Fonts
- Supabase (free tier): email magic-link auth + Postgres
- Maps: Google Maps JS API when a key is set; otherwise Leaflet with free CARTO Voyager tiles. Both use the same `MapView` component and props.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

Copy `.env.example` to `.env.local` and fill in whatever you have. Every variable is optional.

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Without it (or the key), the app runs in demo mode. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Switches maps to Google. Without it, Leaflet + CARTO is used. |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Optional Google map ID (vector map, advanced markers). |

These are build-time variables. After you change them on Vercel, redeploy.

## Demo mode

If the Supabase variables are missing, Motion still works fully. Data is stored in the browser's localStorage, a set of sample runs is seeded (and refreshed once they're in the past), and a "Demo mode — data stays on this device" banner shows at the top. Signing in only asks for an email and signs you in on that device straight away. No email is sent.

All data access goes through one `Store` interface (`lib/store/types.ts`) with two implementations: `lib/store/demo.ts` and `lib/store/supabase.ts`.

## Going live

### 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL editor → New query**, paste in all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. You can safely run it again later.
3. Go to **Authentication → URL configuration**:
   - **Site URL:** your Vercel domain, e.g. `https://motion-oau.vercel.app`
   - **Redirect URLs:** add `https://motion-oau.vercel.app/**` (the magic link returns people to the page they signed in from). Add `http://localhost:3000/**` for local development. If you use Vercel preview deployments, add `https://*-<your-vercel-team>.vercel.app/**` too.
4. Under **Authentication → Providers**, make sure **Email** is on. Optional: in **Authentication → Email templates → Magic link**, change the wording to mention Motion.
5. Copy **Project settings → API → Project URL** and the **anon public** key into Vercel as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then redeploy.

> The free tier's built-in email sender is heavily rate-limited (a few emails an hour). Before launch, set up custom SMTP under **Project settings → Authentication → SMTP** (e.g. Resend or Brevo, both of which have free tiers).

What the schema sets up:

- `profiles`: created automatically by a trigger when someone signs up. Holds `display_name` (up to 40 characters) and `is_private`.
- `runs`: route, host, start time, pace, group size (2–50), meeting note (up to 200 characters), women-only flag, and status.
- `run_participants`: the host is added automatically. A security-definer trigger blocks joining a run that's full, cancelled or already over, with a clear error message.
- `waitlist`: "Notify me" sign-ups. Insert-only through the API, so you read it in the dashboard (**Table editor → waitlist**).
- Row level security: anyone can read runs. Only the host can create or update their runs. People see and change only their own participant and profile rows.
- Views: `run_feed` (runs + host name + going count) and `run_roster` (who's going). Both blank out names and IDs of private profiles unless the viewer is that person, so the `profiles` table never has to be opened up.

### 2. (Optional) Add a Google Maps key

Leaflet + CARTO works well and is free, so you only need this if you want Google's base map.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and **attach a billing account**. Google requires one, even for free usage.
2. Enable the **Maps JavaScript API**.
3. Create an API key under **APIs & Services → Credentials**, then restrict it:
   - **Application restrictions → Websites:** `https://your-domain.vercel.app/*` (plus `http://localhost:3000/*` for development)
   - **API restrictions:** Maps JavaScript API only
4. **Set a budget alert** under **Billing → Budgets & alerts** (e.g. $1) so you hear about it before you're charged.
5. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in Vercel and redeploy. Optionally create a map ID (**Map management**) and set `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.

Pricing at the time of writing: dynamic map loads include **10,000 free loads per month**. After that you pay per 1,000 loads. Each time someone opens a page with a map counts as a load. If the key is wrong or billing is off, Motion falls back to Leaflet automatically.

### 3. Deploy on Vercel

Import the repo in Vercel (framework: Next.js, no extra settings), add the environment variables, and deploy.

## Recording real routes

The route paths in `lib/routes.ts` are **approximate**. Every route is `verified: false`, which shows a "Draft route" badge on the map and the route page. To replace one with a real path:

1. Open `/tools/route-recorder` on your phone. It isn't linked in the app and is marked `noindex`.
2. Pick a method:
   - **Walk & record** uses GPS (`watchPosition`). Start at the route's start point and walk it. Readings less accurate than ±30 m are skipped, and points are kept at least 5 m apart. Distance updates live. Keep the screen on. The app asks the phone not to sleep where it can.
   - **Tap to draw**: tap along the road on the map. Use **Undo last point** or **Clear** to fix mistakes.
3. Tap **Copy JSON** or **Download .json**. The export is an array of `[lat, lng]` pairs, which is exactly the `path` format in `lib/routes.ts`.
4. In `lib/routes.ts`, replace the route's `path` with the exported array and set `verified: true`. The distance is calculated from the path at runtime with the haversine formula, so there's nothing else to update.
5. Commit and push. Vercel redeploys.

For loops, finish where you started. For a spot (like the Amphitheatre steps), the path is a single point.

## Project layout

```
app/                    pages (home, routes/[slug], runs/new, runs/[id], me, explore, tools/route-recorder)
components/MapView.tsx  lazy map wrapper → components/map/GoogleMap.tsx | LeafletMap.tsx
lib/routes.ts           campus routes (paths, levels, terrain, best times)
lib/store/              Store interface + demo and Supabase implementations
supabase/schema.sql     tables, triggers, RLS policies, views
```

## Roadmap: coming soon

These show on the Explore tab with a "Notify me" button so we can see what people want most:

- **Reading spaces**: see which lecture theatres and reading rooms are full
- **Skating**: smooth roads and people to skate with
- **Biking**: group rides around campus and towards Ife town
- **Swimming**: pool times and swim buddies
- **Ball games**: pickup football and basketball
- **Hangouts**: low-key meetups and study breaks
- **Nights out**: events, with safe ways there and back
- **Trips & explore**: weekend trips with local guides
- **Campus life game**: meet people and get to know who's who

Also planned for running: verified routes, run reminders, and run chat.
