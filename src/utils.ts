import type { Stop } from './model';
export const japanDate = (date = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
export const japanTime = (date = new Date()) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
export const weekday = (date: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short',
  }).format(new Date(date + 'T12:00:00+09:00'));
export const fmt = (n: number) =>
  new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(n);
export function maps(
  s: Pick<Stop, 'name' | 'address' | 'to' | 'from' | 'mode' | 'navigation'>,
) {
  if (s.navigation === 'place')
    return (
      'https://www.google.com/maps/search/?' +
      new URLSearchParams({ api: '1', query: s.to || s.address || s.name })
    );
  const q = new URLSearchParams({
    api: '1',
    destination: s.to || s.address || s.name,
    travelmode: s.mode ?? 'walking',
  });
  if (s.from) q.set('origin', s.from);
  return 'https://www.google.com/maps/dir/?' + q.toString();
}
export function nextStop(stops: Stop[], date: string, now = new Date()) {
  if (date !== japanDate(now)) return undefined;
  return stops
    .filter((s) => s.time && s.time >= japanTime(now))
    .sort((a, b) => a.time.localeCompare(b.time))[0];
}
export function inForecast(date: string, today = japanDate()) {
  const delta = (Date.parse(date) - Date.parse(today)) / 86400000;
  return delta >= 0 && delta < 16;
}
