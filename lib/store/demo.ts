import { RUN_GRACE_MS, StoreError, type NewRun, type Profile, type RosterEntry, type Run, type Store, type Viewer } from './types';
import { validateDisplayName, validateEmail, validateNewRun } from './validate';
import { MSG } from './messages';
import { lagosToIso, lagosYmd } from '../time';
import type { Pace } from '../pace';

const KEY = 'motion:demo:v1';

type DbRun = Omit<Run, 'host_name' | 'going_count'>;
interface DbParticipant {
  run_id: string;
  user_id: string;
  joined_at: string;
}
interface DemoDb {
  version: 1;
  deviceUserId: string;
  viewer: Viewer | null;
  profiles: Record<string, Profile>;
  runs: DbRun[];
  participants: DbParticipant[];
  waitlist: { feature: string; user_id: string | null; contact: string | null; created_at: string }[];
}

const SAMPLE_PREFIX = 'sample-';

const SAMPLE_PEOPLE: Profile[] = [
  { id: 'demo-tolu', display_name: 'Tolu', is_private: false },
  { id: 'demo-adaeze', display_name: 'Adaeze', is_private: false },
  { id: 'demo-femi', display_name: 'Femi O.', is_private: false },
  { id: 'demo-zainab', display_name: 'Zainab', is_private: false },
  { id: 'demo-kunle', display_name: 'Kunle', is_private: false },
  { id: 'demo-private-1', display_name: 'Seun', is_private: true },
  { id: 'demo-private-2', display_name: 'Bisi', is_private: true },
  { id: 'demo-ife', display_name: 'Ifeoluwa', is_private: false },
];

interface SampleRun {
  key: string;
  route: string;
  days: number;
  time: string;
  pace: Pace;
  max: number;
  note: string;
  womenOnly?: boolean;
  host: string;
  going: string[];
}

const SAMPLE_RUNS: SampleRun[] = [
  { key: 'road-one-am', route: 'road-one', days: 1, time: '06:00', pace: 'easy', max: 15, note: 'Meet just inside the main gate by the security post. We’ll run to the SUB and back.', host: 'demo-tolu', going: ['demo-femi', 'demo-private-1', 'demo-kunle'] },
  { key: 'sports-pm', route: 'sports-centre-loop', days: 1, time: '17:30', pace: 'walk', max: 10, note: 'First time? Perfect. We walk two laps and jog a bit if people feel like it.', host: 'demo-adaeze', going: ['demo-ife'] },
  { key: 'motion-full', route: 'motion-ground-circuit', days: 2, time: '18:00', pace: 'easy', max: 4, note: 'Walk–run intervals, 30 minutes.', host: 'demo-kunle', going: ['demo-tolu', 'demo-adaeze', 'demo-private-2'] },
  { key: 'hostels-women', route: 'hostels-to-central', days: 2, time: '06:15', pace: 'easy', max: 12, note: 'Meet at the hall junction. Women-only, all paces welcome.', womenOnly: true, host: 'demo-zainab', going: ['demo-adaeze'] },
  { key: 'staff-long', route: 'staff-quarters-loop', days: 4, time: '06:00', pace: 'steady', max: 8, note: 'Two laps of the staff quarters, about 8 km. Bring water.', host: 'demo-private-1', going: ['demo-femi'] },
  { key: 'amphi-stairs', route: 'amphitheatre-steps', days: 3, time: '17:00', pace: 'fast', max: 20, note: 'Stair session: 10 rounds, then stretch together.', host: 'demo-femi', going: ['demo-tolu', 'demo-ife', 'demo-kunle', 'demo-zainab'] },
];

function uid(prefix = ''): string {
  const c = globalThis.crypto;
  const id = c && 'randomUUID' in c ? c.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix + id;
}

