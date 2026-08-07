# 홈 리디자인 (인터랙티브 랜딩) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈을 정적 텍스트 랜딩에서, 상권 분석 미니데모를 주인공으로 한 인터랙티브 랜딩으로 개편한다 — 방문자가 랜딩만 보고 서비스 의도·기능을 이해하도록, 구체·직설·전문 카피와 절제된 모션으로.

**Architecture:** 홈(`home-page.tsx`)은 서버 컴포넌트를 유지하고, 상호작용이 필요한 부분만 client 경계로 격리한다 — (1) 상권 분석 미니데모(`analysis-mini-demo.tsx`), (2) 스크롤 진입 애니메이션용 `Reveal` 래퍼. 데모는 `src/data/home-demo.ts`의 정적 샘플만 사용(백엔드 0). 스파크라인은 인라인 SVG(의존성 0, 기존 `analysis/charts/line-chart.tsx` 방식 참고). 모든 색/radius/shadow/motion은 DESIGN.md 토큰.

**Tech Stack:** Next.js App Router, TypeScript, styled-components, Vitest(순수 로직), 브라우저 프리뷰(UI·모션·반응형 검증).

## Global Constraints

- **DESIGN.md 토큰만 사용** — 새 색/radius/shadow/spacing/motion 토큰 추가 금지. 기존 `--color-*`, `--radius-*`, `--shadow-level-*`, `--motion-*`, `--ease-*` 사용.
- **백엔드 호출·로그인 분기·라이브 데이터 없음** — 미니데모는 `src/data/home-demo.ts` 정적 샘플만. "대표 예시 데이터" 라벨 필수.
- **차트 라이브러리 추가 금지** — 스파크라인은 인라인 SVG.
- **모션 접근성** — `prefers-reduced-motion: reduce`에서 전환/애니메이션 제거(전역 스타일이 일부 처리하나 컴포넌트도 이를 깨지 않게).
- **client 경계 최소화** — 미니데모·Reveal만 `'use client'`. 나머지 홈 콘텐츠는 서버 렌더.
- **스크롤 하이재킹 금지** — 자연 스크롤 + 진입 시 1회 reveal만.
- **카피 보이스** — 구체·직설·전문. 아래 각 태스크에 명시된 한국어 문구를 **그대로** 사용(AI 상투구·과장 배제, 임의 변형 금지).
- **검증 관문**: `pnpm test` 통과 + `pnpm qa:verify`(format:check·lint·typecheck·build) 통과.
- **작업 디렉터리**: `BossPickSeoul/frontend`. 브랜치: `feature/fe/home-redesign`.

---

## 파일 구조

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `src/data/home-demo.ts` | 미니데모 정적 샘플·타입·`getDemoSample` 폴백 조회 | 신규 |
| `src/data/home-demo.test.ts` | `getDemoSample` 단위테스트 | 신규 |
| `src/components/home/sparkline.tsx` | 숫자 배열 → 인라인 SVG 스파크라인 + `sparklinePath` 순수함수 | 신규 |
| `src/components/home/sparkline.test.ts` | `sparklinePath` 단위테스트 | 신규 |
| `src/components/home/reveal.tsx` | 스크롤 진입 reveal 래퍼(`'use client'`, IntersectionObserver, reduced-motion) | 신규 |
| `src/components/home/analysis-mini-demo.tsx` | 미니데모 본체(`'use client'`) — 선택·카드·CTA | 신규 |
| `src/components/home/home-page.tsx` | 홈 재작성(서버) — 새 섹션·카피·데모/Reveal 통합 | 수정(재작성) |

---

## Task 1: home-demo 정적 데이터 + getDemoSample (순수, TDD)

**Files:**
- Create: `src/data/home-demo.ts`
- Test: `src/data/home-demo.test.ts`

**Interfaces (Produces):**
- `type CompetitionLevel = 'low' | 'medium' | 'high'`
- `type DemoSample = { districtId: string; industryId: string; salesTrend: number[]; salesChangePct: number; footTraffic: string; competition: CompetitionLevel; insight: string }`
- `const DISTRICTS: { id: string; name: string }[]`
- `const INDUSTRIES: { id: string; name: string }[]`
- `const DEFAULT_SELECTION: { districtId: string; industryId: string }`
- `function getDemoSample(districtId: string, industryId: string): DemoSample` — 매칭 샘플 없으면 대표 폴백(항상 non-null 반환, 반환값의 districtId/industryId는 요청값으로 채움)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/data/home-demo.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  DISTRICTS,
  INDUSTRIES,
  DEFAULT_SELECTION,
  getDemoSample,
} from './home-demo'

