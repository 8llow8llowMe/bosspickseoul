import type { Page } from '@playwright/test'
import { expect, test } from './test'
import { openCommunityDetail, openCommunityList } from './measure'

/**
 * 커뮤니티 로컬 컨트롤의 모바일 히트 영역(#633).
 *
 * 보이는 높이가 44 보다 작은 컨트롤(댓글 행 동작 36, 반응 바·지역 경로·검색 지우기·전체 글 보기 40)은
 * `touchHitArea()` 가 깐 `::before` 로 히트 영역만 44 까지 넓힌다. 넓어진 영역이 **이웃 컨트롤의 히트
 * 영역과 겹치면** 뒤쪽 요소가 탭을 가져가므로, 겹치지 않는지는 실제 배치에서만 알 수 있다.
 * 44 미만인데 히트 영역을 넓히지 않은 정의는 vitest(`src/components/ui/button-heights.test.ts`)가 잡는다.
 */

type Box = { left: number; right: number; top: number; bottom: number }

type HitReport = {
  name: string
  width: number
  height: number
  /** 가장 가까운 이웃 히트 영역까지의 거리. 음수면 겹친다. */
  nearestGap: number
  nearest: string
}

/**
 * `selector` 로 찾은 컨트롤마다 히트 영역(요소 상자 ∪ 가운데 정렬된 `::before`)과 가장 가까운 이웃까지의
 * 거리를 잰다. 이웃은 같은 층(대화상자 안이면 그 대화상자)의 보이는 a·button·input·select·textarea 다.
 * 검색칸 안에 겹쳐 놓은 지우기 버튼처럼 **자기를 품은 입력칸**은 이웃으로 보지 않는다.
 */
const readHitAreas = (page: Page, selector: string) =>
  page.evaluate((target): HitReport[] => {
    const hitOf = (element: Element): Box => {
      const rect = element.getBoundingClientRect()
      const before = getComputedStyle(element, '::before')
      let width = rect.width
      let height = rect.height
      if (before.content !== 'none' && before.position === 'absolute') {
        width = Math.max(width, parseFloat(before.width) || 0)
        height = Math.max(height, parseFloat(before.height) || 0)
      }
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      return {
        left: centerX - width / 2,
        right: centerX + width / 2,
        top: centerY - height / 2,
        bottom: centerY + height / 2,
      }
    }
    const distance = (a: Box, b: Box) => {
      const dx = Math.max(b.left - a.right, a.left - b.right)
      const dy = Math.max(b.top - a.bottom, a.top - b.bottom)
      return dx < 0 && dy < 0 ? Math.max(dx, dy) : Math.max(dx, dy, 0)
    }
    const labelOf = (element: Element) =>
      (element.getAttribute('aria-label') ?? element.textContent ?? '').trim()
    const visible = (element: Element) => element.getClientRects().length > 0
    /** `position: fixed` 조상(포털 하단 바 등)이 있으면 스크롤과 무관한 층이라 좌표 비교에서 뺀다. */
    const fixedLayer = (element: Element) => {
      for (
        let node: Element | null = element;
        node;
        node = node.parentElement
      ) {
        if (getComputedStyle(node).position === 'fixed') return node
      }
      return null
    }

    return Array.from(document.querySelectorAll(target))
      .filter(visible)
      .map(element => {
        element.scrollIntoView({ block: 'center', behavior: 'instant' })
        const hit = hitOf(element)
        const ownFixed = fixedLayer(element)
        const layer = element.closest('[role="dialog"]') ?? document
        const host = element.parentElement
        let nearest = { name: '', gap: Number.POSITIVE_INFINITY }

        for (const other of layer.querySelectorAll(
          'a, button, input, select, textarea',
        )) {
          if (
            other === element ||
            other.contains(element) ||
            element.contains(other) ||
            !visible(other) ||
            fixedLayer(other) !== ownFixed
          ) {
            continue
          }
          const overlaid =
            other instanceof HTMLInputElement &&
            getComputedStyle(element).position === 'absolute' &&
            host?.contains(other)
          if (overlaid) continue

          const gap = distance(hit, hitOf(other))
          if (gap < nearest.gap) nearest = { name: labelOf(other), gap }
        }

        return {
          name: labelOf(element),
          width: hit.right - hit.left,
          height: hit.bottom - hit.top,
          nearestGap: nearest.gap,
          nearest: nearest.name,
        }
      })
  }, selector)

const expectTouchable = (reports: HitReport[], expectedCount: number) => {
  expect(reports).toHaveLength(expectedCount)
  for (const report of reports) {
    expect(report.height, `${report.name} 히트 높이`).toBeGreaterThanOrEqual(44)
    expect(report.width, `${report.name} 히트 폭`).toBeGreaterThanOrEqual(44)
    expect(
      report.nearestGap,
      `${report.name} ↔ ${report.nearest} 히트 영역 간격`,
    ).toBeGreaterThanOrEqual(0)
  }
}

test.describe('커뮤니티 모바일 히트 영역 (#633)', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'mobile',
      '히트 영역 확장은 ≤1023 에서만 켜진다',
    )
  })

  test('목록 — `전체 글 보기`·검색어 지우기', async ({ page }) => {
    await openCommunityList(page, '?targetType=DISTRICT&targetCode=11680')
    expectTouchable(
      await readHitAreas(page, 'h1 + a[href^="/community/list"]'),
      1,
    )

    await page.getByRole('searchbox', { name: '게시글 검색어' }).fill('강남')
    expectTouchable(
      await readHitAreas(page, 'button[aria-label="검색어 지우기"]'),
      1,
    )
  })

  test('지역 시트 — 경로 버튼', async ({ page }) => {
    await openCommunityList(page)
    await page.locator('[data-region-chip="filter"]').click()
    const sheet = page.getByRole('dialog', { name: '지역 선택' })
    await sheet.getByRole('button', { name: '강남구', exact: true }).click()
    await sheet
      .getByRole('button', { name: /역삼1동/ })
      .first()
      .click()
    await expect(
      sheet.getByRole('navigation', { name: '지역 경로' }),
    ).toContainText('역삼1동')

    expectTouchable(
      await readHitAreas(page, 'nav[aria-label="지역 경로"] button'),
      2,
    )
  })

  test('상세 — 반응 바·댓글 행 동작·답글 펼치기', async ({ page }) => {
    // 9번 글(목 데이터): 댓글 좋아요 4개(댓글 1 + 보이는 답글 3), `답글 달기` 1개, `답글 2개 더 보기` 1개.
    // 개수를 고정해 aria-label 문구가 바뀌어 대상이 측정에서 소리 없이 빠지지 않게 한다.
    await openCommunityDetail(page, '9')

    expectTouchable(
      await readHitAreas(
        page,
        '[role="group"][aria-label="게시글 반응"] button',
      ),
      3,
    )

    const rowActions = await readHitAreas(
      page,
      [
        'button[aria-label^="댓글 좋아요"]',
        'button[aria-label^="댓글 좋아요"] + button',
        'button[aria-expanded]:not([aria-label]):not([aria-haspopup])',
      ].join(', '),
    )
    const names = rowActions.map(item => item.name)
    expect(names.filter(name => name.startsWith('댓글 좋아요'))).toHaveLength(4)
    expect(names.filter(name => name === '답글 달기')).toHaveLength(1)
    expect(
      names.filter(name => /^답글 \d+개 더 보기$/.test(name)),
    ).toHaveLength(1)
    expectTouchable(rowActions, 6)
  })
})
