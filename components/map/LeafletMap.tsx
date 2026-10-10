'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OAU_CENTRE } from '@/lib/routes';
import type { LatLngTuple } from '@/lib/geo';
import { CAMPUS_ZOOM, COLORS, SPOT_ZOOM, type AdapterProps, type MapRoute } from './types';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function boundsOf(routes: MapRoute[]): L.LatLngBounds | null {
  const pts = routes.flatMap((r) => r.path);
  return pts.length ? L.latLngBounds(pts) : null;
}

export default function LeafletMap(props: AdapterProps) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routesLayer = useRef<L.LayerGroup | null>(null);
  const draftLayer = useRef<L.LayerGroup | null>(null);
  const userMarker = useRef<L.CircleMarker | null>(null);
  const fitted = useRef(false);
  const latest = useRef(props);
  latest.current = props;

  // Create the map once.
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, {
      center: OAU_CENTRE,
      zoom: CAMPUS_ZOOM,
      // Canvas is much faster than SVG on low-end phones; tolerance widens tap targets.
      preferCanvas: true,
      renderer: L.canvas({ tolerance: 10 }),
      scrollWheelZoom: false,
      zoomControl: true,
    });
    // Standard-resolution tiles on purpose: retina tiles are 4x the data.
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, subdomains: 'abcd', maxZoom: 19, crossOrigin: true }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.on('click', (e: L.LeafletMouseEvent) => latest.current.onMapClick?.([e.latlng.lat, e.latlng.lng]));
    routesLayer.current = L.layerGroup().addTo(map);
    draftLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // The container may have been sized after mount (e.g. flex layouts).
    const t = window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Routes: dark road with a dashed yellow centreline.
  const { routes, selectedSlug, fit = 'routes' } = props;
  const selectable = !!props.onSelectRoute;
  useEffect(() => {
    const map = mapRef.current;
    const layer = routesLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const list = routes ?? [];
    for (const r of list) {
      const dim = !!selectedSlug && r.slug !== selectedSlug;
      const select = () => latest.current.onSelectRoute?.(r.slug);
      const bind = (l: L.Path) => {
        if (selectable) {
          l.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            select();
          });
          l.bindTooltip(r.name, { sticky: true });
        }
        l.addTo(layer);
      };
      if (r.kind === 'spot' || r.path.length < 2) {
        bind(
          L.circleMarker(r.path[0], {
            radius: 10,
            color: COLORS.asphalt,
            weight: 4,
            fillColor: COLORS.lane,
            fillOpacity: 1,
            opacity: dim ? 0.45 : 1,
            interactive: selectable,
          }),
        );
        continue;
      }
      bind(
        L.polyline(r.path, {
          color: COLORS.asphalt,
          weight: dim ? 7 : 10,
          opacity: dim ? 0.45 : 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: selectable,
        }),
      );
      L.polyline(r.path, {
        color: COLORS.lane,
        weight: 2,
        opacity: dim ? 0.5 : 1,
        dashArray: '7 9',
        lineCap: 'butt',
        interactive: false,
      }).addTo(layer);
      bind(
        L.circleMarker(r.path[0], {
          radius: 6,
          color: COLORS.white,
          weight: 2,
          fillColor: COLORS.forest,
          fillOpacity: 1,
          opacity: dim ? 0.5 : 1,
          interactive: selectable,
        }),
      );
    }

    if (!fitted.current) {
      fitted.current = true;
      const target = fit === 'selected' ? list.filter((r) => r.slug === selectedSlug) : fit === 'routes' ? list : [];
      const b = boundsOf(target);
      if (b && target.length === 1 && target[0].path.length === 1) map.setView(target[0].path[0], SPOT_ZOOM);
      else if (b) map.fitBounds(b, { padding: [24, 24], maxZoom: 17 });
    }
  }, [routes, selectedSlug, fit, selectable]);

  // Draft path (route recorder).
  const { draftPath } = props;
  useEffect(() => {
    const layer = draftLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (!draftPath?.length) return;
    if (draftPath.length > 1) {
      L.polyline(draftPath, { color: COLORS.white, weight: 9, opacity: 0.9, interactive: false }).addTo(layer);
      L.polyline(draftPath, { color: COLORS.draft, weight: 5, interactive: false }).addTo(layer);
    }
    const dot = (p: LatLngTuple, fill: string) =>
      L.circleMarker(p, { radius: 6, color: COLORS.white, weight: 2, fillColor: fill, fillOpacity: 1, interactive: false }).addTo(layer);
    dot(draftPath[0], COLORS.forest);
    if (draftPath.length > 1) dot(draftPath[draftPath.length - 1], COLORS.lane);
  }, [draftPath]);

  // Live position.
  const { userPosition, followUser } = props;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userPosition) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    if (!userMarker.current) {
      userMarker.current = L.circleMarker(userPosition, {
        radius: 8,
        color: COLORS.white,
        weight: 3,
        fillColor: COLORS.user,
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    } else {
      userMarker.current.setLatLng(userPosition);
    }
    if (followUser) map.panTo(userPosition, { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches });
  }, [userPosition, followUser]);

  return <div ref={el} className="map-canvas" />;
}
