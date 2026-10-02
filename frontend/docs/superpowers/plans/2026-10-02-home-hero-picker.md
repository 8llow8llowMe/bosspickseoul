# 히어로 자치구 피커 · 모바일 첫 화면 · 지도 자동 시연 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 히어로에 자치구 피커(실데이터 미리보기 + 딥링크 주 버튼)를 넣고, 모바일에서 카드를 지도 위로 올리며, 근거 없는 강조 펄스를 데스크톱 자동 시연 1회로 바꾼다.

**Architecture:** `HeroSection` 이 `pickedCode` 를 소유하고 카드(`HeroWindow` → 피커·미리보기)와 지도(`SeoulDistrictsMap` → 채움·모바일 탭·자동 시연)에 내려 준다. 화면 규칙(옵션 정렬·버튼 href/라벨·미리보기 문구)은 순수 함수 `hero-picker.ts` 로 빼서 vitest(node 환경)로 잠근다. 미리보기 데이터는 툴팁과 같은 `useDistrictDetail` 캐시를 쓴다.

**Tech Stack:** Next.js App Router · React 19 · styled-components · @tanstack/react-query · vitest(node, `renderToStaticMarkup`) · Playwright

**Spec:** `frontend/docs/features/home/hero-picker-and-mobile-first-screen.md`

## Global Constraints

- 새 백엔드 호출·새 npm 패키지·새 디자인 토큰 금지(`DESIGN.md` 토큰만).
- 히어로 문장은 해요체. 결과 보장·과장 금지. 주어·목적어 생략 금지.
- 데스크톱(>640px) 지도 클릭은 **그대로** `/analysis?districtCode=…` 로 이동한다.
- 계측 파라미터는 자치구 코드·출처·버튼 종류만(개인 식별값 금지).
- 피커 `<select>` 글자 16px, 피커·버튼 높이 48px, 터치 타깃 ≥ 44px.
- 커밋 형식 `[FE] <type>: <한국어>` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 빌드(`qa:verify`)와 dev 서버를 동시에 돌리지 않는다(`.next` 충돌).

## Review Focus

