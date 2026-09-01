export interface DateSuffixes {
  readonly just: string;
  readonly min: string;
  readonly hour: string;
  readonly day: string;
  readonly month?: string;
}

const MINUTE = 60_000;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

function parseDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime()) || typeof value !== "string") return date;
  return new Date(value.replaceAll("-", "/"));
}

export function differenceInDays(value: string | number | Date, now: Date = new Date()): number {
  return Math.trunc((now.getTime() - parseDate(value).getTime()) / DAY);
}

export function formatRelativeDate(
  value: string | number | Date,
  suffixes: DateSuffixes,
  now: Date = new Date(),
  exactAfterDays = 7,
): string {
  const date = parseDate(value);
  const difference = Math.max(0, now.getTime() - date.getTime());
  if (difference >= DAY * exactAfterDays) return date.toLocaleDateString();
  if (difference >= DAY) return `${Math.trunc(difference / DAY)}${suffixes.day}`;
  if (difference >= HOUR) return `${Math.trunc(difference / HOUR)} ${suffixes.hour}`;
  if (difference >= MINUTE) return `${Math.trunc(difference / MINUTE)} ${suffixes.min}`;
  return suffixes.just;
}

export function formatExactRelativeDate(
  value: string | number | Date,
  suffixes: DateSuffixes,
  now: Date = new Date(),
): string {
  const date = parseDate(value);
  const difference = Math.max(0, now.getTime() - date.getTime());
  if (difference >= DAY * 30) return date.toLocaleDateString().replaceAll("/", "-");
  if (difference >= DAY) return `${Math.trunc(difference / DAY)} ${suffixes.day}`;
  if (difference >= HOUR) return `${Math.trunc(difference / HOUR)} ${suffixes.hour}`;
  if (difference >= MINUTE) return `${Math.trunc(difference / MINUTE)} ${suffixes.min}`;
  return suffixes.just;
}
