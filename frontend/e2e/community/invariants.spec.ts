import { expect, test } from './test'
import { readLayoutInvariants, watchCommunitySession } from './measure'

/**
 * 커뮤니티 세 화면 불변식(CM-014) — 가로 넘침 없음 · 그려진 h1 하나 · 콘솔 오류 0.
 *
 * 기준선(래칫)을 두지 않는다. 셋 다 「넘으면 바로 실패」인 이진 조건이라 내려갈 값이 없다.
 * 화면마다 「다 그려졌다」는 표지를 기다린 뒤 잰다 — 스켈레톤 상태의 폭은 뜻이 없다.
 */
const SCREENS = [
  {
    name: '목록',
    path: '/community/list',
    ready: '[data-community-post-id]',
    // 넓은 화면은 레일이 폭 판정 뒤에 붙는다 — 붙은 뒤의 폭을 잰다.
    desktopReady: '[data-community-list-rail]',
  },
  {
    name: '상세(사진 있는 글)',
    path: '/community/8',
    ready: '[data-community-article]',
    desktopReady: '[data-community-rail]',
  },
  {
    name: '글쓰기',
    path: '/community/register',
    ready: '[data-community-editor-form]',
    desktopReady: null,
  },
] as const

test.describe('커뮤니티 불변식', () => {
  for (const screen of SCREENS) {
    test(`${screen.name} — 가로 넘침 없음 · h1 하나 · 콘솔 오류 0 (CM-014)`, async ({
      page,
    }) => {
      const session = watchCommunitySession(page)

      await page.goto(screen.path, { waitUntil: 'domcontentloaded' })
      await expect(page.locator(screen.ready).first()).toBeVisible()
      if (screen.desktopReady && test.info().project.name === 'desktop') {
        await expect(page.locator(screen.desktopReady)).toBeVisible()
      }
      await page.evaluate(async () => {
        await document.fonts.ready
      })

      const invariants = await readLayoutInvariants(page)

      expect(
        invariants.scrollWidth,
        `가로 넘침: scrollWidth ${invariants.scrollWidth} > innerWidth ${invariants.innerWidth}`,
      ).toBeLessThanOrEqual(invariants.innerWidth)
      expect(invariants.visibleH1Count).toBe(1)
      expect(session.consoleErrors).toEqual([])
    })
  }

  test('모바일 목록 첫 화면에 글 행이 3개 이상 보인다 (CM-015)', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'mobile',
      '첫 화면 글 수는 모바일(375×812)에서만 잰다.',
    )

    await page.goto('/community/list', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('[data-community-post-id]').first()).toBeVisible()

    // 행의 **아래 끝까지** 첫 화면 안에 들어온 것만 센다 — 반쯤 걸친 행은 「보인다」고 하지 않는다.
    const fullyVisibleRows = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll('[data-community-post-id]'),
        ).filter(row => {
          const rect = row.getBoundingClientRect()
          return rect.top >= 0 && rect.bottom <= window.innerHeight
        }).length,
    )

    expect(fullyVisibleRows).toBeGreaterThanOrEqual(3)
  })

  /*
    셸 푸터 위치(community.md §S4 「다듬기」). 검색어로 결과를 0 으로 만들면 본문이 짧다 — 셸이 최소 한 화면
    높이의 세로 묶음이라 푸터 아래 끝이 화면 바닥에 붙어야 한다(예전에는 화면 가운데로 올라왔다).
  */
  test('빈 목록에서도 푸터는 화면 바닥에 붙는다', async ({ page }) => {
    await page.goto(
      '/community/list?keyword=%EC%97%86%EB%8A%94%EA%B2%80%EC%83%89%EC%96%B4zz',
      { waitUntil: 'domcontentloaded' },
    )
    await expect(page.getByText('검색 결과가 없어요')).toBeVisible()

    const layout = await page.evaluate(() => {
      const footer = document.querySelector('footer')
      return {
        footerBottom: footer
          ? footer.getBoundingClientRect().bottom + window.scrollY
          : null,
        documentHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
      }
    })

    expect(layout.footerBottom).not.toBeNull()
    // 내용이 짧으니 문서는 한 화면이고, 푸터 아래 끝이 그 바닥이다.
    expect(layout.documentHeight).toBe(layout.innerHeight)
    expect(
      Math.abs(layout.footerBottom! - layout.innerHeight),
    ).toBeLessThanOrEqual(1)
  })
})
