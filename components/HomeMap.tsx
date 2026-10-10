'use client';

import Link from 'next/link';
import { useState } from 'react';
import MapView from './MapView';
import { ROUTES, getRoute } from '@/lib/routes';
import { routeDistanceLabel } from './RouteCard';

export default function HomeMap() {
  const [selected, setSelected] = useState<string | null>(null);
  const route = selected ? getRoute(selected) : undefined;
  return (
    <div>
      <div className="map-wrap">
        <MapView
          label="Map of running routes on the OAU campus"
          routes={ROUTES}
          selectedSlug={selected}
          onSelectRoute={setSelected}
          fit="routes"
          height="min(56vh, 440px)"
        />
        <span className="badge badge-draft">Draft routes</span>
      </div>
      <div className="map-pick" aria-live="polite">
        {route ? (
          <>
            <p>
              <strong>{route.name}</strong>
              <br />
              <span className="muted small">
                {routeDistanceLabel(route)} · {route.level}
              </span>
            </p>
            <Link className="btn btn-small" href={`/routes/${route.slug}`}>
              View route
            </Link>
          </>
        ) : (
          <p className="muted small">Tap a route on the map to see its name, or pick one from the list below.</p>
        )}
      </div>
    </div>
  );
}
