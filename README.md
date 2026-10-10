# Motion

**Never run alone at Great Ife.**

Motion is a campus activity app for Obafemi Awolowo University (OAU), Ile-Ife. In v1, students can:

- find common campus running routes on a map (Road One, Sports Centre loop, Motion Ground, Amphitheatre steps, hostels run, staff quarters loop)
- schedule a group run on a route: date and time (Lagos time), pace, group size, meeting point and an optional women-only label
- join or leave other people's runs, see who's going (private profiles appear as "A runner"), and share a run on WhatsApp
- see what's coming next (reading spaces, ball games, trips and more) and tap "Notify me" to join a waitlist

It's built for cheap Android phones and slow data. The pages are small, the map code only downloads when the map scrolls into view, the database client only downloads when a backend is configured, and map tiles load at standard resolution.

## Stack

- Next.js 15 (App Router) + TypeScript, plain CSS, Archivo from Google Fonts
- Firebase (free Spark plan): Google sign-in + email/password, Firestore database
- Supabase is still supported as an alternative backend (magic-link auth + Postgres)
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
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app config. With these set, Motion uses Firebase. |
| `NEXT_PUBLIC_FIREBASE_EMULATOR_HOST` | Local development only: use the Firebase emulators (e.g. `127.0.0.1`). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Alternative backend, used only when Firebase isn't configured. With neither, the app runs in demo mode. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Switches maps to Google. Without it, Leaflet + CARTO is used. |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Optional Google map ID (vector map, advanced markers). |

These are build-time variables. After you change them on Vercel, redeploy.

To try the Firebase setup locally without a real project, run the emulators (`npx firebase-tools emulators:start --only auth,firestore --project demo-motion`, needs Java) and start the app with `NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-motion` and any placeholder API key and app ID. The emulators load the rules from `firebase/firestore.rules`.

## Demo mode

If no backend is configured, Motion still works fully. Data is stored in the browser's localStorage, a set of sample runs is seeded (and refreshed once they're in the past), and a "Demo mode — data stays on this device" banner shows at the top. Signing in only asks for an email and signs you in on that device straight away. No email is sent.

All data access goes through one `Store` interface (`lib/store/types.ts`) with three implementations: `lib/store/demo.ts`, `lib/store/firebase.ts` and `lib/store/supabase.ts`.

## Going live

### 1. Set up Firebase (free)

Firebase's free **Spark** plan needs no card and easily covers a campus app: 50,000 database reads and 20,000 writes a day, 1 GB of storage, and free Google and email/password sign-in. (Only sign-in by email link is limited, to 5 emails a day, so Motion doesn't use it.)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Create a project** (call it `motion-oau`). You can turn Google Analytics off.
2. **Add a web app:** on the project overview, click the **</>** (Web) icon, give it a nickname, and skip Firebase Hosting (Vercel hosts the app). Firebase shows a `firebaseConfig` block. Keep that page open.
3. **Turn on sign-in:** **Build → Authentication → Get started → Sign-in method**:
   - enable **Google** (pick a support email and save)
   - enable **Email/Password** (leave "Email link" off: the free plan only allows 5 link emails a day)
4. **Allow your domain:** **Authentication → Settings → Authorized domains → Add domain**, and add your Vercel domain (e.g. `motion-oau.vercel.app`). `localhost` is there already. For preview deployments, add each preview domain you want to sign in on.
5. **Create the database:** **Build → Firestore Database → Create database**. Choose **Start in production mode** and a location close to Nigeria, such as `europe-west1` (Belgium). The location can't be changed later.
6. **Add the security rules:** in Firestore, open the **Rules** tab, replace everything with the contents of [`firebase/firestore.rules`](firebase/firestore.rules), and click **Publish**. Do this again whenever that file changes.
7. **Add the config to Vercel:** **Vercel → your project → Settings → Environment Variables**, copy these values from the `firebaseConfig` block, then **redeploy**:

   | Vercel variable | `firebaseConfig` field |
   | --- | --- |
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

   These values are safe to be public. The security rules are what protect the data.

How the data is stored and protected:

- `profiles/{uid}`: your display name and private setting. Only you can read or change it. It's created the first time you sign in, using your Google first name if you have one.
- `runs/{id}`: anyone can read runs. Only the host can create or cancel theirs. Runs can be scheduled up to 60 days ahead.
- `participants/{runId}_{uid}`: the "who's going" list. Anyone can read it, but the name is blank for private profiles, so they show as "A runner". You can only add or remove yourself, and the host can't leave their own run.
- `going_count` on a run can only change by one at a time, together with someone joining or leaving. The rules refuse a join when the run is full, cancelled or already over.
- `waitlist`: "Notify me" sign-ups. The app can add to it but nobody can read it through the app. Read it in **Firestore → Data → waitlist**.

Because Firestore has no views, names are copied onto runs and participant rows. When someone changes their name or goes private, the app updates those copies. A private runner's user ID is still part of their participant row, but their name never is.

Students who open a link inside Instagram or another app's built-in browser can't use Google sign-in there (Google blocks it). The app tells them to open the page in Chrome or use email and password.

### Alternative: Supabase

Supabase works too, if you'd rather use it (for example, after pausing an old project to free a slot on the 2-project free limit). Set only the Supabase variables, not the Firebase ones.

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

Import the repo in Vercel, add the environment variables, and deploy. `vercel.json` pins the framework (Next.js), install and build commands, and `package.json` pins Node 22, so the project settings don't matter. If a deployment fails, open it in Vercel and check **Build Logs**.

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
lib/store/              Store interface + demo, Firebase and Supabase implementations
firebase/firestore.rules  Firestore security rules (paste into the Firebase console)
supabase/schema.sql     tables, triggers, RLS policies, views (Supabase alternative)
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
