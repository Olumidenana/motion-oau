/** User-facing messages shared by both stores (and mirrored in supabase/schema.sql). */
export const MSG = {
  signInFirst: 'Sign in first — it only takes an email address.',
  runNotFound: 'We couldn’t find that run. It may have been removed.',
  runFull: 'This run is full. Check other runs on this route, or schedule your own.',
  runCancelled: 'This run has been cancelled, so you can’t join it.',
  runOver: 'This run has already started, so you can’t join it any more.',
  hostCantLeave: 'You’re hosting this run. Cancel it instead if you can’t make it.',
  onlyHostCancels: 'Only the host can cancel this run.',
  passwordShort: 'Use a password with at least 8 characters.',
  offline: 'We couldn’t reach Motion. Check your data connection and try again.',
} as const;
