import type { Metadata } from 'next';
import MePanel from '@/components/MePanel';

export const metadata: Metadata = { title: 'Me' };

export default function MePage() {
  return (
    <>
      <h1>Me</h1>
      <MePanel />
    </>
  );
}
