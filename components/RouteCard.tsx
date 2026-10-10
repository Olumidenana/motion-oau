import Link from 'next/link';
import { routeDistance, type CampusRoute } from '@/lib/routes';
import { formatDistance } from '@/lib/geo';

export function routeDistanceLabel(route: CampusRoute): string {
  const d = routeDistance(route);
  if (d === null) return 'Meeting spot';
  if (route.kind === 'loop') return `${formatDistance(d)} loop`;
  return route.outAndBack ? `${formatDistance(d)} one way` : formatDistance(d);
}

export default function RouteCard({ route }: { route: CampusRoute }) {
  return (
    <Link href={`/routes/${route.slug}`} className="route-card">
      <div className="road" aria-hidden="true" />
      <h3>{route.name}</h3>
      <div className="route-meta">
        <span>
          <strong>{routeDistanceLabel(route)}</strong>
        </span>
        <span>{route.level}</span>
        {!route.verified ? <span>Draft route</span> : null}
      </div>
      <p>{route.summary}</p>
    </Link>
  );
}
