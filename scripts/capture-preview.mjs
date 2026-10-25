import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  for (const [name, viewport, colorScheme] of [
    ['mobile', { width: 390, height: 844 }, 'light'],
    ['desktop', { width: 1440, height: 1000 }, 'light'],
    ['mobile-dark', { width: 390, height: 844 }, 'dark'],
  ]) {
    const context = await browser.newContext({
      viewport,
      colorScheme,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForFunction(
      () =>
        !document.querySelector('.weather')?.textContent.includes('查詢天氣中'),
      {},
      { timeout: 15000 },
    );
    await page.screenshot({ path: `docs/preview-${name}.png` });
    await context.close();
  }
} finally {
  await browser.close();
}
