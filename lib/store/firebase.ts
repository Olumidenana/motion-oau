import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase/firestore/lite';
import { RUN_GRACE_MS, StoreError, type Profile, type RosterEntry, type Run, type Store, type Viewer } from './types';
import { validateDisplayName, validateEmail, validateNewRun } from './validate';
import { MSG } from './messages';
import { FIREBASE_CONFIG, FIREBASE_EMULATOR_HOST } from '../config';
import type { Pace } from '../pace';

/*
 * Firestore layout (see firebase/firestore.rules):
 *   profiles/{uid}               { display_name, is_private }               — owner only
 *   runs/{runId}                 { ...run, host_name, going_count }         — public read
 *   participants/{runId}_{uid}   { run_id, user_id, display_name, is_host, joined_at, starts_at }
 * Names are copied onto runs/participants (null when the profile is private),
 * because Firestore has no views. Changing your name or privacy updates the copies.
 */

const MIN_PASSWORD = 8;

function fail(e: unknown): never {
  if (e instanceof StoreError) throw e;
  const code = (e as { code?: string })?.code ?? '';
  const known: Record<string, string> = {
    'auth/email-already-in-use': 'There’s already an account with that email. Sign in instead.',
    'auth/invalid-credential': 'That email and password don’t match. Check them, or reset your password.',
    'auth/wrong-password': 'That email and password don’t match. Check them, or reset your password.',
    'auth/user-not-found': 'That email and password don’t match. Check them, or reset your password.',
    'auth/invalid-email': 'That doesn’t look like an email address.',
    'auth/weak-password': MSG.passwordShort,
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes, then try again.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
    'auth/network-request-failed': MSG.offline,
    'auth/operation-not-allowed': 'This sign-in method isn’t turned on yet. Ask the Motion team to enable it in Firebase.',
    'auth/unauthorized-domain': 'Sign-in isn’t set up for this web address yet. Add it under Firebase → Authentication → Settings → Authorized domains.',
    'permission-denied': 'You don’t have permission to do that. Refresh the page and try again.',
    unavailable: MSG.offline,
    'deadline-exceeded': MSG.offline,
  };
  if (known[code]) throw new StoreError(known[code]);
  throw new StoreError('Something went wrong. Please try again.');
}

const toViewer = (u: User | null): Viewer | null => (u ? { id: u.uid, email: u.email } : null);
const iso = (t: unknown) => (t instanceof Timestamp ? t.toDate().toISOString() : new Date().toISOString());

function toRun(snap: DocumentSnapshot<DocumentData>): Run {
  const d = snap.data()!;
  return {
    id: snap.id,
    route_slug: d.route_slug,
    host_id: d.host_id,
    host_name: d.host_name ?? null,
    starts_at: iso(d.starts_at),
    pace: d.pace as Pace,
    max_people: d.max_people,
    meeting_note: d.meeting_note ?? null,
    women_only: !!d.women_only,
    status: d.status,
    going_count: d.going_count ?? 0,
    created_at: iso(d.created_at),
  };
}

/** First word of a Google display name, as a friendly default. */
function defaultName(u: User): string {
  const first = (u.displayName ?? '').trim().split(/\s+/)[0] ?? '';
  return first && first.length <= 40 ? first : 'Runner';
}

