import { expect, test, type Page } from '@playwright/test'
import {
  RECOMMEND_RESULTS_PATH,
  routeRecommendApi,
} from '../fixtures/recommend'

/**
 * 상권 추천 모바일 바텀시트 — 업종 선택 목록이 **끝까지 스크롤되고 마지막 항목을 누를 수 있다**(#647).
 *
 * 시트 본문과 패널 `Content` 가 둘 다 스크롤 칸이던 때, 스크롤 거리가 없는 `Content` 가
 * `overscroll-behavior: contain` 으로 휠·터치 스크롤을 삼켜 목록 아래쪽에 닿을 수 없었다.
 * 정적 마크업으로는 스크롤 체인을 알 수 없어 실제 브라우저에서 휠로 굴려 본다.
 *
 * 여백도 같이 본다 — 시트 안 내용의 좌우 여백은 모바일 거터 16px 하나다(시트 테두리 1px 포함).
 * 시트 손잡이 줄이 이미 「업종 선택」을 말하므로 안쪽 제목은 화면에서 감춘다(헤딩·포커스 자리는 남는다).
 */

const SHEET = 'section[aria-label="상권 추천"]'
const SHEET_BODY = '[aria-label="상권 추천 내용"]'
/** DESIGN.md 모바일 거터. */
const MOBILE_GUTTER = 16
/** 시트 테두리(`border: 1px`). 여백은 화면 가장자리부터 잰다. */
const SHEET_BORDER = 1

/** 비교 바(시트 변형) — 위아래 8px + 버튼 44px + 위 테두리 1px. 아래에 거터를 두지 않는다(#647). */
const SHEET_COMPARE_BAR_HEIGHT = 61

const expandSheet = async (page: Page) => {
  const sheet = page.locator(SHEET)
  await expect(sheet).toBeVisible()
  if ((await sheet.getAttribute('data-sheet-snap')) !== 'expanded') {
    await page.getByRole('button', { name: /바텀시트 펼치기/ }).click()
  }
  await expect(sheet).toHaveAttribute('data-sheet-snap', 'expanded')
}

/** 시트 안에서 사용자처럼 휠을 굴린다. 스크롤을 코드로 옮기면 체인이 끊겨도 통과한다. */
const wheelInside = async (
  page: Page,
  box: { x: number; y: number; width: number; height: number },
) => {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 600)
}

const openServicePicker = async (page: Page) => {
  // 조건 없이 연다 — 업종은 지역과 독립이라 바로 고를 수 있고, 자치구를 고르면 행정동 목록 호출이
  // 따라 나가 fixture 가 커진다. 업종 목록은 정적 카탈로그라 어느 쪽이든 같다.
  await page.goto('/recommend')
  await expandSheet(page)

  await page.locator(`${SHEET_BODY} [data-step="service"]`).click()
  await expect(
    page.locator(SHEET_BODY).getByRole('button', { name: '조건으로 돌아가기' }),
  ).toBeVisible()
  // 뷰가 바뀔 때 패널이 옆에서 미끄러져 들어온다(translateX 8px → 0). 다 들어온 뒤에 잰다.
  await page
    .locator(`${SHEET_BODY} [data-panel-view="picker"]`)
    .evaluate(element =>
      Promise.all(element.getAnimations().map(animation => animation.finished)),
    )
}

