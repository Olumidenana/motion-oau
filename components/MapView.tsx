'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { GOOGLE_MAPS_API_KEY } from '@/lib/config';
import type { AdapterProps, MapViewProps } from './map/types';

type Provider = 'google' | 'leaflet';

/**
 * One map component, two adapters. Uses Google Maps when
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set, otherwise Leaflet + CARTO tiles.
 * The adapter code is only downloaded once the map scrolls into view.
 */
export default function MapView(props: MapViewProps) {
  const { label, height = '320px' } = props;
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [provider, setProvider] = useState<Provider>(GOOGLE_MAPS_API_KEY ? 'google' : 'leaflet');
  const [loaded, setLoaded] = useState<{ provider: Provider; Comp: ComponentType<AdapterProps> } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setFailed(false);
    const load = provider === 'google' ? import('./map/GoogleMap') : import('./map/LeafletMap');
    load.then(
      (m) => alive && setLoaded({ provider, Comp: m.default }),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [visible, provider, attempt]);

  const Adapter = loaded?.provider === provider ? loaded.Comp : null;

  return (
    <div className="map" style={{ height }} ref={box} role="region" aria-label={label}>
      {Adapter && !failed ? (
        <Adapter
          key={provider}
          {...props}
          onFail={provider === 'google' ? () => setProvider('leaflet') : () => setFailed(true)}
        />
      ) : null}
      {!Adapter && !failed ? (
        <div className="map-placeholder" aria-hidden="true">
          <span>Loading map…</span>
        </div>
      ) : null}
      {failed ? (
        <div className="map-placeholder">
          <p>The map couldn’t load. Check your data connection.</p>
          <button type="button" className="btn btn-small" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
