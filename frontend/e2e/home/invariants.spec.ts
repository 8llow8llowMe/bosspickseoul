import { expect, test } from '@playwright/test'
import { routeHomeApi } from '../fixtures/home'
import { measureHomeMetrics, openHome } from './measure'

/**
 * 홈 불변식 — **CI(`frontend-ci / e2e`)에서 도는 홈 슈트**(#632).
 *
 * 래칫(`home-metrics.spec.ts`)과 나눈 이유: 래칫의 수치(문서 높이·sticky 비중·첫 CTA 위치·대비·
 * 글자 크기·터치 타깃)는 **dev 서버 + 실응답** 으로 잰 기준선과 비교한다. CI 는 프로덕션 빌드에
 * 백엔드가 없어 번들·폰트 로딩과 데이터가 다르고, 그 차이가 수치를 흔든다. 그래서 래칫은 로컬 전용이다.
 *
 * 여기 단언은 서버 종류·데이터 값과 무관하게 늘 참이어야 하는 것만 둔다.
 * - 가로 넘침 없음 · h1 정확히 하나 · `main` 링크 허용 목록 · 콘솔 오류 0
 * - **합니다체 문장 0** — 해요체가 기본이다(#613 의 문체 회귀가 다음 배치에서야 발견된 일을 막는다).
 *   래칫의 기준선도 0 이지만 래칫은 CI 에서 돌지 않는다. 목표(0)를 그대로 단언한다.
 * - 첫 페인트 BFF 호출 ≤3 — 감사 목표값(`home-metrics.spec.ts` 의 `TARGET.bffRequests`)이다.
 *
 * 첫 페인트 BFF 호출은 `e2e/fixtures/home.ts` 가 고정 응답으로 받는다. 받지 못한 호출은 501 로 막혀
 * 콘솔 오류와 `unhandled` 로 드러난다.
 */

/** `main` 안 링크가 갈 수 있는 곳. 홈은 보호 라우트로 보내지 않는다. */
const ALLOWED_PATHS = [
  '/status',
  '/analysis',
  '/recommend',
  '/simulation',
  '/register',
]

/**
 * 홈이 밖으로 보내도 되는 곳 — 데이터 출처 카드의 공식 원문(data-sources.md D4-4).
 * 위 목록의 목적은 「보호 라우트로 보내지 않는다」라 외부는 공식 데이터 도메인만 연다.
 */
const ALLOWED_EXTERNAL_HOSTS = ['data.seoul.go.kr', 'www.data.go.kr']

const isAllowedLink = (href: string): boolean => {
  if (/^https?:\/\//.test(href)) {
    return ALLOWED_EXTERNAL_HOSTS.includes(new URL(href).host)
  }
  const [pathname] = href.split('?')
  return ALLOWED_PATHS.includes(pathname)
}

/** 감사 목표(home-ux-audit-2026-09-11.md §5). 래칫의 `TARGET` 과 같은 값이다. */
const MAX_FIRST_PAINT_BFF_REQUESTS = 3

test.describe('홈 불변식', () => {
  test('가로 넘침·h1·링크·콘솔 오류·문체·첫 페인트 BFF 호출', async ({
    page,
    context,
  }, testInfo) => {
    const api = await routeHomeApi(context)
    const session = await openHome(page)
    const metrics = await measureHomeMetrics(page)

    await testInfo.attach('home-invariants', {
      body: JSON.stringify(
        {
          horizontalOverflow: metrics.horizontalOverflow,
          h1Count: metrics.h1Count,
          linkHrefs: metrics.linkHrefs,
          sentenceEndings: metrics.sentenceEndings,
          consoleErrors: session.consoleErrors,
          bffRequests: session.bffRequests,
          unhandled: api.unhandled,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    })

    expect(metrics.horizontalOverflow, '가로 스크롤이 생겼습니다.').toBe(false)
    expect(metrics.h1Count, 'h1 은 정확히 1개여야 합니다.').toBe(1)

    const disallowed = metrics.linkHrefs.filter(href => !isAllowedLink(href))
    expect(
      disallowed,
      `허용 목록 밖 링크가 있습니다: ${disallowed.join(', ')}`,
    ).toEqual([])

    expect(
      metrics.sentenceEndings.formal,
      '합니다체 문장이 있습니다(해요체가 기본입니다).',
    ).toBe(0)

    expect(
      session.bffRequests.length,
      `첫 페인트 BFF 호출이 목표를 넘었습니다: ${session.bffRequests.join(', ')}`,
    ).toBeLessThanOrEqual(MAX_FIRST_PAINT_BFF_REQUESTS)
    expect(api.unhandled, '고정 응답이 없는 BFF 호출').toEqual([])

    expect(
      session.consoleErrors,
      `콘솔 오류가 있습니다: ${session.consoleErrors.join(' / ')}`,
    ).toEqual([])
  })
})
