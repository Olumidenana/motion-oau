import Link from 'next/link';
import { getRoute } from '@/lib/routes';
import { PACE_INFO } from '@/lib/pace';
import { formatDay, formatTime } from '@/lib/time';
import type { Run } from '@/lib/store/types';

export function hostLabel(run: Run): string {
  return run.host_name ?? 'A runner';
}

export function hasStarted(run: Run): boolean {
  return new Date(run.starts_at).getTime() <= Date.now();
}

export default function RunCard({ run, showRoute = true }: { run: Run; showRoute?: boolean }) {
  const route = getRoute(run.route_slug);
  const full = run.going_count >= run.max_people;
  const started = hasStarted(run);
  const title = showRoute ? route?.shortName ?? 'Campus run' : `${PACE_INFO[run.pace].label} ${run.pace === 'walk' ? '' : 'run'}`.trim();
  return (
    <Link href={`/runs/${run.id}`} className="run-card">
      <div className="run-date">
        <span className="day">{formatDay(run.starts_at)}</span>
        <span className="time">{formatTime(run.starts_at)}</span>
      </div>
      <div className="run-main">
        <h3>{title}</h3>
        <p>
          {showRoute ? `${PACE_INFO[run.pace].label} · ` : ''}
          Hosted by {hostLabel(run)}
        </p>
        {run.women_only || full || started ? (
          <div className="badges" style={{ margin: '6px 0 0' }}>
            {started ? <span className="badge badge-now">Happening now</span> : null}
            {run.women_only ? <span className="badge badge-women">Women-only</span> : null}
            {full ? <span className="badge badge-full">Full</span> : null}
          </div>
        ) : null}
      </div>
      <div className="run-going">
        <strong>
          {run.going_count}/{run.max_people}
        </strong>
        going
      </div>
    </Link>
  );
}
