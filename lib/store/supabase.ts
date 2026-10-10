import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import { RUN_GRACE_MS, StoreError, type Profile, type RosterEntry, type Run, type Store, type Viewer } from './types';
import { validateDisplayName, validateEmail, validateNewRun } from './validate';
import { MSG } from './messages';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

// Error codes raised by our own triggers in supabase/schema.sql carry
// messages written for people, so they are shown as-is.
const FRIENDLY_CODES = new Set(['P0001', 'P0002']);

function fail(error: PostgrestError | Error | { message: string; code?: string } | null): never {
  const code = error && 'code' in error ? error.code : undefined;
  const message = error?.message ?? '';
  if (code && FRIENDLY_CODES.has(code)) throw new StoreError(message);
  if (/fetch|network|load failed/i.test(message)) throw new StoreError(MSG.offline);
  if (code === '42501') throw new StoreError('You don’t have permission to do that. Try signing in again.');
  if (code === '23514') throw new StoreError('Some details aren’t valid. Check the form and try again.');
  throw new StoreError(message ? `Something went wrong: ${message}` : 'Something went wrong. Please try again.');
}

const toViewer = (u: { id: string; email?: string | null } | null | undefined): Viewer | null =>
  u ? { id: u.id, email: u.email ?? null } : null;

export function createSupabaseStore(): Store {
  const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Implicit flow lets a magic link work even when it opens in a different
      // browser (e.g. Gmail's in-app browser on Android).
      flowType: 'implicit',
    },
  });

  async function viewer(): Promise<Viewer | null> {
    const { data } = await sb.auth.getSession();
    return toViewer(data.session?.user);
  }

  async function requireViewer(): Promise<Viewer> {
    const v = await viewer();
    if (!v) throw new StoreError(MSG.signInFirst);
    return v;
  }

  const sinceIso = () => new Date(Date.now() - RUN_GRACE_MS).toISOString();

  return {
    mode: 'supabase',

    getViewer: viewer,

    onViewerChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toViewer(session?.user)));
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, redirectTo) {
      const { error } = await sb.auth.signInWithOtp({
        email: validateEmail(email),
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (error) {
        if (/rate limit/i.test(error.message)) {
          throw new StoreError('Too many sign-in emails were sent. Wait a minute, then try again.');
        }
        fail(error);
      }
      return { sentLink: true };
    },

    async signOut() {
      const { error } = await sb.auth.signOut();
      if (error) fail(error);
    },

    async getProfile() {
      const v = await viewer();
      if (!v) return null;
      const { data, error } = await sb.from('profiles').select('id, display_name, is_private').eq('id', v.id).maybeSingle();
      if (error) fail(error);
      return (data as Profile | null) ?? null;
    },

    async updateProfile(patch) {
      const v = await requireViewer();
      const update: Partial<Profile> = {};
      if (patch.display_name !== undefined) update.display_name = validateDisplayName(patch.display_name);
      if (patch.is_private !== undefined) update.is_private = patch.is_private;
      const { data, error } = await sb
        .from('profiles')
        .update(update)
        .eq('id', v.id)
        .select('id, display_name, is_private')
        .single();
      if (error) fail(error);
      return data as Profile;
    },

    async listRuns(opts = {}) {
      let q = sb.from('run_feed').select('*').eq('status', 'scheduled').gte('starts_at', sinceIso()).order('starts_at');
      if (opts.routeSlug) q = q.eq('route_slug', opts.routeSlug);
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) fail(error);
      return (data ?? []) as Run[];
    },

    async getRun(id) {
      // Invalid ids would make Postgres complain about the uuid format.
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const { data, error } = await sb.from('run_feed').select('*').eq('id', id).maybeSingle();
      if (error) fail(error);
      return (data as Run | null) ?? null;
    },

    async getRoster(runId) {
      const { data, error } = await sb.from('run_roster').select('*').eq('run_id', runId).order('joined_at');
      if (error) fail(error);
      return (data ?? []) as RosterEntry[];
    },

    async myRuns() {
      const v = await viewer();
      if (!v) return [];
      const { data: rows, error } = await sb.from('run_participants').select('run_id').eq('user_id', v.id);
      if (error) fail(error);
      const ids = (rows ?? []).map((r: { run_id: string }) => r.run_id);
      if (!ids.length) return [];
      const { data, error: e2 } = await sb
        .from('run_feed')
        .select('*')
        .in('id', ids)
        .eq('status', 'scheduled')
        .gte('starts_at', sinceIso())
        .order('starts_at');
      if (e2) fail(e2);
      return (data ?? []) as Run[];
    },

    async createRun(input) {
      const v = await requireViewer();
      const clean = validateNewRun(input);
      const { data, error } = await sb
        .from('runs')
        .insert({ ...clean, meeting_note: clean.meeting_note || null, host_id: v.id })
        .select('id')
        .single();
      if (error) fail(error);
      return (data as { id: string }).id;
    },

    async joinRun(runId) {
      const v = await requireViewer();
      const { error } = await sb.from('run_participants').insert({ run_id: runId, user_id: v.id });
      if (error && error.code !== '23505') fail(error); // 23505 = already going
    },

    async leaveRun(runId) {
      const v = await requireViewer();
      const run = await this.getRun(runId);
      if (run?.host_id === v.id) throw new StoreError(MSG.hostCantLeave);
      const { error } = await sb.from('run_participants').delete().eq('run_id', runId).eq('user_id', v.id);
      if (error) fail(error);
    },

    async cancelRun(runId) {
      const v = await requireViewer();
      const { data, error } = await sb
        .from('runs')
        .update({ status: 'cancelled' })
        .eq('id', runId)
        .eq('host_id', v.id)
        .select('id');
      if (error) fail(error);
      if (!data?.length) throw new StoreError(MSG.onlyHostCancels);
    },

    async joinWaitlist(feature, contact) {
      const v = await viewer();
      const { error } = await sb
        .from('waitlist')
        .insert({ feature, user_id: v?.id ?? null, contact: contact?.trim() || null });
      if (error) fail(error);
    },
  };
}
