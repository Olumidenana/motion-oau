/** A point as [latitude, longitude] — the format used by lib/routes.ts and the recorder export. */
export type LatLngTuple = [number, number];

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in metres. */
export function haversine(a: LatLngTuple, b: LatLngTuple): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length of a path, in metres. */
export function pathLength(path: LatLngTuple[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += haversine(path[i - 1], path[i]);
  return total;
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Round to 5 decimal places (~1 m), which is plenty for a running route. */
export function roundPoint(p: LatLngTuple): LatLngTuple {
  return [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];
}
