import { appUrl } from './urls';
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';

async function ready(page: Page, route = '/expenses') {
  await page.goto(appUrl(route));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}
async function addExpense(page: Page) {
  await page.getByRole('button', { name: '設定預算與匯率' }).click();
  await page.getByLabel('1 日幣 = 多少台幣').fill('0.22');
  await page.getByRole('button', { name: '儲存設定' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '記一筆', exact: true }).click();
  await page.getByLabel('消費名稱').fill('跨分頁測試');
  await page.getByLabel('日幣金額（JPY）').fill('100');
  await page.getByRole('button', { name: '儲存消費' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
test('跨區交通導航與手機搜尋尺寸', async ({ page }) => {
  await ready(page, '/itinerary');
  if ((page.viewportSize()?.width ?? 0) <= 760) {
    expect(
      await page
        .getByRole('textbox', { name: '搜尋當日行程' })
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
  }
  await page.getByRole('button', { name: /DAY 5 / }).click();
  for (const name of ['VIA INN 心齋橋・寄放行李', '心齋橋筋商店街']) {
    const card = page
      .locator('.stop-card')
      .filter({ has: page.getByRole('heading', { name, exact: true }) });
    const url = new URL(
      (await card
        .getByRole('link', { name: '導航至' + name })
        .getAttribute('href'))!,
    );
    expect(url.searchParams.get('travelmode')).toBe('transit');
    expect(url.searchParams.get('origin')).toBeTruthy();
  }
  await page.getByRole('button', { name: /DAY 4 / }).click();
  const tour = page.locator('.stop-card').filter({
    has: page.getByRole('heading', { name: '勝尾寺', exact: true }),
  });
  const link = tour.getByRole('link', { name: '導航至勝尾寺' });
  await expect(link).toContainText('查看地點');
  expect(new URL((await link.getAttribute('href'))!).pathname).toBe(
    '/maps/search/',
  );
});
test('私人名稱驗證與完整備份跨環境還原', async ({ page, browser }) => {
  await ready(page, '/info');
  await page.getByRole('button', { name: '新增', exact: true }).click();
  await page.getByLabel('名稱', { exact: true }).fill('   ');
  await page.getByLabel('內容', { exact: true }).fill('需要保留的私人備註');
  await page.getByRole('button', { name: '儲存私人資料' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    '名稱不可空白',
  );
  await page.getByLabel('名稱', { exact: true }).fill('我的預約備註');
  await page.getByRole('button', { name: '儲存私人資料' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await ready(page);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 備份', exact: true }).click();
  const file = await downloaded;
  const other = await browser.newContext();
  try {
    const restored = await other.newPage();
    await ready(restored);
    restored.once('dialog', (d) => d.accept());
    await restored
      .getByLabel('匯入 JSON 備份')
      .setInputFiles((await file.path())!);
    await expect(restored.getByRole('status')).toContainText('匯入完成');
    await ready(restored, '/info');
    await expect(restored.locator('.private-panel')).toContainText(
      '需要保留的私人備註',
    );
  } finally {
    await other.close();
  }
});
test('跨分頁即時更新、完整 CSV、拒絕舊表單及已刪除紀錄復活', async ({
  page,
  context,
}) => {
  await ready(page);
  const other = await context.newPage();
  await ready(other);
  await addExpense(page);
  await expect(other.locator('.expense-list')).toContainText('跨分頁測試');
  const downloaded = other.waitForEvent('download');
  await other.getByRole('button', { name: 'CSV', exact: true }).click();
  const file = await downloaded;
  expect(await fs.readFile((await file.path())!, 'utf8')).toContain(
    '跨分頁測試',
  );
  await other
    .getByRole('button', { name: '修改消費跨分頁測試', exact: true })
    .click();
  await page
    .getByRole('button', { name: '修改消費跨分頁測試', exact: true })
    .click();
  await page.getByLabel('日幣金額（JPY）').fill('200');
  await page.getByRole('button', { name: '儲存消費' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await other.getByLabel('日幣金額（JPY）').fill('300');
  await other.getByRole('button', { name: '儲存消費' }).click();
  await expect(other.getByRole('dialog').getByRole('alert')).toContainText(
    '其他分頁',
  );
  await expect(page.locator('.expense-list')).toContainText('¥200');
  await page
    .getByRole('button', { name: '修改消費跨分頁測試', exact: true })
    .click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '刪除此筆消費', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await other.getByRole('button', { name: '儲存消費' }).click();
  await expect(other.getByRole('dialog').getByRole('alert')).toContainText(
    '其他分頁',
  );
  await page.reload();
  await expect(page.locator('.expense-list')).not.toContainText('跨分頁測試');
});
test('IndexedDB 故障仍能離線閱讀行程、飯店及緊急電話', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
  });
  await ready(page, '/info');
  await expect(page.getByRole('alert')).toContainText('唯讀');
  await expect(page.getByRole('link', { name: /110/ })).toHaveAttribute(
    'href',
    'tel:110',
  );
  await expect(
    page.getByRole('button', { name: '新增', exact: true }),
  ).toBeDisabled();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await ready(page, '/itinerary');
  await expect(page.locator('.stop-card')).toHaveCount(5);
  await ready(page, '/info');
  await expect(page.getByRole('link', { name: /119/ })).toHaveAttribute(
    'href',
    'tel:119',
  );
  await expect(page.locator('.hotel-card')).toContainText(['京都', '心斎橋']);
});
test('長時間開啟與刷新失敗不把過期天氣當成目前資料', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-31T01:00:00Z') });
  let count = 0;
  let fail = false;
  await page.route('https://api.open-meteo.com/**', async (route) => {
    count++;
    if (fail) {
      await route.abort();
      return;
    }
    await route.fulfill({
      json: {
        current: {
          temperature_2m: 20 + count,
          weather_code: 3,
          time: count === 1 ? '2026-10-31T10:00' : '2026-10-31T13:00',
        },
        daily: {
          time: ['2026-10-31'],
          temperature_2m_max: [24],
          temperature_2m_min: [16],
          precipitation_probability_max: [10],
          weather_code: [3],
        },
      },
    });
  });
  await ready(page, '/');
  await expect(page.locator('.weather')).toContainText('21°');
  await page.clock.fastForward(3 * 3600000);
  await expect(page.locator('.weather')).toContainText('22°');
  expect(count).toBe(2);
  fail = true;
  await page.clock.fastForward(3600000);
  await expect(page.locator('.weather')).toContainText('上次資料');
  await expect(page.locator('.weather')).not.toContainText('目前氣溫');
  await page.clock.fastForward(25 * 3600000);
  await expect(page.locator('.weather')).not.toContainText('22°');
});
