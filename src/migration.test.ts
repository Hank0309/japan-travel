import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { it, expect } from 'vitest';

it('v1 帳本升級至 v2 保留資料並修復空白私人名稱', async () => {
  const legacy = new Dexie('tabi-kansai-v1');
  legacy
    .version(1)
    .stores({
      expenses: 'id,date,category',
      settings: 'id',
      edits: 'id',
      orders: 'id',
      privateInfo: 'id',
    });
  await legacy
    .table('privateInfo')
    .put({ id: 'old', label: '  ', value: '原始內容' });
  await legacy
    .table('expenses')
    .put({
      id: 'old-expense',
      date: '2026-10-31',
      title: '舊帳本',
      jpy: 100,
      rate: 0.22,
      category: '餐飲',
      updated: '2026-10-25T00:00Z',
    });
  legacy.close();
  const { db, backup, serializeBackup, parseBackup } = await import('./db');
  expect((await db.privateInfo.get('old'))?.label).toBe('未命名私人資料');
  expect((await db.privateInfo.get('old'))?.value).toBe('原始內容');
  expect((await db.expenses.get('old-expense'))?.jpy).toBe(100);
  expect(parseBackup(serializeBackup(await backup())).expenses).toHaveLength(1);
  await db.delete();
});
