import type { LatLngTuple } from '@/lib/geo';
import type { RouteKind } from '@/lib/routes';

export interface MapRoute {
  slug: string;
  name: string;
  kind: RouteKind;
  path: LatLngTuple[];
}

/** Props shared by MapView and both adapters (Google and Leaflet). */
export interface MapViewProps {
  routes?: MapRoute[];
  /** Highlight this route; others are dimmed. */
  selectedSlug?: string | null;
  /** Makes routes tappable. */
  onSelectRoute?: (slug: string) => void;
  /** Initial view: fit every route, fit the selected route, or just show campus. */
  fit?: 'routes' | 'selected' | 'campus';
  /** A path being drawn or recorded (route recorder). */
  draftPath?: LatLngTuple[];
  /** The person's live position (route recorder). */
  userPosition?: LatLngTuple | null;
  /** Keep the map centred on userPosition. */
  followUser?: boolean;
  onMapClick?: (point: LatLngTuple) => void;
  /** Accessible label for the map region. */
  label: string;
  /** CSS height, e.g. "320px" or "50vh". */
  height?: string;
}

export interface AdapterProps extends MapViewProps {
  /** Called when the provider can't load (bad key, blocked script). MapView falls back to Leaflet. */
  onFail?: () => void;
}

export const COLORS = {
  asphalt: '#23272B',
  lane: '#F2C230',
  forest: '#1D5C3F',
  draft: '#1D5C3F',
  user: '#2B6CB0',
  white: '#FFFFFF',
};

export const CAMPUS_ZOOM = 15;
export const SPOT_ZOOM = 17;
