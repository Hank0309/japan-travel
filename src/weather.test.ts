import { it, expect, vi, afterEach } from 'vitest';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});
const daily = {
  time: ['2026-10-31'],
  temperature_2m_max: [23],
  temperature_2m_min: [13],
  precipitation_probability_max: [60],
  weather_code: [61],
};
async function env() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-31T01:00Z'));
  const storage = new Map<string, string>();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  });
  return import('./weather');
}
it('並行只呼叫一次 API，30 分鐘內不重取', async () => {
  const { getWeather } = await env();
  const fetcher = vi.fn(async () => ({
    ok: true,
    json: async () => ({ daily }),
  }));
  vi.stubGlobal('fetch', fetcher);
  const result = await Promise.all([
    getWeather('京都', '2026-10-31'),
    getWeather('京都', '2026-10-31'),
  ]);
  expect(result.every(Boolean)).toBe(true);
  await getWeather('京都', '2026-10-31');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('無效天氣回應安全失敗並限制失敗重試', async () => {
  const { getWeather } = await env();
  const fetcher = vi.fn(async () => ({
    ok: true,
    json: async () => ({ daily, current: { time: 4 } }),
  }));
  vi.stubGlobal('fetch', fetcher);
  expect(await getWeather('京都', '2026-10-31')).toBeNull();
  expect(await getWeather('京都', '2026-10-31')).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('離線資料標示 stale，超過 24 小時不再顯示過期記憶快取', async () => {
  const { getWeather } = await env();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ daily }) })),
  );
  expect((await getWeather('大阪', '2026-10-31'))?.stale).toBe(false);
  vi.stubGlobal('navigator', { onLine: false });
  expect((await getWeather('大阪', '2026-10-31'))?.stale).toBe(true);
  vi.setSystemTime(new Date('2026-11-01T02:00Z'));
  expect(await getWeather('大阪', '2026-11-01')).toBeNull();
});
it('超過預報範圍與非行程城市完全不呼叫 API', async () => {
  const { getWeather } = await env();
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  expect(await getWeather('京都', '2026-12-31')).toBeNull();
  expect(await getWeather('其他', '2026-10-31')).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});
it('目前氣溫排除過期取得時間、舊觀測與跨日資料', async () => {
  const { currentAllowed } = await env();
  const weather = {
    city: '京都',
    fetched: Date.now(),
    daily,
    stale: false,
    current: { temperature_2m: 20, weather_code: 3, time: '2026-10-31T10:00' },
  };
  expect(currentAllowed(weather, '2026-10-31')).toBe(true);
  expect(
    currentAllowed({ ...weather, fetched: Date.now() - 1800000 }, '2026-10-31'),
  ).toBe(false);
  expect(
    currentAllowed(
      { ...weather, current: { ...weather.current, time: '2026-10-31T08:00' } },
      '2026-10-31',
    ),
  ).toBe(false);
  expect(currentAllowed(weather, '2026-11-01')).toBe(false);
});
