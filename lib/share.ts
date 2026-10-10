import { getRoute, routeDistance } from './routes';
import { formatDistance } from './geo';
import { formatLongDay, formatTime } from './time';
import { PACE_INFO } from './pace';
import type { Run } from './store/types';

/** wa.me link with the run details and a link back to the run. */
export function whatsappShareUrl(run: Run, url: string): string {
  const route = getRoute(run.route_slug);
  const dist = route ? routeDistance(route) : null;
  const spots = run.max_people - run.going_count;
  const lines = [
    `🏃🏾 Group ${run.pace === 'walk' ? 'walk' : 'run'} at Great Ife — join us on Motion`,
    '',
    `📍 ${route?.name ?? 'Campus run'}${dist ? ` (${formatDistance(dist)})` : ''}`,
    `🗓️ ${formatLongDay(run.starts_at)}, ${formatTime(run.starts_at)}`,
    `👟 Pace: ${PACE_INFO[run.pace].label}`,
    run.meeting_note ? `🤝 Meet: ${run.meeting_note}` : '',
    run.women_only ? '💜 Women-only run' : '',
    `👥 ${run.going_count} going${spots > 0 ? `, ${spots} ${spots === 1 ? 'place' : 'places'} left` : ' — full'}`,
    '',
    url,
  ].filter((l, i, a) => l !== '' || (a[i - 1] ?? '') !== '');
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}
