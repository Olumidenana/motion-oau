// Builds Amazoe-Project-Overview.pdf. If amazoe-logo.png sits next to this file it is used in the header.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const logoPath = path.join(__dirname, 'amazoe-logo.png');
const logo = fs.existsSync(logoPath)
  ? `<img class="logo" src="data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}" alt="Amazoe Solutions logo">`
  : `<div class="logo mark">A</div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 0 }
:root { --dg:#0C332C; --gold:#C9A24D; --leaf:#6CC24A; }
* { box-sizing: border-box }
body { margin:0; font-family: "Helvetica Neue", Arial, sans-serif; color:#1b2b27; font-size:9.6pt; line-height:1.42 }
.page { width:210mm; height:297mm; position:relative; padding:0 16mm; overflow:hidden; page-break-after:always }
.page:last-child { page-break-after:auto }
header { background:var(--dg); margin:0 -16mm 6mm; padding:8mm 16mm 6mm; border-bottom:3px solid var(--gold); display:flex; align-items:center; gap:5mm }
.logo { height:16mm; width:auto }
.mark { width:16mm; background:var(--leaf); color:var(--dg); font-weight:800; font-size:22pt; text-align:center; line-height:16mm; border-radius:3mm }
.brand b { display:block; color:#fff; letter-spacing:.18em; font-size:14pt }
.brand i { color:var(--gold); font-size:9pt; font-style:normal }
.tag { margin-left:auto; color:var(--leaf); font-size:8pt; letter-spacing:.12em; text-transform:uppercase }
h1 { color:var(--dg); font-size:22pt; margin:0 0 1mm }
.sub { color:#3d554e; font-size:11pt; margin:0 0 4mm }
h2 { color:var(--dg); font-size:11.5pt; margin:4.5mm 0 1.5mm; padding-bottom:1mm; border-bottom:1.5px solid var(--gold) }
h2:before { content:""; display:inline-block; width:2.5mm; height:2.5mm; background:var(--leaf); margin-right:2mm }
p { margin:0 0 2mm } ul { margin:0; padding-left:4.5mm } li { margin-bottom:1.2mm } li::marker { color:var(--leaf) }
table { width:100%; border-collapse:collapse; font-size:9pt } td { padding:1.4mm 2mm; border-bottom:1px solid #e4ebe8; vertical-align:top } td:first-child { width:30%; font-weight:700; color:var(--dg) }
.box { background:#f3f8f1; border-left:3px solid var(--leaf); padding:2.5mm 3.5mm; margin:2mm 0 }
.done { color:#2f7d1e; font-weight:700 } .wip { color:#9a7418; font-weight:700 }
footer { position:absolute; left:0; right:0; bottom:0; background:var(--dg); color:#fff; text-align:center; font-size:8pt; padding:3.5mm 0; border-top:2px solid var(--gold); letter-spacing:.03em }
code { background:#eef3f1; padding:0 1mm; font-size:8.6pt }
</style></head><body>

<section class="page">
<header>${logo}<div class="brand"><b>AMAZOE SOLUTIONS</b><i>Any solution. Any problem.</i></div><div class="tag">Project Overview</div></header>
<h1>Motion</h1>
<p class="sub">A campus activity app that helps Obafemi Awolowo University students find running routes and group runs, so nobody has to run alone.</p>

<h2>The problem it solves</h2>
<p>Running alone on a large campus can feel unsafe or unmotivating, and there is no single place to find where people run or who is going. Motion gives students a shared list of common OAU (Ile-Ife) routes and a simple way to organise and join group runs. It is designed for cheap Android phones and slow data: small pages, map code that loads only when the map scrolls into view, and backend libraries that download only when a backend is configured.</p>

<h2>Key features (built in the code)</h2>
<ul>
<li><b>Campus route map.</b> Six named routes (Road One, Sports Centre loop, Motion Ground circuit, Amphitheatre steps, Hostels run, Staff quarters loop) with level, terrain and best-time details. Route distance is calculated from each path using the haversine formula.</li>
<li><b>Schedule a group run.</b> Pick a route, date and time (Lagos time), pace (Walk / Easy / Steady / Fast), group size (2–50), a meeting-point note, and an optional women-only label. Runs can be booked up to 60 days ahead.</li>
<li><b>Join, leave and cancel.</b> A roster shows who is going; private profiles appear as “A runner”. Joining is refused when a run is full, cancelled or over.</li>
<li><b>WhatsApp sharing</b> of a run, and a “My runs” profile page with name and privacy settings.</li>
<li><b>Sign-in.</b> Google and email/password (Firebase), magic-link (Supabase), or instant sign-in in demo mode.</li>
<li><b>Explore + waitlist.</b> Nine upcoming activity categories, each with a “Notify me” button that records interest.</li>
<li><b>Route recorder tool.</b> A hidden page that records a route by GPS walking or tap-to-draw and exports JSON to replace draft route paths.</li>
<li><b>Demo mode.</b> With no backend configured, the whole app works from browser storage with seeded sample runs.</li>
</ul>

<h2>Tech stack</h2>
<table>
<tr><td>Front end</td><td>Next.js 15 (App Router), React 19, TypeScript, plain CSS; installable web app manifest</td></tr>
<tr><td>Backend (choose one)</td><td>Firebase (Auth + Firestore, with security rules) – or Supabase (Postgres, row-level security, views, triggers)</td></tr>
<tr><td>Maps</td><td>Leaflet with free CARTO tiles by default; Google Maps JS API when a key is set</td></tr>
<tr><td>Hosting</td><td>Vercel (build settings pinned in <code>vercel.json</code>; Node 22)</td></tr>
</table>
<footer>Amazoe Solutions · WhatsApp: 0814 964 0122 · Osogbo, Osun State</footer>
</section>

<section class="page">
<header>${logo}<div class="brand"><b>AMAZOE SOLUTIONS</b><i>Any solution. Any problem.</i></div><div class="tag">Project Overview</div></header>

<h2>How it works</h2>
<p>Motion is a Next.js web app. Every screen talks to data through one <code>Store</code> interface (<code>lib/store/types.ts</code>), and three interchangeable implementations sit behind it: a browser-storage demo store, a Firebase store and a Supabase store. At start-up the app checks which environment settings exist and loads only the matching one, so a phone never downloads a backend it does not use.</p>
<p>Before anything is saved, shared checks in <code>lib/store/validate.ts</code> enforce the same rules the databases enforce (valid route and pace, 2–50 people, future date within 60 days, note length). The databases then enforce them again: Firestore security rules and Supabase row-level security ensure that only a host can create or cancel their run, people can only add or remove themselves, and private profiles never expose a name. Routes themselves are fixed data in <code>lib/routes.ts</code>, drawn on a lazily loaded map component that switches between Leaflet and Google Maps.</p>
<div class="box"><b>In short:</b> screens → one Store interface → demo, Firebase or Supabase, with the same validation and privacy rules applied at both the app and database level.</div>

<h2>Current status</h2>
<p><span class="done">Built:</span> the full v1 flow – browse routes, sign in, schedule, join, leave, cancel and share runs, profile and privacy, waitlist sign-ups, route recorder, three backends, database rules/schema, and Vercel deployment configuration.</p>
<p><span class="wip">In progress / not finished:</span></p>
<ul>
<li>All six route paths are approximate drafts (<code>verified: false</code>) and are labelled “Draft route” in the app until they are recorded on the ground with the route recorder.</li>
<li>The nine Explore categories are waitlist placeholders only; none of those activities is built.</li>
<li>No automated tests exist in the repository (only a type-check script).</li>
<li>No live deployment, user numbers or usage data are recorded in the repository, so none are claimed here.</li>
</ul>

<h2>Next steps</h2>
<ul>
<li>Walk and record the real route paths, then mark them verified.</li>
<li>Add run reminders and run chat (listed as planned in the project README).</li>
<li>Set up a production backend (Firebase project and published rules) and a custom email sender if Supabase is used.</li>
<li>Add automated tests for validation and the store implementations.</li>
<li>Build the highest-demand Explore category, using waitlist counts to decide.</li>
</ul>

<div class="box" style="margin-top:5mm"><b>Prepared by Amazoe Solutions</b>, business systems and software consultancy, Osogbo, Osun State. Content in this overview is drawn from the project's source code and README.</div>
<footer>Amazoe Solutions · WhatsApp: 0814 964 0122 · Osogbo, Osun State</footer>
</section>
</body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(html);
  await p.pdf({ path: path.join(__dirname, 'Amazoe-Project-Overview.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
})();
