'use client';

import { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '@/lib/config';
import { OAU_CENTRE } from '@/lib/routes';
import type { LatLngTuple } from '@/lib/geo';
import { CAMPUS_ZOOM, COLORS, SPOT_ZOOM, type AdapterProps } from './types';

const CALLBACK = '__motionGoogleMapsReady';
const AUTH_FAILURE_EVENT = 'motion:google-maps-auth-failure';
let loader: Promise<void> | null = null;

/** Load the Maps JS API by hand (no wrapper library), once per page. */
function loadGoogleMaps(): Promise<void> {
  if (typeof google !== 'undefined' && typeof google.maps?.importLibrary === 'function') return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w[CALLBACK] = () => resolve();
    // Google calls this when the key is invalid, restricted or billing is off.
    w.gm_authFailure = () => window.dispatchEvent(new Event(AUTH_FAILURE_EVENT));
    const params = new URLSearchParams({ key: GOOGLE_MAPS_API_KEY, v: 'weekly', loading: 'async', callback: CALLBACK });
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    s.async = true;
    s.onerror = () => {
      loader = null;
      s.remove();
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(s);
  });
  return loader;
}

const ll = (p: LatLngTuple): google.maps.LatLngLiteral => ({ lat: p[0], lng: p[1] });

interface Dot {
  setPosition(p: LatLngTuple): void;
  remove(): void;
}

interface Libs {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary | null;
}

/** A round dot. Advanced markers need a map ID; without one, a classic marker with a circle symbol. */
function makeDot(
  libs: Libs,
  map: google.maps.Map,
  p: LatLngTuple,
  o: { fill: string; stroke: string; size: number; strokeWidth?: number; opacity?: number; title?: string; onClick?: () => void; z?: number },
): Dot {
  const sw = o.strokeWidth ?? 2;
  if (libs.marker && GOOGLE_MAPS_MAP_ID) {
    const el = document.createElement('div');
    el.style.cssText = `width:${o.size}px;height:${o.size}px;border-radius:50%;background:${o.fill};border:${sw}px solid ${o.stroke};box-sizing:border-box;opacity:${o.opacity ?? 1};transform:translateY(50%)`;
    const m = new libs.marker.AdvancedMarkerElement({ map, position: ll(p), content: el, title: o.title, zIndex: o.z });
    if (o.onClick) m.addListener('click', o.onClick);
    return {
      setPosition: (q) => (m.position = ll(q)),
      remove: () => (m.map = null),
    };
  }
  const m = new google.maps.Marker({
    map,
    position: ll(p),
    title: o.title,
    clickable: !!o.onClick,
    zIndex: o.z,
    opacity: o.opacity ?? 1,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: o.size / 2,
      fillColor: o.fill,
      fillOpacity: 1,
      strokeColor: o.stroke,
      strokeWeight: sw,
    },
  });
  if (o.onClick) m.addListener('click', o.onClick);
  return { setPosition: (q) => m.setPosition(ll(q)), remove: () => m.setMap(null) };
}

type Removable = { setMap(m: null): void } | Dot;
const clear = (items: Removable[]) => {
  for (const i of items) 'remove' in i ? i.remove() : i.setMap(null);
  items.length = 0;
};

