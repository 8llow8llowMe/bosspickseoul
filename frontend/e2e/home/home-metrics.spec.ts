import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { measureHomeMetrics, openHome, type HomeMetrics } from './measure'

/**
 * 홈 감사 지표 회귀 — **래칫(ratchet)**.
 *
 * 이 테스트는 「좋아졌는가」가 아니라 「나빠지지 않았는가」를 본다. 기준선은
 * `e2e/baselines/home.<project>.json` 이고, 값은 **나아졌을 때만 내린다**
 * (`docs/runbook/qa.md` 「브라우저 실측 회귀」).
 *
 * 목표값은 `docs/features/home/home-ux-audit-2026-09-11.md` §5 재측정 기준이다.
 *
 * | 지표                        | 목표        |
 * | --------------------------- | ----------- |
 * | 모바일 h1 위치              | 0 화면      |
 * | 모바일 첫 CTA               | ≤0.8 화면   |
 * | AA 미달 색 조합             | 0           |
 * | 문서 높이(1440×900)         | ≤8 화면     |
 * | sticky 트랙 비중            | ≤50%        |
 * | 합니다체 문장               | 0           |
 * | 스케일 밖 글자 크기         | 0 종        |
 * | 44px 미만 터치 타깃(모바일) | 0           |
 * | 모바일 첫 페인트 API 호출   | ≤3          |
 *
 * 폰트 전송량(3,049KB → ≤500KB)은 프로덕션 빌드에서만 뜻이 있어 여기서 재지 않는다.
 */
const TARGET = {
  h1Screen: 0,
  firstCtaScreen: 0.8,
  contrastFailures: 0,
  docHeightScreens: 8,
  stickyTrackShare: 0.5,
  formalSentences: 0,
  offScaleFontSizes: 0,
  smallTapTargets: 0,
  bffRequests: 3,
} as const

/** 렌더 오차·서브픽셀 흔들림을 흡수하는 폭. 회귀를 놓칠 만큼 넓지 않게 둔다. */
const SLACK = {
  docHeightScreens: 0.1,
  stickyTrackShare: 0.02,
  screenPosition: 0.05,
} as const

type Baseline = {
  measuredAt: string
  viewport: { width: number; height: number }
  docHeightScreens: number
  stickyTrackShare: number
  h1Screen: number
  firstCtaScreen: number
  contrastCombinations: number
  contrastFailures: number
  smallTapTargets: number
  offScaleFontSizes: number
  offScaleFontSizeList: number[]
  sentenceEndings: { formal: number; polite: number }
  bffRequests: number
}

const baselinePath = (project: string) =>
  path.join(__dirname, '..', 'baselines', `home.${project}.json`)

const toBaseline = (metrics: HomeMetrics, bffRequests: number): Baseline => ({
  measuredAt: new Date().toISOString().slice(0, 10),
  viewport: metrics.viewport,
  docHeightScreens: metrics.docHeightScreens,
  stickyTrackShare: metrics.stickyTrackShare,
  h1Screen: metrics.h1Screen ?? -1,
  firstCtaScreen: metrics.firstCtaScreen ?? -1,
  contrastCombinations: metrics.contrastCombinations,
  contrastFailures: metrics.contrastFailures,
  smallTapTargets: metrics.smallTapTargets,
  offScaleFontSizes: metrics.offScaleFontSizes,
  offScaleFontSizeList: metrics.offScaleFontSizeList,
  sentenceEndings: metrics.sentenceEndings,
  bffRequests,
})

/**
 * 기준선 파일을 prettier 출력과 같은 모양으로 쓴다.
 *
 * `JSON.stringify(…, 2)` 는 짧은 배열도 줄바꿈하지만 prettier 는 한 줄로 접는다.
 * 그대로 쓰면 기준선을 갱신할 때마다 `pnpm format:check` 가 깨지므로 여기서 맞춘다.
 */
const serializeBaseline = (baseline: Baseline) =>
  `${JSON.stringify(baseline, null, 2).replace(
    /"offScaleFontSizeList": \[[^\]]*\]/,
    `"offScaleFontSizeList": [${baseline.offScaleFontSizeList.join(', ')}]`,
  )}\n`

/** 목표에 닿았으면 기준선을 내려도 된다고 알린다(자동으로 내리지는 않는다). */
const reportTarget = (label: string, value: number, target: number) => {
  if (value <= target) {
    console.log(
      `[target reached] ${label} = ${value} (목표 ≤ ${target}) — 기준선을 내려도 됩니다.`,
    )
  }
}

/** `main` 안 링크가 갈 수 있는 곳. 홈은 보호 라우트로 보내지 않는다. */
const ALLOWED_PATHS = [
  '/status',
  '/analysis',
  '/recommend',
  '/simulation',
  '/register',
]

