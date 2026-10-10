import Link from 'next/link';
import HomeMap from '@/components/HomeMap';
import RunList from '@/components/RunList';
import RouteCard from '@/components/RouteCard';
import { ROUTES } from '@/lib/routes';
import { COMING_SOON } from '@/lib/features';

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <h1>
          Never run alone at <span className="lane">Great Ife.</span>
        </h1>
        <p className="lede">
          Find the common running routes around OAU, schedule a group run, or join one that’s already happening.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-lane" href="/runs/new">
            Schedule a run
          </Link>
          <a className="btn btn-ghost" href="#next-runs">
            See next runs
          </a>
        </div>
      </section>

      <section className="section" aria-labelledby="map-heading">
        <h2 id="map-heading" className="visually-hidden">
          Routes map
        </h2>
        <HomeMap />
      </section>

      <section className="section" id="next-runs" aria-labelledby="next-runs-heading">
        <div className="section-head">
          <h2 id="next-runs-heading">Next runs</h2>
          <Link href="/runs/new">Schedule one</Link>
        </div>
        <RunList
          limit={6}
          emptyText="No runs scheduled yet. Pick a route and start the first one — someone will join you."
          emptyCta={{ href: '/runs/new', label: 'Schedule the first run' }}
        />
      </section>

      <section className="section" aria-labelledby="routes-heading">
        <div className="section-head">
          <h2 id="routes-heading">Campus routes</h2>
        </div>
        <ul className="route-list">
          {ROUTES.map((r) => (
            <li key={r.slug}>
              <RouteCard route={r} />
            </li>
          ))}
        </ul>
        <p className="muted small" style={{ marginTop: 12 }}>
          Routes marked draft are traced roughly and may not follow the road exactly. We’re walking each one to map it
          properly.
        </p>
      </section>

      <section className="section" aria-labelledby="explore-heading">
        <div className="section-head">
          <h2 id="explore-heading">Explore more — coming soon</h2>
          <Link href="/explore">See all</Link>
        </div>
        <p className="muted">Motion is growing into a guide to campus life. Here’s what’s next:</p>
        <ul className="teaser">
          {COMING_SOON.map((f) => (
            <li key={f.slug}>
              <span aria-hidden="true">{f.icon}</span> {f.name}
            </li>
          ))}
        </ul>
        <Link className="btn btn-ghost" href="/explore">
          Get notified when they launch
        </Link>
      </section>
    </>
  );
}
