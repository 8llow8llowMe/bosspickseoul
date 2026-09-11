import { expect, test } from '@playwright/test'
import { openHome } from './measure'

/**
 * 히어로 상호작용 스모크.
 *
 * 지도 폴리곤 **클릭은 하지 않는다** — `/analysis` 로 라우팅되어 홈 측정이 끝난다.
 * 호버까지만 본다.
 */
test.describe('홈 히어로', () => {
  test('데스크톱 — 지도 호버에 자치구 툴팁이 뜬다', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'desktop',
      '호버는 데스크톱 프로젝트에서만 본다(모바일은 포인터가 없다).',
    )

    await openHome(page)

    const gangnam = page.locator('main path[aria-label="강남구"]')
    await expect(gangnam).toHaveCount(1)
    await gangnam.hover()

    const tooltip = page.locator('main svg text')
    await expect(tooltip.filter({ hasText: '강남구' }).first()).toBeVisible()
    await expect(tooltip.filter({ hasText: '월 매출' }).first()).toBeVisible()
  })

  test('모바일 — 첫 화면 스크린샷과 h1', async ({ page }, testInfo) => {
    test.skip(
      test.info().project.name !== 'mobile',
      '첫 화면 스크린샷은 모바일 프로젝트에서만 남긴다.',
    )

    await openHome(page)

    await testInfo.attach('home-first-screen', {
      body: await page.screenshot(),
      contentType: 'image/png',
    })

    // 위치 판정은 `home-metrics.spec.ts` 의 `h1Screen` 이 한다. 여기서는 존재만 본다.
    await expect(page.locator('main h1')).toHaveCount(1)
  })
})
