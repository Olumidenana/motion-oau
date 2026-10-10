// NEXT_PUBLIC_* values are inlined at build time, so these are plain constants.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
export const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? '';

/** Demo mode: no Supabase configured, so data lives in this browser only. */
export const IS_DEMO = !(SUPABASE_URL && SUPABASE_ANON_KEY);