function sampleRunsFrom(now: Date): { runs: DbRun[]; participants: DbParticipant[] } {
  const runs: DbRun[] = [];
  const participants: DbParticipant[] = [];
  for (const s of SAMPLE_RUNS) {
    const day = lagosYmd(new Date(now.getTime() + s.days * 86_400_000));
    const id = `${SAMPLE_PREFIX}${s.key}-${day}`;
    const created = new Date(now.getTime() - 3 * 3_600_000).toISOString();
    runs.push({
      id,
      route_slug: s.route,
      host_id: s.host,
      starts_at: lagosToIso(day, s.time),
      pace: s.pace,
      max_people: s.max,
      meeting_note: s.note,
      women_only: !!s.womenOnly,
      status: 'scheduled',
      created_at: created,
    });
    [s.host, ...s.going].forEach((user_id, i) =>
      participants.push({ run_id: id, user_id, joined_at: new Date(now.getTime() - (3 - i * 0.2) * 3_600_000).toISOString() }),
    );
  }
  return { runs, participants };
}

function emptyDb(): DemoDb {
  const profiles: Record<string, Profile> = {};
  for (const p of SAMPLE_PEOPLE) profiles[p.id] = p;
  return { version: 1, deviceUserId: uid('demo-me-'), viewer: null, profiles, runs: [], participants: [], waitlist: [] };
}

/** Keep sample data fresh: once every sample run is in the past, schedule a new set. */
function refreshSamples(db: DemoDb, now = new Date()): boolean {
  const cutoff = now.getTime() - RUN_GRACE_MS;
  const samples = db.runs.filter((r) => r.id.startsWith(SAMPLE_PREFIX));
  if (samples.some((r) => new Date(r.starts_at).getTime() > cutoff)) return false;
  const dropIds = new Set(samples.map((r) => r.id));
  const fresh = sampleRunsFrom(now);
  db.runs = db.runs.filter((r) => !dropIds.has(r.id)).concat(fresh.runs);
  db.participants = db.participants.filter((p) => !dropIds.has(p.run_id)).concat(fresh.participants);
  return true;
}

