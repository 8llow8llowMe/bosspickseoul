import { expect, test } from './test'
import {
  openCommunityList,
  rectOf,
  scrollWindowTo,
  watchCommunitySession,
} from './measure'

/**
 * 커뮤니티 목록 — 폭별 골격(CM-037·038), 숨는 헤더(CM-043), 스크롤 복원(CM-030).
 *
 * 레일·내비를 그릴지는 matchMedia 판정이라(`useNarrowViewport`) 마크업 문자열로는 못 본다.
 * 탭 줄 숨김도 `display:none` CSS 라 실제 계산 스타일이 있어야 안다. 그래서 여기서 잰다.
 */

const LAYOUT = '[data-community-list-layout]'
const NAV = '[data-community-list-nav]'
const RAIL = '[data-community-list-rail]'
const TAB_ROW = '[data-community-tab-row]'

test.describe('커뮤니티 목록 골격', () => {
  test('1440 — 좌 내비 · 피드 · 우 레일 3단, 탭 줄 없음 (CM-037)', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'desktop',
      '1440 폭은 desktop 프로젝트.',
    )

    await openCommunityList(page)

    await expect(page.locator(LAYOUT)).toHaveAttribute(
      'data-community-list-layout',
      'three',
    )
    await expect(page.locator(NAV)).toBeVisible()
    await expect(page.locator(RAIL)).toBeVisible()
    await expect(page.locator(TAB_ROW)).toBeHidden()
  })

  test('1200 — 피드 + 우 레일 2단, 탭 줄 있음 (CM-038)', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'desktop',
      '넓은 폭은 desktop 프로젝트.',
    )

    await page.setViewportSize({ width: 1200, height: 900 })
    await openCommunityList(page)

    await expect(page.locator(LAYOUT)).toHaveAttribute(
      'data-community-list-layout',
      'two',
    )
    await expect(page.locator(RAIL)).toBeVisible()
    await expect(page.locator(TAB_ROW)).toBeVisible()
    await expect(page.locator(NAV)).toHaveCount(0)
  })

  test('모바일 — 레일·내비를 그리지 않고 인기 글을 부르지 않는다 (CM-038)', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'mobile', '1단은 mobile 프로젝트.')

    const session = watchCommunitySession(page)
    await openCommunityList(page)
    /*
      글 행은 첫 쪽 응답 뒤에 그려지고, 폭 판정(matchMedia)은 그보다 먼저 마운트 이펙트에서 끝난다.
      그래서 행이 보인 시점에 레일이 없으면 「판정 결과 없음」이다. 두 프레임 더 기다려 같은 커밋의
      후속 렌더까지 흘려보낸다.
    */
    await scrollWindowTo(page, 0)

    await expect(page.locator(LAYOUT)).toHaveAttribute(
      'data-community-list-layout',
      'one',
    )
    await expect(page.locator(RAIL)).toHaveCount(0)
    await expect(page.locator(NAV)).toHaveCount(0)
    await expect(page.locator(TAB_ROW)).toBeVisible()
    // 인기 글은 `sortType=POPULAR` 목록 호출이다 — 모바일 1단은 레일이 없으니 부르지 않는다.
    expect(
      session.bffRequests.filter(request =>
        request.includes('sortType=POPULAR'),
      ),
    ).toEqual([])
  })
})

test.describe('커뮤니티 목록 숨는 헤더', () => {
  test('모바일 — 아래로 스크롤하면 헤더가 숨고, 위로 올리면 돌아오고, 상세에는 남지 않는다 (CM-043)', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'mobile',
      '숨는 헤더는 <480 에서만 켠다.',
    )

    // 헤더 전환 애니메이션을 끈다 — 위치를 바로 잰다.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openCommunityList(page)

    const html = page.locator('html')
    await expect(html).not.toHaveAttribute('data-community-header-hidden')

    await scrollWindowTo(page, 400)
    await expect(html).toHaveAttribute('data-community-header-hidden', 'true')
    await expect
      .poll(async () => (await rectOf(page, '[data-site-header]'))?.bottom)
      .toBeLessThanOrEqual(0)
    // 툴바는 헤더가 비운 맨 위에 붙는다.
    await expect
      .poll(
        async () =>
          (await rectOf(page, '[role="region"][aria-label="커뮤니티 탐색"]'))
            ?.top,
      )
      .toBeLessThanOrEqual(1)

    await scrollWindowTo(page, 200)
    await expect(html).not.toHaveAttribute('data-community-header-hidden')
    await expect
      .poll(async () => (await rectOf(page, '[data-site-header]'))?.top)
      .toBeGreaterThanOrEqual(0)

    // 다시 숨긴 채로 상세로 가도 속성이 남지 않는다(언마운트 정리).
    await scrollWindowTo(page, 400)
    await expect(html).toHaveAttribute('data-community-header-hidden', 'true')
    await page.locator('[data-community-post-id]').last().click()
    await expect(page.locator('[data-community-article]')).toBeVisible()
    await expect(html).not.toHaveAttribute('data-community-header-hidden')
  })
})

test.describe('커뮤니티 목록 스크롤 복원', () => {
  test('목록 → 상세 → 뒤로 가면 누른 행이 같은 화면 높이에 있다 (CM-030)', async ({
    page,
  }) => {
    /*
      브라우저 기본 복원을 끄고 **앱 복원만** 본다. 목 데이터는 상세가 목록보다 길어 기본 복원이
      우연히 맞는 자리에 떨어진다 — 그대로 두면 앱 복원(`useCommunityListScrollRestore`)이 깨져도
      통과한다. 실데이터에서 기본 복원은 popstate 순간의 짧은 문서 높이에 걸려 잘린다(list-scroll.ts).
    */
    await page.addInitScript(() => {
      window.history.scrollRestoration = 'manual'
    })
    await openCommunityList(page)
    await scrollWindowTo(page, 300)

    /*
      누를 행: 위쪽 붙는 툴바(·헤더) 아래이고 아래 끝까지 화면 안에 든 첫 행. 화면 밖 행을 누르면
      Playwright 가 먼저 스크롤해 「누른 순간의 자리」가 우리가 잰 값과 달라진다.
    */
    const target = await page.evaluate(() => {
      const toolbar = document.querySelector(
        '[role="region"][aria-label="커뮤니티 탐색"]',
      )
      const floor = toolbar ? toolbar.getBoundingClientRect().bottom : 0
      const row = Array.from(
        document.querySelectorAll<HTMLElement>('[data-community-post-id]'),
      ).find(candidate => {
        const rect = candidate.getBoundingClientRect()
        return rect.top >= floor + 8 && rect.bottom <= window.innerHeight - 96
      })
      if (!row) return null
      return {
        postId: row.getAttribute('data-community-post-id') ?? '',
        top: row.getBoundingClientRect().top,
        scrollY: window.scrollY,
      }
    })
    expect(target, '화면 안에 누를 수 있는 글 행이 없다').not.toBeNull()
    if (!target) return
    expect(target.scrollY, '목록이 스크롤되지 않았다').toBeGreaterThan(0)

    const row = page.locator(`[data-community-post-id="${target.postId}"]`)
    await row.click()
    await expect(page).toHaveURL(new RegExp(`/community/${target.postId}\\b`))
    await expect(page.locator('[data-community-article]')).toBeVisible()

    await page.goBack()
    await expect(row).toBeVisible()
    await expect
      .poll(async () =>
        Math.abs(
          ((await rectOf(page, `[data-community-post-id="${target.postId}"]`))
            ?.top ?? Number.POSITIVE_INFINITY) - target.top,
        ),
      )
      .toBeLessThanOrEqual(4)
  })
})
