import { test, expect } from '@playwright/test';

/**
 * Visual regression — Playwright toHaveScreenshot karşılaştırması.
 * Eşik %0.02 piksel oranı; reading-progress fill ve clock-chip gibi
 * dinamik elemanlar maskelenir.
 *
 * Snapshot güncelleme:
 *   npx playwright test tests/visual.spec.ts --update-snapshots
 */

test.describe('Visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.cluster');
    // Saat chip + reading-progress dinamik — maske öncesi gizle
    await page.addStyleTag({
      content: `
        .read-chip, .updated-chip { visibility: hidden; }
        .reading-progress__fill { opacity: 0 !important; }
      `,
    });
  });

  test('overview sayfası — light mode', async ({ page }) => {
    await expect(page).toHaveScreenshot('overview-light.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('overview sayfası — dark mode', async ({ page }) => {
    await page.click('#dark-toggle');
    await page.waitForTimeout(150);
    await expect(page).toHaveScreenshot('overview-dark.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('detail panel — açık', async ({ page }) => {
    // İlk tıklanabilir karta tıkla
    await page.locator('[data-detail-key]').first().click();
    await page.waitForSelector('.detail-panel--open');
    await page.waitForTimeout(100);
    await expect(page.locator('.detail-panel')).toHaveScreenshot('detail-panel.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('sidebar TOC — açık', async ({ page }) => {
    await expect(page.locator('#sidebar')).toHaveScreenshot('sidebar-toc.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