export function createDemoStore(): Store {
  let cache: DemoDb | null = null;
  const listeners = new Set<(v: Viewer | null) => void>();

  function load(): DemoDb {
    if (cache) return cache;
    let db: DemoDb | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoDb;
        if (parsed && parsed.version === 1) db = parsed;
      }
    } catch {
      // Storage blocked or corrupted: start fresh in memory.
    }
    db ??= emptyDb();
    for (const p of SAMPLE_PEOPLE) db.profiles[p.id] ??= p;
    cache = db;
    if (refreshSamples(db)) save();
    return db;
  }

  function save() {
    if (!cache) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      // Private mode / quota: keep working from memory for this visit.
    }
  }

  function requireViewer(): Viewer {
    const v = load().viewer;
    if (!v) throw new StoreError(MSG.signInFirst);
    return v;
  }

  function toRun(db: DemoDb, r: DbRun): Run {
    const host = db.profiles[r.host_id];
    const viewerId = db.viewer?.id;
    const hidden = !host || (host.is_private && host.id !== viewerId);
    return {
      ...r,
      host_name: hidden ? null : host.display_name,
      going_count: db.participants.filter((p) => p.run_id === r.id).length,
    };
  }

  const upcoming = (r: DbRun) =>
    r.status === 'scheduled' && new Date(r.starts_at).getTime() > Date.now() - RUN_GRACE_MS;
  const byStart = (a: Run, b: Run) => a.starts_at.localeCompare(b.starts_at);

  function emit() {
    const v = load().viewer;
    listeners.forEach((cb) => cb(v));
  }

  return {
    mode: 'demo',
    authMethods: ['instant'] as const,

    async getViewer() {
      return load().viewer;
    },

    onViewerChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async signIn(email) {
      const db = load();
      const clean = validateEmail(email);
      db.viewer = { id: db.deviceUserId, email: clean };
      db.profiles[db.deviceUserId] ??= { id: db.deviceUserId, display_name: 'Runner', is_private: false };
      save();
      emit();
      return { sentLink: false };
    },

    async signOut() {
      load().viewer = null;
      save();
      emit();
    },

    async getProfile() {
      const db = load();
      return db.viewer ? db.profiles[db.viewer.id] ?? null : null;
    },

    async updateProfile(patch) {
      const db = load();
      const v = requireViewer();
      const current = db.profiles[v.id] ?? { id: v.id, display_name: 'Runner', is_private: false };
      const next: Profile = {
        ...current,
        ...(patch.display_name !== undefined ? { display_name: validateDisplayName(patch.display_name) } : {}),
        ...(patch.is_private !== undefined ? { is_private: patch.is_private } : {}),
      };
      db.profiles[v.id] = next;
      save();
      return next;
    },

    async listRuns(opts = {}) {
      const db = load();
      const runs = db.runs
        .filter((r) => upcoming(r) && (!opts.routeSlug || r.route_slug === opts.routeSlug))
        .map((r) => toRun(db, r))
        .sort(byStart);
      return opts.limit ? runs.slice(0, opts.limit) : runs;
    },

    async getRun(id) {
      const db = load();
      const r = db.runs.find((x) => x.id === id);
      return r ? toRun(db, r) : null;
    },

    async getRoster(runId) {
      const db = load();
      const run = db.runs.find((r) => r.id === runId);
      const viewerId = db.viewer?.id;
      return db.participants
        .filter((p) => p.run_id === runId)
        .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
        .map<RosterEntry>((p) => {
          const prof = db.profiles[p.user_id];
          const isViewer = p.user_id === viewerId;
          const hidden = !prof || (prof.is_private && !isViewer);
          return {
            run_id: p.run_id,
            user_id: hidden ? null : p.user_id,
            display_name: hidden ? null : prof.display_name,
            is_viewer: isViewer,
            is_host: p.user_id === run?.host_id,
            joined_at: p.joined_at,
          };
        });
    },

    async myRuns() {
      const db = load();
      const v = db.viewer;
      if (!v) return [];
      const mine = new Set(db.participants.filter((p) => p.user_id === v.id).map((p) => p.run_id));
      return db.runs.filter((r) => mine.has(r.id) && upcoming(r)).map((r) => toRun(db, r)).sort(byStart);
    },

    async createRun(input: NewRun) {
      const db = load();
      const v = requireViewer();
      const clean = validateNewRun(input);
      const id = uid();
      const now = new Date().toISOString();
      db.runs.push({ ...clean, meeting_note: clean.meeting_note || null, id, host_id: v.id, status: 'scheduled', created_at: now });
      db.participants.push({ run_id: id, user_id: v.id, joined_at: now });
      save();
      return id;
    },

    async joinRun(runId) {
      const db = load();
      const v = requireViewer();
      const run = db.runs.find((r) => r.id === runId);
      if (!run) throw new StoreError(MSG.runNotFound);
      if (db.participants.some((p) => p.run_id === runId && p.user_id === v.id)) return;
      if (run.status === 'cancelled') throw new StoreError(MSG.runCancelled);
      if (new Date(run.starts_at).getTime() < Date.now() - RUN_GRACE_MS) throw new StoreError(MSG.runOver);
      const count = db.participants.filter((p) => p.run_id === runId).length;
      if (count >= run.max_people) throw new StoreError(MSG.runFull);
      db.participants.push({ run_id: runId, user_id: v.id, joined_at: new Date().toISOString() });
      save();
    },

    async leaveRun(runId) {
      const db = load();
      const v = requireViewer();
      const run = db.runs.find((r) => r.id === runId);
      if (run?.host_id === v.id) throw new StoreError(MSG.hostCantLeave);
      db.participants = db.participants.filter((p) => !(p.run_id === runId && p.user_id === v.id));
      save();
    },

    async cancelRun(runId) {
      const db = load();
      const v = requireViewer();
      const run = db.runs.find((r) => r.id === runId);
      if (!run) throw new StoreError(MSG.runNotFound);
      if (run.host_id !== v.id) throw new StoreError(MSG.onlyHostCancels);
      run.status = 'cancelled';
      save();
    },

    async joinWaitlist(feature, contact) {
      const db = load();
      db.waitlist.push({
        feature,
        user_id: db.viewer?.id ?? null,
        contact: contact?.trim() || null,
        created_at: new Date().toISOString(),
      });
      save();
    },
  };
}
