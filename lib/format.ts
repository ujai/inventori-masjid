/**
 * Date/time formatting helpers locked to Asia/Kuala_Lumpur.
 *
 * Never rely on the server's system timezone (Vercel runs UTC regardless of
 * the TIMEZONE env var, which is not the same as Node's TZ variable).
 *
 * Uses 24-hour format (hour12: false) — the ms-MY locale only has PG/PTG
 * (AM/PM equivalents) and does not differentiate petang vs malam. 24-hour
 * format is unambiguous and standard in Malaysian government/public systems.
 */

const TZ = 'Asia/Kuala_Lumpur';

/** "12 Mei 2026, 22:30" */
export function formatDateTimeMY(date: Date | string): string {
  return new Date(date).toLocaleString('ms-MY', {
    timeZone: TZ,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

/** "12 Mei, 22:30" (no year — for activity feeds) */
export function formatActivityTimeMY(date: Date | string): string {
  return new Date(date).toLocaleString('ms-MY', {
    timeZone: TZ,
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

/** "12 Mei 2026" (date only) */
export function formatDateMY(date: Date | string): string {
  return new Date(date).toLocaleDateString('ms-MY', {
    timeZone: TZ,
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
