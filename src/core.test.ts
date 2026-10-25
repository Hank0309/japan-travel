import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import {
  db,
  backup,
  importBackup,
  parseBackup,
  saveExpense,
  savePrivateInfo,
  serializeBackup,
  deleteExpense,
  toCSV,
  defaults,
} from './db';
import { days, sources, guides } from './data';
import {
  japanDate,
  japanTime,
  nextStop,
  maps,
  inForecast,
  weekday,
} from './utils';
import { description, validateWeather } from './weather';
const expense = {
  id: 'one',
  date: '2026-11-01',
  title: '抹茶',
  category: '餐飲',
  jpy: 600,
  rate: 0.22,
  updated: '2026-10-25T12:00:00Z',
};
beforeEach(async () => {
  await Promise.all([
    db.expenses.clear(),
    db.settings.clear(),
    db.edits.clear(),
    db.orders.clear(),
    db.privateInfo.clear(),
  ]);
});
describe('帳本可靠性', () => {
  it('備份上限依 UTF-8 位元組計算，避免中文字繞過限制', () => {
    expect(() => parseBackup('旅'.repeat(1_700_000))).toThrow('5 MB');
  });
  it('拒絕空白名稱、舊備份空白名稱可保留內容並還原', async () => {
    await expect(
      savePrivateInfo({ id: 'p', label: '   ', value: '保留內容' }),
    ).rejects.toThrow();
    const old = await backup();
    old.privateInfo = [{ id: 'p', label: '', value: '保留內容' }];
    await importBackup(JSON.stringify(old));
    expect((await db.privateInfo.get('p'))?.label).toBe('未命名私人資料');
    const exported = serializeBackup(await backup());
    await db.privateInfo.clear();
    await importBackup(exported);
    expect((await db.privateInfo.get('p'))?.value).toBe('保留內容');
  });
  it('超過可備份筆數時回滾，不產生無法還原的資料', async () => {
    await db.privateInfo.bulkPut(
      Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        label: '備註',
        value: '',
      })),
    );
    await expect(
      savePrivateInfo({ id: 'overflow', label: '超量', value: '' }),
    ).rejects.toThrow();
    expect(await db.privateInfo.count()).toBe(100);
    expect(await db.privateInfo.get('overflow')).toBeUndefined();
  });
  it('匯入合併後也檢查筆數，失敗整批回滾', async () => {
    const incoming = await backup();
    incoming.privateInfo = [{ id: 'extra', label: '匯入', value: '' }];
    await db.privateInfo.bulkPut(
      Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        label: '備註',
        value: '',
      })),
    );
    await expect(importBackup(JSON.stringify(incoming))).rejects.toThrow();
    expect(await db.privateInfo.count()).toBe(100);
  });
  it('拒絕跨分頁舊版本更新與刪除，也不復活已刪除消費', async () => {
    await saveExpense(expense);
    const changed = { ...expense, jpy: 900 };
    await saveExpense(changed, expense);
    await expect(
      saveExpense({ ...expense, jpy: 700 }, expense),
    ).rejects.toThrow('其他分頁');
    await expect(deleteExpense(expense)).rejects.toThrow('其他分頁');
    await deleteExpense(changed);
    await expect(saveExpense(expense, changed)).rejects.toThrow('其他分頁');
    expect(await db.expenses.count()).toBe(0);
  });
  it('新增、修改、刪除與資料庫重開', async () => {
    await saveExpense(expense);
    db.close();
    await db.open();
    expect(await db.expenses.get('one')).toEqual(expense);
    await saveExpense({ ...expense, jpy: 800 }, expense);
    expect((await db.expenses.get('one'))?.jpy).toBe(800);
    await db.expenses.delete('one');
    expect(await db.expenses.count()).toBe(0);
  });
  it('JSON 完整往返，含設定、排序、備註與私人資料', async () => {
    await saveExpense(expense);
    await db.settings.put({ ...defaults, rate: 0.22, budget: 100000 });
    await db.edits.put({ id: 'd2-gokago', time: '12:45', note: '休息' });
    await db.orders.put({
      id: '1',
      ids: days[0].stops.map((s) => s.id).reverse(),
    });
    await db.privateInfo.put({
      id: 'private',
      label: '測試憑證',
      value: 'local-only',
    });
    const first = await backup();
    await db.expenses.clear();
    await db.privateInfo.clear();
    await importBackup(JSON.stringify(first));
    const second = await backup();
    expect(second.expenses).toEqual(first.expenses);
    expect(second.settings).toEqual(first.settings);
    expect(second.edits).toEqual(first.edits);
    expect(second.orders).toEqual(first.orders);
    expect(second.privateInfo).toEqual(first.privateInfo);
  });
  it('拒絕損毀備份，任何資料皆不得先寫入', async () => {
    await saveExpense(expense);
    const b = await backup();
    b.expenses.push({ ...expense, id: 'new', jpy: NaN });
    await expect(importBackup(JSON.stringify(b))).rejects.toThrow();
    expect(await db.expenses.count()).toBe(1);
    b.expenses = [];
    b.settings.rate = -1;
    expect(() => parseBackup(JSON.stringify(b))).toThrow();
  });
  it('重複匯入不產生重複消費，舊匯率不隨設定改動', async () => {
    await saveExpense(expense);
    const text = JSON.stringify(await backup());
    await importBackup(text);
    await importBackup(text);
    await db.settings.put({ ...defaults, rate: 0.3 });
    expect(await db.expenses.count()).toBe(1);
    expect((await db.expenses.get('one'))?.rate).toBe(0.22);
  });
  it('拒絕負數、無限值、錯誤日期與未知分類', async () => {
    for (const patch of [
      { jpy: -1 },
      { rate: Infinity },
      { jpy: 1.5 },
      { date: '2026-12-25' },
      { category: 'bad' },
    ])
      await expect(saveExpense({ ...expense, ...patch })).rejects.toThrow();
  });
  it('CSV 正確處理換行、逗號、引號及試算表公式', () => {
    const csv = toCSV([
      { ...expense, title: '=SUM(1,2)' },
      { ...expense, id: 'two', title: '茶,"京都"\n休息' },
    ]);
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain('"茶,""京都""\n休息"');
    expect(csv).toContain('"132"');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});
