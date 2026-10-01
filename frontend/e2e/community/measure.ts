import { expect, type Page } from '@playwright/test'
import { CONSOLE_NOISE } from '../home/measure'

/**
 * 커뮤니티 화면 실측 헬퍼.
 *
 * 화면은 **실데이터 경로 그대로** 열고, BFF 호출만 고정 응답으로 바꾼다(`./test` 의 자동 fixture →
 * `e2e/fixtures/community.ts`). 응답은 목 데이터 소스(`src/lib/community/community-mock.ts`)가 만든다.
 * 예전에는 `?mock=1` 목 모드로 열었는데, 목 모드는 dev 서버에서만 켜져 프로덕션 빌드에서 돌지 않았다(#469).
 * 무엇을 여기서 재고 무엇을 vitest 가 보는지는 `docs/runbook/qa.md` 「브라우저 실측 회귀」.
 */

export type CommunitySession = {
  /** dev 오버레이·HMR 잡음을 뺀 콘솔 error 메시지. */
  consoleErrors: string[]
  /** 연 뒤 나간 BFF 호출(경로 + 쿼리). */
  bffRequests: string[]
}

/** 콘솔 오류·BFF 호출 기록을 붙인다. `page.goto` 전에 불러야 첫 요청부터 잡힌다. */
export const watchCommunitySession = (page: Page): CommunitySession => {
  const session: CommunitySession = { consoleErrors: [], bffRequests: [] }

  page.on('console', message => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (CONSOLE_NOISE.some(noise => text.includes(noise))) return
    session.consoleErrors.push(text)
  })
  page.on('pageerror', error => {
    session.consoleErrors.push(`pageerror: ${error.message}`)
  })
  page.on('request', request => {
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/bff/')) return
    session.bffRequests.push(`${url.pathname}${url.search}`)
  })

  return session
}

/** 목록을 열고 첫 글 행이 그려질 때까지 기다린다. */
export const openCommunityList = async (page: Page, query = '') => {
  await page.goto(`/community/list${query}`, {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('[data-community-post-id]').first()).toBeVisible()
}

/** 상세를 열고 본문이 그려질 때까지 기다린다. */
export const openCommunityDetail = async (page: Page, postId: string) => {
  await page.goto(`/community/${postId}`, {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('[data-community-article]')).toBeVisible()
}

export type LayoutInvariants = {
  scrollWidth: number
  innerWidth: number
  /** 화면에 그려진 h1 수. 폭에 따라 CSS 로 갈아 끼우는 h1(글쓰기 편집 바/머리)은 숨은 쪽을 세지 않는다. */
  visibleH1Count: number
}

export const readLayoutInvariants = (page: Page): Promise<LayoutInvariants> =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    visibleH1Count: Array.from(document.querySelectorAll('h1')).filter(
      heading =>
        heading.getClientRects().length > 0 &&
        getComputedStyle(heading).visibility !== 'hidden',
    ).length,
  }))

/**
 * 창을 스크롤한다. 스크롤 이벤트 핸들러가 rAF 로 한 프레임 미뤄 계산하므로(FAB 접힘·숨는 헤더)
 * 두 프레임을 기다려 판정이 끝난 뒤 돌려준다. 고정 sleep 을 쓰지 않는다.
 */
export const scrollWindowTo = async (page: Page, top: number) => {
  await page.evaluate(async y => {
    window.scrollTo({ top: y, behavior: 'instant' })
    await new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
  }, top)
}

/** 요소의 뷰포트 기준 사각형. 없으면 null. */
export const rectOf = (page: Page, selector: string) =>
  page.evaluate(target => {
    const element = document.querySelector(target)
    if (!element) return null
    const { top, bottom, left, right } = element.getBoundingClientRect()
    return { top, bottom, left, right }
  }, selector)
