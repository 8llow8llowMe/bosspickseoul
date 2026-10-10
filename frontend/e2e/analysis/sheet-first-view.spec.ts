import { expect, test, type Page } from '@playwright/test'
import { routeAnalysisApi } from '../fixtures/analysis'

/**
 * 상권분석 모바일 시트 첫 화면(#648).
 *
 * 「지금 많이 본 상권」이 단계 탭 밑에 따로 서서 스크롤해도 자리를 먹었고, 이름 검색·단계 탭·CTA
 * 사이에 자치구 카드가 반 줄만 보였다. 이제 지름길은 목록 스크롤의 첫 블록이다.
 *
 * - 390×844·440×956: 시트 기본 높이에서 자치구 카드가 **두 줄 이상 온전히** 보인다.
 * - 375×667: 두 줄은 목표가 아니다. 지도 최소 높이(180px)·시트 높이 상수를 지켜 작은 화면에서도 지도
 *   맥락을 남기기로 했고(2026-10-10 결정), 그러면 시트가 422px 에 묶인다. 대신 지름길 칩 줄이 온전히
 *   보이고 카드 줄이 일부라도 비쳐 「아래로 더 있다」는 스크롤 단서가 생겨야 한다
 *   (explorer.md 「인기 상권 지름길」).
 *
 * BFF 는 `e2e/fixtures/analysis.ts` 고정 응답이다(백엔드 없이 돈다). 모바일 시트는 ≤1024px 에서만
 * 그려지므로 mobile 프로젝트에서만 돈다(desktop 프로젝트의 1440 기기 설정과 섞지 않는다).
 */

const SHEET = 'section[aria-label="분석 대상 선택"]'
const POPULAR = 'section[aria-label="지금 많이 본 상권"]'

type FirstView = {
  /** 위아래가 목록 영역 안에 온전히 든 카드 줄 수. */
  fullRows: number
  /** 목록 영역에 조금이라도 걸친 카드 줄 수. */
  touchedRows: number
  shortcutInsideScroller: boolean
  /** 지름길 칩 줄이 목록 영역 안에 온전히 보이는가. */
  chipsFullyVisible: boolean
  /** 목록 제목(h2)이 DOM 에 있으면서 화면에서는 감춰졌는가(sr-only). */
  titleVisuallyHidden: boolean
}

/** 목록 스크롤 영역(푸터 바로 앞 형제)을 기준으로 잰다. */
const measureFirstView = (page: Page) =>
  page.evaluate(
    ({ sheetSelector, popularSelector }): FirstView | null => {
      const sheet = document.querySelector(sheetSelector)
      const panel = sheet?.querySelector(
        'section[aria-label="상권 분석 조건 선택"]',
      )
      const footer = panel?.querySelector('footer')
      const body = footer?.previousElementSibling
      if (!footer || !body) return null

      const top = body.getBoundingClientRect().top
      const bottom = footer.getBoundingClientRect().top
      const full = new Set<number>()
      const touched = new Set<number>()
      for (const option of body.querySelectorAll('button')) {
        if (option.closest(popularSelector)) continue
        const rect = option.getBoundingClientRect()
        if (rect.height < 40) continue
        const row = Math.round(rect.top)
        if (rect.bottom > top && rect.top < bottom) touched.add(row)
        if (rect.top >= top - 1 && rect.bottom <= bottom + 1) full.add(row)
      }

      const chips = [
        ...body.querySelectorAll(`${popularSelector} button`),
      ].filter(chip => chip.getBoundingClientRect().height >= 44)
      const chipsFullyVisible =
        chips.length > 0 &&
        chips.every(chip => {
          const rect = chip.getBoundingClientRect()
          return rect.top >= top - 1 && rect.bottom <= bottom + 1
        })

      const title = body.querySelector('h2')
      // 감추는 것은 제목 줄(h2 + 개수) 컨테이너다. h2 자신의 상자는 잘려도 크기가 남는다.
      const titleRect = title?.parentElement?.getBoundingClientRect()

      return {
        fullRows: full.size,
        touchedRows: touched.size,
        shortcutInsideScroller: Boolean(body.querySelector(popularSelector)),
        chipsFullyVisible,
        titleVisuallyHidden: Boolean(
          titleRect && titleRect.width <= 1 && titleRect.height <= 1,
        ),
      }
    },
    { sheetSelector: SHEET, popularSelector: POPULAR },
  )

const openSheet = async (page: Page) => {
  await page.goto('/analysis')
  const sheet = page.locator(SHEET)
  await expect(sheet).toHaveAttribute('data-sheet-snap', 'expanded')
  await expect(sheet.locator(POPULAR)).toBeVisible()
  await expect(sheet.getByRole('button', { name: '강남구' })).toBeAttached()
}

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== 'mobile',
    '모바일 시트는 mobile 프로젝트에서만 잰다',
  )
})

