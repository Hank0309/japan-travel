import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { setTimeout, clearTimeout } from 'node:timers';
import { chromium } from '@playwright/test';
const watchdog = setTimeout(() => {
  console.error('FAIL: update smoke exceeded 60 seconds');
  process.exit(1);
}, 60000);
let version = 1;
const types = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
const root = path.resolve('dist');
const server = http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(
      new URL(req.url, 'http://127.0.0.1').pathname,
    );
    let target = path.resolve(root, '.' + pathname);
    if (!target.startsWith(root + path.sep) && target !== root) {
      res.writeHead(403).end();
      return;
    }
    try {
      if (!(await fs.stat(target)).isFile())
        target = path.join(root, 'index.html');
    } catch {
      target = path.join(root, 'index.html');
    }
    let body = await fs.readFile(target);
    if (pathname === '/sw.js')
      body = Buffer.from(
        body
          .toString()
          .replace(
            /(url:"index.html",revision:")([^"]+)/,
            `$1$2-smoke-${version}`,
          ) + `\n// smoke release ${version}\n`,
      );
    if (target === path.join(root, 'index.html'))
      body = Buffer.from(
        body
          .toString()
          .replace('<html ', `<html data-smoke-release="${version}" `),
      );
    res.writeHead(200, {
      'Content-Type': types[path.extname(target)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(500).end();
  }
});
await new Promise((resolve) => server.listen(4174, '127.0.0.1', resolve));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  await page.goto('http://127.0.0.1:4174/expenses');
  await page.getByRole('button', { name: '設定預算與匯率' }).click();
  await page.getByLabel('1 日幣 = 多少台幣').fill('0.22');
  await page.getByRole('button', { name: '儲存設定' }).click();
  await page.getByRole('button', { name: '記一筆', exact: true }).click();
  await page.getByLabel('消費名稱').fill('更新保留測試');
  await page.getByLabel('日幣金額（JPY）').fill('300');
  await page.getByRole('button', { name: '儲存消費' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  console.log('Expense saved; waiting for service worker.');
  await page.evaluate(async () => await navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  assert.equal(
    await page.locator('html').getAttribute('data-smoke-release'),
    '1',
  );
  version = 2;
  console.log('Version 2 available; checking update.');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update();
  });
  await page
    .getByRole('button', { name: '更新 App' })
    .waitFor({ timeout: 20000 });
  await Promise.all([
    page.waitForEvent('framenavigated', {
      predicate: (frame) => frame === page.mainFrame(),
    }),
    page.getByRole('button', { name: '更新 App' }).click(),
  ]);
  console.log('Update accepted; checking retained expense.');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    () => document.documentElement.dataset.smokeRelease === '2',
  );
  await page.context().setOffline(true);
  await page.reload();
  assert.equal(
    await page.locator('html').getAttribute('data-smoke-release'),
    '2',
  );
  await page
    .locator('.expense-list')
    .getByText('更新保留測試', { exact: true })
    .waitFor();
  assert.match(await page.locator('.expense-list').innerText(), /300/);
  console.log(
    'PASS: new service worker → update prompt → reload → IndexedDB expense retained',
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  clearTimeout(watchdog);
}