test.describe('상권 추천 모바일 시트 스크롤', () => {
  test.skip(({ isMobile }) => !isMobile, '바텀시트는 1024px 미만에서만 그린다')

  test('조건 화면은 내용 높이만큼 낮게 열리고, 선택 목록으로 넘어가면 시트가 더 올라온다', async ({
    page,
    context,
  }) => {
    await routeRecommendApi(context)
    await page.goto('/recommend')
    await expandSheet(page)

    const sheet = page.locator(SHEET)
    const submit = page
      .locator(SHEET_BODY)
      .getByRole('button', { name: '상권 추천받기' })
    // 높이 전환(250ms)이 끝난 뒤에 잰다 — 두 번 재어 같으면 멈춘 것이다.
    const settledHeight = async () => {
      let previous = -1
      await expect(async () => {
        const current = (await sheet.boundingBox())?.height ?? 0
        const last = previous
        previous = current
        expect(current).toBe(last)
      }).toPass({ intervals: [100], timeout: 5_000 })
      return previous
    }

    const criteriaHeight = await settledHeight()
    const sheetBox = await sheet.boundingBox()
    const submitBox = await submit.boundingBox()
    if (!sheetBox || !submitBox) throw new Error('시트를 잴 수 없습니다.')

    // 제출 버튼 아래로 남는 자리는 패널 아래 여백(16px)뿐이다 — 빈 공간으로 지도를 가리지 않는다.
    const below =
      sheetBox.y + sheetBox.height - (submitBox.y + submitBox.height)
    expect(below).toBeGreaterThanOrEqual(MOBILE_GUTTER - 0.5)
    expect(below).toBeLessThanOrEqual(MOBILE_GUTTER + 2)

    await page.locator(`${SHEET_BODY} [data-step="service"]`).click()
    const pickerHeight = await settledHeight()
    expect(pickerHeight).toBeGreaterThan(criteriaHeight)

    await page
      .locator(SHEET_BODY)
      .getByRole('button', { name: '조건으로 돌아가기' })
      .click()
    expect(await settledHeight()).toBe(criteriaHeight)
  })

  test('업종 목록을 휠로 끝까지 내리면 마지막 항목이 시트 안에 들어오고 누를 수 있다', async ({
    page,
    context,
  }) => {
    const api = await routeRecommendApi(context)
    await openServicePicker(page)

    const body = page.locator(SHEET_BODY)
    const options = body.locator('li button')
    const last = options.last()
    const lastName = (await last.innerText()).trim()
    const bodyBox = await body.boundingBox()
    if (!bodyBox) throw new Error('시트 본문 상자를 잴 수 없습니다.')

    // 처음에는 마지막 항목이 시트 아래로 잘려 있다(스크롤이 필요한 목록이다).
    const before = await last.boundingBox()
    expect(before?.y ?? 0).toBeGreaterThan(bodyBox.y + bodyBox.height)

    // 사용자처럼 시트 안에서 휠을 굴린다. 스크롤을 코드로 옮기지 않는다 — 그러면 체인이 끊겨도 통과한다.
    await page.mouse.move(
      bodyBox.x + bodyBox.width / 2,
      bodyBox.y + bodyBox.height - 40,
    )
    await expect(async () => {
      await page.mouse.wheel(0, 600)
      const box = await last.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        bodyBox.y + bodyBox.height + 0.5,
      )
      expect(box!.y).toBeGreaterThanOrEqual(bodyBox.y)
    }).toPass({ timeout: 15_000 })

    // 마지막 항목 한가운데를 실제로 누른다 — 그 자리를 다른 요소가 덮고 있으면 선택되지 않는다.
    const box = await last.boundingBox()
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

    await expect(
      body.locator('[data-step="service"]'),
      '고른 업종이 조건 조각에 들어간다',
    ).toContainText(lastName)
    expect(api.unhandled, '고정 응답이 없는 BFF 호출').toEqual([])
  })

  test('시트 안 내용의 좌우 여백은 모바일 거터 하나이고, 안쪽 제목은 겹쳐 그리지 않는다', async ({
    page,
    context,
  }) => {
    await routeRecommendApi(context)
    await openServicePicker(page)

    const body = page.locator(SHEET_BODY)
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('뷰포트를 알 수 없습니다.')

    const list = body.locator('ul').first()
    const listBox = await list.boundingBox()
    if (!listBox) throw new Error('목록 상자를 잴 수 없습니다.')

    expect(Math.round(listBox.x)).toBe(SHEET_BORDER + MOBILE_GUTTER)
    expect(Math.round(viewport.width - (listBox.x + listBox.width))).toBe(
      SHEET_BORDER + MOBILE_GUTTER,
    )

    // 손잡이 줄은 「업종 선택」을 보여 주고, 안쪽 헤딩은 스크린리더용으로만 남는다.
    await expect(
      page.locator(SHEET).getByRole('button', { name: /바텀시트 접기/ }),
    ).toContainText('업종 선택')
    const heading = body.getByRole('heading', { name: '업종 선택' })
    await expect(heading).toHaveCount(1)
    const headingBox = await heading.boundingBox()
    expect(headingBox?.width ?? 0).toBeLessThanOrEqual(1)
    // 뒤로 가기와 개수는 보인다.
    await expect(
      body.getByRole('button', { name: '조건으로 돌아가기' }),
    ).toBeVisible()
    await expect(body.getByText('30개')).toBeVisible()
  })

  test('결과 목록을 끝까지 내리면 마지막 카드가 보이고, 비교 바는 시트 바닥에 붙어 카드를 가리지 않는다', async ({
    page,
    context,
  }) => {
    const api = await routeRecommendApi(context)
    await page.goto(RECOMMEND_RESULTS_PATH)
    await expandSheet(page)

    const body = page.locator(SHEET_BODY)
    const cards = body.locator('article[data-result-card="true"]')
    await expect(cards).toHaveCount(5)
    const bodyBox = await body.boundingBox()
    if (!bodyBox) throw new Error('시트 본문 상자를 잴 수 없습니다.')
    const bodyBottom = bodyBox.y + bodyBox.height

    // 비교에 하나를 담으면 한 줄 바가 나타나 시트 바닥에 붙는다(#569 · #647).
    const bar = body.locator('[data-compare-bar="true"]')
    await expect(bar).toHaveCount(0)
    await body
      .getByLabel(/비교 담기/)
      .first()
      .check()
    await expect(bar).toBeVisible()
    const barBox = await bar.boundingBox()
    if (!barBox) throw new Error('비교 바 상자를 잴 수 없습니다.')
    expect(Math.abs(barBox.y + barBox.height - bodyBottom)).toBeLessThanOrEqual(
      1,
    )
    expect(Math.round(barBox.height)).toBe(SHEET_COMPARE_BAR_HEIGHT)

    // 처음에는 마지막 카드가 시트 아래로 잘려 있다(스크롤이 필요한 목록이다).
    const last = cards.last()
    const initial = await last.boundingBox()
    expect(initial?.y ?? 0).toBeGreaterThan(bodyBottom)

    // 끝까지 내리면 마지막 카드 아래끝이 바 위로 드러난다.
    await expect(async () => {
      await wheelInside(page, bodyBox)
      const box = await last.boundingBox()
      const stuck = await bar.boundingBox()
      expect(box).not.toBeNull()
      expect(stuck).not.toBeNull()
      expect(box!.y + box!.height).toBeLessThanOrEqual(stuck!.y)
    }).toPass({ timeout: 15_000 })

    // 바는 끝까지 내려도 시트 바닥 그대로다.
    const stuckBox = await bar.boundingBox()
    expect(
      Math.abs(stuckBox!.y + stuckBox!.height - bodyBottom),
    ).toBeLessThanOrEqual(1)

    // 마지막 카드의 마지막 버튼 한가운데를 다른 요소(바)가 덮지 않는다.
    const lastButton = last.locator('button, a').last()
    const buttonBox = await lastButton.boundingBox()
    if (!buttonBox) throw new Error('마지막 카드 버튼 상자를 잴 수 없습니다.')
    const isTopmost = await lastButton.evaluate(
      (element, point) => {
        const hit = document.elementFromPoint(point.x, point.y)
        return Boolean(hit && (hit === element || element.contains(hit)))
      },
      {
        x: buttonBox.x + buttonBox.width / 2,
        y: buttonBox.y + buttonBox.height / 2,
      },
    )
    expect(isTopmost, '마지막 카드 버튼이 맨 위에 있다').toBe(true)

    expect(api.unhandled, '고정 응답이 없는 BFF 호출').toEqual([])
  })
})
