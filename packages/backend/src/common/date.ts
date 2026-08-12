export function assertTimeZone(timeZone: string): void {
  new Intl.DateTimeFormat('en-US', { timeZone }).format();
}

export function currentDateInZone(timeZone = process.env.DAILY_TIME_ZONE ?? 'UTC'): string {
  assertTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
