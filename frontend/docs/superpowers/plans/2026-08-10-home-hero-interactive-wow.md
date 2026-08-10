# 홈 히어로 인터랙티브 wow (방향 C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩(`/`) 히어로를 "떠 있는 분석 창 + 살아있는 지도"로 만들어 첫 진입에서 "이건 내 상권 분석 도구"라는 인상을 준다.

**Architecture:** 인터랙티브 상태(창 open/minimize/close, 드래그 위치, hover된 자치구)를 새 클라이언트 컴포넌트 `HeroSection`이 소유한다. `home-page.tsx`는 서버 컴포넌트로 유지하고 `<HeroSection />`만 합성한다. 지도(`SeoulDistrictsMap`)는 순차 페이드인·상위 상권 pulse·hover 미니 툴팁(스파크라인)을 스스로 렌더하고, hover 자치구 코드를 `onHoverChange` 콜백으로 부모에 올린다. 부모는 그 코드로 카드 배경에 동적 틴트를 섞는다. 카드는 macOS식 신호등 3버튼과 드래그 가능한 타이틀바를 가진 `HeroWindow`다. 모바일은 오버레이를 해제하고 지도 아래에 카드를 세로 정렬한다.

**Tech Stack:** Next.js App Router, TypeScript, styled-components, lucide-react, vitest(`renderToStaticMarkup` SSR 마크업 검증). 새 런타임 의존성 없음.

## Global Constraints

- **FE 전용.** 백엔드 API 계약·엔드포인트 신설 금지. 툴팁 데이터는 **하드코딩 대표 예시**(런타임 API 호출 0).
- **styled-components + `DESIGN.md` 토큰만.** 임의 색상·radius·shadow·spacing·motion 토큰 추가 금지. 모션은 `--motion-*` / `--ease-*` 토큰 사용.
- **글래스/backdrop-filter 예외.** `DESIGN.md`의 "장식용 glass panel 금지"(현 878행)는 홈 히어로 카드에 한해 사용자 승인으로 예외. 예외를 정본에 명시하고 QA 체크리스트를 조정하는 것이 Task 8이다. 그 전까지는 다른 화면에 글래스 확산 금지.
- **접근성:** 신호등·드래그는 색 외에 아이콘 + `aria-label`로 구분, 키보드 대안 제공(버튼은 실제 `<button>`, 링크는 `<a>`/`next/link`).
- **`prefers-reduced-motion: reduce`:** 순차 페이드인·pulse·드래그 트랜지션을 정지/즉시화(`--motion-instant` 또는 애니메이션 제거). `reveal.tsx`의 패턴을 따른다.
- **모바일(≤640px):** 카드·지도 겹치지 않고 세로 정렬. 신호등·드래그는 숨김/비활성.
- **검증:** 완료 보고 전 `pnpm qa:verify`(= `format:check && lint && typecheck && build`) 통과 필수. 미실행 명령을 통과했다 보고하지 않는다.

## 확정된 세부 결정 (2026-08-10)

- **툴팁 데이터**: 대표 예시 하드코딩 (`src/data/district-metrics.ts`).
- **카드 재호출**: 🔴 close 후 화면 모서리에 작은 플로팅 독 버튼("분석 창 열기")으로 복귀.
- **드래그 위치 지속성**: 저장 안 함. 새로고침 시 중앙 기본 위치. 화면 밖 이탈 경계만 처리.
- **커서 spotlight**: 이번 범위에서 제외(YAGNI). 후속 과제로 이월.

## File Structure

- **Create** `src/data/district-metrics.ts` — 25개 자치구 대표 매출/유동인구 라벨 + 트렌드 스파크라인 배열, `getDistrictMetric(code)` 조회, 상위 상권 코드 `TOP_DISTRICT_CODES`.
- **Create** `src/data/district-metrics.test.ts` — 모든 자치구 코드가 매트릭을 가지는지 검증.
- **Create** `src/components/home/hero-section.tsx` (`'use client'`) — 히어로 stage/레이어, 창 상태·hover 코드·드래그 위치 소유. 지도 + 창 카드 + 독 버튼 합성.
- **Create** `src/components/home/hero-window.tsx` — 신호등 3버튼 + 드래그 타이틀바 + 카드 본문(open/minimize 상태). 글래스 배경.
- **Create** `src/components/home/use-window-drag.ts` — 타이틀바 드래그 훅 + 순수 `clampOffset` 헬퍼(경계 클램프).
- **Create** `src/components/home/use-window-drag.test.ts` — `clampOffset` 경계 케이스.
- **Create** `src/components/home/tooltip-geometry.ts` — 순수 `clampTooltipPosition` 헬퍼(viewBox 내 클램프).
- **Create** `src/components/home/tooltip-geometry.test.ts` — 클램프 경계 케이스.
- **Modify** `src/components/home/seoul-districts-map.tsx` — 순차 페이드인, 상위 상권 pulse, hover 미니 툴팁(SVG, 스파크라인), `onHoverChange` prop.
- **Modify** `src/components/home/home-page.tsx` — 인라인 히어로 마크업을 `<HeroSection />`으로 교체(서버 컴포넌트 유지).
- **Modify** `src/components/home/home-page.test.ts` — 히어로 이동 후에도 통과하도록 셀렉터 조정(카피·링크 유지 확인).
- **Modify** `DESIGN.md` — 글래스 예외 명시 + QA 체크리스트 조정.
- **Modify** `docs/features/_index.md` — 홈 히어로 상태 갱신.

