import Dexie, { type EntityTable } from 'dexie';
import type { Expense, Settings, Edit, Order, PrivateInfo } from './model';
import { categories } from './model';
import { days } from './data';
export const db = new Dexie('tabi-kansai-v1') as Dexie & {
  expenses: EntityTable<Expense, 'id'>;
  settings: EntityTable<Settings, 'id'>;
  edits: EntityTable<Edit, 'id'>;
  orders: EntityTable<Order, 'id'>;
  privateInfo: EntityTable<PrivateInfo, 'id'>;
};
db.version(1).stores({
  expenses: 'id,date,category',
  settings: 'id',
  edits: 'id',
  orders: 'id',
  privateInfo: 'id',
});
db.version(2)
  .stores({})
  .upgrade(async (tx) => {
    await tx
      .table('privateInfo')
      .toCollection()
      .modify((p: PrivateInfo) => {
        if (!p.label.trim()) p.label = '未命名私人資料';
      });
  });
export const MAX_BACKUP_BYTES = 5_000_000;
export function validatePrivateInfo(
  value: unknown,
  legacy = false,
): PrivateInfo {
  const p = value as PrivateInfo;
  if (
    !p ||
    typeof p.id !== 'string' ||
    !p.id ||
    p.id.length > 100 ||
    typeof p.label !== 'string' ||
    p.label.length > 100 ||
    (!legacy && !p.label.trim()) ||
    typeof p.value !== 'string' ||
    p.value.length > 5000
  )
    throw new Error('私人資料格式錯誤：名稱不可空白');
  return {
    id: p.id,
    label: p.label.trim() || '未命名私人資料',
    value: p.value,
  };
}
export async function writeLocal(action: () => Promise<unknown>) {
  await db.transaction('rw', db.tables, async () => {
    await action();
    serializeBackup(await backup());
  });
}
export async function savePrivateInfo(p: PrivateInfo) {
  const valid = validatePrivateInfo(p);
  await writeLocal(() => db.privateInfo.put(valid));
}
export const defaults: Settings = {
  id: 'settings',
  rate: 0,
  budget: 0,
  dailyBudget: 0,
};
export const round = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export function validMoney(n: number) {
  return Number.isFinite(n) && n >= 0 && n <= 1e10;
}
export function validateExpense(value: unknown): Expense {
  const e = value as Expense;
  if (
    !e ||
    typeof e.id !== 'string' ||
    e.id.length > 100 ||
    !days.some((d) => d.date === e.date) ||
    typeof e.title !== 'string' ||
    !e.title.trim() ||
    e.title.length > 200 ||
    !categories.includes(e.category) ||
    !Number.isSafeInteger(e.jpy) ||
    e.jpy <= 0 ||
    e.jpy > 1e9 ||
    !Number.isFinite(e.rate) ||
    e.rate <= 0 ||
    e.rate > 10 ||
    typeof e.updated !== 'string' ||
    !Number.isFinite(Date.parse(e.updated))
  )
    throw new Error('消費資料格式錯誤：日期、金額或匯率無效');
  return {
    id: e.id,
    date: e.date,
    title: e.title.trim(),
    category: e.category,
    jpy: e.jpy,
    rate: e.rate,
    updated: e.updated,
  };
}
export function validateSettings(value: unknown): Settings {
  const s = value as Settings;
  if (
    !s ||
    !Number.isFinite(s.rate) ||
    s.rate < 0 ||
    s.rate > 10 ||
    !validMoney(s.budget) ||
    !validMoney(s.dailyBudget)
  )
    throw new Error('預算或匯率格式錯誤');
  return {
    id: 'settings',
    rate: s.rate,
    budget: s.budget,
    dailyBudget: s.dailyBudget,
  };
}
function assertUnchanged(current: Expense | undefined, expected: Expense) {
  if (
    !current ||
    JSON.stringify(validateExpense(current)) !==
      JSON.stringify(validateExpense(expected))
  )
    throw new Error(
      '此筆消費已在其他分頁修改或刪除。請關閉編輯，查看最新紀錄後再操作。',
    );
}
export async function saveExpense(e: Expense, expected?: Expense) {
  const valid = validateExpense(e);
  await writeLocal(async () => {
    const current = await db.expenses.get(valid.id);
    if (expected) assertUnchanged(current, expected);
    else if (current) throw new Error('消費 ID 已存在，請重新開啟編輯');
    await db.expenses.put(valid);
  });
}
export async function deleteExpense(expected: Expense) {
  await db.transaction('rw', db.expenses, async () => {
    assertUnchanged(await db.expenses.get(expected.id), expected);
    await db.expenses.delete(expected.id);
  });
}
export async function backup() {
  return db.transaction('r', db.tables, async () => ({
    schema: 1,
    exportedAt: new Date().toISOString(),
    expenses: await db.expenses.toArray(),
    settings: (await db.settings.get('settings')) ?? { ...defaults },
    edits: await db.edits.toArray(),
    orders: await db.orders.toArray(),
    privateInfo: await db.privateInfo.toArray(),
  }));
}
type Backup = Awaited<ReturnType<typeof backup>>;
export function parseBackup(text: string): Backup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new Error('備份上限 5 MB');
  const b = JSON.parse(text) as Backup;
  if (
    !b ||
    b.schema !== 1 ||
    !Array.isArray(b.expenses) ||
    !Array.isArray(b.edits) ||
    !Array.isArray(b.orders) ||
    !Array.isArray(b.privateInfo) ||
    b.expenses.length > 10000 ||
    b.edits.length > 500 ||
    b.orders.length > 7 ||
    b.privateInfo.length > 100
  )
    throw new Error('不支援的備份版本或資料量');
  const expenses = b.expenses.map(validateExpense);
  if (new Set(expenses.map((e) => e.id)).size !== expenses.length)
    throw new Error('備份含重複消費 ID');
  const ids = new Set(days.flatMap((d) => d.stops.map((s) => s.id)));
  const edits = b.edits.map((e) => {
    if (
      !e ||
      !ids.has(e.id) ||
      typeof e.note !== 'string' ||
      e.note.length > 3000 ||
      typeof e.time !== 'string' ||
      (e.time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time))
    )
      throw new Error('行程編輯格式錯誤');
    return { id: e.id, time: e.time, note: e.note };
  });
  const orders = b.orders.map((o) => {
    const day = days.find((d) => String(d.id) === o?.id);
    if (
      !day ||
      !Array.isArray(o.ids) ||
      o.ids.length !== day.stops.length ||
      new Set(o.ids).size !== o.ids.length ||
      o.ids.some((id) => !day.stops.some((s) => s.id === id))
    )
      throw new Error('行程排序格式錯誤');
    return { id: o.id, ids: [...o.ids] };
  });
  const privateInfo = b.privateInfo.map((p) => validatePrivateInfo(p, true));
  return {
    schema: 1,
    exportedAt: b.exportedAt,
    expenses,
    settings: validateSettings(b.settings),
    edits,
    orders,
    privateInfo,
  };
}
export function serializeBackup(value: Backup) {
  const text = JSON.stringify(parseBackup(JSON.stringify(value)), null, 2);
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new Error(
      '資料將超過可還原的 5 MB 備份上限，未儲存；請先匯出並整理紀錄。',
    );
  return text;
}
export async function importBackup(text: string) {
  const b = parseBackup(text);
  // Validate the entire document before any write; transaction rolls back on failure.
  await db.transaction(
    'rw',
    [db.expenses, db.settings, db.edits, db.orders, db.privateInfo],
    async () => {
      await db.expenses.bulkPut(b.expenses);
      await db.settings.put(b.settings);
      await db.edits.bulkPut(b.edits);
      await db.orders.bulkPut(b.orders);
      await db.privateInfo.bulkPut(b.privateInfo);
      serializeBackup(await backup());
    },
  );
}
function csvCell(v: unknown) {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function toCSV(expenses: Expense[]) {
  return (
    '\uFEFF' +
    [
      ['日期', '項目', '分類', '日幣', '當筆匯率 TWD/JPY', '台幣'],
      ...expenses.map((e) => [
        e.date,
        e.title,
        e.category,
        e.jpy,
        e.rate,
        round(e.jpy * e.rate),
      ]),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  );
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
