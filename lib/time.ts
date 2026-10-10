/** All times in Motion are shown in Lagos time (WAT, UTC+1, no daylight saving). */
export const TZ = 'Africa/Lagos';
const LAGOS_OFFSET = '+01:00';

const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const longDayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
const ymdFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const hmFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });

/** YYYY-MM-DD for a date in Lagos. */
export function lagosYmd(d: Date): string {
  return ymdFmt.format(d);
}

/** HH:MM (24h) for a date in Lagos. */
export function lagosHm(d: Date): string {
  return hmFmt.format(d);
}

/** Turn a Lagos date + time from form inputs into an ISO timestamp. */
export function lagosToIso(ymd: string, hm: string): string {
  return new Date(`${ymd}T${hm}:00${LAGOS_OFFSET}`).toISOString();
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso)).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toLowerCase()}`);
}

/** "Today", "Tomorrow" or "Sat 12 Oct". */
export function formatDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const ymd = lagosYmd(d);
  if (ymd === lagosYmd(now)) return 'Today';
  if (ymd === lagosYmd(new Date(now.getTime() + 86_400_000))) return 'Tomorrow';
  return dayFmt.format(d);
}

export function formatLongDay(iso: string): string {
  return longDayFmt.format(new Date(iso));
}

/** "Tomorrow · 6:00 am" */
export function formatWhen(iso: string): string {
  return `${formatDay(iso)} · ${formatTime(iso)}`;
}
