import { expect, test } from '@playwright/test'

/**
 * 없는 주소 화면(docs/features/layout/error-screens.md).
 * `/nope-xyz` 는 루트 not-found(셸을 직접 두름), `/community/abc` 는 (shell)/not-found(셸 없이 화면만)다.
 * 어느 쪽이든 셸은 하나여야 한다.
 */
for (const path of ['/nope-xyz', '/community/abc']) {
  test(`${path} — 404 · 셸 하나 · 한국어 h1`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(404)
    await expect(page.locator('[data-site-shell]')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('찾는 페이지가 없어요')
  })
}
