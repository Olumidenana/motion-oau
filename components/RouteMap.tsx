'use client';

import { useMemo } from 'react';
import MapView from './MapView';
import { getRoute } from '@/lib/routes';

/** Map focused on one route. Client-only so the route data isn't sent twice. */
export default function RouteMap({ slug, height = 'min(50vh, 400px)' }: { slug: string; height?: string }) {
  const route = getRoute(slug);
  const routes = useMemo(() => (route ? [route] : []), [route]);
  if (!route) return null;
  return (
    <div className="map-wrap">
      <MapView label={`Map of ${route.name}`} routes={routes} selectedSlug={slug} fit="selected" height={height} />
      {!route.verified ? <span className="badge badge-draft">Draft route</span> : null}
    </div>
  );
}
