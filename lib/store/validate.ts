import { getRoute } from '../routes';
import { isPace } from '../pace';
import { DISPLAY_NAME_MAX, MAX_PEOPLE, MEETING_NOTE_MAX, MIN_PEOPLE, StoreError, type NewRun } from './types';

const MAX_DAYS_AHEAD = 60;

/** Shared checks so demo mode behaves like the database constraints. */
export function validateNewRun(input: NewRun): NewRun {
  if (!getRoute(input.route_slug)) throw new StoreError('Pick a route for your run.');
  if (!isPace(input.pace)) throw new StoreError('Pick a pace for your run.');
  const max = Math.round(Number(input.max_people));
  if (!Number.isFinite(max) || max < MIN_PEOPLE || max > MAX_PEOPLE) {
    throw new StoreError(`Group size must be between ${MIN_PEOPLE} and ${MAX_PEOPLE}.`);
  }
  const t = new Date(input.starts_at).getTime();
  if (!Number.isFinite(t)) throw new StoreError('Pick a date and time for your run.');
  if (t < Date.now()) throw new StoreError('That time has already passed. Pick a time in the future.');
  if (t > Date.now() + MAX_DAYS_AHEAD * 86_400_000) {
    throw new StoreError(`You can schedule runs up to ${MAX_DAYS_AHEAD} days ahead.`);
  }
  const note = input.meeting_note.trim();
  if (note.length > MEETING_NOTE_MAX) {
    throw new StoreError(`Keep the meeting point note under ${MEETING_NOTE_MAX} characters.`);
  }
  return { ...input, max_people: max, meeting_note: note, starts_at: new Date(t).toISOString() };
}

export function validateDisplayName(name: string): string {
  const v = name.trim().replace(/\s+/g, ' ');
  if (!v) throw new StoreError('Your name can’t be empty.');
  if (v.length > DISPLAY_NAME_MAX) throw new StoreError(`Keep your name under ${DISPLAY_NAME_MAX} characters.`);
  return v;
}

export function validateEmail(email: string): string {
  const v = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new StoreError('That doesn’t look like an email address.');
  return v;
}
