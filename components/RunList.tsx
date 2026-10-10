'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMotion } from './StoreProvider';
import { useAsync } from './useAsync';
import RunCard from './RunCard';

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <p>{message}</p>
      <button type="button" className="btn btn-small btn-ghost" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

interface Props {
  routeSlug?: string;
  limit?: number;
  emptyText: ReactNode;
  emptyCta?: { href: string; label: string };
  showRoute?: boolean;
}

export default function RunList({ routeSlug, limit, emptyText, emptyCta, showRoute = true }: Props) {
  const { store, viewer } = useMotion();
  const { data, error, loading, reload } = useAsync(
    () => store?.listRuns({ routeSlug, limit }),
    [store, viewer?.id, routeSlug, limit],
  );

  if (error && !data) return <LoadError message={error} onRetry={reload} />;
  if (!data) return <ListSkeleton rows={limit ? Math.min(limit, 3) : 3} />;
  if (!data.length) {
    return (
      <div className="empty">
        <p>{emptyText}</p>
        {emptyCta ? (
          <Link className="btn btn-lane" href={emptyCta.href}>
            {emptyCta.label}
          </Link>
        ) : null}
      </div>
    );
  }
  return (
    <ul className="run-list" aria-busy={loading}>
      {data.map((run) => (
        <li key={run.id}>
          <RunCard run={run} showRoute={showRoute} />
        </li>
      ))}
    </ul>
  );
}
