import { StoreError } from './store/types';
import { MSG } from './store/messages';

export function errorMessage(e: unknown): string {
  if (e instanceof StoreError) return e.message;
  if (e instanceof TypeError && /fetch|network|load/i.test(e.message)) return MSG.offline;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return MSG.offline;
  return 'Something went wrong. Please try again.';
}