---

## Task 1: 자치구 대표 매트릭 데이터 모듈

hover 툴팁에 쓸 하드코딩 대표 수치. 순수 데이터라 TDD로 커버리지를 잠근다.

**Files:**
- Create: `src/data/district-metrics.ts`
- Test: `src/data/district-metrics.test.ts`

**Interfaces:**
- Consumes: `SEOUL_STATUS_FEATURES`(`src/data/seoul-status-map.ts`, 각 항목 `districtCode: string`), `districts`(`src/data/districts.ts`, `gooCode: number`, `gooName: string`).
- Produces:
  - `type DistrictMetric = { districtCode: string; salesLabel: string; footTrafficLabel: string; trend: number[] }`
  - `function getDistrictMetric(districtCode: string): DistrictMetric | undefined`
  - `const TOP_DISTRICT_CODES: readonly string[]` — pulse 대상 상위 상권 3곳.

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/data/district-metrics.test.ts
import { describe, expect, it } from 'vitest'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import {
  TOP_DISTRICT_CODES,
  getDistrictMetric,
} from '@/data/district-metrics'

describe('district-metrics', () => {
  it('지도에 있는 모든 자치구가 매트릭을 가진다', () => {
    for (const feature of SEOUL_STATUS_FEATURES) {
      const metric = getDistrictMetric(feature.districtCode)
      expect(metric, `no metric for ${feature.districtCode}`).toBeDefined()
      expect(metric!.salesLabel.length).toBeGreaterThan(0)
      expect(metric!.footTrafficLabel.length).toBeGreaterThan(0)
      expect(metric!.trend.length).toBeGreaterThanOrEqual(6)
    }
  })

  it('상위 상권 코드는 모두 실제 지도 자치구다', () => {
    const codes = new Set(SEOUL_STATUS_FEATURES.map(f => f.districtCode))
    expect(TOP_DISTRICT_CODES.length).toBe(3)
    for (const code of TOP_DISTRICT_CODES) {
      expect(codes.has(code), `top code ${code} not on map`).toBe(true)
    }
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/data/district-metrics.test.ts`
Expected: FAIL — `getDistrictMetric` / `TOP_DISTRICT_CODES` 미정의.

- [ ] **Step 3: 최소 구현**

25개 자치구(11110~11740 서울 sig 코드) 각각에 대표 예시 라벨과 6~8포인트 트렌드를 채운다. 값은 "대표 예시"임을 라벨 문구로 드러내지 않아도 되지만, 실제 계약이 아닌 예시 수치다. 상위 3곳은 강남구(`11680`), 마포구(`11440`), 송파구(`11710`).

```ts
// src/data/district-metrics.ts
export type DistrictMetric = {
  districtCode: string
  salesLabel: string
  footTrafficLabel: string
  trend: number[]
}

// 대표 예시 수치(실데이터 아님). hover 툴팁의 "느낌" 전달용.
const METRICS: DistrictMetric[] = [
  { districtCode: '11110', salesLabel: '월 매출 2.4억', footTrafficLabel: '일 유동 5.1만', trend: [42, 45, 43, 48, 52, 55, 58] },
  { districtCode: '11140', salesLabel: '월 매출 2.1억', footTrafficLabel: '일 유동 4.7만', trend: [38, 40, 39, 41, 44, 43, 46] },
  { districtCode: '11170', salesLabel: '월 매출 2.8억', footTrafficLabel: '일 유동 6.0만', trend: [50, 52, 55, 54, 58, 60, 63] },
  { districtCode: '11200', salesLabel: '월 매출 1.9억', footTrafficLabel: '일 유동 4.2만', trend: [30, 33, 32, 35, 37, 39, 40] },
  { districtCode: '11215', salesLabel: '월 매출 2.2억', footTrafficLabel: '일 유동 4.9만', trend: [40, 42, 41, 44, 46, 45, 48] },
  { districtCode: '11230', salesLabel: '월 매출 2.0억', footTrafficLabel: '일 유동 4.4만', trend: [35, 36, 38, 37, 40, 42, 43] },
  { districtCode: '11260', salesLabel: '월 매출 2.5억', footTrafficLabel: '일 유동 5.3만', trend: [44, 46, 45, 49, 51, 53, 56] },
  { districtCode: '11290', salesLabel: '월 매출 2.3억', footTrafficLabel: '일 유동 5.0만', trend: [41, 43, 42, 45, 47, 49, 50] },
  { districtCode: '11305', salesLabel: '월 매출 1.7억', footTrafficLabel: '일 유동 3.8만', trend: [28, 30, 29, 31, 33, 34, 35] },
  { districtCode: '11320', salesLabel: '월 매출 1.8억', footTrafficLabel: '일 유동 4.0만', trend: [30, 31, 33, 32, 35, 36, 38] },
  { districtCode: '11350', salesLabel: '월 매출 2.0억', footTrafficLabel: '일 유동 4.5만', trend: [34, 36, 35, 38, 40, 41, 43] },
  { districtCode: '11380', salesLabel: '월 매출 1.9억', footTrafficLabel: '일 유동 4.3만', trend: [32, 34, 33, 36, 38, 39, 40] },
  { districtCode: '11410', salesLabel: '월 매출 2.6억', footTrafficLabel: '일 유동 5.6만', trend: [46, 48, 47, 51, 53, 55, 58] },
  { districtCode: '11440', salesLabel: '월 매출 3.1억', footTrafficLabel: '일 유동 7.2만', trend: [55, 58, 60, 62, 66, 69, 72] },
  { districtCode: '11470', salesLabel: '월 매출 1.8억', footTrafficLabel: '일 유동 4.1만', trend: [31, 33, 32, 35, 37, 38, 39] },
  { districtCode: '11500', salesLabel: '월 매출 2.2억', footTrafficLabel: '일 유동 4.8만', trend: [39, 41, 40, 43, 45, 47, 49] },
  { districtCode: '11530', salesLabel: '월 매출 2.1억', footTrafficLabel: '일 유동 4.6만', trend: [37, 39, 38, 41, 43, 44, 46] },
  { districtCode: '11545', salesLabel: '월 매출 2.0억', footTrafficLabel: '일 유동 4.4만', trend: [35, 37, 36, 39, 41, 42, 44] },
  { districtCode: '11560', salesLabel: '월 매출 2.7억', footTrafficLabel: '일 유동 5.8만', trend: [48, 50, 49, 53, 55, 57, 60] },
  { districtCode: '11590', salesLabel: '월 매출 1.9억', footTrafficLabel: '일 유동 4.2만', trend: [32, 34, 33, 36, 38, 39, 41] },
  { districtCode: '11620', salesLabel: '월 매출 1.8억', footTrafficLabel: '일 유동 4.0만', trend: [30, 32, 31, 34, 36, 37, 38] },
  { districtCode: '11650', salesLabel: '월 매출 2.3억', footTrafficLabel: '일 유동 5.0만', trend: [41, 43, 42, 46, 48, 50, 52] },
  { districtCode: '11680', salesLabel: '월 매출 3.6억', footTrafficLabel: '일 유동 8.4만', trend: [60, 64, 66, 70, 74, 78, 82] },
  { districtCode: '11710', salesLabel: '월 매출 3.0억', footTrafficLabel: '일 유동 6.9만', trend: [52, 55, 57, 60, 63, 66, 70] },
  { districtCode: '11740', salesLabel: '월 매출 2.4억', footTrafficLabel: '일 유동 5.2만', trend: [43, 45, 44, 48, 50, 52, 54] },
]

const METRIC_BY_CODE = new Map(METRICS.map(m => [m.districtCode, m]))

export function getDistrictMetric(
  districtCode: string,
): DistrictMetric | undefined {
  return METRIC_BY_CODE.get(districtCode)
}

// pulse/glow로 강조할 상위 상권(강남·마포·송파).
export const TOP_DISTRICT_CODES = ['11680', '11440', '11710'] as const
```

> 주의: 위 25개 코드가 `SEOUL_STATUS_FEATURES`의 코드 집합과 정확히 일치해야 테스트가 통과한다. 구현 시 `SEOUL_STATUS_FEATURES.map(f => f.districtCode)`를 콘솔로 덤프해 누락/오타를 대조하라. 코드가 다르면 위 목록을 실제 값으로 교체한다.

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/data/district-metrics.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/data/district-metrics.ts src/data/district-metrics.test.ts
git commit -m "[FE] feat(home): 히어로 지도 툴팁용 자치구 대표 매트릭 데이터"
```

---

## Task 2: 히어로를 HeroSection 클라이언트 컴포넌트로 추출 (동작 변경 없음)

인터랙션 상태를 담을 그릇을 먼저 만든다. 이 태스크는 순수 리팩터 — 화면은 그대로.

**Files:**
- Create: `src/components/home/hero-section.tsx`
- Modify: `src/components/home/home-page.tsx` (히어로 블록 및 히어로 전용 styled-components 이동)
- Test: `src/components/home/home-page.test.ts` (기존 어서션 유지 확인)

**Interfaces:**
- Produces: `export default function HeroSection(): JSX.Element` — 현재 `<Hero>...</Hero>` 마크업과 동일 출력(지도 + 글래스 카드 오버레이).
- Consumes: `SeoulDistrictsMap`(현행 그대로).

- [ ] **Step 1: 기존 테스트가 초록인지 먼저 확인(리팩터 안전망)**

Run: `pnpm vitest run src/components/home/home-page.test.ts`
Expected: PASS (현행 코드).

- [ ] **Step 2: HeroSection 생성 — home-page.tsx의 히어로 블록 그대로 이동**

`home-page.tsx`에서 `Hero, Inner, HeroStage, MapLayer, CardLayer, HeroCopy, Eyebrow, Title, Body, BodyEmphasis, Actions, PrimaryLink, SecondaryLink` 중 **히어로에서만 쓰는** 스타일과 `<Hero>...</Hero>` JSX를 `hero-section.tsx`로 옮긴다. `Eyebrow`/`Actions`/`PrimaryLink`/`SecondaryLink`/`Inner`는 다른 섹션에서도 쓰이므로 **공유 스타일은 `home-page.tsx`에 남기고 hero-section에서 재선언**하거나, 공용 스타일 파일로 빼지 말고 각 파일에 필요한 것만 로컬 선언한다(YAGNI — 지금 공용화하지 않음). 파일 상단에 `'use client'`.

```tsx
// src/components/home/hero-section.tsx
'use client'

import Link from 'next/link'
import { MapPinned, Search } from 'lucide-react'
import styled from 'styled-components'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'

// (home-page.tsx에서 이동한 Hero/Inner/HeroStage/MapLayer/CardLayer/HeroCopy/
//  Eyebrow/Title/Body/BodyEmphasis/Actions/PrimaryLink/SecondaryLink 선언을 여기 둔다)

export default function HeroSection() {
  return (
    <Hero>
      <Inner>
        <HeroStage>
          <MapLayer>
            <SeoulDistrictsMap />
          </MapLayer>
          <CardLayer>
            <HeroCopy>
              <Eyebrow>서울 상권 데이터 분석</Eyebrow>
              <Title>창업 전에, 상권부터 확인하세요.</Title>
              <Body>
                서울 25개 자치구를 업종별 매출·유동인구·경쟁 현황으로 분석합니다.
                <BodyEmphasis>감이 아니라 데이터로 자리를 정하세요.</BodyEmphasis>
              </Body>
              <Actions>
                <PrimaryLink href="/analysis">
                  <Search aria-hidden="true" />내 상권 분석하기
                </PrimaryLink>
                <SecondaryLink href="/status">
                  <MapPinned aria-hidden="true" />
                  구별현황 보기
                </SecondaryLink>
              </Actions>
            </HeroCopy>
          </CardLayer>
        </HeroStage>
      </Inner>
    </Hero>
  )
}
```

- [ ] **Step 3: home-page.tsx에서 히어로 블록을 `<HeroSection />`으로 교체**

`home-page.tsx`의 `<Hero>...</Hero>` 전체를 삭제하고 상단에 `import HeroSection from '@/components/home/hero-section'` 추가 후 `<HeroSection />` 렌더. 이동으로 미사용이 된 import(`Search`, `SeoulDistrictsMap` 등)와 styled 선언을 정리한다. `home-page.tsx`는 `'use client'`를 붙이지 않는다(서버 컴포넌트 유지).

- [ ] **Step 4: 테스트가 여전히 초록인지 확인**

Run: `pnpm vitest run src/components/home/home-page.test.ts`
Expected: PASS — 히어로 카피("창업 전에, 상권부터 확인하세요.")와 링크가 그대로 렌더되므로 어서션 통과. 실패하면 이동 누락이므로 마크업/텍스트를 원본과 대조.

- [ ] **Step 5: 커밋**

```bash
git add src/components/home/hero-section.tsx src/components/home/home-page.tsx
git commit -m "[FE] refactor(home): 히어로를 HeroSection 클라이언트 컴포넌트로 추출"
```

---

## Task 3: 살아있는 지도 — 순차 페이드인 + 상위 상권 pulse

**Files:**
- Modify: `src/components/home/seoul-districts-map.tsx`
- Test: 브라우저 검증(마크업 스냅샷은 불안정하므로 유닛 테스트 없음)

**Interfaces:**
- Consumes: `TOP_DISTRICT_CODES`(Task 1).
- Produces: 마운트 시 자치구가 인덱스 순서로 지연 페이드인, `TOP_DISTRICT_CODES` 폴리곤에 은은한 pulse. reduced-motion 시 즉시 표시·pulse 없음.

- [ ] **Step 1: 페이드인 상태 + 스타일 추가**

`seoul-districts-map.tsx`에 `useEffect`로 마운트 후 `mounted` 상태를 true로 전환(reveal.tsx 패턴). `DistrictPath`에 `$index`, `$appear`, `$isTop` transient prop을 받아:
- 초기 `opacity: 0`, `mounted` 시 `opacity: 1`, `transition-delay: ${index * 24}ms`(마지막 구도 ~600ms 내 완료).
- `$isTop`이면 `@keyframes` pulse(예: `filter: drop-shadow`나 `fill` 밝기 2.4s 무한, 아주 낮은 진폭).
- `@media (prefers-reduced-motion: reduce)`: `opacity: 1; animation: none; transition: none;`.

```tsx
const appear = keyframes`from { opacity: 0 } to { opacity: 1 }`
const topPulse = keyframes`
  0%, 100% { fill: var(--color-primary-100); }
  50% { fill: color-mix(in srgb, var(--color-primary-700) 22%, var(--color-surface-muted)); }
`
```

`styled`에서 `keyframes`를 import(`import styled, { keyframes } from 'styled-components'`). pulse는 hover 색을 덮지 않도록 `&:hover { animation: none; fill: var(--color-primary-700); }`.

- [ ] **Step 2: 폴리곤 렌더에 index/top 플래그 배선**

`.map((feature, index) => ...)`로 인덱스 전달, `$isTop={TOP_DISTRICT_CODES.includes(feature.districtCode)}`.

- [ ] **Step 3: 브라우저 검증**

`pnpm dev` → preview_start(`{name}`) → `/` 로드. 확인:
- 페이지 진입 시 자치구가 왼→오/순차로 부드럽게 나타난다.
- 강남·마포·송파가 은은히 맥동한다(과하지 않게).
- reduced-motion(resize_window `colorScheme`는 무관 — OS 설정 또는 devtools emulation)에서 즉시 표시.
- 콘솔 에러 없음(read_console_messages).

- [ ] **Step 4: 커밋**

```bash
git add src/components/home/seoul-districts-map.tsx
git commit -m "[FE] feat(home): 지도 순차 페이드인 + 상위 상권 pulse"
```

---

## Task 4: hover 미니 툴팁(스파크라인) + onHoverChange 콜백

hover 시 자치구 이름 라벨 대신(또는 함께) 매출·유동인구 + 트렌드 스파크라인 미니 툴팁을 SVG 안에 그린다. 좌표 변환을 피하려고 viewBox 단위로 SVG-native 렌더하고, 화면 밖으로 나가지 않게 순수 헬퍼로 클램프한다.

**Files:**
- Create: `src/components/home/tooltip-geometry.ts`
- Create: `src/components/home/tooltip-geometry.test.ts`
- Modify: `src/components/home/seoul-districts-map.tsx`

**Interfaces:**
- Produces:
  - `function clampTooltipPosition(center: {x:number;y:number}, size: {width:number;height:number}, viewBox: {width:number;height:number}, offset?: number): {x:number;y:number}` — 툴팁 박스 좌상단 좌표를 `[0, viewBox-size]`로 클램프.
  - `SeoulDistrictsMap` 새 prop: `onHoverChange?: (districtCode: string | null) => void`.
- Consumes: `getDistrictMetric`(Task 1), `sparklinePath`(`src/components/home/sparkline.tsx`).

- [ ] **Step 1: clampTooltipPosition 실패 테스트**

```ts
// src/components/home/tooltip-geometry.test.ts
import { describe, expect, it } from 'vitest'
import { clampTooltipPosition } from '@/components/home/tooltip-geometry'

const VIEW = { width: 800, height: 620 }
const SIZE = { width: 180, height: 96 }

describe('clampTooltipPosition', () => {
  it('중앙 근처는 offset 적용해 그대로 배치', () => {
    const p = clampTooltipPosition({ x: 400, y: 300 }, SIZE, VIEW, 12)
    expect(p.x).toBe(412)
    expect(p.y).toBe(312)
  })

  it('우/하단 경계를 넘지 않게 클램프', () => {
    const p = clampTooltipPosition({ x: 790, y: 610 }, SIZE, VIEW, 12)
    expect(p.x).toBe(VIEW.width - SIZE.width) // 620
    expect(p.y).toBe(VIEW.height - SIZE.height) // 524
  })

  it('좌/상단 경계 아래로 내려가지 않게 클램프', () => {
    const p = clampTooltipPosition({ x: -50, y: -50 }, SIZE, VIEW, 12)
    expect(p.x).toBe(0)
    expect(p.y).toBe(0)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/home/tooltip-geometry.test.ts`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 3: clampTooltipPosition 구현**

```ts
// src/components/home/tooltip-geometry.ts
type Point = { x: number; y: number }
type Size = { width: number; height: number }

export function clampTooltipPosition(
  center: Point,
  size: Size,
  viewBox: Size,
  offset = 12,
): Point {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max)
  return {
    x: clamp(center.x + offset, 0, viewBox.width - size.width),
    y: clamp(center.y + offset, 0, viewBox.height - size.height),
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/components/home/tooltip-geometry.test.ts`
Expected: PASS.

- [ ] **Step 5: 지도에 SVG 툴팁 + onHoverChange 배선**

`seoul-districts-map.tsx`:
- prop `onHoverChange?: (code: string | null) => void` 추가. `setHoveredCode`를 감싸 hover 변경 시 `onHoverChange?.(code)` 호출(useEffect로 `hoveredCode` 변화를 구독하거나, set 지점에서 직접 호출).
- `hoveredFeature`가 있으면 `getDistrictMetric(code)`로 매트릭 조회. `SEOUL_STATUS_VIEW_BOX`를 파싱해 `{width:800,height:620}` 확보(문자열 `"0 0 800 620"` split).
- 툴팁 박스 크기 상수(예 `{width:184,height:96}`), `clampTooltipPosition(center, size, view)`로 좌상단 좌표 계산.
- SVG `<g>`로 툴팁 렌더: 배경 `<rect rx=10>`(`fill: var(--color-surface)`, `stroke: var(--color-border-200)`, 그림자는 SVG filter 대신 생략 또는 낮은 opacity rect), 자치구명 `<text>`, `salesLabel`·`footTrafficLabel` `<text>`, 트렌드는 `sparklinePath(metric.trend, 140, 28)`로 얻은 points를 `<polyline stroke="var(--color-primary-700)">`. 모두 `pointer-events: none`.
- 기존 이름 라벨(`DistrictLabel`)은 제거하거나 툴팁 안 제목으로 흡수(중복 텍스트 방지).

> 그림자가 필요하면 `<rect>`를 살짝 오프셋한 반투명 사본으로 흉내내지 말고, 카드 밖 지도이므로 테두리 + 미세 배경만으로 충분. 토큰 외 그림자 추가 금지.

- [ ] **Step 6: 브라우저 검증**

`/`에서 자치구 hover 시 매출/유동인구/스파크라인 툴팁이 뜨고, 지도 가장자리 자치구에서도 툴팁이 잘리지 않는지(클램프) 확인. mouseleave 시 사라짐. 콘솔 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/components/home/tooltip-geometry.ts src/components/home/tooltip-geometry.test.ts src/components/home/seoul-districts-map.tsx
git commit -m "[FE] feat(home): 지도 hover 미니 데이터 툴팁 + onHoverChange"
```

---

## Task 5: HeroWindow — 신호등 3버튼 + 창 상태(open/minimize/close) + 독 복귀

**Files:**
- Create: `src/components/home/hero-window.tsx`
- Modify: `src/components/home/hero-section.tsx`

**Interfaces:**
- Produces:
  - `type WindowState = 'open' | 'minimized' | 'closed'`
  - `function HeroWindow(props: { state: WindowState; onClose: () => void; onMinimize: () => void; onToggleMinimize: () => void; dragHandlers?: TitleBarDragHandlers; style?: CSSProperties }): JSX.Element`
  - `dragHandlers`/`style`은 Task 6에서 채운다(이번 태스크에선 optional, 미사용).
- Consumes: `hero-section`이 창 상태를 소유하고 주입.

- [ ] **Step 1: HeroWindow 마크업 — 타이틀바 + 신호등 + 본문**

`hero-window.tsx`(`'use client'`):
- 최상위 `HeroCopy`(글래스 카드) 안에 `TitleBar`(좌: 창 제목 "상권 분석", 우: 신호등 그룹) + 본문(Eyebrow/Title/Body/Actions).
- 신호등은 **실제 `<button>` 3개**, 색만이 아니라 아이콘 + `aria-label`:
  - close: `aria-label="분석 창 닫고 지도 보기"`, 빨강, `X` 아이콘(lucide `X`), `onClick={onClose}`.
  - minimize: `aria-label="분석 창 접기"`, 노랑, `Minus` 아이콘, `onClick={onToggleMinimize}`.
  - maximize: `aria-label="상권 분석 시작(전체 화면)"`, 초록, `Maximize2` 아이콘, `next/link` `href="/analysis"`로 렌더(버튼처럼 보이되 실제 네비게이션). → 링크라 키보드 접근·새 탭 열기 자연스러움.
- `state === 'minimized'`이면 본문(Eyebrow/Title/Body/Actions)을 숨기고 `TitleBar`만 표시(높이 축소, `--motion-standard`로 전환).
- 신호등 버튼은 `pointer-events: auto`. 카드 본문 hover-through 유지(`HeroCopy` `pointer-events: none`, 버튼/타이틀바 `auto`).

```tsx
const Dot = styled.button<{ $variant: 'close' | 'min' | 'max' }>`
  width: 12px; height: 12px; border-radius: 50%; border: none; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  pointer-events: auto;
  background: ${p =>
    p.$variant === 'close' ? '#ff5f57' : p.$variant === 'min' ? '#febc2e' : '#28c840'};
  svg { width: 8px; height: 8px; opacity: 0; transition: opacity var(--motion-fast) var(--ease-standard); stroke: rgba(0,0,0,0.55); }
  &:hover svg, &:focus-visible svg { opacity: 1; }
  &:focus-visible { outline: 2px solid var(--color-primary-700); outline-offset: 2px; }
`
```

- [ ] **Step 2: hero-section에 창 상태 배선 + 독 버튼**

`hero-section.tsx`:
- `const [windowState, setWindowState] = useState<WindowState>('open')`.
- `<HeroWindow state={windowState} onClose={() => setWindowState('closed')} onMinimize={...} onToggleMinimize={() => setWindowState(s => s === 'minimized' ? 'open' : 'minimized')} />`.
- `windowState === 'closed'`이면 `HeroWindow`를 언마운트하고 `CardLayer` 대신 화면 모서리(우하단)에 **작은 플로팅 독 버튼** 렌더: `<DockButton onClick={() => setWindowState('open')} aria-label="분석 창 열기">`(lucide `PanelTopOpen`/`LayoutTemplate` + 짧은 텍스트). `pointer-events: auto`, `position: absolute; right/bottom` inset.
- close→open 복귀 시 드래그 위치는 초기화(Task 6에서 offset 리셋).

- [ ] **Step 3: 브라우저 검증**

`/`에서:
- 🔴 클릭 → 카드 사라지고 지도 전체 공개 + 우하단 "분석 창 열기" 독 버튼 등장 → 클릭 시 카드 복귀.
- 🟡 클릭 → 타이틀바만 남게 접힘 → 다시 클릭 시 펼침.
- 🟢 클릭 → `/analysis`로 이동.
- 키보드 Tab으로 신호등 3버튼 순회 가능, 아이콘/aria-label 노출, `:focus-visible` 아웃라인 보임.
- 콘솔 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/home/hero-window.tsx src/components/home/hero-section.tsx
git commit -m "[FE] feat(home): 히어로 신호등 창 컨트롤(닫기/접기/최대화) + 독 복귀"
```

---

## Task 6: 타이틀바 드래그(데스크톱) + 경계 클램프

**Files:**
- Create: `src/components/home/use-window-drag.ts`
- Create: `src/components/home/use-window-drag.test.ts`
- Modify: `src/components/home/hero-window.tsx`, `src/components/home/hero-section.tsx`

**Interfaces:**
- Produces:
  - `function clampOffset(offset: {x:number;y:number}, bounds: {minX:number;maxX:number;minY:number;maxY:number}): {x:number;y:number}`
  - `type TitleBarDragHandlers = { onPointerDown: (e: React.PointerEvent) => void }`
  - `function useWindowDrag(opts: { enabled: boolean; containerRef: RefObject<HTMLElement>; cardRef: RefObject<HTMLElement> }): { offset: {x:number;y:number}; handlers: TitleBarDragHandlers; reset: () => void }`
- Consumes: `clampOffset`가 pointermove마다 카드가 컨테이너 밖으로 나가지 않게 offset 제한.

- [ ] **Step 1: clampOffset 실패 테스트**

```ts
// src/components/home/use-window-drag.test.ts
import { describe, expect, it } from 'vitest'
import { clampOffset } from '@/components/home/use-window-drag'

describe('clampOffset', () => {
  const bounds = { minX: -100, maxX: 100, minY: -80, maxY: 80 }
  it('범위 내는 그대로', () => {
    expect(clampOffset({ x: 20, y: -30 }, bounds)).toEqual({ x: 20, y: -30 })
  })
  it('범위를 벗어나면 경계로 클램프', () => {
    expect(clampOffset({ x: 250, y: -250 }, bounds)).toEqual({ x: 100, y: -80 })
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/home/use-window-drag.test.ts`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 3: clampOffset + useWindowDrag 구현**

```ts
// src/components/home/use-window-drag.ts
'use client'
import { useCallback, useRef, useState, type PointerEvent, type RefObject } from 'react'

type Offset = { x: number; y: number }
type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

export function clampOffset(offset: Offset, bounds: Bounds): Offset {
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
  return { x: clamp(offset.x, bounds.minX, bounds.maxX), y: clamp(offset.y, bounds.minY, bounds.maxY) }
}

export type TitleBarDragHandlers = { onPointerDown: (e: PointerEvent) => void }

export function useWindowDrag(opts: {
  enabled: boolean
  containerRef: RefObject<HTMLElement | null>
  cardRef: RefObject<HTMLElement | null>
}): { offset: Offset; handlers: TitleBarDragHandlers; reset: () => void } {
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  const computeBounds = useCallback((): Bounds => {
    const c = opts.containerRef.current
    const card = opts.cardRef.current
    if (!c || !card) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    // 카드 중심이 컨테이너 안에 머물도록 여유 계산(카드가 중앙 배치 기준 offset).
    const cr = c.getBoundingClientRect()
    const kr = card.getBoundingClientRect()
    const slackX = Math.max(0, (cr.width - kr.width) / 2)
    const slackY = Math.max(0, (cr.height - kr.height) / 2)
    return { minX: -slackX, maxX: slackX, minY: -slackY, maxY: slackY }
  }, [opts.containerRef, opts.cardRef])

  const onPointerMove = useCallback((e: globalThis.PointerEvent) => {
    if (!start.current) return
    const next = { x: start.current.ox + (e.clientX - start.current.px), y: start.current.oy + (e.clientY - start.current.py) }
    setOffset(clampOffset(next, computeBounds()))
  }, [computeBounds])

  const onPointerUp = useCallback(() => {
    start.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (!opts.enabled) return
    start.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [opts.enabled, offset.x, offset.y, onPointerMove, onPointerUp])

  const reset = useCallback(() => setOffset({ x: 0, y: 0 }), [])
  return { offset, handlers: { onPointerDown }, reset }
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/components/home/use-window-drag.test.ts`
Expected: PASS.

- [ ] **Step 5: hero-section/hero-window 배선(데스크톱 전용)**

`hero-section.tsx`:
- `containerRef`(HeroStage), `cardRef`(HeroWindow 루트) ref 생성.
- 데스크톱 판별: `const [enabled, setEnabled] = useState(false)`; `useEffect`에서 `window.matchMedia('(min-width: 641px) and (pointer: fine)').matches` + `!prefers-reduced-motion`로 설정, resize 리스너로 갱신.
- `const drag = useWindowDrag({ enabled, containerRef, cardRef })`.
- `HeroWindow`에 `dragHandlers={drag.handlers}`와 `style={{ transform: \`translate(\${drag.offset.x}px, \${drag.offset.y}px)\` }}` 전달. 드래그 중 `transition: none`, 놓으면 복귀 트랜지션은 두지 않음(즉시 추종).
- `onClose` 시 `drag.reset()` 호출(복귀 시 중앙).

`hero-window.tsx`:
- `TitleBar`에 `onPointerDown={dragHandlers?.onPointerDown}`, `cursor: grab`(active `grabbing`), `touch-action: none`. `style`은 카드 루트에 적용.
- 카드 루트를 `forwardRef`로 만들어 `cardRef` 연결.

- [ ] **Step 6: 브라우저 검증**

데스크톱 뷰포트에서 타이틀바를 잡고 드래그 → 카드가 따라오고 컨테이너 밖으로 이탈하지 않음. 모바일 뷰포트(resize_window mobile)에서는 드래그 비활성(핸들 없음/`enabled=false`). 콘솔 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/components/home/use-window-drag.ts src/components/home/use-window-drag.test.ts src/components/home/hero-window.tsx src/components/home/hero-section.tsx
git commit -m "[FE] feat(home): 히어로 타이틀바 드래그(데스크톱) + 경계 클램프"
```

---

## Task 7: 동적 틴트 + 글래스 개선 + 모바일 세로 정렬 + reduced-motion 최종 점검

**Files:**
- Modify: `src/components/home/hero-section.tsx`, `src/components/home/hero-window.tsx`, `src/components/home/seoul-districts-map.tsx`

**Interfaces:**
- Consumes: `SeoulDistrictsMap`의 `onHoverChange`(Task 4)로 hover 코드를 hero-section이 받음.
- Produces: hover 자치구가 있으면 카드 배경에 primary 색 5~8% 혼합. 모바일은 오버레이 해제·세로 정렬.

- [ ] **Step 1: hover 코드 lift + 동적 틴트**

`hero-section.tsx`: `const [hoveredCode, setHoveredCode] = useState<string | null>(null)`, `<SeoulDistrictsMap onHoverChange={setHoveredCode} />`. `HeroWindow`에 `tinted={hoveredCode != null}` 전달.
`hero-window.tsx`의 글래스 배경 개선(예외 승인 범위):
```css
background: color-mix(in srgb, var(--color-surface) 55%, transparent);
-webkit-backdrop-filter: blur(14px) saturate(180%) brightness(1.04);
backdrop-filter: blur(14px) saturate(180%) brightness(1.04);
border-top: 1px solid color-mix(in srgb, #ffffff 70%, transparent);
```
`tinted`일 때 배경에 `color-mix(... var(--color-primary-700) 7% ...)` 혼합을 얹어 지도 hover에 "반응". 전환은 `--motion-fast`.

- [ ] **Step 2: 모바일 세로 정렬(오버레이 해제)**

`@media (max-width: 640px)`에서 `HeroStage`를 `position: static`로, `CardLayer`를 `position: static; margin-top`으로 바꿔 **지도 아래 카드**가 오도록. 신호등·드래그 핸들 숨김(`display:none` 또는 `enabled=false`로 이미 비활성 — 시각적으로도 신호등 숨김). 독 버튼도 모바일에선 노출 안 함(항상 open 유지). `backdrop-filter`는 모바일에서 성능 고려해 유지하되 blur 값 낮춤(선택).

- [ ] **Step 3: reduced-motion 최종 점검**

`prefers-reduced-motion: reduce`에서 페이드인·pulse·틴트 전환·드래그 추종 트랜지션이 정지/즉시화되는지 각 컴포넌트 미디어쿼리 확인. 드래그 자체는 사용자가 능동 조작이므로 허용하되 트랜지션만 제거.

- [ ] **Step 4: 브라우저 검증(반응형·테마)**

- 데스크톱: 자치구 hover 시 카드 배경이 미세하게 물든다.
- resize_window mobile(375): 지도 위 / 카드 아래로 세로 정렬, 겹침 없음, 신호등 숨김.
- resize_window desktop: 오버레이 복귀.
- 다크 테마(resize_window colorScheme dark)에서 글래스 대비·가독성 확인.
- 콘솔 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/components/home/hero-section.tsx src/components/home/hero-window.tsx src/components/home/seoul-districts-map.tsx
git commit -m "[FE] feat(home): 카드 동적 틴트 + 글래스 개선 + 모바일 세로정렬 + reduced-motion"
```

---

## Task 8: DESIGN.md 글래스 예외 정본화 + QA 체크리스트 조정 + 인덱스 갱신

**Files:**
- Modify: `DESIGN.md`
- Modify: `docs/features/_index.md`

- [ ] **Step 1: DESIGN.md 예외 문구 추가**

현 878행 "금지: 마케팅 hero 그라디언트, decorative glow, glass panel." 항목에 예외 각주/보조 문장 추가:
> **예외(승인 2026-08-10):** 랜딩 히어로(`/`)의 "떠 있는 분석 창" 카드에 한해 `backdrop-filter` 글래스를 허용한다. 창(window) 은유를 위한 기능적 표현이며, 다른 화면·마케팅 배너로 확산 금지.

QA 체크리스트의 `backdrop-filter`/`glass` grep 무결과 항목(현 1230/1261/1287행 부근)을 "`src/components/home/hero-window.tsx` **제외** 무결과"로 수정하거나 예외 경로를 명시.

- [ ] **Step 2: 기능 인덱스 상태 갱신**

`docs/features/_index.md`에서 홈 히어로 항목 상태를 "인터랙티브 wow 구현 완료(방향 C)"로 갱신하고 이 플랜/스펙 문서를 링크.

- [ ] **Step 3: 커밋**

```bash
git add DESIGN.md docs/features/_index.md
git commit -m "[FE] docs(home): 히어로 글래스 예외 정본화 + QA 체크리스트/인덱스 갱신"
```

---

## 최종 검증 (완료 보고 전)

- [ ] `pnpm qa:verify` (format:check && lint && typecheck && build) 통과.
- [ ] 브라우저 최종 시나리오: 진입 페이드인 → hover 툴팁 → 신호등 3동작 → 드래그 → 독 복귀 → 모바일 세로정렬 → 다크테마 → reduced-motion.
- [ ] 콘솔/네트워크 에러 없음, 툴팁 데이터는 하드코딩(네트워크 호출 0) 확인.

## Self-Review 메모 (작성자 확인)

- **Spec 커버리지:** A(신호등·드래그)=Task 5·6, B(페이드인·pulse·툴팁)=Task 3·4, 글래스 개선=Task 7, 모바일 세로정렬=Task 7, 동적 틴트=Task 7, a11y/키보드=Task 5(+각 태스크), reduced-motion=Task 3·7, 툴팁 데이터 출처=Task 1(하드코딩 확정), close 재호출=Task 5(독 버튼 확정), 드래그 지속성=미저장 확정(Task 6 reset), DESIGN.md 예외=Task 8. 커서 spotlight는 명시적으로 범위 제외.
- **타입 일관성:** `WindowState`(Task 5), `TitleBarDragHandlers`/`clampOffset`/`useWindowDrag`(Task 6), `clampTooltipPosition`(Task 4), `getDistrictMetric`/`TOP_DISTRICT_CODES`(Task 1), `onHoverChange`(Task 4에서 정의 → Task 7에서 소비) 이름 일치.
- **플레이스홀더:** 순수 로직은 실제 코드 제공, 인터랙션은 브라우저 검증 단계로 대체(TDD 불가 영역 명시).
