import type { Metadata } from 'next';
import { Suspense } from 'react';
import RunDetail from '@/components/RunDetail';
import { ListSkeleton } from '@/components/RunList';

export const metadata: Metadata = { title: 'Group run' };

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <RunDetail id={id} />
    </Suspense>
  );
}
