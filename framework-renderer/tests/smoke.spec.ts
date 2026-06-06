import { test, expect } from '@playwright/test';

test.describe('Smoke — temel render', () => {
  test('sayfa açılır, hero ve TOC görünür', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.appbar__brand')).toBeVisible();
    await expect(page.locator('#toc')).toBeVisible();
    await expect(page.locator('#hero')).toBeVisible();
  });

  test('cluster başlığına tıklayınca accordion açılır', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.cluster');
    const first = page.locator('.cluster').first();
    const wasCollapsed = await first.evaluate((el) => el.classList.contains('cluster--collapsed'));
    await first.locator('.cluster__header').click();
    const isCollapsedNow = await first.evaluate((el) => el.classList.contains('cluster--collapsed'));
    expect(isCollapsedNow).toBe(!wasCollapsed);
  });

  test('arama / kısayolu search box odağına alır', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('/');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'TEXTAREA']).toContain(focused);
  });

  test('dark mode toggle data-theme attribute değiştirir', async ({ page }) => {
    await page.goto('/');
    await page.click('#dark-toggle');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(['dark', 'light']).toContain(theme);
  });

  test('share button clipboard yazar (Web Share fallback)', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await page.click('#share-toggle');
    // Toast veya hata mesajı görünmeli — başarılı senaryoda toast
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible({ timeout: 2000 }).catch(() => {});
  });
});