export default function GoogleMap(props: AdapterProps) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const libsRef = useRef<Libs | null>(null);
  const routeItems = useRef<Removable[]>([]);
  const draftItems = useRef<Removable[]>([]);
  const userDot = useRef<Dot | null>(null);
  const fitted = useRef(false);
  const latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const onAuthFail = () => latest.current.onFail?.();
    window.addEventListener(AUTH_FAILURE_EVENT, onAuthFail);
    (async () => {
      try {
        await loadGoogleMaps();
        const maps = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
        const marker = GOOGLE_MAPS_MAP_ID
          ? ((await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary)
          : null;
        if (!alive || !el.current) return;
        libsRef.current = { maps, marker };
        const map = new maps.Map(el.current, {
          center: ll(OAU_CENTRE),
          zoom: CAMPUS_ZOOM,
          mapId: GOOGLE_MAPS_MAP_ID || undefined,
          // One finger scrolls the page, two fingers move the map — except in the recorder.
          gestureHandling: latest.current.onMapClick ? 'greedy' : 'cooperative',
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: GOOGLE_MAPS_MAP_ID
            ? undefined
            : [
                { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
                { featureType: 'transit', stylers: [{ visibility: 'off' }] },
              ],
        });
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) latest.current.onMapClick?.([e.latLng.lat(), e.latLng.lng()]);
        });
        mapRef.current = map;
        setReady(true);
      } catch {
        if (alive) latest.current.onFail?.();
      }
    })();
    return () => {
      alive = false;
      window.removeEventListener(AUTH_FAILURE_EVENT, onAuthFail);
      clear(routeItems.current);
      clear(draftItems.current);
      userDot.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Routes: dark road with a dashed yellow centreline.
  const { routes, selectedSlug, fit = 'routes' } = props;
  const selectable = !!props.onSelectRoute;
  useEffect(() => {
    const map = mapRef.current;
    const libs = libsRef.current;
    if (!ready || !map || !libs) return;
    clear(routeItems.current);
    const list = routes ?? [];
    for (const r of list) {
      const dim = !!selectedSlug && r.slug !== selectedSlug;
      const onClick = selectable ? () => latest.current.onSelectRoute?.(r.slug) : undefined;
      if (r.kind === 'spot' || r.path.length < 2) {
        routeItems.current.push(
          makeDot(libs, map, r.path[0], { fill: COLORS.lane, stroke: COLORS.asphalt, size: 20, strokeWidth: 4, opacity: dim ? 0.45 : 1, title: r.name, onClick, z: 3 }),
        );
        continue;
      }
      const path = r.path.map(ll);
      const road = new libs.maps.Polyline({
        map,
        path,
        strokeColor: COLORS.asphalt,
        strokeOpacity: dim ? 0.45 : 0.95,
        strokeWeight: dim ? 7 : 10,
        clickable: selectable,
        zIndex: dim ? 1 : 2,
      });
      if (onClick) road.addListener('click', onClick);
      const centreline = new libs.maps.Polyline({
        map,
        path,
        strokeOpacity: 0,
        clickable: false,
        zIndex: dim ? 1 : 2,
        icons: [
          {
            icon: { path: 'M 0,-1 0,1', strokeOpacity: dim ? 0.5 : 1, strokeColor: COLORS.lane, strokeWeight: 2, scale: 2 },
            offset: '0',
            repeat: '14px',
          },
        ],
      });
      routeItems.current.push(
        road,
        centreline,
        makeDot(libs, map, r.path[0], { fill: COLORS.forest, stroke: COLORS.white, size: 12, opacity: dim ? 0.5 : 1, title: `${r.name} — start`, onClick, z: 3 }),
      );
    }

    if (!fitted.current) {
      fitted.current = true;
      const target = fit === 'selected' ? list.filter((r) => r.slug === selectedSlug) : fit === 'routes' ? list : [];
      const pts = target.flatMap((r) => r.path);
      if (pts.length === 1) {
        map.setCenter(ll(pts[0]));
        map.setZoom(SPOT_ZOOM);
      } else if (pts.length > 1) {
        const b = new google.maps.LatLngBounds();
        pts.forEach((p) => b.extend(ll(p)));
        map.fitBounds(b, 24);
        google.maps.event.addListenerOnce(map, 'idle', () => {
          if ((map.getZoom() ?? 0) > 17) map.setZoom(17);
        });
      }
    }
  }, [ready, routes, selectedSlug, fit, selectable]);

  // Draft path (route recorder).
  const { draftPath } = props;
  useEffect(() => {
    const map = mapRef.current;
    const libs = libsRef.current;
    if (!ready || !map || !libs) return;
    clear(draftItems.current);
    if (!draftPath?.length) return;
    if (draftPath.length > 1) {
      const path = draftPath.map(ll);
      draftItems.current.push(
        new libs.maps.Polyline({ map, path, strokeColor: COLORS.white, strokeWeight: 9, strokeOpacity: 0.9, clickable: false, zIndex: 4 }),
        new libs.maps.Polyline({ map, path, strokeColor: COLORS.draft, strokeWeight: 5, strokeOpacity: 1, clickable: false, zIndex: 5 }),
      );
    }
    draftItems.current.push(makeDot(libs, map, draftPath[0], { fill: COLORS.forest, stroke: COLORS.white, size: 12, z: 6 }));
    if (draftPath.length > 1) {
      draftItems.current.push(makeDot(libs, map, draftPath[draftPath.length - 1], { fill: COLORS.lane, stroke: COLORS.white, size: 12, z: 6 }));
    }
  }, [ready, draftPath]);

  // Live position.
  const { userPosition, followUser } = props;
  useEffect(() => {
    const map = mapRef.current;
    const libs = libsRef.current;
    if (!ready || !map || !libs) return;
    if (!userPosition) {
      userDot.current?.remove();
      userDot.current = null;
      return;
    }
    if (!userDot.current) {
      userDot.current = makeDot(libs, map, userPosition, { fill: COLORS.user, stroke: COLORS.white, size: 16, strokeWidth: 3, z: 7 });
    } else {
      userDot.current.setPosition(userPosition);
    }
    if (followUser) map.panTo(ll(userPosition));
  }, [ready, userPosition, followUser]);

  return <div ref={el} className="map-canvas" />;
}
