export const WEEKDAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
export const WEEKDAY_NAMES_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
export const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

/** YYYY-MM-DD, immer auf Basis der lokalen Zeitzone – Datumsangaben sind Kalendertage ohne Uhrzeit. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Montag = 0 ... Sonntag = 6 */
export function isoWeekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function weekdayOfDateKey(key: string): number {
  return isoWeekdayIndex(parseDateKey(key));
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addDaysToKey(key: string, days: number): string {
  return dateKey(addDays(parseDateKey(key), days));
}

export function startOfWeek(d: Date): Date {
  return addDays(d, -isoWeekdayIndex(d));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function formatGermanDate(key: string): string {
  const d = parseDateKey(key);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export function formatGermanDateLong(key: string): string {
  const d = parseDateKey(key);
  return `${WEEKDAY_NAMES[isoWeekdayIndex(d)]}, ${formatGermanDate(key)}`;
}

export function isoWeekNumber(d: Date): number {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = isoWeekdayIndex(date);
  date.setDate(date.getDate() - day + 3); // Donnerstag der aktuellen Woche
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const diffDays = Math.round((date.getTime() - firstThursday.getTime()) / 86400000);
  return 1 + Math.round((diffDays - isoWeekdayIndex(firstThursday) + 3) / 7);
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, total));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}