describe('home-demo', () => {
  it('exposes non-empty districts and industries', () => {
    expect(DISTRICTS.length).toBeGreaterThanOrEqual(4)
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(4)
  })

  it('default selection references existing ids', () => {
    expect(DISTRICTS.some(d => d.id === DEFAULT_SELECTION.districtId)).toBe(true)
    expect(INDUSTRIES.some(i => i.id === DEFAULT_SELECTION.industryId)).toBe(
      true,
    )
  })

  it('returns the curated sample for a known combo', () => {
    const s = getDemoSample('gangnam', 'cafe')
    expect(s.districtId).toBe('gangnam')
    expect(s.industryId).toBe('cafe')
    expect(s.salesTrend.length).toBeGreaterThanOrEqual(6)
    expect(['low', 'medium', 'high']).toContain(s.competition)
  })

  it('falls back for an unknown combo but echoes the requested ids', () => {
    const s = getDemoSample('gangnam', 'gym')
    expect(s.districtId).toBe('gangnam')
    expect(s.industryId).toBe('gym')
    expect(s.salesTrend.length).toBeGreaterThanOrEqual(6)
    expect(typeof s.insight).toBe('string')
    expect(s.insight.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/data/home-demo.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: 구현**

Create `src/data/home-demo.ts` (샘플 수치는 "대표 예시"이며 실제 데이터가 아니다):
```ts
export type CompetitionLevel = 'low' | 'medium' | 'high'

export type DemoSample = {
  districtId: string
  industryId: string
  salesTrend: number[] // 최근 6개월 대표 지수
  salesChangePct: number // 전월 대비 %(부호 포함)
  footTraffic: string
  competition: CompetitionLevel
  insight: string
}

export const DISTRICTS: { id: string; name: string }[] = [
  { id: 'gangnam', name: '강남구' },
  { id: 'mapo', name: '마포구' },
  { id: 'jongno', name: '종로구' },
  { id: 'seongdong', name: '성동구' },
]

export const INDUSTRIES: { id: string; name: string }[] = [
  { id: 'cafe', name: '카페' },
  { id: 'restaurant', name: '음식점' },
  { id: 'convenience', name: '편의점' },
  { id: 'gym', name: '헬스장' },
]

export const DEFAULT_SELECTION = { districtId: 'gangnam', industryId: 'cafe' }

// 대표 예시 데이터 — 실제 수치가 아니다.
const SAMPLES: Record<string, Omit<DemoSample, 'districtId' | 'industryId'>> = {
  'gangnam:cafe': {
    salesTrend: [82, 88, 91, 87, 95, 100],
    salesChangePct: 5.3,
    footTraffic: '일평균 4.2만 명',
    competition: 'high',
    insight: '유동인구는 많지만 카페 밀도가 높아 경쟁이 치열합니다.',
  },
  'mapo:cafe': {
    salesTrend: [70, 74, 78, 83, 88, 92],
    salesChangePct: 4.5,
    footTraffic: '일평균 3.1만 명',
    competition: 'medium',
    insight: '20~30대 유입이 꾸준해 카페 수요가 안정적입니다.',
  },
  'jongno:restaurant': {
    salesTrend: [95, 92, 90, 93, 96, 98],
    salesChangePct: 2.1,
    footTraffic: '일평균 5.0만 명',
    competition: 'high',
    insight: '직장인 점심 수요가 크지만 기존 음식점 경쟁이 강합니다.',
  },
  'seongdong:cafe': {
    salesTrend: [60, 66, 72, 79, 85, 90],
    salesChangePct: 6.2,
    footTraffic: '일평균 2.4만 명',
    competition: 'low',
    insight: '상권이 성장 중이라 카페 진입 여지가 있습니다.',
  },
  'mapo:restaurant': {
    salesTrend: [78, 80, 83, 82, 86, 89],
    salesChangePct: 3.4,
    footTraffic: '일평균 3.4만 명',
    competition: 'medium',
    insight: '저녁 상권이 활발해 음식점 회전이 빠른 편입니다.',
  },
  'gangnam:convenience': {
    salesTrend: [88, 90, 89, 92, 94, 96],
    salesChangePct: 2.2,
    footTraffic: '일평균 4.2만 명',
    competition: 'medium',
    insight: '오피스 수요로 편의점 매출이 평일에 집중됩니다.',
  },
}

const FALLBACK: Omit<DemoSample, 'districtId' | 'industryId'> = {
  salesTrend: [72, 75, 78, 80, 83, 86],
  salesChangePct: 3.0,
  footTraffic: '일평균 3.0만 명',
  competition: 'medium',
  insight: '대표 예시 기준으로 수요와 경쟁이 보통 수준입니다.',
}

export function getDemoSample(
  districtId: string,
  industryId: string,
): DemoSample {
  const base = SAMPLES[`${districtId}:${industryId}`] ?? FALLBACK
  return { districtId, industryId, ...base }
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/data/home-demo.test.ts` → PASS.
- [ ] **Step 5: 커밋** — `git add src/data/home-demo.ts src/data/home-demo.test.ts && git commit -m "[FE] feat: 홈 미니데모 정적 샘플 데이터·getDemoSample"`

---

## Task 2: 스파크라인 (인라인 SVG + 순수 path, TDD)

**Files:**
- Create: `src/components/home/sparkline.tsx`
- Test: `src/components/home/sparkline.test.ts`

**Interfaces (Produces):**
- `function sparklinePath(values: number[], width: number, height: number): string` — SVG polyline `points` 문자열("x,y x,y ..."). 값이 1개 이하이면 빈 문자열. 최소값→height, 최대값→0 정규화(위가 큰 값). 값이 모두 같으면 중앙선.
- `default function Sparkline(props: { values: number[]; width?: number; height?: number; className?: string }): JSX.Element` — `<svg>` + `<polyline>` (stroke `currentColor`, fill none). 참고: 기존 인라인 SVG 방식 `src/components/analysis/charts/line-chart.tsx`.

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/home/sparkline.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { sparklinePath } from './sparkline'

describe('sparklinePath', () => {
  it('returns empty for <2 values', () => {
    expect(sparklinePath([], 100, 20)).toBe('')
    expect(sparklinePath([5], 100, 20)).toBe('')
  })

  it('maps first x to 0 and last x to width', () => {
    const pts = sparklinePath([1, 2, 3], 100, 20).split(' ')
    expect(pts).toHaveLength(3)
    expect(pts[0].startsWith('0,')).toBe(true)
    expect(pts[2].startsWith('100,')).toBe(true)
  })

  it('maps the max value to y=0 and the min value to y=height', () => {
    const pts = sparklinePath([10, 20], 100, 20).split(' ')
    // first (min) → y=20, last (max) → y=0
    expect(pts[0]).toBe('0,20')
    expect(pts[1]).toBe('100,0')
  })

  it('centers a flat series', () => {
    const pts = sparklinePath([5, 5, 5], 100, 20).split(' ')
    expect(pts.every(p => p.endsWith(',10'))).toBe(true)
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/components/home/sparkline.test.ts` → FAIL.

- [ ] **Step 3: 구현**

Create `src/components/home/sparkline.tsx`:
```tsx
export function sparklinePath(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length < 2) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const stepX = width / (values.length - 1)
  return values
    .map((v, i) => {
      const x = Math.round(i * stepX)
      const y = span === 0 ? height / 2 : height - ((v - min) / span) * height
      return `${x},${Math.round(y)}`
    })
    .join(' ')
}

type SparklineProps = {
  values: number[]
  width?: number
  height?: number
  className?: string
}

export default function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
}: SparklineProps) {
  const points = sparklinePath(values, width, height)
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/components/home/sparkline.test.ts` → PASS.
- [ ] **Step 5: 커밋** — `git add src/components/home/sparkline.tsx src/components/home/sparkline.test.ts && git commit -m "[FE] feat: 인라인 SVG 스파크라인 컴포넌트"`

---

## Task 3: Reveal 스크롤 진입 래퍼 (client)

스크롤 진입 시 자식을 1회 페이드/상승시키는 래퍼. IntersectionObserver 사용, `prefers-reduced-motion`에서는 즉시 표시(모션 없음). 서버 렌더 자식을 감싸 사용한다.

**Files:**
- Create: `src/components/home/reveal.tsx`

**Interfaces (Produces):**
- `default function Reveal(props: { children: ReactNode; delay?: number; className?: string }): JSX.Element` — 초기 opacity 0 + translateY, 뷰포트 진입 시 1회 visible. reduced-motion이면 처음부터 visible.

- [ ] **Step 1: 구현**

Create `src/components/home/reveal.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'

const Wrapper = styled.div<{ $visible: boolean; $delay: number }>`
  opacity: ${p => (p.$visible ? 1 : 0)};
  transform: translateY(${p => (p.$visible ? '0' : '12px')});
  transition:
    opacity var(--motion-standard) var(--ease-standard) ${p => p.$delay}ms,
    transform var(--motion-standard) var(--ease-standard) ${p => p.$delay}ms;

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    transform: none;
    transition: none;
  }
`

export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Wrapper ref={ref} $visible={visible} $delay={delay} className={className}>
      {children}
    </Wrapper>
  )
}
```

- [ ] **Step 2: 타입/린트 확인** — Run: `pnpm exec tsc --noEmit --incremental false` (또는 `pnpm typecheck`) 및 `pnpm exec eslint src/components/home/reveal.tsx` → 0 error/warning. `pnpm exec prettier --write src/components/home/reveal.tsx`.
- [ ] **Step 3: 커밋** — `git add src/components/home/reveal.tsx && git commit -m "[FE] feat: 스크롤 진입 Reveal 래퍼(reduced-motion 대응)"`

---

## Task 4: 상권 분석 미니데모 (client)

Task 1·2를 사용해 데모 본체를 만든다. 지역·업종 선택(키보드 조작) → `getDemoSample` → 카드 갱신(`aria-live`), CTA는 `/analysis`.

**Files:**
- Create: `src/components/home/analysis-mini-demo.tsx`

**Interfaces:**
- Consumes: `getDemoSample`, `DISTRICTS`, `INDUSTRIES`, `DEFAULT_SELECTION`, `DemoSample`, `CompetitionLevel`(`@/data/home-demo`); `Sparkline`(`@/components/home/sparkline`); `next/link`.
- Produces: `default function AnalysisMiniDemo(): JSX.Element`.

- [ ] **Step 1: 컴포넌트 구현**

`'use client'`. 요구사항:
- 상태: `const [sel, setSel] = useState(DEFAULT_SELECTION)`. `const sample = getDemoSample(sel.districtId, sel.industryId)`.
- 선택 UI: 지역·업종 각각 **라디오 그룹형 세그먼트**(버튼들) 또는 접근성 있는 컨트롤. 각 그룹은 `role="radiogroup"` + `aria-label`("지역 선택"/"업종 선택"), 각 옵션은 `<button role="radio" aria-checked>` 또는 실제 radio input. 선택 버튼은 `--color-primary-700`/`--color-primary-100` 토큰으로 활성 표시. 키보드 포커스 링(`--shadow-focus-primary`).
- 카드: `aria-live="polite"` 컨테이너. 내부:
  - 헤더: "{지역명} · {업종명}" + "대표 예시 데이터" 배지(작은 캡션, `--color-text-caption`).
  - 매출 추이: `<Sparkline values={sample.salesTrend} />`(색은 상승/하락에 따라 `--color-success`/`--color-danger`, currentColor로 상속) + `salesChangePct` 배지(부호 포함, `+`는 success, `-`는 danger).
  - 유동인구: 라벨 "유동인구" + `sample.footTraffic`.
  - 경쟁 강도: 라벨 "경쟁 강도" + 배지(`competition` → 텍스트 "낮음"/"보통"/"높음"). 색: low=success, medium=text-700, high=danger 계열(기존 토큰).
  - 해석: `sample.insight` 한 줄.
  - CTA: `<Link href="/analysis">이 조건으로 실제 분석하기</Link>`(PrimaryLink 스타일, 홈 공통 링크 스타일 재사용).
- 스타일: styled-components + DESIGN.md 토큰만(카드 `--color-surface`/`--color-border-200`/`--radius-card`/`--shadow-level-2`). 값 변경 시 자연스러운 색/opacity 전환(`--motion-fast`), reduced-motion 존중.
- 하드코딩 색/그림자 금지.

- [ ] **Step 2: 검증** — `pnpm exec tsc --noEmit --incremental false`(or `pnpm typecheck`), `pnpm exec eslint src/components/home/analysis-mini-demo.tsx`(0 warning), `pnpm exec prettier --write` 후 `--check`.
- [ ] **Step 3: 커밋** — `git add src/components/home/analysis-mini-demo.tsx && git commit -m "[FE] feat: 상권 분석 미니데모 컴포넌트(정적 샘플·접근성)"`

---

## Task 5: home-page.tsx 재작성 (서버, 섹션·카피·통합)

새 섹션 구성으로 재작성하고, 미니데모/ Reveal을 통합한다. 카피는 아래 문구를 **그대로** 사용. 기존 styled-components 중 재사용 가능한 것은 유지(Inner/PrimaryLink 등), 불필요해진 것(PreviewPanel/MetricList 등 약한 지표 패널)은 제거.

**Files:**
- Modify: `src/components/home/home-page.tsx` (재작성). 서버 컴포넌트 유지(파일 상단 `'use client'` 없음). 미니데모는 client 컴포넌트를 import해 배치, Reveal로 섹션 감싸기.

**Interfaces:**
- Consumes: `AnalysisMiniDemo`(`@/components/home/analysis-mini-demo`), `Reveal`(`@/components/home/reveal`), `next/link`, lucide 아이콘.

**섹션 & 카피(그대로 사용):**

1) **Hero**
- Eyebrow: `서울 상권 데이터 분석`
- Title: `창업 전에, 상권부터 확인하세요.`
- Body: `서울 25개 자치구를 업종별 매출·유동인구·경쟁 현황으로 분석합니다. 감이 아니라 데이터로 자리를 정하세요.`
- Primary CTA: `내 상권 분석하기` → `/analysis`
- Secondary CTA: `구별현황 보기` → `/status`

2) **상권 분석 미니데모** (Hero 직후) — 섹션 헤더 + `<AnalysisMiniDemo />`
- Eyebrow: `미리 체험하기`
- Title: `지역과 업종을 고르면, 분석이 이렇게 나옵니다.`
- Body: `실제 리포트의 축약본입니다. 아래 수치는 대표 예시입니다.`

3) **판단 흐름** (Reveal로 각 스텝 순차 등장, delay 단계별 증가)
- Eyebrow: `판단 흐름`
- Title: `현황 확인부터 창업 판단까지, 네 단계로 좁힙니다.`
- Steps:
  - `01` / `현황 확인` / `구별현황에서 자치구별 매출·유동인구·업종 분포를 비교합니다.`
  - `02` / `상권 분석` / `지역과 업종을 지정해 매출 추이와 경쟁 강도를 리포트로 확인합니다.`
  - `03` / `후보 추천` / `조건에 맞는 상권을 추천받아 후보를 좁히고 저장합니다.`
  - `04` / `창업 시뮬레이션` / `예상 비용과 매출을 시뮬레이션해 실행 가능성을 점검합니다.`

4) **기능** (카드 6개, 호버 상승, 실제 라우트)
- Eyebrow: `기능`
- Title: `상권 판단에 필요한 기능을 한 곳에 모았습니다.`
- 카드:
  - `구별현황` → `/status` / `자치구별 상권 지표를 한눈에 비교합니다.`
  - `상권분석` → `/analysis` / `업종·지역별 매출과 경쟁을 리포트로 분석합니다.`
  - `상권추천` → `/recommend` / `조건에 맞는 후보 상권을 추천합니다.`
  - `시뮬레이션` → `/simulation` / `창업 비용과 예상 수익을 시뮬레이션합니다.`
  - `커뮤니티` → `/community/list` / `창업자들과 상권 정보를 나눕니다.`
  - `실시간 채팅` → `/chatting/list` / `관심 주제방에서 실시간으로 대화합니다.`

5) **마무리 CTA**
- Title: `지금 내 상권을 분석해 보세요.`
- Body: `회원가입 후 분석 리포트와 추천, 시뮬레이션을 이어서 사용할 수 있습니다.`
- Primary CTA: `시작하기` → `/register`
- Secondary CTA: `상권 분석 바로가기` → `/analysis`

**요구사항:**
- 기존 metrics 배열/PreviewPanel/MetricList/Quick actions 4카드 등 v1 전용 구조는 제거(새 구성으로 대체). "판단 흐름 4단계/연결 기능 6개" 같은 의미 약한 지표 문구는 넣지 않는다.
- 카드 hover는 `--color-primary-700` 보더 + `--shadow-level-2` + `--motion-fast` 전환(기존 QuickCard/ServiceCard 패턴 재사용 가능).
- 판단 흐름·기능 섹션은 `<Reveal>`로 감싸 진입 애니메이션(delay 예: 0/80/160/240ms).
- 모든 CTA는 `next/link`. 아이콘은 장식이면 `aria-hidden`.
- DESIGN.md 토큰만. 반응형(≤960/≤640) 유지.

- [ ] **Step 1: 재작성 구현** (위 섹션·카피·요구사항 반영)
- [ ] **Step 2: 검증** — `pnpm exec tsc --noEmit --incremental false`(or `pnpm typecheck`), `pnpm exec eslint src/components/home/home-page.tsx`(0 warning), `pnpm exec prettier --write` 후 `--check`, `pnpm build`로 RSC/client 경계 오류 없음 확인.
- [ ] **Step 3: 커밋** — `git add src/components/home/home-page.tsx && git commit -m "[FE] feat: 홈 인터랙티브 랜딩 재작성(미니데모·판단흐름·기능·카피)"`

---

## Task 6: 전체 검증 · 브라우저 도그푸딩 · 문서 상태

**Files:**
- Modify: `docs/features/_index.md`(home 행), `docs/features/home/mini-demo.md`(D8), `docs/features/home/home.md`(필요 시)

- [ ] **Step 1: 단위테스트 + 품질 게이트** — Run: `pnpm test`(전체 PASS) 및 `pnpm qa:verify`(exit 0). 실패 시 수정 후 재실행.
- [ ] **Step 2: 브라우저 도그푸딩** — dev 서버(`.claude/launch.json`의 `bosspick-frontend`)로 `/` 확인:
  - Hero/미니데모/판단 흐름/기능/마무리 CTA 렌더, 각 CTA `href` 정확
  - 미니데모: 지역·업종 변경 시 카드(스파크라인·지표·해석) 즉시 갱신, 키보드 조작, "대표 예시" 라벨 표시
  - 스크롤 시 판단 흐름/기능 reveal 동작
  - `resize_window` desktop/mobile 반응형, `colorScheme` 다크(있다면) 확인
  - reduced-motion 에뮬레이션 시 모션 제거(가능 범위)
  - `read_console_messages`/`read_network_requests`로 오류 없음·**백엔드 호출 없음** 확인
  - 스크린샷으로 근거 캡처
- [ ] **Step 3: 문서 상태 갱신** — `_index.md` home 행 비고에 "인터랙티브 랜딩 리디자인(미니데모) 완료" 반영. `mini-demo.md` D8-1/2를 구현 결과(넣은 조합·샘플 범위)로 확정.
- [ ] **Step 4: 커밋** — `git add docs/features && git commit -m "[FE] docs: 홈 리디자인 구현 결과·상태 반영"`

---

## Self-Review (작성자 점검)

- **Spec coverage**: home.md S2 #1(섹션 순서)→Task5 / #3(보이스)→Task5 카피 / #5(모션·reduced-motion)→Task3·4 / #6(client 격리·정적 데이터)→Task1·3·4 / #7(키보드·aria)→Task4. mini-demo D1~D7→Task1·2·4, D7 순수테스트→Task1. 검증→Task6.
- **Placeholder scan**: 순수 로직(getDemoSample·sparklinePath)·데이터·Reveal은 실제 코드 포함. UI(미니데모·home-page)는 코드 전량 대신 정확한 요구사항+확정 카피로 지정(컴포넌트 테스트 인프라 없음 → 브라우저 검증). "적절히" 류 지시 없음.
- **Type consistency**: `DemoSample`/`CompetitionLevel`/`getDemoSample`/`DEFAULT_SELECTION`/`sparklinePath`/`Sparkline`/`Reveal`/`AnalysisMiniDemo` 시그니처가 Task1·2·3 정의와 Task4·5 사용에서 일치.
- **결정**: 홈 서버 컴포넌트 유지 + 미니데모/Reveal만 client. 스파크라인 인라인 SVG(의존성 0). 정적 샘플 "대표 예시" 라벨로 오인 방지.