1. **모바일에서 지도를 탭했는데 터치가 `mouseenter` 를 먼저 쏴서 툴팁 요청·`home_map_hover` 가 나가는 것** — `tooltipEnabled=false` 면 호버 핸들러 자체를 붙이지 않는다(Task 2 테스트·B2 실측).
2. **피커로 고른 뒤 첫 항목(「자치구 고르기」)으로 되돌리면** 버튼이 `/analysis`·「내 상권 분석하기」로 돌아와야 한다(Task 1 #3, Task 4 실측).
3. **미리보기 API 실패** — 줄만 빠지고 버튼은 동작한다(Task 3 실측 B5).
4. **자동 시연 도중 사용자가 피커를 고르거나 지도에 들어오면** 툴팁이 즉시 닫히고 다시 뜨지 않는다 — `hasPicked` 래치·`interacted` 래치(Task 2·4, 실측 B6).
5. **가장 긴 라벨(「영등포구 분석하기」)이 데스크톱 한 줄을 넘기는 것** — 실측 B3.

---

### Task 1: 순수 규칙 `hero-picker.ts` + 계측 타입

**Files:**

- Create: `frontend/src/components/home/hero-picker.ts`
- Create: `frontend/src/components/home/hero-picker.test.ts`
- Modify: `frontend/src/lib/analytics/events.ts` (AnalyticsEventMap)

**Interfaces:**

- Produces:
  - `type HeroPickerOption = { code: string; name: string }`
  - `HERO_PICKER_OPTIONS: readonly HeroPickerOption[]` (25구, 가나다순)
  - `heroPickerName(code: string): string | null`
  - `type HeroPrimaryCta = { href: string; label: string; carried: boolean }`
  - `resolveHeroPrimaryCta(code: string | null): HeroPrimaryCta`
  - `describePickPreview(rhythm: DistrictRhythm): string[]`
  - 이벤트 `home_hero_picker_select: { district_code: string; source: 'select' | 'map' }`, `home_hero_cta_click` 에 `carried?: boolean`

- [ ] **Step 1: 실패하는 테스트 작성** — `hero-picker.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import type { DistrictRhythm } from '@/components/home/district-rhythm'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import { parseAnalysisSelection } from '@/lib/analysis/selection'

import {
  HERO_PICKER_OPTIONS,
  describePickPreview,
  heroPickerName,
  resolveHeroPrimaryCta,
} from './hero-picker'

const rhythm = (over: Partial<DistrictRhythm> = {}): DistrictRhythm => ({
  latest: { periodCode: '20242', total: 12_345_678, changeRate: 3.14 },
  indicatorName: '다이나믹',
  slots: [
    { start: 0, end: 6, perHour: 1, peak: false },
    { start: 14, end: 17, perHour: 9, peak: true },
  ],
  days: [],
  weekendDeltaPct: null,
  ...over,
})

describe('HERO_PICKER_OPTIONS', () => {
  it('25개 자치구를 가나다순으로 둔다', () => {
    const names = HERO_PICKER_OPTIONS.map(option => option.name)
    expect(names).toHaveLength(25)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ko')))
    expect(names[0]).toBe('강남구')
  })

  it('모든 코드가 히어로 지도에 있다', () => {
    const mapCodes = new Set(SEOUL_STATUS_FEATURES.map(f => f.districtCode))
    for (const option of HERO_PICKER_OPTIONS) {
      expect(mapCodes.has(option.code), option.name).toBe(true)
    }
  })

  it('코드로 이름을 찾고, 모르는 코드는 null', () => {
    expect(heroPickerName('11440')).toBe('마포구')
    expect(heroPickerName('99999')).toBeNull()
  })
})

describe('resolveHeroPrimaryCta', () => {
  it('고르기 전에는 빈 분석 화면으로 간다', () => {
    expect(resolveHeroPrimaryCta(null)).toEqual({
      href: '/analysis',
      label: '내 상권 분석하기',
      carried: false,
    })
  })

  it('고른 자치구를 /analysis 에 싣고 라벨에 이름을 쓴다', () => {
    const cta = resolveHeroPrimaryCta('11440')
    expect(cta.href).toBe('/analysis?districtCode=11440')
    expect(cta.label).toBe('마포구 분석하기')
    expect(cta.carried).toBe(true)
    // 분석 화면이 실제로 그 구를 읽는다 — 빌더가 바뀌어도 왕복이 깨지지 않게 잠근다.
    const params = new URL(cta.href, 'https://example.test').searchParams
    expect(parseAnalysisSelection(params).districtCode).toBe('11440')
  })

  it('지도에 없는 코드는 싣지 않는다', () => {
    expect(resolveHeroPrimaryCta('99999').carried).toBe(false)
  })
})

describe('describePickPreview', () => {
  it('분기 유동인구(전분기 대비) · 최다 시간대 순서로 말한다', () => {
    expect(describePickPreview(rhythm())).toEqual([
      '2024년 2분기 유동인구 1,235만명 (전분기 대비 +3.1%)',
      '14~17시 최다',
    ])
  })

  it('변화율이 없으면 괄호 조각을 뺀다', () => {
    expect(
      describePickPreview(
        rhythm({
          latest: { periodCode: '20242', total: 12_345_678, changeRate: null },
        }),
      )[0],
    ).toBe('2024년 2분기 유동인구 1,235만명')
  })

  it('말할 값이 없으면 빈 배열이다(→ 줄을 숨긴다)', () => {
    expect(describePickPreview(rhythm({ latest: null, slots: [] }))).toEqual([])
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `cd frontend && pnpm vitest run src/components/home/hero-picker.test.ts` → Expected: FAIL (`Failed to resolve import "./hero-picker"`).
  - `parseAnalysisSelection` 시그니처가 `URLSearchParams` 를 받는지 `src/lib/analysis/selection.ts` 에서 확인하고, 다르면 `story-steps.test.ts` 가 쓰는 방식으로 맞춘다.

- [ ] **Step 3: 구현** — `hero-picker.ts`

```ts
import {
  formatSlotRange,
  type DistrictRhythm,
} from '@/components/home/district-rhythm'
import { districts } from '@/data/districts'
import { formatPeriodCode } from '@/lib/analysis/presentation'
import {
  createAnalysisExplorerHref,
  createEmptyAnalysisSelection,
} from '@/lib/analysis/selection'
import {
  formatSinoUnit,
  formatStatusChange,
} from '@/lib/status/status-formatters'

/**
 * 히어로 자치구 피커의 화면 규칙(hero-picker-and-mobile-first-screen.md D3-2).
 * vitest 가 node 환경이라 컴포넌트 밖 순수 함수로 두고 잠근다.
 */

export type HeroPickerOption = { code: string; name: string }

/** 25구 가나다순. 지도 코드(`SEOUL_STATUS_FEATURES`)와 같은 문자열 코드다. */
export const HERO_PICKER_OPTIONS: readonly HeroPickerOption[] = districts
  .map(district => ({
    code: String(district.gooCode),
    name: district.gooName,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

export const heroPickerName = (code: string): string | null =>
  HERO_PICKER_OPTIONS.find(option => option.code === code)?.name ?? null

export type HeroPrimaryCta = { href: string; label: string; carried: boolean }

/**
 * 주 버튼이 피커의 실행 버튼이다(D4-2). 업종은 싣지 않는다 — 분석 화면이 행정동을 고르는
 * 순간 지운다(D0-3). 판단 흐름 02 CTA 와 같은 빌더를 쓴다.
 */
export const resolveHeroPrimaryCta = (code: string | null): HeroPrimaryCta => {
  const name = code === null ? null : heroPickerName(code)
  if (code === null || name === null) {
    return { href: '/analysis', label: '내 상권 분석하기', carried: false }
  }
  return {
    href: createAnalysisExplorerHref({
      ...createEmptyAnalysisSelection(),
      districtCode: code,
    }),
    label: `${name} 분석하기`,
    carried: true,
  }
}

/**
 * 미리보기 한 줄의 조각(D4-3). 툴팁과 같은 포맷터·같은 말이다. 값이 없는 조각은
 * 칸째로 뺀다 — 0 으로 채우면 「유동 0명」이라는 틀린 말이 된다.
 */
export const describePickPreview = (rhythm: DistrictRhythm): string[] => {
  const parts: string[] = []
  const { latest } = rhythm
  if (latest) {
    const change =
      latest.changeRate === null
        ? ''
        : ` (전분기 대비 ${formatStatusChange(latest.changeRate)})`
    parts.push(
      `${formatPeriodCode(latest.periodCode)} 유동인구 ${formatSinoUnit(latest.total, '명')}${change}`,
    )
  }
  const peak = rhythm.slots.find(slot => slot.peak)
  if (peak) parts.push(`${formatSlotRange(peak)} 최다`)
  return parts
}
```

- [ ] **Step 4: 계측 타입** — `events.ts` 의 `AnalyticsEventMap` 에서

```ts
  home_hero_cta_click: {
    cta: 'analysis' | 'status' | 'recommend' | 'window_max'
    /** 주 버튼만 — 피커로 고른 자치구를 링크에 실었는가(hero-picker D4-8). */
    carried?: boolean
  }
  /** 히어로 피커에서 구를 고르거나 모바일 지도를 탭했을 때. 값이 바뀔 때만. */
  home_hero_picker_select: {
    district_code: string
    source: 'select' | 'map'
  }
```

- [ ] **Step 5: 통과 확인** — Run: `pnpm vitest run src/components/home/hero-picker.test.ts src/lib/analytics` → Expected: PASS. 기대값 `1,235만명` 이 실제 `formatSinoUnit` 출력과 다르면 포맷터가 정본이므로 **테스트 기대값을 포맷터 출력에 맞춘다**(명세의 「1,234만 명」은 예시 표기).

- [ ] **Step 6: Commit** — `[FE] feat: 히어로 자치구 피커의 화면 규칙과 계측 이벤트를 정한다`

---

### Task 2: 지도 — 펄스 삭제 · 고른 구 채움 · 모바일 탭 · 캡션 · 자동 시연

**Files:**

- Modify: `frontend/src/components/home/seoul-districts-map.tsx`
- Delete: `frontend/src/data/district-metrics.ts`, `frontend/src/data/district-metrics.test.ts`

**Interfaces:**

- Consumes: 없음(지도는 피커 규칙을 모른다)
- Produces: `SeoulDistrictsMap` props

```ts
type SeoulDistrictsMapProps = {
  onHoverChange?: (districtCode: string | null) => void
  /** 피커로 고른 구. 그 칸을 primary-700 으로 채운다. */
  selectedCode?: string | null
  /** 있으면 폴리곤 활성화가 라우팅 대신 이 콜백을 부른다(모바일 = 피커 연동). */
  onDistrictActivate?: (districtCode: string) => void
  /** false 면 호버 툴팁·호버 계측·카드 틴트를 모두 붙이지 않는다(모바일). 기본 true. */
  tooltipEnabled?: boolean
  /** true 동안 한 번만 자동 시연을 한다(데스크톱). 기본 false. */
  autoDemo?: boolean
}
export const AUTO_DEMO_DISTRICT_CODE = '11740' // 강동구 — D5-3
export const AUTO_DEMO_DELAY_MS = 2000
export const AUTO_DEMO_VISIBLE_MS = 4000
```

- [ ] **Step 1: 펄스·고정 목록 삭제** — `topPulse` keyframes, `$isTop` prop, `TOP_DISTRICT_CODES` import, `keyframes` import(남은 사용처가 없으면) 를 지우고 `git rm src/data/district-metrics.ts src/data/district-metrics.test.ts`. `DistrictPath` 의 `animation` 줄과 `:hover`·`:focus-visible`·reduced-motion 블록의 `animation: none` 도 지운다.

- [ ] **Step 2: 채움** — `DistrictPath` 에 `$selected: boolean`:

```ts
  fill: ${p =>
    p.$selected ? 'var(--color-primary-700)' : 'var(--color-surface-muted)'};
```

- [ ] **Step 3: 모바일 높이** — `MapSvg` 끝에:

```ts
  /* 모바일: 폴리곤이 실제로 차지하는 높이만 쓴다 — 빈 띠 0(hero-picker D4-4, 초안 D0-2). */
  @media (max-width: 640px) {
    height: auto;
    aspect-ratio: 800 / 620;
  }
```

- [ ] **Step 4: 활성화 분기 · 호버 분기** — 컴포넌트 본문:

```tsx
const activate = (districtCode: string) => {
  if (onDistrictActivate) {
    onDistrictActivate(districtCode)
    return
  }
  trackEvent('home_map_click', { district_code: districtCode })
  router.push(`/analysis?districtCode=${districtCode}`)
}
```

`handleKeyDown` 과 `onClick` 은 `activate` 를 부른다. 폴리곤 JSX:

```tsx
<DistrictPath
  key={feature.districtCode}
  d={feature.path}
  role={onDistrictActivate ? 'button' : 'link'}
  aria-pressed={onDistrictActivate ? selected : undefined}
  tabIndex={0}
  aria-label={name || '자치구'}
  $index={index}
  $appear={mounted}
  $selected={selected}
  {...(tooltipEnabled ? hoverHandlers(feature.districtCode) : {})}
  onClick={() => activate(feature.districtCode)}
  onKeyDown={event => handleKeyDown(event, feature.districtCode)}
/>
```

`selected = feature.districtCode === selectedCode`. `hoverHandlers(code)` 는 지금의 `onMouseEnter/onMouseLeave/onFocus/onBlur` 네 개를 그대로 묶은 함수이고, `onMouseEnter`·`onFocus` 안에서 `setInteracted(true)` 도 부른다(Step 5).

- [ ] **Step 5: 자동 시연** — 상태와 effect:

```tsx
const [interacted, setInteracted] = useState(false)
const [demoCode, setDemoCode] = useState<string | null>(null)

/* 지도 진입·포커스 한 번이면 시연은 끝이다 — 사용자가 이미 발견했다(D4-7). */
useEffect(() => {
  if (!autoDemo || interacted) return
  const timer = window.setTimeout(
    () => setDemoCode(AUTO_DEMO_DISTRICT_CODE),
    AUTO_DEMO_DELAY_MS,
  )
  return () => window.clearTimeout(timer)
}, [autoDemo, interacted])

useEffect(() => {
  if (demoCode === null) return
  const timer = window.setTimeout(() => setDemoCode(null), AUTO_DEMO_VISIBLE_MS)
  return () => window.clearTimeout(timer)
}, [demoCode])
```

시연은 한 번뿐이어야 하므로 첫 effect 에 `demoShownRef`(true 가 되면 다시 예약하지 않음)를 더한다 — 예약 콜백 안에서 `demoShownRef.current = true` 로 세운다.

툴팁 대상 계산:

```tsx
const demoVisible = autoDemo && !interacted && demoCode !== null
const tooltipCode = hoveredCode ?? (demoVisible ? demoCode : null)
const tooltipFeature = SEOUL_STATUS_FEATURES.find(
  feature => feature.districtCode === tooltipCode,
)
const detail = useDistrictDetail(
  tooltipCode,
  tooltipCode !== null && (hoveredCode === null || settledCode === hoveredCode),
)
```

`hoveredFeature`·`hoveredName` 을 쓰던 툴팁 위치·이름 계산은 `tooltipFeature` 로 바꾼다. 시연은 `trackEvent('home_map_hover')`·`onHoverChange` 를 부르지 않는다(그 둘은 `hoveredCode` 경로에만 있다). `Wrapper` 에 `onPointerEnter={() => setInteracted(true)}`.

- [ ] **Step 6: 캡션** — `useId()` 로 `captionId`, `<MapSvg aria-describedby={captionId}>`, `MapSvg` 다음에:

```tsx
<MapCaption id={captionId}>
  <DesktopOnly>
    자치구 위에 올리면 시간대별 유동인구가 보이고, 누르면 그 구의 분석으로
    넘어가요.
  </DesktopOnly>
  <MobileOnly>자치구를 누르면 위 칸에서 바로 골라져요.</MobileOnly>
</MapCaption>
```

```ts
const MapCaption = styled.p`
  position: absolute;
  left: 0;
  bottom: 0;
  max-width: 420px;
  pointer-events: none;
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;

  @media (max-width: 640px) {
    position: static;
    max-width: none;
    margin-top: 8px;
  }
`
const DesktopOnly = styled.span`
  @media (max-width: 640px) {
    display: none;
  }
`
const MobileOnly = styled.span`
  display: none;
  @media (max-width: 640px) {
    display: inline;
  }
`
```

- [ ] **Step 7: 검사** — Run: `pnpm vitest run src/components/home && pnpm exec tsc --noEmit -p . && pnpm exec eslint src/components/home/seoul-districts-map.tsx` → Expected: 통과(`home-page.test.ts` 의 히어로 문구 단언은 Task 3 에서 바꾸므로 이 시점엔 그대로 통과해야 한다).

- [ ] **Step 8: Commit** — `[FE] feat: 히어로 지도의 근거 없는 강조를 걷고 고른 구 채움·모바일 탭·자동 시연을 더한다`

---

### Task 3: 카드 — 카피 B안 · 피커 · 미리보기 줄 · 주 버튼

**Files:**

- Create: `frontend/src/components/home/hero-pick-preview.tsx`
- Modify: `frontend/src/components/home/hero-window.tsx`
- Modify: `frontend/src/components/home/home-page.test.ts:34`

**Interfaces:**

- Consumes: Task 1 의 `HERO_PICKER_OPTIONS`, `heroPickerName`, `resolveHeroPrimaryCta`, `describePickPreview`
- Produces: `HeroWindowProps` 에 `pickedCode: string | null`, `onPick: (code: string | null) => void`, `pickerRef?: Ref<HTMLDivElement>`

- [ ] **Step 1: 실패하는 테스트로 문구를 먼저 바꾼다** — `home-page.test.ts`

```ts
expect(text).toContain('서울 어디에 차려야 할까요?') // 히어로
```

그리고 같은 파일 `describe('HomePage')` 안에 추가:

```ts
/* 히어로 피커(hero-picker-and-mobile-first-screen.md D4-1·D4-3). */
it('히어로에 자치구 피커와 고르기 전 안내가 있다', () => {
  const html = render()
  const text = html.replace(/<[^>]+>/g, '')

  expect(html).toContain('<option value="">자치구 고르기</option>')
  expect(text).toContain('창업할 자치구')
  expect(text).toContain(
    '고르면 그 구의 최근 분기 유동인구부터 바로 보여 줘요.',
  )
  expect(text).toContain('내 상권 분석하기')
  expect(text).not.toContain('짚어 드립니다')
})
```

Run: `pnpm vitest run src/components/home/home-page.test.ts` → Expected: FAIL.

- [ ] **Step 2: 미리보기 컴포넌트** — `hero-pick-preview.tsx`

```tsx
'use client'

import { useMemo } from 'react'
import styled from 'styled-components'
import { toDistrictRhythm } from '@/components/home/district-rhythm'
import {
  describePickPreview,
  heroPickerName,
} from '@/components/home/hero-picker'
import { useDistrictDetail } from '@/hooks/use-district-detail'

/*
  안내·불러오는 중·실데이터 세 상태가 같은 두 줄을 예약한다 — 줄이 바뀌며 아래 버튼이
  튀지 않게(hero-picker-and-mobile-first-screen.md D5-2). 실패·빈 응답이면 줄이 빠진다.
*/
const Line = styled.p`
  min-height: 40px;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;

  strong {
    color: var(--color-text-900);
    font-weight: 700;
  }
`

export default function HeroPickPreview({ code }: { code: string | null }) {
  const detail = useDistrictDetail(code, code !== null)
  const parts = useMemo(
    () =>
      detail.data ? describePickPreview(toDistrictRhythm(detail.data)) : [],
    [detail.data],
  )
  const name = code === null ? null : heroPickerName(code)

  let content: React.ReactNode = null
  if (code === null || name === null) {
    content = '고르면 그 구의 최근 분기 유동인구부터 바로 보여 줘요.'
  } else if (detail.data) {
    content =
      parts.length > 0 ? (
        <>
          <strong>{name}</strong> · {parts.join(' · ')}
        </>
      ) : null
  } else if (!detail.isError) {
    content = `${name} 유동인구를 불러오는 중이에요.`
  }

  /* 라이브 영역은 늘 있어야 바뀐 문장을 읽어 준다. 내용이 없으면 높이를 예약하지 않는다. */
  return (
    <div aria-live="polite">
      {content === null ? null : <Line>{content}</Line>}
    </div>
  )
}
```

(`React.ReactNode` 대신 `import type { ReactNode } from 'react'` 를 쓴다 — 파일 상단 import 에 합친다.)

- [ ] **Step 3: 카드 카피·피커** — `hero-window.tsx`

  - props 에 `pickedCode`, `onPick`, `pickerRef` 를 더한다.
  - `<Title>서울 어디에 차려야 할까요?</Title>`
  - `<Body>자치구를 고르면 유동인구부터 바로 보여 주고, 분석 화면에서 매출·경쟁 강도와 AI 리포트까지 이어서 볼 수 있어요.</Body>` (`BodyEmphasis` 와 그 styled 정의 삭제)
  - `Actions` 앞에 피커 덩어리:

```tsx
            <PickerBlock ref={pickerRef}>
              <PickerRow>
                <PickerField>
                  <VisuallyHidden>창업할 자치구</VisuallyHidden>
                  <PickerSelect
                    value={pickedCode ?? ''}
                    onChange={event => onPick(event.target.value || null)}
                  >
                    <option value="">자치구 고르기</option>
                    {HERO_PICKER_OPTIONS.map(option => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </PickerSelect>
                  <ChevronDown aria-hidden="true" />
                </PickerField>
                <PrimaryLink
                  href={primaryCta.href}
                  {...trackAttrs('home_hero_cta_click', {
                    cta: 'analysis',
                    carried: primaryCta.carried,
                  })}
                >
                  <Search aria-hidden="true" />
                  {primaryCta.label}
                </PrimaryLink>
              </PickerRow>
              <HeroPickPreview code={pickedCode} />
            </PickerBlock>
            <Actions>
              <SecondaryLink …구별현황 보기… />
            </Actions>
            <EscapeLink …그대로… />
```

`const primaryCta = resolveHeroPrimaryCta(pickedCode)`. 스타일:

```ts
const PickerBlock = styled.div`
  display: grid;
  gap: 8px;
  /* 모바일 지도 탭 뒤 scrollIntoView 가 sticky 헤더 밑으로 숨지 않게(D6). */
  scroll-margin-top: calc(${HEADER_HEIGHT} + 16px);
`
const PickerRow = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`
const PickerField = styled.label`
  position: relative;
  flex: 1 1 140px;
  min-width: 140px;
  display: flex;
  align-items: center;

  > svg {
    position: absolute;
    right: 14px;
    width: 16px;
    height: 16px;
    color: var(--color-text-600);
    pointer-events: none;
  }
`
const PickerSelect = styled.select`
  width: 100%;
  min-height: 48px;
  appearance: none;
  padding: 0 40px 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-surface);
  color: var(--color-text-900);
  /* 16px — iOS 포커스 확대 방지(DESIGN.md 편집기 규칙과 같다). */
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary-600);
  }

  &:focus-visible {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-focus-primary);
    outline: none;
  }
`
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`
```

`PrimaryLink` 에 `flex: 0 0 auto; white-space: nowrap;` 를 더한다(라벨이 줄바꿈되지 않게). `HEADER_HEIGHT` 는 `@/components/home/layout-constants` 에서, `ChevronDown` 은 `lucide-react` 에서 import.

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/components/home` → Expected: PASS. 이 단계에서 `HeroSection` 이 새 필수 props 를 안 넘겨 타입 오류가 나는 것은 Task 4 에서 고친다 — 그래서 **커밋은 Task 4 와 함께** 한다(타입이 깨진 커밋을 남기지 않는다).

---

### Task 4: `HeroSection` — 상태 소유 · 모바일 순서 · 탭 스크롤

**Files:**

- Modify: `frontend/src/components/home/hero-section.tsx`

**Interfaces:**

- Consumes: Task 2 지도 props, Task 3 `HeroWindow` props, Task 1 `trackEvent('home_hero_picker_select')`

- [ ] **Step 1: 상태와 핸들러**

```tsx
const [pickedCode, setPickedCode] = useState<string | null>(null)
/* 한 번이라도 고르면 자동 시연은 끝이다 — 해제해도 다시 하지 않는다(D4-7). */
const [hasPicked, setHasPicked] = useState(false)
const pickerRef = useRef<HTMLDivElement>(null)

const handlePick = (code: string | null, source: 'select' | 'map') => {
  if (code !== null && code !== pickedCode) {
    trackEvent('home_hero_picker_select', { district_code: code, source })
  }
  setPickedCode(code)
  if (code !== null) setHasPicked(true)
  if (source === 'map') revealPicker()
}

/* 모바일 지도 탭 뒤, 바뀐 버튼·미리보기가 화면 밖이면 그쪽으로 데려간다(D4-4). */
const revealPicker = () => {
  const el = pickerRef.current
  if (!el) return
  const rect = el.getBoundingClientRect()
  const headerBottom = Number.parseInt(HEADER_HEIGHT, 10)
  if (rect.top >= headerBottom && rect.bottom <= window.innerHeight) return
  el.scrollIntoView({
    block: 'nearest',
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
}
```

- [ ] **Step 2: 모바일 레이아웃** — 스타일:
  - `MapScreen` ≤640: `height: calc(100dvh - …)` 를 `height: auto` 로.
  - `MapLayer` 에 `@media (max-width: 640px) { flex: none; margin-top: 24px; }`
  - `CardLayer` ≤640: `min-height: auto; padding: 24px 0 0;`
  - `MobileIntro`·`MobileIntroEyebrow`·`MobileIntroTitle`·`MobileScrollHint` 정의와 JSX, `ChevronDown` import 삭제.
  - `Hero`·`HeroStage` 의 모바일 주석을 새 순서([카드][지도][캡션])로 고친다.

- [ ] **Step 3: JSX 순서·배선** — `HeroStage` 안을 `CardLayer`(또는 `DockButton`) → `MapScreen` 순서로 바꾼다. 데스크톱은 `CardLayer` 가 `position: absolute` 라 순서가 화면에 영향이 없다.

```tsx
<MapLayer>
  <SeoulDistrictsMap
    selectedCode={pickedCode}
    onDistrictActivate={
      isMobileViewport ? code => handlePick(code, 'map') : undefined
    }
    tooltipEnabled={!isMobileViewport}
    onHoverChange={isMobileViewport ? undefined : setHoveredCode}
    autoDemo={dragEnabled && !hasPicked}
  />
</MapLayer>
```

```tsx
              <HeroWindow
                …기존 props…
                pickedCode={pickedCode}
                onPick={code => handlePick(code, 'select')}
                pickerRef={pickerRef}
              />
```

`trackEvent` 를 `@/lib/analytics/events` 에서 import.

- [ ] **Step 4: 검사** — Run: `pnpm vitest run src/components/home && pnpm exec tsc --noEmit -p . && pnpm exec eslint src/components/home` → Expected: 통과.

- [ ] **Step 5: Commit** (Task 3 + 4) — `[FE] feat: 히어로에 자치구 피커를 넣고 모바일에서 카드를 지도 위로 올린다`

---

### Task 5: 검증 · 기준선 · 문서

**Files:**

- Modify: `frontend/e2e/home/hero.spec.ts`
- Modify: `frontend/e2e/baselines/home.mobile.json`, `home.desktop.json` (UPDATE_HOME_BASELINE=1 로 재생성)
- Modify: `frontend/docs/features/home/hero-picker-and-mobile-first-screen.md`(상태·D5-1 실측), `measurement-and-deep-link.md`(D2 표 두 행), `docs/features/_index.md`(home 행 끝 한 문장)

- [ ] **Step 1: e2e 추가** — `hero.spec.ts` 에:

```ts
test('모바일 — 첫 화면에 h1·피커·주 버튼이 들어온다', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', '모바일 첫 화면 판정.')
  await openHome(page)
  const viewport = page.viewportSize()!
  for (const locator of [
    page.locator('main h1'),
    page.getByRole('combobox', { name: '창업할 자치구' }),
    page.getByRole('link', { name: '내 상권 분석하기' }),
  ]) {
    const box = (await locator.boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
  }
})

test('모바일 — 지도를 탭하면 피커에 골라지고 이동하지 않는다', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', '모바일 탭 동작.')
  await openHome(page)
  await page.locator('path[aria-label="마포구"]').click()
  await expect(
    page.getByRole('combobox', { name: '창업할 자치구' }),
  ).toHaveValue('11440')
  await expect(
    page.getByRole('link', { name: '마포구 분석하기' }),
  ).toHaveAttribute('href', '/analysis?districtCode=11440')
  expect(new URL(page.url()).pathname).toBe('/')
})

test('데스크톱 — 피커로 고르면 주 버튼이 그 구로 간다', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', '데스크톱 피커.')
  await openHome(page)
  await page
    .getByRole('combobox', { name: '창업할 자치구' })
    .selectOption('11560')
  const link = page.getByRole('link', { name: '영등포구 분석하기' })
  await expect(link).toHaveAttribute('href', '/analysis?districtCode=11560')
  const box = (await link.boundingBox())!
  expect(box.height).toBeLessThanOrEqual(48) // 한 줄
})
```

- [ ] **Step 2: 전체 검증** — dev 서버를 내린 상태에서 `pnpm qa:verify` → PASS. 이어서 (빈 포트로) `PORT=5188 pnpm dev` 를 백그라운드로 띄우고 `PLAYWRIGHT_BASE_URL=http://localhost:5188 pnpm test:e2e e2e/home` → PASS. `home-metrics` 가 통과하면 `UPDATE_HOME_BASELINE=1` 로 같은 명령을 다시 돌려 기준선을 갱신하고 diff 에서 모바일 `h1Screen`·`firstCtaScreen` 이 1 미만인지 확인한다.

- [ ] **Step 3: 브라우저 실측(명세 D7 B4~B7)** — gstack browse 스크립트(스크래치패드 `.sh`)로: 1440×900·1024×768 에서 2초 대기 후 강동구 툴팁이 카드 밖에 뜨는지 스크린샷, 6.5초 뒤 사라지는지, 지도 진입 시 즉시 닫히는지. 미리보기 실패는 `XMLHttpRequest.prototype.open` 패치로 `/districts/` 요청을 깨고 피커 선택 → 줄이 빠지고 버튼 href 가 바뀌는지. reduced-motion 은 `matchMedia` 에뮬레이션 또는 Playwright `emulateMedia`.

- [ ] **Step 4: 문서** — 명세 상태를 「구현 완료(2026-10-02)」로, D5-1 표를 실측값으로 바꾼다. `measurement-and-deep-link.md` D2 표에 `home_hero_picker_select` 행과 `home_hero_cta_click` 의 `carried` 를 더한다. `_index.md` home 행 끝에 「히어로 피커·모바일 첫 화면·자동 시연 구현 — [hero-picker-and-mobile-first-screen](./home/hero-picker-and-mobile-first-screen.md)」 한 문장. `pnpm exec prettier --write` 로 문서 포맷.

- [ ] **Step 5: Commit** — `[FE] test: 히어로 피커·모바일 첫 화면 e2e 를 더하고 홈 기준선을 갱신한다` / `[FE] docs: 히어로 피커 구현 결과를 명세·계측 표·인덱스에 반영한다`

- [ ] **Step 6: 리뷰** — 저장소 `reviewer`(또는 `fe-reviewer`, model opus) 에 브랜치 전체 diff(`origin/develop...HEAD`) 검토를 맡기고, 지적을 반영한 뒤 PR(`--assignee seonghoho --label frontend-web`, base `develop`).
