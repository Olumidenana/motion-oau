import { pathLength, type LatLngTuple } from './geo';

/**
 * Campus routes live in code, not the database, so they ship with the app and
 * load instantly on slow data.
 *
 * IMPORTANT: every path below is APPROXIMATE (traced by hand). Each route is
 * marked `verified: false`, which shows a "Draft route" badge. To replace a
 * path with a real one, record it at /tools/route-recorder, paste the exported
 * JSON array into `path`, and set `verified: true`.
 *
 * Distances are never hardcoded — they are computed from `path` with haversine.
 */

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

/** route = point A to point B, loop = ends where it starts, spot = a single place. */
export type RouteKind = 'route' | 'loop' | 'spot';

export interface CampusRoute {
  slug: string;
  name: string;
  /** Short label for chips and lists. */
  shortName: string;
  summary: string;
  kind: RouteKind;
  level: Level;
  terrain: string;
  bestTimes: string;
  startLabel: string;
  /** Route can be run there and back (distance doubled for the out-and-back option). */
  outAndBack?: boolean;
  /** Extra, route-specific safety notes. General tips are added on the route page. */
  tips?: string[];
  verified: boolean;
  /** [lat, lng] points. A spot has exactly one point. */
  path: LatLngTuple[];
}

/** Approximate centre of the OAU campus core (around the SUB). */
export const OAU_CENTRE: LatLngTuple = [7.51833, 4.52278];

export const ROUTES: CampusRoute[] = [
  {
    slug: 'road-one',
    name: 'Road One: Main Gate to SUB',
    shortName: 'Road One',
    summary:
      'The classic Great Ife run. A long, steady road from the main gate up to the Student Union Building, lined with trees most of the way.',
    kind: 'route',
    level: 'Intermediate',
    terrain: 'Tarred road with a gentle climb towards the campus core. Wide verges in places.',
    bestTimes: 'Early morning (5:45–7:30 am) or late afternoon after 5 pm',
    startLabel: 'Inside the main gate, by the security post',
    outAndBack: true,
    tips: [
      'Road One carries cars, buses and okadas. Run facing traffic and keep to the verge.',
      'Turn back before dusk if you are out alone — the stretch near the gate is darker at night.',
    ],
    verified: false,
    path: [
      [7.5015, 4.5388],
      [7.5018, 4.5385],
      [7.5042, 4.5364],
      [7.5069, 4.534],
      [7.5095, 4.5318],
      [7.512, 4.5295],
      [7.5142, 4.5275],
      [7.5161, 4.5256],
      [7.5176, 4.5242],
      [7.5188, 4.5232],
    ],
  },
  {
    slug: 'sports-centre-loop',
    name: 'Sports Centre loop',
    shortName: 'Sports Centre',
    summary:
      'A flat, friendly loop around the sports complex. Short enough to repeat, and there are usually other people about.',
    kind: 'loop',
    level: 'Beginner',
    terrain: 'Mostly flat tarred paths with a short stretch of hard-packed ground.',
    bestTimes: 'Mornings, or evenings when training sessions are on',
    startLabel: 'Sports Centre main entrance',
    verified: false,
    path: [
      [7.521, 4.5175],
      [7.5237, 4.5175],
      [7.524, 4.519],
      [7.5237, 4.5203],
      [7.521, 4.5203],
      [7.5207, 4.5189],
      [7.521, 4.5175],
    ],
  },
  {
    slug: 'motion-ground-circuit',
    name: 'Motion Ground circuit',
    shortName: 'Motion Ground',
    summary:
      'A short circuit for walkers and new runners. Do it once to warm up or stack laps for a longer session.',
    kind: 'loop',
    level: 'Beginner',
    terrain: 'Flat, open ground and paved edges. Good for walk–run intervals.',
    bestTimes: 'Any time with daylight; busiest in the evening',
    startLabel: 'Edge of Motion Ground nearest the SUB',
    verified: false,
    path: [
      [7.5165, 4.524],
      [7.5177, 4.524],
      [7.5179, 4.525],
      [7.5175, 4.5258],
      [7.5165, 4.5257],
      [7.5162, 4.5248],
      [7.5165, 4.524],
    ],
  },
  {
    slug: 'amphitheatre-steps',
    name: 'Amphitheatre steps',
    shortName: 'Amphitheatre',
    summary:
      'Not a route, a spot. Meet here for warm-ups, stretching and stair workouts before heading off on a run.',
    kind: 'spot',
    level: 'Intermediate',
    terrain: 'Concrete steps. Watch your footing when they are wet.',
    bestTimes: 'Early morning before lectures, or after 5 pm',
    startLabel: 'Bottom of the Amphitheatre steps',
    tips: ['Go up and down on the side, away from people sitting on the steps.'],
    verified: false,
    path: [[7.51915, 4.522]],
  },
  {
    slug: 'hostels-to-central',
    name: 'Hostels to central campus',
    shortName: 'Hostels run',
    summary:
      'Run in from the halls of residence to the heart of campus. A handy way to start the day before an 8 am lecture.',
    kind: 'route',
    level: 'Beginner',
    terrain: 'Tarred campus roads with footpaths. A few junctions to cross.',
    bestTimes: 'Early morning (6–7:30 am)',
    startLabel: 'Hall junction, outside the halls of residence',
    outAndBack: true,
    verified: false,
    path: [
      [7.5242, 4.5145],
      [7.5236, 4.5156],
      [7.5228, 4.5169],
      [7.5218, 4.5182],
      [7.5207, 4.5195],
      [7.5196, 4.5208],
      [7.5188, 4.5219],
    ],
  },
  {
    slug: 'staff-quarters-loop',
    name: 'Staff quarters loop',
    shortName: 'Staff quarters',
    summary:
      'A longer loop on the quieter residential roads of the staff quarters. Shady, calm and good for building distance.',
    kind: 'loop',
    level: 'Advanced',
    terrain: 'Quiet tarred residential roads with some rolling hills.',
    bestTimes: 'Weekend mornings, or weekdays before 7 am',
    startLabel: 'Staff quarters entrance',
    tips: [
      'It is quiet here, which is lovely — but it also means fewer people around. Run in a group.',
    ],
    verified: false,
    path: [
      [7.5245, 4.5045],
      [7.529, 4.504],
      [7.5335, 4.5048],
      [7.534, 4.509],
      [7.5335, 4.5135],
      [7.529, 4.514],
      [7.5245, 4.5132],
      [7.524, 4.509],
      [7.5245, 4.5045],
    ],
  },
];

export const GENERAL_SAFETY_TIPS = [
  'Run with at least one other person, and tell someone where you are going.',
  'Carry your student ID and a little cash or your phone.',
  'Ife gets hot fast. Drink water before you go and run early or late in the day.',
  'Wear something bright, especially around dawn and dusk.',
  'If you feel dizzy or unwell, stop, walk and let your group know.',
];

export function getRoute(slug: string): CampusRoute | undefined {
  return ROUTES.find((r) => r.slug === slug);
}

/** Length of one pass of the route in metres, or null for a spot. */
export function routeDistance(route: CampusRoute): number | null {
  if (route.kind === 'spot' || route.path.length < 2) return null;
  return pathLength(route.path);
}

export function routeStart(route: CampusRoute): LatLngTuple {
  return route.path[0];
}
