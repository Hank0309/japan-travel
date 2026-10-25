import { inForecast, japanDate } from './utils';
export interface Forecast {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  weather_code: number[];
}
export interface Weather {
  fetched: number;
  city: string;
  daily: Forecast;
  current?: { temperature_2m: number; weather_code: number; time: string };
  stale: boolean;
}
const memory = new Map<string, Weather>();
const failed = new Map<string, number>();
const pending = new Map<string, Promise<Weather | null>>();
const key = (city: string) => 'tabi-weather-v1-' + city;
export function description(code: number) {
  if (code === 0) return '晴朗';
  if (code <= 3) return '多雲';
  if (code <= 48) return '有霧';
  if (code <= 67) return '下雨';
  if (code <= 77) return '降雪';
  if (code <= 82) return '陣雨';
  if (code <= 86) return '陣雪';
  return '雷雨';
}
export function validateWeather(data: unknown): data is Weather {
  const w = data as Weather;
  const d = w?.daily;
  return (
    !!w &&
    Number.isFinite(w.fetched) &&
    (!w.current ||
      (Number.isFinite(w.current.temperature_2m) &&
        Number.isFinite(w.current.weather_code) &&
        typeof w.current.time === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(w.current.time))) &&
    !!d &&
    Array.isArray(d.time) &&
    d.time.length <= 16 &&
    d.time.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t)) &&
    [
      d.temperature_2m_max,
      d.temperature_2m_min,
      d.precipitation_probability_max,
      d.weather_code,
    ].every(
      (a) =>
        Array.isArray(a) &&
        a.length === d.time.length &&
        a.every((n) => n === null || Number.isFinite(n)),
    )
  );
}
export async function getWeather(
  city: string,
  date: string,
): Promise<Weather | null> {
  if (!inForecast(date)) return null;
  if (!['京都', '大阪'].includes(city)) return null;
  const active = pending.get(city);
  if (active) return active;
  const request = loadWeather(city);
  pending.set(city, request);
  try {
    return await request;
  } finally {
    pending.delete(city);
  }
}
async function loadWeather(city: string): Promise<Weather | null> {
  let cached = memory.get(city);
  if (
    cached &&
    (Date.now() - cached.fetched >= 86400000 || cached.fetched > Date.now())
  ) {
    memory.delete(city);
    cached = undefined;
  }
  if (!cached) {
    try {
      const raw = localStorage.getItem(key(city));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          validateWeather(parsed) &&
          parsed.fetched <= Date.now() &&
          Date.now() - parsed.fetched < 86400000
        )
          cached = parsed;
        else localStorage.removeItem(key(city));
      }
    } catch {
      /* Storage unavailable: proceed with network. */
    }
  }
  if (cached && Date.now() - cached.fetched < 1800000) {
    return { ...cached, stale: !navigator.onLine };
  }
  if (!navigator.onLine || (failed.get(city) ?? 0) > Date.now() - 300000) {
    return cached ? { ...cached, stale: true } : null;
  }
  const [latitude, longitude] =
    city === '京都' ? [35.0116, 135.7681] : [34.6937, 135.5023];
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code',
    daily:
      'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    timezone: 'Asia/Tokyo',
    forecast_days: '16',
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?' + params,
      { signal: controller.signal, cache: 'no-store' },
    );
    if (!res.ok) throw new Error('Weather HTTP ' + res.status);
    const data = await res.json();
    const result: Weather = {
      city,
      fetched: Date.now(),
      daily: data.daily,
      current: data.current,
      stale: false,
    };
    if (!validateWeather(result)) throw new Error('Weather invalid schema');
    memory.set(city, result);
    try {
      localStorage.setItem(key(city), JSON.stringify(result));
    } catch {
      /* Memory cache remains usable. */
    }
    return result;
  } catch {
    failed.set(city, Date.now());
    return cached ? { ...cached, stale: true } : null;
  } finally {
    clearTimeout(timer);
  }
}
export function currentAllowed(w: Weather, date: string) {
  const age = Date.now() - w.fetched;
  const time = w.current?.time ?? '';
  const observed = Date.parse(
    time + (time.length === 16 ? ':00' : '') + '+09:00',
  );
  return (
    !w.stale &&
    age >= 0 &&
    age < 1800000 &&
    Date.now() - observed >= -300000 &&
    Date.now() - observed < 3600000 &&
    date === japanDate() &&
    w.current?.time?.slice(0, 10) === japanDate()
  );
}