test.describe('홈 감사 지표', () => {
  test('기준선보다 나빠지지 않는다', async ({ page }, testInfo) => {
    const session = await openHome(page)
    const metrics = await measureHomeMetrics(page)
    const bffRequests = session.bffRequests.length

    await testInfo.attach('home-metrics', {
      body: JSON.stringify(
        { ...metrics, bffRequests: session.bffRequests },
        null,
        2,
      ),
      contentType: 'application/json',
    })

    const file = baselinePath(testInfo.project.name)

    if (process.env.UPDATE_HOME_BASELINE === '1') {
      writeFileSync(
        file,
        serializeBaseline(toBaseline(metrics, bffRequests)),
        'utf-8',
      )
      test.info().annotations.push({
        type: 'baseline',
        description: `기준선을 다시 기록했습니다: ${file}`,
      })
      return
    }

    const baseline = JSON.parse(readFileSync(file, 'utf-8')) as Baseline

    expect(
      metrics.docHeightScreens,
      '문서 높이(화면 수)가 기준선보다 늘었습니다.',
    ).toBeLessThanOrEqual(baseline.docHeightScreens + SLACK.docHeightScreens)
    expect(
      metrics.stickyTrackShare,
      'sticky 트랙 비중이 기준선보다 늘었습니다.',
    ).toBeLessThanOrEqual(baseline.stickyTrackShare + SLACK.stickyTrackShare)
    expect(
      metrics.h1Screen ?? Number.POSITIVE_INFINITY,
      'h1 이 기준선보다 아래로 밀렸습니다.',
    ).toBeLessThanOrEqual(baseline.h1Screen + SLACK.screenPosition)
    expect(
      metrics.firstCtaScreen ?? Number.POSITIVE_INFINITY,
      '첫 CTA 가 기준선보다 아래로 밀렸습니다.',
    ).toBeLessThanOrEqual(baseline.firstCtaScreen + SLACK.screenPosition)
    expect(
      metrics.contrastFailures,
      `AA 미달 색 조합이 늘었습니다: ${JSON.stringify(metrics.contrastFailureList.slice(0, 5))}`,
    ).toBeLessThanOrEqual(baseline.contrastFailures)
    expect(
      metrics.smallTapTargets,
      `44px 미만 터치 타깃이 늘었습니다: ${JSON.stringify(metrics.smallTapTargetList.slice(0, 5))}`,
    ).toBeLessThanOrEqual(baseline.smallTapTargets)
    expect(
      metrics.offScaleFontSizes,
      `DESIGN.md 스케일 밖 글자 크기가 늘었습니다: ${metrics.offScaleFontSizeList.join(', ')}`,
    ).toBeLessThanOrEqual(baseline.offScaleFontSizes)
    expect(
      metrics.sentenceEndings.formal,
      '합니다체 문장이 늘었습니다(해요체가 기본입니다).',
    ).toBeLessThanOrEqual(baseline.sentenceEndings.formal)
    expect(
      bffRequests,
      `첫 페인트 BFF 호출이 늘었습니다: ${session.bffRequests.join(', ')}`,
    ).toBeLessThanOrEqual(baseline.bffRequests)

    reportTarget(
      'docHeightScreens',
      metrics.docHeightScreens,
      TARGET.docHeightScreens,
    )
    reportTarget(
      'stickyTrackShare',
      metrics.stickyTrackShare,
      TARGET.stickyTrackShare,
    )
    reportTarget(
      'h1Screen',
      metrics.h1Screen ?? Number.POSITIVE_INFINITY,
      TARGET.h1Screen,
    )
    reportTarget(
      'firstCtaScreen',
      metrics.firstCtaScreen ?? Number.POSITIVE_INFINITY,
      TARGET.firstCtaScreen,
    )
    reportTarget(
      'contrastFailures',
      metrics.contrastFailures,
      TARGET.contrastFailures,
    )
    reportTarget(
      'smallTapTargets',
      metrics.smallTapTargets,
      TARGET.smallTapTargets,
    )
    reportTarget(
      'offScaleFontSizes',
      metrics.offScaleFontSizes,
      TARGET.offScaleFontSizes,
    )
    reportTarget(
      'formalSentences',
      metrics.sentenceEndings.formal,
      TARGET.formalSentences,
    )
    reportTarget('bffRequests', bffRequests, TARGET.bffRequests)
  })

  test('불변식 — 가로 넘침·h1·링크·콘솔 오류', async ({ page }, testInfo) => {
    const session = await openHome(page)
    const metrics = await measureHomeMetrics(page)

    await testInfo.attach('home-invariants', {
      body: JSON.stringify(
        {
          horizontalOverflow: metrics.horizontalOverflow,
          h1Count: metrics.h1Count,
          linkHrefs: metrics.linkHrefs,
          consoleErrors: session.consoleErrors,
          bffRequests: session.bffRequests,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    })

    expect(metrics.horizontalOverflow, '가로 스크롤이 생겼습니다.').toBe(false)
    expect(metrics.h1Count, 'h1 은 정확히 1개여야 합니다.').toBe(1)

    const disallowed = metrics.linkHrefs.filter(href => {
      const [pathname] = href.split('?')
      return !ALLOWED_PATHS.includes(pathname)
    })
    expect(
      disallowed,
      `허용 목록 밖 링크가 있습니다: ${disallowed.join(', ')}`,
    ).toEqual([])

    expect(
      session.consoleErrors,
      `콘솔 오류가 있습니다: ${session.consoleErrors.join(' / ')}`,
    ).toEqual([])
  })
})
