/** The wider campus-life platform. Each one has a "Notify me" waitlist. */
export interface ComingSoon {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export const COMING_SOON: ComingSoon[] = [
  { slug: 'reading-spaces', name: 'Reading spaces', icon: '📚', description: 'See which lecture theatres and reading rooms are full before you walk over.' },
  { slug: 'skating', name: 'Skating', icon: '🛼', description: 'Find smooth stretches of road and people to skate with.' },
  { slug: 'biking', name: 'Biking', icon: '🚲', description: 'Group rides around campus and out towards Ife town.' },
  { slug: 'swimming', name: 'Swimming', icon: '🏊', description: 'Pool times, swim buddies and beginner sessions.' },
  { slug: 'ball-games', name: 'Ball games', icon: '⚽', description: 'Pickup football and basketball — find a game or fill a team.' },
  { slug: 'hangouts', name: 'Hangouts', icon: '🧃', description: 'Low-key meetups: study breaks, games, food spots.' },
  { slug: 'nights-out', name: 'Nights out', icon: '🌙', description: 'Events and nights out, with safe ways to get there and back.' },
  { slug: 'trips', name: 'Trips & explore', icon: '🧭', description: 'Weekend trips around Ife and beyond, with local guides.' },
  { slug: 'campus-game', name: 'Campus life game', icon: '🎲', description: 'Meet people, earn points and get to know who’s who at Great Ife.' },
];
