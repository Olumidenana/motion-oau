import type { Pace } from '../pace';

export type RunStatus = 'scheduled' | 'cancelled';

export interface Viewer {
  id: string;
  email: string | null;
}

export interface Profile {
  id: string;
  display_name: string;
  is_private: boolean;
}

/** A row of the run_feed view. */
export interface Run {
  id: string;
  route_slug: string;
  host_id: string;
  /** Null when the host has a private profile (shown as "A runner"). */
  host_name: string | null;
  starts_at: string;
  pace: Pace;
  max_people: number;
  meeting_note: string | null;
  women_only: boolean;
  status: RunStatus;
  going_count: number;
  created_at: string;
}

/** A row of the run_roster view. Private profiles come back with nulls. */
export interface RosterEntry {
  run_id: string;
  user_id: string | null;
  display_name: string | null;
  is_viewer: boolean;
  is_host: boolean;
  joined_at: string;
}

export interface NewRun {
  route_slug: string;
  starts_at: string;
  pace: Pace;
  max_people: number;
  meeting_note: string;
  women_only: boolean;
}

export interface ListRunsOptions {
  routeSlug?: string;
  limit?: number;
}

/**
 * The single data-layer interface. Two implementations:
 * - demo: localStorage, seeded sample runs (no Supabase env vars)
 * - supabase: Postgres + magic-link auth
 */
export interface Store {
  readonly mode: 'demo' | 'supabase';

  getViewer(): Promise<Viewer | null>;
  onViewerChange(cb: (viewer: Viewer | null) => void): () => void;
  /** Supabase: sends a magic link. Demo: signs in immediately. */
  signIn(email: string, redirectTo: string): Promise<{ sentLink: boolean }>;
  signOut(): Promise<void>;

  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Pick<Profile, 'display_name' | 'is_private'>>): Promise<Profile>;

  /** Upcoming scheduled runs, soonest first. */
  listRuns(opts?: ListRunsOptions): Promise<Run[]>;
  getRun(id: string): Promise<Run | null>;
  getRoster(runId: string): Promise<RosterEntry[]>;
  /** Upcoming runs the viewer is going to (hosting or joined). */
  myRuns(): Promise<Run[]>;

  createRun(input: NewRun): Promise<string>;
  joinRun(runId: string): Promise<void>;
  leaveRun(runId: string): Promise<void>;
  cancelRun(runId: string): Promise<void>;

  joinWaitlist(feature: string, contact?: string): Promise<void>;
}

/** Errors with a message that is safe and friendly to show as-is. */
export class StoreError extends Error {}

/**
 * Runs stay listed (and joinable) for 30 minutes after their start time so
 * latecomers can still find the group. Keep in sync with supabase/schema.sql.
 */
export const RUN_GRACE_MS = 30 * 60 * 1000;

export const MEETING_NOTE_MAX = 200;
export const DISPLAY_NAME_MAX = 40;
export const MIN_PEOPLE = 2;
export const MAX_PEOPLE = 50;
