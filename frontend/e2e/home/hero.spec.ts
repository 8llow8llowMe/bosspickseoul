import { expect, test } from '@playwright/test'
import { openHome } from './measure'

/**
 * 히어로 상호작용 스모크.
 *
 * 데스크톱 지도 폴리곤 **클릭은 하지 않는다** — `/analysis` 로 라우팅되어 홈 측정이 끝난다.
 * 호버까지만 본다. 모바일 탭은 라우팅하지 않고 피커에 고른다(hero-picker-and-mobile-first-screen.md D4-4).
 */
test.describe('홈 히어로', () => {
  test('데스크톱 — 지도 호버에 자치구 툴팁이 뜬다', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'desktop',
      '호버는 데스크톱 프로젝트에서만 본다(모바일은 포인터가 없다).',
    )

    await openHome(page)

    // 강남구는 카드가 지도 위에 떠 있을 때 카드에 가려 호버할 수 없었다. 좌우 분할 뒤로는
    // 가리는 것이 없다 — 이 구가 호버된다는 것이 그 증거다(hero-split-layout.md D7 #2).
    const gangnam = page.locator('main path[aria-label="강남구"]')
    await expect(gangnam).toHaveCount(1)
    await gangnam.hover()

    const tooltip = page.locator('main svg text')
    await expect(tooltip.filter({ hasText: '강남구' }).first()).toBeVisible()
    // 툴팁은 hover 한 구의 실데이터(GET /districts/{code})다 — 응답이 오면 하루 리듬이 그려진다
    // (full-screen-sections-and-live-tooltip.md D4-5). 예전의 정적 「월 매출」 예시는 없다.
    await expect(tooltip.filter({ hasText: '시간대별' }).first()).toBeVisible()
    await expect(tooltip.filter({ hasText: '월 매출' })).toHaveCount(0)
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
  test('모바일 — 첫 화면에 h1·피커·주 버튼이 들어온다', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', '모바일 첫 화면 판정.')

    await openHome(page)

    const viewportHeight = page.viewportSize()?.height ?? 0
    for (const locator of [
      page.locator('main h1'),
      page.getByRole('combobox', { name: '창업할 자치구' }),
      page.getByRole('link', { name: '내 상권 분석하기' }),
    ]) {
      const box = await locator.boundingBox()
      expect(box, '요소가 렌더되지 않았습니다.').not.toBeNull()
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewportHeight)
    }
  })

  test('모바일 — 지도를 탭하면 피커에 골라지고 이동하지 않는다', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'mobile', '모바일 탭 동작.')

    await openHome(page)
    await page.locator('path[aria-label="마포구"]').click()

    await expect(
      page.getByRole('combobox', { name: '창업할 자치구' }),
    ).toHaveValue('11440')
    await expect(
      page.getByRole('link', { name: '마포구 분석하기' }),
    ).toHaveAttribute('href', '/analysis?districtCode=11440')
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('데스크톱 — 피커로 고르면 주 버튼이 그 구로 간다', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', '데스크톱 피커.')

    await openHome(page)
    await page
      .getByRole('combobox', { name: '창업할 자치구' })
      .selectOption('11560')

    const link = page.getByRole('link', { name: '영등포구 분석하기' })
    await expect(link).toHaveAttribute('href', '/analysis?districtCode=11560')
    // 가장 긴 라벨도 한 줄이고 카드 안에 든다(D7 B3). 높이로는 못 잰다 — 두 줄(15px × 1.5 × 2 =
    // 45px)도 min-height 48px 안에 들어간다. 라벨 글자의 줄 상자 수를 센다.
    const lineCount = await link.evaluate(el => {
      const text = [...el.childNodes].find(
        node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      )
      if (!text) return 0
      const range = document.createRange()
      range.selectNodeContents(text)
      return new Set(
        [...range.getClientRects()].map(rect => Math.round(rect.top)),
      ).size
    })
    expect(lineCount, '라벨이 줄바꿈됐습니다.').toBe(1)
    const cardRight = await page
      .locator('main h1')
      .evaluate(h1 => h1.parentElement!.getBoundingClientRect().right)
    const box = await link.boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(cardRight + 0.5)

    // 첫 항목으로 되돌리면 빈 분석 화면으로 돌아간다.
    await page.getByRole('combobox', { name: '창업할 자치구' }).selectOption('')
    await expect(
      page.getByRole('link', { name: '내 상권 분석하기' }),
    ).toHaveAttribute('href', '/analysis')
  })
})
