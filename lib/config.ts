// NEXT_PUBLIC_* values are inlined at build time, so these are plain constants.
export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};
/** Optional: point the app at local Firebase emulators, e.g. "127.0.0.1". */
export const FIREBASE_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? '';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
export const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? '';

/**
 * Which backend to use. Firebase wins if configured, then Supabase.
 * With neither, the app runs in demo mode (data stays in this browser).
 */
export const BACKEND: 'firebase' | 'supabase' | 'demo' =
  FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId
    ? 'firebase'
    : SUPABASE_URL && SUPABASE_ANON_KEY
      ? 'supabase'
      : 'demo';

export const IS_DEMO = BACKEND === 'demo';