export function createFirebaseStore(): Store {
  const app: FirebaseApp = initializeApp(FIREBASE_CONFIG);
  const auth: Auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  const db: Firestore = getFirestore(app);
  if (FIREBASE_EMULATOR_HOST) {
    connectAuthEmulator(auth, `http://${FIREBASE_EMULATOR_HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, FIREBASE_EMULATOR_HOST, 8080);
  }

  const runRef = (id: string) => doc(db, 'runs', id);
  const partRef = (runId: string, uid: string) => doc(db, 'participants', `${runId}_${uid}`);
  const sinceTs = () => Timestamp.fromMillis(Date.now() - RUN_GRACE_MS);

  async function currentUser(): Promise<User | null> {
    await auth.authStateReady();
    return auth.currentUser;
  }

  async function requireUser(): Promise<User> {
    const u = await currentUser();
    if (!u) throw new StoreError(MSG.signInFirst);
    return u;
  }

  /** Profiles have no server-side trigger here, so create one on first use. */
  async function ensureProfile(u: User): Promise<Profile> {
    const ref = doc(db, 'profiles', u.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return { id: u.uid, display_name: d.display_name, is_private: !!d.is_private };
    }
    const fresh = { display_name: defaultName(u), is_private: false };
    await setDoc(ref, fresh);
    return { id: u.uid, ...fresh };
  }

  const publicName = (p: Profile) => (p.is_private ? null : p.display_name);

  return {
    mode: 'firebase',
    authMethods: ['google', 'password'] as const,

    async getViewer() {
      return toViewer(await currentUser());
    },

    onViewerChange(cb) {
      return onAuthStateChanged(auth, (u) => cb(toViewer(u)));
    },

    async signInWithGoogle() {
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } catch (e) {
        const code = (e as { code?: string })?.code;
        // Closing the Google window isn't an error worth shouting about.
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        fail(e);
      }
    },

    async signInWithPassword(email, password, intent) {
      const clean = validateEmail(email);
      if (intent === 'sign-up' && password.length < MIN_PASSWORD) throw new StoreError(MSG.passwordShort);
      try {
        if (intent === 'sign-up') await createUserWithEmailAndPassword(auth, clean, password);
        else await signInWithEmailAndPassword(auth, clean, password);
      } catch (e) {
        fail(e);
      }
    },

    async sendPasswordReset(email) {
      try {
        await sendPasswordResetEmail(auth, validateEmail(email));
      } catch (e) {
        // Don't reveal whether an account exists.
        if ((e as { code?: string })?.code === 'auth/user-not-found') return;
        fail(e);
      }
    },

    async signOut() {
      await signOut(auth).catch(fail);
    },

    async getProfile() {
      const u = await currentUser();
      if (!u) return null;
      return ensureProfile(u).catch(fail);
    },

    async updateProfile(patch) {
      const u = await requireUser();
      try {
        const current = await ensureProfile(u);
        const next: Profile = {
          id: u.uid,
          display_name: patch.display_name !== undefined ? validateDisplayName(patch.display_name) : current.display_name,
          is_private: patch.is_private ?? current.is_private,
        };
        const batch = writeBatch(db);
        batch.set(doc(db, 'profiles', u.uid), { display_name: next.display_name, is_private: next.is_private });
        if (publicName(next) !== publicName(current)) {
          // Update the name shown on runs you host and rows where you're going.
          const [parts, hosted] = await Promise.all([
            getDocs(query(collection(db, 'participants'), where('user_id', '==', u.uid))),
            getDocs(query(collection(db, 'runs'), where('host_id', '==', u.uid))),
          ]);
          parts.forEach((p) => batch.update(p.ref, { display_name: publicName(next) }));
          hosted.forEach((r) => batch.update(r.ref, { host_name: publicName(next) }));
        }
        await batch.commit();
        return next;
      } catch (e) {
        fail(e);
      }
    },

    async listRuns(opts = {}) {
      try {
        // One simple range query (no composite index needed); campus volumes are small.
        const snap = await getDocs(
          query(collection(db, 'runs'), where('starts_at', '>=', sinceTs()), orderBy('starts_at'), limit(300)),
        );
        const runs = snap.docs
          .map(toRun)
          .filter((r) => r.status === 'scheduled' && (!opts.routeSlug || r.route_slug === opts.routeSlug));
        return opts.limit ? runs.slice(0, opts.limit) : runs;
      } catch (e) {
        fail(e);
      }
    },

    async getRun(id) {
      if (!/^[A-Za-z0-9]{1,40}$/.test(id)) return null;
      try {
        const snap = await getDoc(runRef(id));
        return snap.exists() ? toRun(snap) : null;
      } catch (e) {
        fail(e);
      }
    },

    async getRoster(runId) {
      try {
        const [u, snap] = await Promise.all([
          currentUser(),
          getDocs(query(collection(db, 'participants'), where('run_id', '==', runId))),
        ]);
        return snap.docs
          .map<RosterEntry>((s) => {
            const d = s.data();
            const isViewer = !!u && d.user_id === u.uid;
            const hidden = d.display_name == null && !isViewer;
            return {
              run_id: runId,
              user_id: hidden ? null : d.user_id,
              display_name: d.display_name ?? (isViewer ? 'You' : null),
              is_viewer: isViewer,
              is_host: !!d.is_host,
              joined_at: iso(d.joined_at),
            };
          })
          .sort((a, b) => a.joined_at.localeCompare(b.joined_at));
      } catch (e) {
        fail(e);
      }
    },

    async myRuns() {
      const u = await currentUser();
      if (!u) return [];
      try {
        const parts = await getDocs(query(collection(db, 'participants'), where('user_id', '==', u.uid)));
        const since = sinceTs().toMillis();
        const ids = parts.docs
          .map((p) => p.data())
          .filter((d) => d.starts_at instanceof Timestamp && d.starts_at.toMillis() >= since)
          .map((d) => d.run_id as string);
        const snaps = await Promise.all(ids.map((id) => getDoc(runRef(id))));
        return snaps
          .filter((s) => s.exists())
          .map(toRun)
          .filter((r) => r.status === 'scheduled')
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      } catch (e) {
        fail(e);
      }
    },

    async createRun(input) {
      const u = await requireUser();
      const clean = validateNewRun(input);
      try {
        const profile = await ensureProfile(u);
        const ref = doc(collection(db, 'runs'));
        const startsAt = Timestamp.fromDate(new Date(clean.starts_at));
        const batch = writeBatch(db);
        batch.set(ref, {
          route_slug: clean.route_slug,
          host_id: u.uid,
          host_name: publicName(profile),
          starts_at: startsAt,
          pace: clean.pace,
          max_people: clean.max_people,
          meeting_note: clean.meeting_note || null,
          women_only: clean.women_only,
          status: 'scheduled',
          going_count: 1,
          created_at: serverTimestamp(),
        });
        batch.set(partRef(ref.id, u.uid), {
          run_id: ref.id,
          user_id: u.uid,
          display_name: publicName(profile),
          is_host: true,
          joined_at: serverTimestamp(),
          starts_at: startsAt,
        });
        await batch.commit();
        return ref.id;
      } catch (e) {
        fail(e);
      }
    },

    async joinRun(runId) {
      const u = await requireUser();
      try {
        const profile = await ensureProfile(u);
        // The transaction gives clear messages; the security rules enforce the same limits.
        await runTransaction(db, async (tx) => {
          const runSnap = await tx.get(runRef(runId));
          if (!runSnap.exists()) throw new StoreError(MSG.runNotFound);
          const r = runSnap.data();
          const mine = await tx.get(partRef(runId, u.uid));
          if (mine.exists()) return;
          if (r.status === 'cancelled') throw new StoreError(MSG.runCancelled);
          if ((r.starts_at as Timestamp).toMillis() < Date.now() - RUN_GRACE_MS) throw new StoreError(MSG.runOver);
          if (r.going_count >= r.max_people) throw new StoreError(MSG.runFull);
          tx.set(partRef(runId, u.uid), {
            run_id: runId,
            user_id: u.uid,
            display_name: publicName(profile),
            is_host: false,
            joined_at: serverTimestamp(),
            starts_at: r.starts_at,
          });
          tx.update(runRef(runId), { going_count: r.going_count + 1 });
        });
      } catch (e) {
        fail(e);
      }
    },

    async leaveRun(runId) {
      const u = await requireUser();
      try {
        await runTransaction(db, async (tx) => {
          const runSnap = await tx.get(runRef(runId));
          if (!runSnap.exists()) throw new StoreError(MSG.runNotFound);
          const r = runSnap.data();
          if (r.host_id === u.uid) throw new StoreError(MSG.hostCantLeave);
          const mine = await tx.get(partRef(runId, u.uid));
          if (!mine.exists()) return;
          tx.delete(partRef(runId, u.uid));
          tx.update(runRef(runId), { going_count: r.going_count - 1 });
        });
      } catch (e) {
        fail(e);
      }
    },

    async cancelRun(runId) {
      const u = await requireUser();
      try {
        const snap = await getDoc(runRef(runId));
        if (!snap.exists()) throw new StoreError(MSG.runNotFound);
        if (snap.data().host_id !== u.uid) throw new StoreError(MSG.onlyHostCancels);
        const batch = writeBatch(db);
        batch.update(runRef(runId), { status: 'cancelled' });
        await batch.commit();
      } catch (e) {
        fail(e);
      }
    },

    async joinWaitlist(feature, contact) {
      const u = await currentUser();
      try {
        await addDoc(collection(db, 'waitlist'), {
          feature,
          user_id: u?.uid ?? null,
          contact: contact?.trim() || null,
          created_at: serverTimestamp(),
        });
      } catch (e) {
        fail(e);
      }
    },
  };
}
