'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMotion } from './StoreProvider';
import { useAsync } from './useAsync';
import { ListSkeleton, LoadError } from './RunList';
import RouteMap from './RouteMap';
import SignInForm from './SignInForm';
import { hostLabel } from './RunCard';
import { routeDistanceLabel } from './RouteCard';
import { getRoute } from '@/lib/routes';
import { PACE_INFO } from '@/lib/pace';
import { formatLongDay, formatTime } from '@/lib/time';
import { errorMessage } from '@/lib/errors';
import { whatsappShareUrl } from '@/lib/share';
import { RUN_GRACE_MS, type RosterEntry } from '@/lib/store/types';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

function RosterRow({ p }: { p: RosterEntry }) {
  const hidden = p.display_name === null;
  const name = p.is_viewer ? 'You' : hidden ? 'A runner' : p.display_name!;
  return (
    <li>
      <span className={`avatar${hidden ? ' is-private' : ''}`} aria-hidden="true">
        {hidden ? '·' : initials(p.is_viewer ? p.display_name ?? 'You' : name)}
      </span>
      <span>
        {name}
        {p.is_host ? <span className="muted"> · host</span> : null}
      </span>
    </li>
  );
}

export default function RunDetail({ id }: { id: string }) {
  const { store, viewer, ready } = useMotion();
  const params = useSearchParams();
  const justCreated = params.get('created') === '1';
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [wantsToJoin, setWantsToJoin] = useState(false);

  const { data, error, reload } = useAsync(
    () =>
      store
        ? Promise.all([store.getRun(id), store.getRoster(id)]).then(([run, roster]) => ({ run, roster }))
        : undefined,
    [store, viewer?.id, id],
  );

  if (error && !data) return <LoadError message={error} onRetry={reload} />;
  if (!ready || !data) return <ListSkeleton rows={3} />;

  const { run, roster } = data;
  if (!run) {
    return (
      <div className="empty">
        <h1>Run not found</h1>
        <p>We couldn’t find that run. It may have been removed{store?.mode === 'demo' ? ', or it was created on another device (demo mode keeps data on one device)' : ''}.</p>
        <Link className="btn" href="/">
          See upcoming runs
        </Link>
      </div>
    );
  }

  const route = getRoute(run.route_slug);
  const isHost = !!viewer && viewer.id === run.host_id;
  const going = roster.some((p) => p.is_viewer);
  const full = run.going_count >= run.max_people;
  const cancelled = run.status === 'cancelled';
  const start = new Date(run.starts_at).getTime();
  const over = start < Date.now() - RUN_GRACE_MS;
  const started = start <= Date.now();
  const spotsLeft = Math.max(0, run.max_people - run.going_count);
  const pct = Math.min(100, Math.round((run.going_count / run.max_people) * 100));

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      setConfirmCancel(false);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
      reload();
    }
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/runs/${run.id}` : `/runs/${run.id}`;

  return (
    <>
      <Link href={route ? `/routes/${route.slug}` : '/'} className="back-link">
        ← {route ? route.shortName : 'All runs'}
      </Link>

      {justCreated && !cancelled ? (
        <div className="notice" role="status">
          <p>
            <strong>Your run is scheduled.</strong> Share it on WhatsApp so people can join you.
          </p>
        </div>
      ) : null}

      <div className="badges">
        <span className="badge">{PACE_INFO[run.pace].label}</span>
        {run.women_only ? <span className="badge badge-women">Women-only</span> : null}
        {cancelled ? <span className="badge badge-cancelled">Cancelled</span> : null}
        {!cancelled && full ? <span className="badge badge-full">Full</span> : null}
        {!cancelled && started && !over ? <span className="badge badge-now">Happening now</span> : null}
        {route && !route.verified ? <span className="badge badge-draft">Draft route</span> : null}
      </div>
      <h1>{route?.name ?? 'Campus run'}</h1>
      <p className="run-title-when">
        {formatLongDay(run.starts_at)}, {formatTime(run.starts_at)}{' '}
        <span className="muted small">(Lagos time)</span>
      </p>

      <div className="grid-2">
        <div>
          {route ? <RouteMap slug={route.slug} height="min(44vh, 360px)" /> : null}
          <dl className="facts">
            <div className="fact">
              <dt>Pace</dt>
              <dd>{PACE_INFO[run.pace].label}</dd>
            </div>
            <div className="fact">
              <dt>Route</dt>
              <dd>{route ? routeDistanceLabel(route) : '—'}</dd>
            </div>
          </dl>
          <div className="card">
            <dl className="detail-list">
              <dt style={{ marginTop: 0 }}>Hosted by</dt>
              <dd>{isHost ? 'You' : hostLabel(run)}</dd>
              <dt>Meeting point</dt>
              <dd>{run.meeting_note || route?.startLabel || 'See the map'}</dd>
              <dt>Pace guide</dt>
              <dd>{PACE_INFO[run.pace].hint}</dd>
            </dl>
          </div>
        </div>

        <div>
          <section className="card" aria-labelledby="going-heading">
            <h2 id="going-heading">Who’s going</h2>
            <div className={`meter${full ? ' is-full' : ''}`} aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>
            <p className="muted small">
              {run.going_count} of {run.max_people} going
              {cancelled ? '' : full ? ' — this run is full' : ` · ${spotsLeft} ${spotsLeft === 1 ? 'place' : 'places'} left`}
            </p>
            <ul className="roster">
              {roster.map((p, i) => (
                <RosterRow key={p.user_id ?? `private-${i}`} p={p} />
              ))}
            </ul>
            {roster.some((p) => p.display_name === null && !p.is_viewer) ? (
              <p className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
                Some runners keep their profile private.
              </p>
            ) : null}
          </section>

          <section className="card" aria-label="Your place on this run">
            {cancelled ? (
              <p style={{ margin: 0 }}>
                <strong>This run was cancelled by the host.</strong>{' '}
                {route ? <Link href={`/routes/${route.slug}`}>See other runs on {route.shortName}</Link> : null}
              </p>
            ) : over ? (
              <p style={{ margin: 0 }}>
                <strong>This run has finished.</strong>{' '}
                {route ? <Link href={`/runs/new?route=${route.slug}`}>Schedule another one here</Link> : null}
              </p>
            ) : isHost ? (
              <>
                <p>
                  <strong>You’re hosting this run.</strong> Share it so people can find it.
                </p>
                {confirmCancel ? (
                  <div className="notice notice-warn">
                    <p>Cancel this run? Everyone going will see it’s cancelled.</p>
                    <div className="btn-row">
                      <button type="button" className="btn btn-danger btn-small" disabled={busy} onClick={() => act(() => store!.cancelRun(run.id))}>
                        {busy ? 'Cancelling…' : 'Yes, cancel run'}
                      </button>
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmCancel(false)}>
                        Keep it
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="btn btn-danger btn-small" onClick={() => setConfirmCancel(true)}>
                    Cancel run
                  </button>
                )}
              </>
            ) : going ? (
              <>
                <p>
                  <strong>You’re going.</strong> See you at the start{started ? '' : ` — ${formatTime(run.starts_at)}`}.
                </p>
                <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => act(() => store!.leaveRun(run.id))}>
                  {busy ? 'Leaving…' : 'Leave this run'}
                </button>
              </>
            ) : full ? (
              <p style={{ margin: 0 }}>
                <strong>This run is full.</strong>{' '}
                {route ? <Link href={`/runs/new?route=${route.slug}`}>Schedule your own on {route.shortName}</Link> : null}
              </p>
            ) : !viewer && wantsToJoin ? (
              <SignInForm
                redirectPath={`/runs/${run.id}`}
                title="Sign in to join"
                intro="So the host knows who’s coming. No password — just your email. You can keep your name private."
              />
            ) : (
              <>
                {run.women_only ? <p className="small">This is a women-only run. Please respect the label.</p> : null}
                <button
                  type="button"
                  className="btn btn-lane btn-block"
                  disabled={busy}
                  onClick={() => (viewer ? act(() => store!.joinRun(run.id)) : setWantsToJoin(true))}
                >
                  {busy ? 'Joining…' : 'Join this run'}
                </button>
              </>
            )}
            {actionError ? (
              <p className="notice notice-error" role="alert">
                {actionError}
              </p>
            ) : null}
          </section>

          {!cancelled && !over ? (
            <div style={{ marginTop: 12 }}>
              <a className="btn btn-whatsapp btn-block" href={whatsappShareUrl(run, shareUrl)} target="_blank" rel="noopener noreferrer">
                Share on WhatsApp
              </a>
              {store?.mode === 'demo' ? (
                <p className="muted small" style={{ marginTop: 6 }}>
                  Demo mode: the link only works on this device until Motion is connected to a database.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
