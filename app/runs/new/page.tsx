import type { Metadata } from 'next';
import { Suspense } from 'react';
import ScheduleForm from '@/components/ScheduleForm';
import { ListSkeleton } from '@/components/RunList';

export const metadata: Metadata = { title: 'Schedule a run' };

export default function NewRunPage() {
  return (
    <>
      <h1>Schedule a run</h1>
      <p className="lede">Pick a route and a time. Others can see it and join you.</p>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <ScheduleForm />
      </Suspense>
    </>
  );
}
