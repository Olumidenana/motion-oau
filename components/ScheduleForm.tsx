'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMotion } from './StoreProvider';
import SignInForm from './SignInForm';
import { ListSkeleton } from './RunList';
import { routeDistanceLabel } from './RouteCard';
import { ROUTES, getRoute } from '@/lib/routes';
import { PACES, PACE_INFO, type Pace } from '@/lib/pace';
import { lagosToIso, lagosYmd } from '@/lib/time';
import { errorMessage } from '@/lib/errors';
import { MAX_PEOPLE, MEETING_NOTE_MAX, MIN_PEOPLE } from '@/lib/store/types';

export default function ScheduleForm() {
  const { store, viewer, ready } = useMotion();
  const router = useRouter();
  const params = useSearchParams();
  const initialRoute = getRoute(params.get('route') ?? '')?.slug ?? ROUTES[0].slug;

  const { today, tomorrow, maxDay } = useMemo(() => {
    const now = Date.now();
    return {
      today: lagosYmd(new Date(now)),
      tomorrow: lagosYmd(new Date(now + 86_400_000)),
      maxDay: lagosYmd(new Date(now + 59 * 86_400_000)),
    };
  }, []);

  const [routeSlug, setRouteSlug] = useState(initialRoute);
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState('06:00');
  const [pace, setPace] = useState<Pace>('easy');
  const [maxPeople, setMaxPeople] = useState(10);
  const [note, setNote] = useState('');
  const [womenOnly, setWomenOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const route = getRoute(routeSlug);
  const noteOver = note.length > MEETING_NOTE_MAX;
  const clamp = (n: number) => Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, Math.round(n) || MIN_PEOPLE));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!store || busy) return;
    setError(null);
    if (!date || !time) return setError('Pick a date and time for your run.');
    if (noteOver) return setError(`Keep the meeting point note under ${MEETING_NOTE_MAX} characters.`);
    setBusy(true);
    try {
      const id = await store.createRun({
        route_slug: routeSlug,
        starts_at: lagosToIso(date, time),
        pace,
        max_people: clamp(maxPeople),
        meeting_note: note,
        women_only: womenOnly,
      });
      router.push(`/runs/${id}?created=1`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (!ready) return <ListSkeleton rows={2} />;
  if (!viewer) {
    return (
      <SignInForm
        redirectPath={`/runs/new?route=${routeSlug}`}
        title="Sign in to schedule a run"
        intro="So people know who’s hosting. It only takes a moment."
      />
    );
  }

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="route">Route</label>
        <select id="route" className="input" value={routeSlug} onChange={(e) => setRouteSlug(e.target.value)}>
          {ROUTES.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name} — {routeDistanceLabel(r)}
            </option>
          ))}
        </select>
        {route ? (
          <p className="hint">
            {route.level}. Starts at: {route.startLabel}.
          </p>
        ) : null}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" className="input" type="date" required min={today} max={maxDay} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="time">Time</label>
          <input id="time" className="input" type="time" required step={300} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <p className="hint muted small" style={{ marginTop: -10 }}>
        Times are in Lagos time (WAT).
      </p>

      <fieldset className="field">
        <legend>Pace</legend>
        <div className="choices">
          {PACES.map((p) => (
            <label key={p} className="choice">
              <input type="radio" name="pace" value={p} checked={pace === p} onChange={() => setPace(p)} />
              <span>
                <strong>{PACE_INFO[p].label}</strong>
                <small>{PACE_INFO[p].hint}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="max">Group size</label>
        <div className="stepper">
          <button type="button" className="btn btn-ghost" aria-label="Fewer people" onClick={() => setMaxPeople((n) => clamp(n - 1))} disabled={maxPeople <= MIN_PEOPLE}>
            −
          </button>
          <input
            id="max"
            className="input"
            type="number"
            inputMode="numeric"
            min={MIN_PEOPLE}
            max={MAX_PEOPLE}
            value={maxPeople}
            onChange={(e) => setMaxPeople(Number(e.target.value))}
            onBlur={() => setMaxPeople((n) => clamp(n))}
            aria-describedby="max-hint"
          />
          <button type="button" className="btn btn-ghost" aria-label="More people" onClick={() => setMaxPeople((n) => clamp(n + 1))} disabled={maxPeople >= MAX_PEOPLE}>
            +
          </button>
        </div>
        <p id="max-hint" className="hint">
          Including you. Between {MIN_PEOPLE} and {MAX_PEOPLE} people.
        </p>
      </div>

      <div className="field">
        <label htmlFor="note">Meeting point note (optional)</label>
        <textarea
          id="note"
          className="input"
          value={note}
          maxLength={MEETING_NOTE_MAX + 50}
          onChange={(e) => setNote(e.target.value)}
          placeholder={route ? `e.g. ${route.startLabel}. I’ll be in a green top.` : ''}
          aria-invalid={noteOver || undefined}
          aria-describedby="note-count"
        />
        <div id="note-count" className={`counter${noteOver ? ' is-over' : ''}`} aria-live="polite">
          {note.length}/{MEETING_NOTE_MAX}
        </div>
      </div>

      <label className="toggle">
        <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} />
        <span>
          <strong>Women-only run</strong>
          <small>Adds a women-only label so people know who the run is for.</small>
        </span>
      </label>

      {error ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="btn btn-lane" type="submit" disabled={busy}>
        {busy ? 'Scheduling…' : 'Schedule run'}
      </button>
    </form>
  );
}
