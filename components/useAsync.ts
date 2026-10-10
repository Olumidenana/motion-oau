'use client';

import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { errorMessage } from '@/lib/errors';

interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

/** Run an async loader when deps change. `fn` returning undefined means "not ready yet". */
export function useAsync<T>(fn: () => Promise<T> | undefined, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const p = fn();
    if (!p) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    p.then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (e) => alive && setState((s) => ({ data: s.data, error: errorMessage(e), loading: false })),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