describe('PDF 來源與導航', () => {
  it('跨區導航用大眾運輸，接駁行程僅查看地點', () => {
    const stops = days.flatMap((d) => d.stops);
    for (const id of ['d5-luggage', 'd5-shinsaibashi']) {
      const url = new URL(maps(stops.find((s) => s.id === id)!));
      expect(url.searchParams.get('travelmode')).toBe('transit');
      expect(url.searchParams.get('origin')).toBeTruthy();
    }
    for (const id of ['d4-katsuo', 'd4-kinkaku', 'd4-arashiyama']) {
      const url = new URL(maps(stops.find((s) => s.id === id)!));
      expect(url.pathname).toBe('/maps/search/');
      expect(url.searchParams.has('travelmode')).toBe(false);
    }
  });
  it('七天連續、星期一致、每筆都有有效頁碼及唯一 ID', () => {
    expect(days).toHaveLength(7);
    expect(weekday(days[0].date)).toBe('週六');
    expect(weekday(days[6].date)).toBe('週五');
    const all = days.flatMap((d) => d.stops);
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
    for (const d of days) {
      expect(d.date).toBe(
        new Date(Date.UTC(2026, 9, 31 + d.id - 1)).toISOString().slice(0, 10),
      );
      for (const s of d.stops) {
        expect(s.pages.length).toBeGreaterThan(0);
        expect(s.pages.every((p) => p >= 1 && p <= 18)).toBe(true);
        expect(s.time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)).toBe(
          true,
        );
      }
    }
  });
  it('所有研究來源 ID 可追溯，導向 URL 正確編碼', () => {
    const ids = new Set(sources.map((s) => s.id));
    for (const s of [...days.flatMap((d) => d.stops), ...guides])
      for (const id of s.sourceIds ?? []) expect(ids.has(id)).toBe(true);
    const url = new URL(
      maps({ name: '京都', from: '関西空港駅', to: '京都駅', mode: 'transit' }),
    );
    expect(url.searchParams.get('travelmode')).toBe('transit');
    expect(url.searchParams.get('origin')).toBe('関西空港駅');
  });
});
describe('日本時區與預報邊界', () => {
  it('跨日使用日本時間，下一個項目只在實際旅行當天顯示', () => {
    const now = new Date('2026-11-01T23:00:00Z');
    expect(japanDate(now)).toBe('2026-11-02');
    expect(japanTime(now)).toBe('08:00');
    expect(nextStop(days[2].stops, days[2].date, now)?.id).toBe('d3-start');
    expect(nextStop(days[0].stops, days[0].date, now)).toBeUndefined();
  });
  it('僅允許今天至第 15 天，排除過去和第 16 天', () => {
    expect(inForecast('2026-11-09', '2026-10-25')).toBe(true);
    expect(inForecast('2026-11-10', '2026-10-25')).toBe(false);
    expect(inForecast('2026-10-24', '2026-10-25')).toBe(false);
  });
  it('天氣格式驗證與文字狀態', () => {
    expect(description(0)).toBe('晴朗');
    expect(description(61)).toBe('下雨');
    expect(
      validateWeather({
        fetched: 1,
        daily: {
          time: ['2026-10-25'],
          temperature_2m_max: [20],
          temperature_2m_min: [10],
          precipitation_probability_max: [30],
          weather_code: [3],
        },
      }),
    ).toBe(true);
    expect(validateWeather({ fetched: 1, daily: { time: ['bad'] } })).toBe(
      false,
    );
  });
});
