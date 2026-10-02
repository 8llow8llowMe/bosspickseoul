import { expect, test, type Page } from '@playwright/test'
import { openHome } from './measure'

/**
 * 「지금 많이 본 지역」 겹침 미니 지도(ranking-mini-map.md D7 #5~#8).
 *
 * 조회 순위는 `openHome` 이 고정 응답(강남구·마포구·영등포구, e2e/fixtures/analysis-rankings.ts)으로
 * 바꾼다. 지표 순위는 실제 응답이라 어느 구가 겹치는지는 단언하지 않는다 — 조회 1위 강남구가 늘
 * 배지를 갖는다는 것만 쓴다.
 */

const GANGNAM = '11680'

const section = (page: Page) =>
  page.locator('section:has([data-ranking-mini-map])')

/** 섹션을 화면에 올리고 등장 연출(약 1초)이 끝나기를 기다린다. */
const showSection = async (page: Page) => {
  await openHome(page)
  await section(page).evaluate(element =>
    element.scrollIntoView({ block: 'start' }),
  )
  await expect(
    page.locator('[data-ranking-mini-map] svg[data-revealed="true"]'),
  ).toHaveCount(1)
  await page.waitForTimeout(1200)
}

test.describe('홈 겹침 미니 지도', () => {
  test('데스크톱 — 많이 본 행에 올리면 그 구까지 연결선이 그려지고 토글해도 높이가 같다', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'desktop',
      '호버·연결선은 ≥1200 정밀 포인터에서만.',
    )

    await showSection(page)

    const row = page.locator(
      `[data-rank-column="view"] [data-rank-key="${GANGNAM}"]`,
    )
    const box = await row.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)

    await expect(
      page.locator('[data-ranking-connector-line]').first(),
    ).toBeAttached()
    await expect(
      page.locator(`path[data-district-code="${GANGNAM}"][data-active="true"]`),
    ).toHaveCount(1)

    await page.mouse.move(2, 2)
    const before = (await section(page).boundingBox())!.height
    for (const label of ['매출', '개업', '유동인구']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await page.waitForTimeout(500)
      expect((await section(page).boundingBox())!.height).toBe(before)
    }
  })

  test('데스크톱 — 폴리곤에 올리면 그 구 행이 강조된다', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'desktop',
      '폴리곤 호버는 정밀 포인터에서만.',
    )

    await showSection(page)

    // 폴리곤 안이면서 배지가 덮지 않는 화면 점을 찾는다 — 구 모양이 고르지 않아 상자 비율로는
    // 이웃 구에 떨어진다.
    const point = await page.evaluate(code => {
      const path = document.querySelector<SVGPathElement>(
        `path[data-district-code="${code}"]`,
      )
      const ctm = path?.getScreenCTM()
      if (!path || !ctm) return null
      const bbox = path.getBBox()
      for (let fy = 0.1; fy < 1; fy += 0.1) {
        for (let fx = 0.1; fx < 1; fx += 0.1) {
          const local = new DOMPoint(
            bbox.x + bbox.width * fx,
            bbox.y + bbox.height * fy,
          )
          if (!path.isPointInFill(local)) continue
          const screen = local.matrixTransform(ctm)
          if (document.elementFromPoint(screen.x, screen.y) === path) {
            return { x: screen.x, y: screen.y }
          }
        }
      }
      return null
    }, GANGNAM)
    expect(point).not.toBeNull()
    await page.mouse.move(point!.x, point!.y)

    await expect(
      page.locator(
        `[data-rank-column="view"] [data-rank-key="${GANGNAM}"] [data-highlighted="true"]`,
      ),
    ).toHaveCount(1)
    // aria-current 는 호버를 따라가지 않는다 — 「현재」는 인사이트가 가리키는 행 하나다.
    await expect(
      page.locator(
        `[data-rank-column="view"] [data-rank-key="${GANGNAM}"] [aria-current="true"]`,
      ),
    ).toHaveCount(0)
  })

  test('모바일 — 지도가 목록 위에 있고 가로로 넘치지 않는다', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'mobile', '좁은 폭 배치.')

    await showSection(page)

    const mapBox = await page.locator('[data-ranking-mini-map]').boundingBox()
    const listBox = await page
      .locator('[data-rank-column="view"]')
      .boundingBox()
    expect(mapBox!.y + mapBox!.height).toBeLessThanOrEqual(listBox!.y)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
    // 터치에서는 연결선을 그리지 않는다.
    await expect(page.locator('[data-ranking-connector]')).toHaveCount(0)
  })

  test('reduced-motion — 진입 직후 칠과 배지가 최종 상태다', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openHome(page)
    await section(page).evaluate(element =>
      element.scrollIntoView({ block: 'start' }),
    )

    const state = await page.evaluate(() => {
      const fill = document.querySelector('path[data-rank="1"]')
      const badge = document.querySelector('[data-badge-rank="1"] > g')
      const muted = document.querySelector('path:not([data-rank])')
      return {
        fill: fill ? getComputedStyle(fill).fill : null,
        mutedFill: muted ? getComputedStyle(muted).fill : null,
        badgeOpacity: badge ? getComputedStyle(badge).opacity : null,
      }
    })

    expect(state.badgeOpacity).toBe('1')
    if (state.fill !== null) expect(state.fill).not.toBe(state.mutedFill)
  })
})
