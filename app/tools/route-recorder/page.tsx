import type { Metadata } from 'next';
import RouteRecorder from '@/components/RouteRecorder';

export const metadata: Metadata = {
  title: 'Route recorder',
  robots: { index: false, follow: false, nocache: true },
};

export default function RouteRecorderPage() {
  return (
    <>
      <h1>Route recorder</h1>
      <p className="lede">
        Record a real route to replace a draft one. Walk it with your phone, or tap it out on the map, then export the
        path and paste it into <code>lib/routes.ts</code>.
      </p>
      <RouteRecorder />
    </>
  );
}
