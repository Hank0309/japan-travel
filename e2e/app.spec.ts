import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
async function open(page: Page, route = '/') {
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}
async function setupRate(page: Page) {
  await page.getByRole('button', { name: '設定預算與匯率' }).click();
  await page.getByLabel('1 日幣 = 多少台幣').fill('0.22');
  await page.getByLabel('全程預算（JPY）', { exact: true }).fill('100000');
  await page.getByLabel('每日預算（JPY，每天相同）').fill('15000');
  await page.getByRole('button', { name: '儲存設定' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function add(page: Page, name = '測試抹茶', amount = '600') {
  await page.getByRole('button', { name: '記一筆', exact: true }).click();
  await page.getByLabel('消費名稱').fill(name);
  await page.getByLabel('日幣金額（JPY）').fill(amount);
  await page.getByRole('button', { name: '儲存消費' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function waitSW(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}
test('七日原書行程、導航、編輯與排序持久化', async ({ page }) => {
  await open(page, '/itinerary');
  for (let i = 1; i <= 7; i++) {
    await page
      .getByRole('button', { name: new RegExp('DAY ' + i + ' ') })
      .click();
    await expect(page.locator('.chapter')).toContainText(`DAY 0${i}`);
    expect(await page.locator('.stop-card').count()).toBeGreaterThan(4);
  }
  await page.getByRole('button', { name: /DAY 2 / }).click();
  const navigation = page.getByRole('link', {
    name: '導航至清水寺',
    exact: true,
  });
  expect(await navigation.getAttribute('href')).toContain(
    'google.com/maps/dir/',
  );
  await page.getByRole('button', { name: '編輯清水寺', exact: true }).click();
  await page.getByLabel('時間（留空為自由安排）').fill('09:10');
  await page.getByLabel('我的備註').fill('測試：慢慢參拜');
  await page.getByRole('button', { name: '儲存修改' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '上移清水寺', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('行程順序已儲存');
  await page.reload();
  await page.getByRole('button', { name: /DAY 2 / }).click();
  const card = page
    .locator('.stop-card')
    .filter({
      has: page.getByRole('heading', { name: '清水寺', exact: true }),
    });
  await expect(card).toContainText('09:10');
  await expect(card).toContainText('測試：慢慢參拜');
  const names = await page.locator('.stop-card h3').allTextContents();
  expect(names.indexOf('清水寺')).toBe(2);
});
test('離線新增、重新整理、CRUD 與備份往返', async ({ page, context }) => {
  await open(page, '/expenses');
  await setupRate(page);
  await waitSW(page);
  await context.setOffline(true);
  await add(page);
  await expect(page.locator('.expense-list')).toContainText('測試抹茶');
  await page.reload();
  await expect(page.locator('.expense-list')).toContainText('測試抹茶');
  await page
    .getByRole('button', { name: '修改消費測試抹茶', exact: true })
    .click();
  await page.getByLabel('日幣金額（JPY）').fill('800');
  await page.getByRole('button', { name: '儲存消費' }).click();
  await expect(page.locator('.expense-list')).toContainText('¥800');
  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 備份', exact: true }).click();
  const backup = await jsonDownload;
  const backupPath = await backup.path();
  expect(backupPath).not.toBeNull();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  expect((await csvDownload).suggestedFilename()).toContain('.csv');
  page.once('dialog', (d) => d.accept());
  await page
    .getByRole('button', { name: '修改消費測試抹茶', exact: true })
    .click();
  await page.getByRole('button', { name: '刪除此筆消費', exact: true }).click();
  await expect(page.locator('.expense-list')).not.toContainText('測試抹茶');
  page.once('dialog', (d) => d.accept());
  await page.getByLabel('匯入 JSON 備份').setInputFiles(backupPath!);
  await expect(page.locator('.expense-list')).toContainText('測試抹茶');
  await expect(page.locator('.expense-list')).toContainText('¥800');
  await page.goto('/itinerary');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '七日，慢慢旅行',
  );
  await page.getByRole('button', { name: /DAY 7 / }).click();
  await expect(page.locator('.alert-details')).toContainText('方向錯誤');
});
test('跨瀏覽器重新啟動仍保留帳本與編輯資料', async ({ browser }, testInfo) => {
  const profile = path.resolve(
    'private',
    `test-profile-${testInfo.project.name}-${Date.now()}`,
  );
  const type = browser.browserType();
  const context = await type.launchPersistentContext(profile, {
    viewport: { width: 390, height: 844 },
    headless: true,
  });
  const page = context.pages()[0];
  await page.goto('http://127.0.0.1:4173/expenses');
  await setupRate(page);
  await add(page, '重啟後的晚餐', '1200');
  await context.close();
  const reopened = await type.launchPersistentContext(profile, {
    viewport: { width: 390, height: 844 },
    headless: true,
  });
  try {
    const second = reopened.pages()[0];
    await second.goto('http://127.0.0.1:4173/expenses');
    await expect(second.locator('.expense-list')).toContainText('重啟後的晚餐');
    await expect(second.locator('.expense-list')).toContainText('¥1,200');
  } finally {
    await reopened.close();
  }
});
test('頁面尺寸、深色模式、長日文地址與私人資料不外傳', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url() + (r.postData() ?? '')));
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, '/info');
  await page.getByRole('button', { name: '新增', exact: true }).click();
  await page.getByLabel('名稱', { exact: true }).fill('測試私人訂位');
  await page
    .getByLabel('內容', { exact: true })
    .fill('只存本機-日本語の長い住所と予約確認・'.repeat(12));
  await page.getByRole('button', { name: '儲存私人資料' }).click();
  await expect(page.locator('.private-panel')).toContainText('測試私人訂位');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const route of ['/', '/itinerary', '/map', '/expenses', '/info']) {
      await open(page, route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/${test.info().project.name}-${colorScheme}-${route.replaceAll('/', '') || 'today'}.png`,
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
  expect(
    requests.some(
      (r) =>
        r.includes('只存本機') || r.includes(encodeURIComponent('只存本機')),
    ),
  ).toBe(false);
  await page.goto('/info');
  await page.getByRole('button', { name: '來源與待確認', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '原書待確認清單' }),
  ).toBeVisible();
});
test('PWA manifest、快取範圍與真實離線重開', async ({ page, context }) => {
  await open(page);
  await waitSW(page);
  const manifest = await page.evaluate(
    async () => await (await fetch('/manifest.webmanifest')).json(),
  );
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons).toHaveLength(3);
  for (const icon of manifest.icons) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }
  const keys = await page.evaluate(async () => {
    const all = [];
    for (const name of await caches.keys())
      for (const request of await (await caches.open(name)).keys())
        all.push(request.url);
    return all;
  });
  expect(keys.some((k) => k.includes('index.html'))).toBe(true);
  expect(
    keys.some((k) => k.includes('open-meteo') || k.includes('private/')),
  ).toBe(false);
  await context.setOffline(true);
  await page.goto('/info');
  await expect(
    page.getByRole('heading', { name: '出發之前，安心一點' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '在地攻略', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '清水寺・從奧之院望向舞台' }),
  ).toBeVisible();
});
test('天氣日期、快取標示與無效回應處理', async ({ page, context }) => {
  await page.clock.install({ time: new Date('2026-10-31T01:00:00Z') });
  let count = 0;
  await page.route('https://api.open-meteo.com/**', async (route) => {
    count++;
    await route.fulfill({
      json: {
        current: {
          temperature_2m: 21,
          weather_code: 3,
          time: '2026-10-31T10:00',
        },
        daily: {
          time: ['2026-10-31'],
          temperature_2m_max: [24],
          temperature_2m_min: [16],
          precipitation_probability_max: [70],
          weather_code: [61],
        },
      },
    });
  });
  await open(page);
  await expect(page.locator('.weather')).toContainText('21°');
  await expect(page.locator('.weather')).toContainText('70%');
  await expect(page.locator('.weather')).toContainText('記得帶傘');
  await page.reload();
  await expect(page.locator('.weather')).toContainText('21°');
  expect(count).toBe(1);
  await waitSW(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.weather')).toContainText('上次資料');
  await context.setOffline(false);
  await page.clock.setFixedTime(new Date('2026-11-20T01:00:00Z'));
  await page.reload();
  await expect(page.locator('.weather')).toContainText('尚無天氣預報');
});
test('基本無障礙與文字對比', async ({ page }) => {
  test.setTimeout(90000);
  const failures = [];
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const route of ['/', '/itinerary', '/map', '/expenses', '/info']) {
      await open(page, route);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      if (result.violations.length)
        failures.push({
          colorScheme,
          route,
          violations: result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        });
    }
  }
  expect(failures).toEqual([]);
});
