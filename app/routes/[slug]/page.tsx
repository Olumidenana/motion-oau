import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RouteMap from '@/components/RouteMap';
import RunList from '@/components/RunList';
import { GENERAL_SAFETY_TIPS, ROUTES, getRoute, routeDistance } from '@/lib/routes';
import { formatDistance } from '@/lib/geo';

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return ROUTES.map((r) => ({ slug: r.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const route = getRoute((await params).slug);
  return route ? { title: route.name, description: route.summary } : {};
}

export default async function RoutePage({ params }: { params: Params }) {
  const route = getRoute((await params).slug);
  if (!route) notFound();
  const d = routeDistance(route);
  const scheduleHref = `/runs/new?route=${route.slug}`;

  return (
    <>
      <Link href="/" className="back-link">
        ← All routes
      </Link>
      <div className="badges">
        <span className="badge">{route.level}</span>
        {route.kind === 'spot' ? <span className="badge">Meeting spot</span> : null}
        {!route.verified ? (
          <span className="badge badge-draft" title="Coordinates are approximate">
            Draft route
          </span>
        ) : null}
      </div>
      <h1>{route.name}</h1>
      <p className="lede">{route.summary}</p>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div>
          <RouteMap slug={route.slug} />
          {!route.verified ? (
            <p className="muted small" style={{ marginTop: 8 }}>
              Draft route: the line is traced roughly and may not follow the road exactly. Follow the road, not the map.
            </p>
          ) : null}

          <dl className="facts">
            <div className="fact">
              <dt>Distance</dt>
              <dd>
                {d === null ? 'A spot, not a route' : route.kind === 'loop' ? `${formatDistance(d)} per lap` : formatDistance(d)}
              </dd>
            </div>
            {d !== null && route.outAndBack ? (
              <div className="fact">
                <dt>Out and back</dt>
                <dd>{formatDistance(d * 2)}</dd>
              </div>
            ) : (
              <div className="fact">
                <dt>Level</dt>
                <dd>{route.level}</dd>
              </div>
            )}
          </dl>

          <div className="card">
            <dl className="detail-list">
              <dt style={{ marginTop: 0 }}>Start point</dt>
              <dd>{route.startLabel}</dd>
              <dt>Terrain</dt>
              <dd>{route.terrain}</dd>
              <dt>Best times</dt>
              <dd>{route.bestTimes}</dd>
            </dl>
          </div>
        </div>

        <div>
          <section aria-labelledby="upcoming-heading">
            <div className="section-head">
              <h2 id="upcoming-heading">Upcoming runs</h2>
            </div>
            <RunList
              routeSlug={route.slug}
              showRoute={false}
              emptyText="No runs scheduled on this route yet — schedule the first one."
            />
            <Link className="btn btn-lane btn-block" href={scheduleHref} style={{ marginTop: 12 }}>
              Schedule a run here
            </Link>
          </section>

          <section className="section card" aria-labelledby="safety-heading">
            <h2 id="safety-heading">Safety tips</h2>
            <ul className="tips">
              {[...(route.tips ?? []), ...GENERAL_SAFETY_TIPS].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