for (const viewport of [
  { width: 390, height: 844 },
  { width: 440, height: 956 },
]) {
  test.describe(`상권분석 시트 첫 화면 ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport })

    test('지름길은 목록 스크롤 첫 블록이고 자치구 카드가 두 줄 이상 보인다', async ({
      context,
      page,
    }) => {
      const api = await routeAnalysisApi(context)
      await openSheet(page)

      // 시트 높이 트랜지션(motion-standard)이 끝나 값이 설 때까지 다시 잰다.
      await expect
        .poll(async () => (await measureFirstView(page))?.fullRows ?? -1)
        .toBeGreaterThanOrEqual(2)

      const view = await measureFirstView(page)
      expect(view?.shortcutInsideScroller).toBe(true)
      expect(view?.titleVisuallyHidden).toBe(true)
      expect(api.unhandled, '고정 응답이 없는 BFF 호출').toEqual([])
    })
  })
}

test.describe('상권분석 시트 첫 화면 375×667', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('지름길 칩 줄이 온전히 보이고 카드 줄이 비쳐 스크롤 단서가 생긴다', async ({
    context,
    page,
  }) => {
    const api = await routeAnalysisApi(context)
    await openSheet(page)

    await expect
      .poll(async () => (await measureFirstView(page))?.touchedRows ?? -1)
      .toBeGreaterThanOrEqual(1)

    const view = await measureFirstView(page)
    expect(view?.shortcutInsideScroller).toBe(true)
    expect(view?.chipsFullyVisible).toBe(true)
    expect(api.unhandled, '고정 응답이 없는 BFF 호출').toEqual([])
  })
})

/*
  2단계(행정동)는 불러오는 동안 꺼진 필터 칸으로 자리를 잡아 둔다. 준비가 끝나도 단계 탭이 밀리지 않는다.
*/
test.describe('상권분석 시트 2단계 불러오는 중 375×667', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('불러오는 동안과 준비된 뒤 단계 탭 위치가 같다', async ({
    context,
    page,
  }) => {
    const api = await routeAnalysisApi(context)
    // page 라우트가 context 라우트보다 먼저 받는다. 풀어 줄 때까지 행정동 응답을 붙잡는다.
    let release: () => void = () => undefined
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    await page.route(
      '**/api/bff/regions/districts/11680/administrations',
      async route => {
        await gate
        await route.fallback()
      },
    )

    await page.goto('/analysis?districtCode=11680')
    const sheet = page.locator(SHEET)
    await expect(sheet).toHaveAttribute('data-sheet-snap', 'expanded')
    await expect(
      sheet.getByRole('status', { name: '선택 항목 불러오는 중' }),
    ).toBeVisible()

    const stepsTop = () =>
      sheet
        .locator('ol[aria-label="분석 조건 단계"]')
        .evaluate(element => Math.round(element.getBoundingClientRect().top))
    // 높이 트랜지션이 끝나 값이 설 때까지 기다린다.
    let loadingTop = -1
    await expect
      .poll(async () => {
        const previous = loadingTop
        loadingTop = await stepsTop()
        return loadingTop === previous
      })
      .toBe(true)

    release()
    await expect(sheet.getByRole('button', { name: '행정1동' })).toBeVisible()
    expect(await stepsTop()).toBe(loadingTop)
    expect(api.unhandled, '고정 응답이 없는 BFF 호출').toEqual([])
  })
})

/*
  2단계(행정동)부터는 목록 필터가 시트 머리 아래·단계 탭 위 고정 자리에 선다. 목록을 스크롤해도 그대로이고,
  목록 스크롤 안에는 검색 칸이 없다. 단계 탭 줄은 56px 이하다(탭 48 + 위아래 4, 경계선 별도).
*/
test.describe('상권분석 시트 2단계 375×667', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('목록 필터는 단계 탭 위에 고정되고 목록은 항목부터 시작한다', async ({
    context,
    page,
  }) => {
    const api = await routeAnalysisApi(context)
    await page.goto('/analysis?districtCode=11680')

    const sheet = page.locator(SHEET)
    await expect(sheet).toHaveAttribute('data-sheet-snap', 'expanded')
    await expect(
      sheet.getByRole('searchbox', { name: '행정동 검색' }),
    ).toBeVisible()
    await expect(sheet.getByRole('button', { name: '행정1동' })).toBeVisible()

    const layout = () =>
      page.evaluate(sheetSelector => {
        const panel = document
          .querySelector(sheetSelector)
          ?.querySelector('section[aria-label="상권 분석 조건 선택"]')
        const steps = panel?.querySelector('ol[aria-label="분석 조건 단계"]')
        const footer = panel?.querySelector('footer')
        const body = footer?.previousElementSibling
        const input = panel?.querySelector('input[type="search"]')
        if (!steps || !body || !input) return null
        const firstOption = body.querySelector('button')
        return {
          inputBottom: Math.round(input.getBoundingClientRect().bottom),
          stepsTop: Math.round(steps.getBoundingClientRect().top),
          stepsHeight: Math.round(steps.getBoundingClientRect().height),
          searchInsideList: Boolean(body.querySelector('input')),
          /* 목록 위 여백 = 스크롤 영역 위 끝 ~ 첫 항목. 제목·검색 칸이 없으면 안쪽 여백(8)뿐이다. */
          listLeadPx: firstOption
            ? Math.round(
                firstOption.getBoundingClientRect().top -
                  body.getBoundingClientRect().top,
              )
            : -1,
          scrollable: body.scrollHeight > body.clientHeight,
        }
      }, SHEET)

    await expect.poll(async () => (await layout())?.scrollable).toBe(true)
    const before = await layout()
    expect(before?.inputBottom).toBeLessThanOrEqual(before?.stepsTop ?? 0)
    expect(before?.searchInsideList).toBe(false)
    expect(before?.listLeadPx).toBeLessThanOrEqual(12)
    // 경계선 1px 을 뺀 탭 줄 높이.
    expect((before?.stepsHeight ?? 99) - 1).toBeLessThanOrEqual(56)

    await page.evaluate(sheetSelector => {
      const footer = document.querySelector(`${sheetSelector} footer`)
      footer?.previousElementSibling?.scrollBy(0, 200)
    }, SHEET)
    await expect
      .poll(async () => (await layout())?.inputBottom)
      .toBe(before?.inputBottom)

    expect(api.unhandled, '고정 응답이 없는 BFF 호출').toEqual([])
  })
})
