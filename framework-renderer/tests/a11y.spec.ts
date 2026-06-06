import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('A11y — axe-core scan', () => {
  test('overview sayfası WCAG 2.1 AA ihlali çıkarmaz', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.cluster');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('dark mode ihlali çıkarmaz', async ({ page }) => {
    await page.goto('/');
    await page.click('#dark-toggle');
    await page.waitForTimeout(200);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('açık cluster a11y ihlal çıkarmaz', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cluster').first().locator('.cluster__header').click();
    await page.waitForTimeout(200);
    const results = await new AxeBuilder({ page })
      .include('.cluster:not(.cluster--collapsed)')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
