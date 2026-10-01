import { expect, test } from './test'
import { openCommunityDetail, rectOf, scrollWindowTo } from './measure'

/**
 * 커뮤니티 상세 — 본문·레일 간격(CM-020), 모바일 하단 고정 바(CM-027·028), 라이트박스(CM-041).
 *
 * 간격은 그리드 배치 결과, 하단 바는 IntersectionObserver 판정, 라이트박스는 포털·포커스 가두기·
 * 스크롤 잠금이라 모두 실제 브라우저가 있어야 안다.
 */

const REACTION_BAR = '[role="group"][aria-label="게시글 반응"]'
const COMMENT_ENTRY = '[data-community-comment-entry]'
const BOTTOM_BAR = '[data-community-bottom-bar]'

test.describe('커뮤니티 상세', () => {
  test('1440 — 본문과 레일 사이 간격이 24px 이하다 (CM-020)', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'desktop',
      '1440 폭은 desktop 프로젝트.',
    )

    await openCommunityDetail(page, '8')
    await expect(page.locator('[data-community-rail]')).toBeVisible()

    const article = await rectOf(page, '[data-community-article]')
    const rail = await rectOf(page, '[data-community-rail]')
    expect(article).not.toBeNull()
    expect(rail).not.toBeNull()
    if (!article || !rail) return

    const gap = rail.left - article.right
    expect(
      gap,
      `본문 오른쪽 끝과 레일 왼쪽 끝 사이 ${gap}px`,
    ).toBeGreaterThanOrEqual(0)
    expect(gap).toBeLessThanOrEqual(24)
  })

  test('모바일 — 반응 바·입력칸이 모두 화면 밖이면 하단 바가 뜨고, `댓글을 남겨 보세요` 가 입력칸에 포커스한다 (CM-027·028)', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'mobile',
      '하단 바는 <480 에서만 뜬다.',
    )

    /*
      반응 바와 입력칸 사이(구분 띠 · 댓글 목록)가 화면 한 장보다 짧으면 「둘 다 밖」인 자리가 없다.
      뷰포트 높이를 줄여 그 자리를 만든다(폭은 375 그대로). 글 1 은 댓글이 있어 그 사이가 가장 길다.
    */
    const viewportHeight = 400
    await page.setViewportSize({ width: 375, height: viewportHeight })
    await openCommunityDetail(page, '1')
    await expect(page.locator(COMMENT_ENTRY)).toBeAttached()

    const gapTop = await page.evaluate(
      ([reactionSelector, entrySelector]) => {
        const reaction = document.querySelector(reactionSelector)
        const entry = document.querySelector(entrySelector)
        if (!reaction || !entry) return null
        const reactionBottom =
          reaction.getBoundingClientRect().bottom + window.scrollY
        const entryTop = entry.getBoundingClientRect().top + window.scrollY
        return { reactionBottom, entryTop }
      },
      [REACTION_BAR, COMMENT_ENTRY] as const,
    )
    expect(gapTop).not.toBeNull()
    if (!gapTop) return
    expect(
      gapTop.entryTop - gapTop.reactionBottom,
      '반응 바와 입력칸 사이가 화면 높이보다 짧아 둘 다 밖인 자리가 없다',
    ).toBeGreaterThan(viewportHeight)

    const bar = page.locator(BOTTOM_BAR)

    // 반응 바가 화면 안에 있으면 바는 없다.
    await scrollWindowTo(
      page,
      Math.max(0, Math.floor(gapTop.reactionBottom) - viewportHeight / 2),
    )
    await expect(bar).toHaveCount(0)

    // 반응 바가 막 화면 위로 빠진 자리 — 입력칸은 아직 화면 아래다.
    await scrollWindowTo(page, Math.ceil(gapTop.reactionBottom) + 8)
    await expect(bar).toBeVisible()
    await expect
      .poll(async () => (await rectOf(page, BOTTOM_BAR))?.bottom)
      .toBeLessThanOrEqual(viewportHeight)

    await bar.getByRole('button', { name: '댓글을 남겨 보세요' }).click()
    await expect(page.locator(COMMENT_ENTRY)).toBeFocused()
    // 입력칸이 화면에 들어오면 바는 물러난다(입력칸과 겹치지 않게).
    await expect(bar).toHaveCount(0)
  })

  test('사진 2장 글 — 둘째 사진은 `2 / 2`, Esc 로 닫으면 그 사진에 포커스, 스크롤 잠금 해제 (CM-041)', async ({
    page,
  }) => {
    await openCommunityDetail(page, '6')

    const second = page.getByRole('button', { name: '첨부 이미지 2 크게 보기' })
    await second.click()

    const lightbox = page.getByRole('dialog', { name: '사진 크게 보기' })
    await expect(lightbox).toBeVisible()
    await expect(lightbox).toContainText('2 / 2')
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('hidden')

    await page.keyboard.press('Escape')
    await expect(lightbox).toBeHidden()
    await expect(second).toBeFocused()
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .not.toBe('hidden')
  })
})
