'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { IS_DEMO } from '@/lib/config';
import { createDemoStore } from '@/lib/store/demo';
import type { Store, Viewer } from '@/lib/store/types';

interface MotionContext {
  store: Store | null;
  viewer: Viewer | null;
  /** True once the store is loaded and we know whether someone is signed in. */
  ready: boolean;
}

const Ctx = createContext<MotionContext>({ store: null, viewer: null, ready: false });

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  // Supabase's client is only downloaded when Supabase is configured.
  storePromise ??= IS_DEMO
    ? Promise.resolve(createDemoStore())
    : import('@/lib/store/supabase').then((m) => m.createSupabaseStore());
  return storePromise;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MotionContext>({ store: null, viewer: null, ready: false });

  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};
    getStore()
      .then(async (store) => {
        const viewer = await store.getViewer().catch(() => null);
        if (!alive) return;
        setState({ store, viewer, ready: true });
        unsubscribe = store.onViewerChange((v) =>
          setState((s) => (s.viewer?.id === v?.id && s.viewer?.email === v?.email ? s : { ...s, viewer: v })),
        );
      })
      .catch(() => {
        storePromise = null;
        if (alive) setState({ store: null, viewer: null, ready: true });
      });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useMotion(): MotionContext {
  return useContext(Ctx);
}
