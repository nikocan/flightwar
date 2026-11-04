import { expect, test } from '@playwright/test';

type Dbg = { __SFE__: { state: () => { status: string; stats: { shotsFired: number } }; forceVictory: () => void } };

test('main menu → mission → fire → pause → victory → rewards', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?debug=1');
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.getByTestId('coins')).toContainText('0');

  await page.getByTestId('nav-missions').click();
  await expect(page.getByTestId('mission-select')).toBeVisible();
  await page.getByTestId('start-mission').click();
  await expect(page.getByTestId('hud')).toBeVisible({ timeout: 30_000 });

  // Wait until the simulation is actually ticking (shader compilation can be slow in CI).
  await page.waitForFunction(() => {
    const d = (window as unknown as { __SFE__?: { state: () => { stats: { time?: number } } } }).__SFE__;
    return !!d && ((d.state().stats as { time?: number }).time ?? 0) > 0.5;
  }, undefined, { timeout: 30_000 });
  await page.keyboard.down('Space');
  await page.waitForTimeout(2000);
  await page.keyboard.up('Space');
  const shots = await page.evaluate(() => (window as unknown as Dbg).__SFE__.state().stats.shotsFired);
  expect(shots).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.getByTestId('resume').click();
  await expect(page.getByTestId('pause-menu')).toBeHidden();

  await page.evaluate(() => (window as unknown as Dbg).__SFE__.forceVictory());
  await expect(page.getByTestId('result-title')).toHaveText('GÖREV TAMAMLANDI', { timeout: 10_000 });
  await expect(page.getByTestId('result-rewards')).toContainText('+');

  await page.getByTestId('to-menu').click();
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.getByTestId('coins')).not.toHaveText(/^\s*0\s*$/);
  expect(errors).toEqual([]);
});

test('daily reward can be claimed once per day', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('daily-reward').click();
  await expect(page.getByTestId('coins')).toContainText('100');
  await page.getByTestId('daily-reward').click();
  await expect(page.getByTestId('coins')).toContainText('100');
});
