import type { Metadata } from 'next';
import ComingSoonList from '@/components/ComingSoonList';

export const metadata: Metadata = {
  title: 'Explore — coming soon',
  description: 'Reading spaces, ball games, trips and more are coming to Motion.',
};

export default function ExplorePage() {
  return (
    <>
      <h1>Explore</h1>
      <p className="lede">
        Running is just the start. Motion is becoming your guide to campus life at Great Ife. Tap “Notify me” on the
        ones you want and we’ll tell you when they launch.
      </p>
      <ComingSoonList />
    </>
  );
}
