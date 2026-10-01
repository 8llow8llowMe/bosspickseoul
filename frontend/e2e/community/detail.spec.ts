import type { Locator } from '@playwright/test'
import { expect, test } from './test'
import { openCommunityDetail, rectOf, scrollWindowTo } from './measure'

/**
 * 커뮤니티 상세 — 본문·레일 간격(CM-020), 모바일 하단 고정 바(CM-027·028), 답글 접기(CM-026),
 * 라이트박스(CM-041), 모바일 사진 줄(CM-042).
 *
 * 간격은 그리드 배치 결과, 하단 바는 IntersectionObserver 판정, 라이트박스는 포털·포커스 가두기·
 * 스크롤 잠금, 사진 줄은 scroll-snap 과 scroll 이벤트라 모두 실제 브라우저가 있어야 안다.
 * 답글 접기는 vitest 도 보지만, 펼친 뒤 포커스가 버튼에 남는지는 실제 포커스 이동으로 본다.
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

  test('사진 3장 글 — 둘째에서 `→`·스와이프로 `3 / 3`, Esc 로 닫으면 누른 사진에 포커스 (CM-041)', async ({
    page,
  }) => {
    await openCommunityDetail(page, PHOTO_POST)

    const second = page.getByRole('button', { name: '첨부 이미지 2 크게 보기' })
    await second.click()

    const lightbox = page.getByRole('dialog', { name: '사진 크게 보기' })
    await expect(lightbox).toContainText('2 / 3')

    await page.keyboard.press('ArrowRight')
    await expect(lightbox).toContainText('3 / 3')
    // 끝에서는 더 넘어가지 않는다.
    await page.keyboard.press('ArrowRight')
    await expect(lightbox).toContainText('3 / 3')
    await page.keyboard.press('ArrowLeft')
    await expect(lightbox).toContainText('2 / 3')

    // 왼쪽으로 끌면 다음 장이다. 세로로 더 많이 끈 것은 스와이프가 아니다.
    const stage = lightbox.locator('[data-zoomed]')
    await swipe(stage, { dx: -40, dy: -120 })
    await expect(lightbox).toContainText('2 / 3')
    await swipe(stage, { dx: -160, dy: 10 })
    await expect(lightbox).toContainText('3 / 3')

    await page.keyboard.press('Escape')
    await expect(lightbox).toBeHidden()
    // 안에서 장을 넘겨도 돌아갈 곳은 누른 사진이다.
    await expect(second).toBeFocused()
  })

  test('모바일 사진 3장 — 가로 줄에 점 3개, 줄을 넘기면 지금 장이 따라온다 (CM-042)', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'mobile',
      '사진 줄은 <480 에서만 켠다.',
    )

    await openCommunityDetail(page, PHOTO_POST)

    const strip = page.locator('[data-community-photo-strip]')
    const dots = page.locator('[data-community-photo-dot]')
    const position = page.locator('[data-community-photo-position]')
    await expect(strip).toBeVisible()
    await expect(dots).toHaveCount(3)
    await expect(position).toHaveText('1 / 3')

    // 줄은 본문 열 안에서만 가로로 넘친다 — 페이지에는 가로 스크롤이 없다.
    const overflow = await strip.evaluate(element => ({
      strip: element.scrollWidth > element.clientWidth,
      page: document.documentElement.scrollWidth > window.innerWidth,
    }))
    expect(overflow).toEqual({ strip: true, page: false })

    for (const [index, label] of [
      [1, '2 / 3'],
      [2, '3 / 3'],
    ] as const) {
      await strip.evaluate((element, target) => {
        element.children[target]?.scrollIntoView({
          behavior: 'instant',
          block: 'nearest',
          inline: 'start',
        })
      }, index)
      await expect(position).toHaveText(label)
      await expect(dots.nth(index)).toHaveAttribute('data-active', 'true')
      await expect(dots.nth(0)).toHaveAttribute('data-active', 'false')
    }
  })

  test('답글 5개 — 3개만 보이고 `답글 2개 더 보기` 로 5개, 같은 버튼으로 접힌다 (CM-026)', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'desktop',
      '접힘은 폭과 무관하다 — desktop 하나에서만 본다.',
    )

    await openCommunityDetail(page, PHOTO_POST)

    const replies = page.locator('[data-community-comment="reply"]')
    const toggle = page.getByRole('button', { name: '답글 2개 더 보기' })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(replies).toHaveCount(3)

    await toggle.click()
    await expect(replies).toHaveCount(5)
    const collapse = page.getByRole('button', { name: '답글 접기' })
    await expect(collapse).toHaveAttribute('aria-expanded', 'true')
    // 펼침과 접기는 같은 버튼이라 포커스가 그대로 남는다.
    await expect(collapse).toBeFocused()

    await collapse.click()
    await expect(replies).toHaveCount(3)
  })

  test('모바일 — 긴 글을 읽는 중(반응 바가 아직 아래)에도 하단 바가 뜨고, 반응 바에 닿으면 물러난다 (CM-027)', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'mobile',
      '하단 바는 <480 에서만 뜬다.',
    )

    // 높이를 고정해 「반응 바가 첫 화면 아래」인 조건이 기기 프리셋에 흔들리지 않게 한다.
    const viewportHeight = 480
    await page.setViewportSize({ width: 375, height: viewportHeight })
    await openCommunityDetail(page, PHOTO_POST)
    await expect(page.locator(COMMENT_ENTRY)).toBeAttached()
    /*
      본문 사진은 lazy 이고 높이가 auto 라 그려지기 전에는 거의 0 이다. 그 전에 반응 바 자리를 재면
      그 뒤 사진이 펴지며 바가 아래로 밀려 계산한 스크롤 위치가 어긋난다 — 첫 장이 그려진 뒤 잰다.
    */
    await expect
      .poll(() =>
        page
          .locator('[data-community-photo-strip] img')
          .first()
          .evaluate(
            image =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalHeight > 0,
          ),
      )
      .toBe(true)
    await scrollWindowTo(page, 0)

    const reaction = await rectOf(page, REACTION_BAR)
    expect(reaction).not.toBeNull()
    if (!reaction) return
    expect(
      reaction.top,
      '반응 바가 첫 화면 안에 있어 「읽는 중」 자리가 없다',
    ).toBeGreaterThan(viewportHeight)

    const bar = page.locator(BOTTOM_BAR)
    await expect(bar).toBeVisible()
    await expect(page.locator('[data-community-article] h1')).toBeInViewport()

    // 반응 바가 화면에 들어오면 바는 없다(본문 반응 바와 같은 버튼이 두 벌 보이지 않게).
    await scrollWindowTo(page, Math.max(0, reaction.top - viewportHeight / 2))
    await expect(bar).toHaveCount(0)
  })
})

/** 사진 3장 · 답글 5개 댓글을 싣는 목 글(`community-mock.ts`). */
const PHOTO_POST = '9'

/**
 * 한 손가락 끌기. 라이트박스는 포인터 이벤트로 스와이프를 판정하므로(`photo-viewer.ts`
 * `getPhotoSwipeStep`) 터치 포인터의 down → up 을 그 자리에서 보낸다.
 */
const swipe = async (
  stage: Locator,
  { dx, dy }: { dx: number; dy: number },
) => {
  const box = await stage.boundingBox()
  expect(box, '스와이프할 사진 자리가 없다').not.toBeNull()
  if (!box) return

  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const pointer = { pointerId: 7, pointerType: 'touch', isPrimary: true }

  await stage.dispatchEvent('pointerdown', {
    ...pointer,
    clientX: x,
    clientY: y,
  })
  await stage.dispatchEvent('pointerup', {
    ...pointer,
    clientX: x + dx,
    clientY: y + dy,
  })
}
