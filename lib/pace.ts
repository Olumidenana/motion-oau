export const PACES = ['walk', 'easy', 'steady', 'fast'] as const;
export type Pace = (typeof PACES)[number];

export const PACE_INFO: Record<Pace, { label: string; hint: string }> = {
  walk: { label: 'Walk', hint: 'Brisk walk, chatting the whole way' },
  easy: { label: 'Easy', hint: 'Relaxed jog, about 7+ min per km' },
  steady: { label: 'Steady', hint: 'Comfortably hard, about 5:30–7 min per km' },
  fast: { label: 'Fast', hint: 'Pushing it, under 5:30 min per km' },
};

export function isPace(v: string): v is Pace {
  return (PACES as readonly string[]).includes(v);
}
