# 홈 히어로 하위 섹션 재설계(스크롤리텔링) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 히어로 아래의 나열식 섹션을 「① 앵커 텍스트채우기 → ② 스티키 4스텝 제품 데모 → ③ 벤토 기능+CTA」 3부 스크롤리텔링으로 교체한다.

**Architecture:** 스크롤 진행도를 순수 함수(`scroll-fill.ts`)로 계산하고 얇은 클라이언트 훅(`use-scroll-progress.ts`)이 rAF로 감싼다. ①②는 이 진행도로 채움 비율·활성 스텝을 파생하고, ③은 정적 벤토다. 스크롤-핀·GSAP 없이 CSS `position: sticky` + 진행도만으로 크로스브라우저 안전하게 구현한다. 기존 컴포넌트(`seoul-districts-map`, `analysis-mini-demo`, `mini-area-chart`, `reveal`)를 최대 재활용한다.

**Tech Stack:** Next.js App Router, TypeScript, styled-components, React 19, vitest(+jsdom). 신규 런타임 의존성 없음.

## Global Constraints

- 신규 런타임 의존성 추가 금지(특히 gsap/framer-motion). 스크롤 연출은 무의존성 훅으로 구현.
- 색·모션·radius·shadow·spacing은 `DESIGN.md` 토큰(`--color-*`, `--motion-*`, `--ease-*`, `--radius-*`, `--shadow-*`)만 사용. 신규 토큰 추가 금지.
- `prefers-reduced-motion: reduce`: 채움·전환·리빌 제거, 최종 상태 즉시 표시(스택 레이아웃).
- 3D 아이콘·스크린샷 캡처(`<img>`)·gradient/blur 장식 금지. 아이콘은 기존 `lucide-react` 라인 계열.
- 브라우저 API(scroll, IntersectionObserver, matchMedia) 사용부는 `'use client'`.
- 데모 수치는 대표 예시(샘플)이며 "대표 예시 데이터"로 라벨링.
- 완료 보고 전 `pnpm qa:verify`(format:check && lint && typecheck && build) 실행.
- 앵커 카피(정확히): `감에 의존하지 마세요. AI 에이전트가 방대한 데이터를 분석해 오직 당신만을 위한 맞춤형 리포트를 완성합니다.`

---

## File Structure

- Create `src/components/home/scroll-fill.ts` — 순수 진행도/파생 함수(`viewportProgress`, `filledWordCount`, `activeStepFromProgress`).
- Create `src/components/home/scroll-fill.test.ts` — 위 함수 단위테스트.
- Create `src/components/home/use-scroll-progress.ts` — 요소 진행도(0~1) 클라이언트 훅(rAF, passive, reduced-motion→1).
- Create `src/components/home/anchor-statement.tsx` — ① 앵커(단어 채움). `'use client'`.
- Create `src/components/home/anchor-statement.test.ts` — 앵커 SSR 렌더(전체 문장·SR 텍스트) 테스트.
- Create `src/components/home/story-steps.ts` — ② 스텝 정적 데이터(번호/제목/설명/데모 종류).
- Create `src/components/home/product-story.tsx` — ② 스티키 컨테이너 + 데모 패널 매핑. `'use client'`.
- Create `src/components/home/product-story.test.ts` — ② SSR 렌더(4스텝 제목·샘플 라벨) 테스트.
- Create `src/components/home/feature-bento.tsx` — ③ 벤토 + CTA.
- Create `src/components/home/feature-bento.test.ts` — ③ SSR 렌더(카드·CTA href) 테스트.
- Modify `src/components/home/home-page.tsx` — 기존 3섹션(미리체험/판단흐름/기능) 제거, ①②③ 조립.
- Modify `src/components/home/home-page.test.ts` — 새 구조 카피/href로 갱신.

> 참고: ② 활성 스텝은 명세 D3-1의 IntersectionObserver 대신 **스크롤 진행도 파생**으로 구현한다(순수 함수로 단위테스트 가능, sticky 레이아웃 유지, 동일 UX). reduced-motion·모바일은 스택 레이아웃으로 폴백한다.

---

### Task 1: 스크롤 진행도 순수 함수 (`scroll-fill.ts`)

**Files:**

- Create: `src/components/home/scroll-fill.ts`
- Test: `src/components/home/scroll-fill.test.ts`

**Interfaces:**

- Produces:
  - `viewportProgress(top: number, elementHeight: number, viewportHeight: number): number` — 0(요소가 뷰포트 하단에 막 진입)~1(요소가 뷰포트 상단을 완전히 통과). `top`은 `getBoundingClientRect().top`.
  - `filledWordCount(progress: number, total: number): number` — 채울 단어 수(반올림, 0~total 클램프).
  - `activeStepFromProgress(progress: number, stepCount: number): number` — 활성 스텝 인덱스(0~stepCount-1).

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/components/home/scroll-fill.test.ts
import { describe, expect, it } from 'vitest'
import {
  activeStepFromProgress,
  filledWordCount,
  viewportProgress,
} from '@/components/home/scroll-fill'

describe('viewportProgress', () => {
  it('요소가 뷰포트 하단에 막 진입하면 0', () => {
    // top === viewportHeight → scrolled 0
    expect(viewportProgress(800, 400, 800)).toBe(0)
  })

  it('요소가 상단을 완전히 통과하면 1', () => {
    // top === -elementHeight → scrolled === total
    expect(viewportProgress(-400, 400, 800)).toBe(1)
  })

  it('범위를 벗어나도 0~1로 클램프', () => {
    expect(viewportProgress(2000, 400, 800)).toBe(0)
    expect(viewportProgress(-5000, 400, 800)).toBe(1)
  })
})

describe('filledWordCount', () => {
  it('진행도에 비례해 반올림', () => {
    expect(filledWordCount(0, 10)).toBe(0)
    expect(filledWordCount(1, 10)).toBe(10)
    expect(filledWordCount(0.44, 10)).toBe(4)
    expect(filledWordCount(0.45, 10)).toBe(5)
  })

  it('진행도를 0~1로 클램프', () => {
    expect(filledWordCount(-1, 10)).toBe(0)
    expect(filledWordCount(2, 10)).toBe(10)
  })
})

describe('activeStepFromProgress', () => {
  it('구간별 인덱스 매핑', () => {
    expect(activeStepFromProgress(0, 4)).toBe(0)
    expect(activeStepFromProgress(0.2, 4)).toBe(0)
    expect(activeStepFromProgress(0.25, 4)).toBe(1)
    expect(activeStepFromProgress(0.75, 4)).toBe(3)
    expect(activeStepFromProgress(1, 4)).toBe(3)
  })

  it('스텝이 0 이하면 0', () => {
    expect(activeStepFromProgress(0.5, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/home/scroll-fill.test.ts`
Expected: FAIL — 모듈/함수 없음.

- [ ] **Step 3: 최소 구현**

```ts
// src/components/home/scroll-fill.ts
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function viewportProgress(
  top: number,
  elementHeight: number,
  viewportHeight: number,
): number {
  const total = elementHeight + viewportHeight
  if (total <= 0) return 0
  const scrolled = viewportHeight - top
  return clamp01(scrolled / total)
}

export function filledWordCount(progress: number, total: number): number {
  return Math.round(clamp01(progress) * total)
}

export function activeStepFromProgress(
  progress: number,
  stepCount: number,
): number {
  if (stepCount <= 0) return 0
  const p = Math.min(0.999999, Math.max(0, progress))
  return Math.min(stepCount - 1, Math.floor(p * stepCount))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/home/scroll-fill.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/home/scroll-fill.ts src/components/home/scroll-fill.test.ts
git commit -m "feat(home): 스크롤 진행도 순수 함수(scroll-fill) 추가"
```

---

### Task 2: 스크롤 진행도 훅 (`use-scroll-progress.ts`)

**Files:**

- Create: `src/components/home/use-scroll-progress.ts`

**Interfaces:**

- Consumes: `viewportProgress` (Task 1).
- Produces: `useScrollProgress(ref: RefObject<HTMLElement | null>): number` — 대상 요소의 진행도(0~1). 스크롤/리사이즈 시 rAF 스로틀로 갱신. `prefers-reduced-motion: reduce`이면 항상 1 반환(최종 상태). SSR/초기값 0.

**참고:** 얇은 훅이라 별도 단위테스트 없이 Task 1의 순수 함수 테스트와 Task 3·4의 SSR 테스트로 커버한다. 로직은 최소로 유지한다.

- [ ] **Step 1: 구현**

```ts
// src/components/home/use-scroll-progress.ts
'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { viewportProgress } from '@/components/home/scroll-fill'

export function useScrollProgress(ref: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setProgress(1)
      return
    }

    const measure = () => {
      frame.current = null
      const rect = el.getBoundingClientRect()
      setProgress(viewportProgress(rect.top, rect.height, window.innerHeight))
    }

    const onScroll = () => {
      if (frame.current !== null) return
      frame.current = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    }
  }, [ref])

  return progress
}
```

- [ ] **Step 2: 타입 검사**

Run: `pnpm exec tsc --noEmit --incremental false`
Expected: PASS(신규 파일 관련 에러 없음). 기존 프로젝트 에러가 없다면 클린.

- [ ] **Step 3: 커밋**

```bash
git add src/components/home/use-scroll-progress.ts
git commit -m "feat(home): 스크롤 진행도 훅(use-scroll-progress) 추가"
```

---

### Task 3: ① 앵커 문장 (`anchor-statement.tsx`)

**Files:**

- Create: `src/components/home/anchor-statement.tsx`
- Test: `src/components/home/anchor-statement.test.ts`

**Interfaces:**

- Consumes: `useScrollProgress` (Task 2), `filledWordCount` (Task 1).
- Produces: `default AnchorStatement()` — props 없음. 앵커 카피를 단어 span으로 렌더, 스크롤 진행도로 앞에서부터 본문색으로 채움. 미채움 단어는 `--color-border-200`, 채운 단어는 `--color-text-900`.

**설계 메모:** 전체 문장이 스크린리더에 온전히 읽히도록 span 분해는 공백 포함 인라인 텍스트로 유지한다(`aria-hidden` 쓰지 않음). 채움 완료 타이밍을 앞당기려 진행도에 게인(`FILL_GAIN = 1.7`)을 곱한다(`filledWordCount`가 내부 클램프).

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/components/home/anchor-statement.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AnchorStatement from '@/components/home/anchor-statement'

describe('AnchorStatement', () => {
  it('앵커 문장 전체가 텍스트로 렌더된다(SR 낭독 보장)', () => {
    const html = renderToStaticMarkup(createElement(AnchorStatement))
    const text = html.replace(/<[^>]+>/g, '')
    expect(text).toContain('감에 의존하지 마세요.')
    expect(text).toContain('오직 당신만을 위한 맞춤형 리포트를 완성합니다.')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/home/anchor-statement.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

```tsx
// src/components/home/anchor-statement.tsx
'use client'

import { useRef } from 'react'
import styled from 'styled-components'
import { filledWordCount } from '@/components/home/scroll-fill'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

const ANCHOR_COPY =
  '감에 의존하지 마세요. AI 에이전트가 방대한 데이터를 분석해 오직 당신만을 위한 맞춤형 리포트를 완성합니다.'
const WORDS = ANCHOR_COPY.split(' ')
const FILL_GAIN = 1.7

const Section = styled.section`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 20px;

  @media (max-width: 640px) {
    min-height: auto;
    padding: 96px 16px;
  }
`

const Statement = styled.p`
  width: min(880px, 100%);
  margin: 0;
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: -0.01em;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 24px;
  }
`

const Word = styled.span<{ $filled: boolean }>`
  color: ${p =>
    p.$filled ? 'var(--color-text-900)' : 'var(--color-border-200)'};
  transition: color var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export default function AnchorStatement() {
  const ref = useRef<HTMLParagraphElement | null>(null)
  const progress = useScrollProgress(ref)
  const filled = filledWordCount(progress * FILL_GAIN, WORDS.length)

  return (
    <Section>
      <Statement ref={ref}>
        {WORDS.map((word, index) => (
          <Word key={`${word}-${index}`} $filled={index < filled}>
            {word}
            {index < WORDS.length - 1 ? ' ' : ''}
          </Word>
        ))}
      </Statement>
    </Section>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/home/anchor-statement.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/home/anchor-statement.tsx src/components/home/anchor-statement.test.ts
git commit -m "feat(home): ① 앵커 문장 텍스트채우기 컴포넌트 추가"
```

---

### Task 4: ② 스티키 제품 데모 스토리텔링 (`story-steps.ts`, `product-story.tsx`)

**Files:**

- Create: `src/components/home/story-steps.ts`
- Create: `src/components/home/product-story.tsx`
- Test: `src/components/home/product-story.test.ts`

**Interfaces:**

- Consumes: `useScrollProgress` (Task 2), `activeStepFromProgress` (Task 1), 재활용 `SeoulDistrictsMap`(default, props 옵셔널), `AnalysisMiniDemo`(default), `MiniAreaChart`(`{ values, labels?, className? }`).
- Produces:
  - `story-steps.ts`: `type StoryDemo = 'map' | 'mini-demo' | 'recommend' | 'simulation'`; `type StoryStep = { step: string; title: string; body: string; demo: StoryDemo }`; `export const STORY_STEPS: readonly StoryStep[]`(4개).
  - `product-story.tsx`: `default ProductStory()` — props 없음. 데스크톱: 컨테이너 스크롤 진행도→활성 스텝, 좌측 스텝목록 sticky + 우측 데모 패널 sticky 교체. reduced-motion/모바일: 스택.

**설계 메모(이중 모드):** 마운트 전(SSR·초기)과 데스크톱은 **스티키 모드**(좌측 스텝목록 4개 + 우측 패널에 활성 데모 1개, active는 스크롤 진행도). 마운트 후 `prefers-reduced-motion: reduce`이거나 모바일 폭(≤640px)이면 **스택 모드**(스텝마다 텍스트+자기 데모를 세로로 나열, 스크롤 의존 없음)로 전환한다. `mounted` 게이트로 초기 렌더를 SSR과 일치시켜 hydration 불일치를 피한다. "대표 예시 데이터" 라벨은 각 패널 상단에 표기.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/components/home/product-story.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ProductStory from '@/components/home/product-story'

// SeoulDistrictsMap이 useRouter를 호출하므로 SSR 렌더용으로 모킹(home-page.test.ts와 동일)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

describe('ProductStory', () => {
  it('4개 스텝 제목과 샘플 라벨을 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(ProductStory))
    for (const title of [
      '현황 확인',
      '상권 분석',
      '후보 추천',
      '창업 시뮬레이션',
    ]) {
      expect(html).toContain(title)
    }
    expect(html).toContain('대표 예시 데이터')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/home/product-story.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 스텝 데이터 구현**

```ts
// src/components/home/story-steps.ts
export type StoryDemo = 'map' | 'mini-demo' | 'recommend' | 'simulation'

export type StoryStep = {
  step: string
  title: string
  body: string
  demo: StoryDemo
}

export const STORY_STEPS: readonly StoryStep[] = [
  {
    step: '01',
    title: '현황 확인',
    body: '서울 자치구별 매출·유동인구·업종 분포를 지도에서 비교합니다.',
    demo: 'map',
  },
  {
    step: '02',
    title: '상권 분석',
    body: '지역과 업종을 골라 매출 추이와 경쟁 강도를 리포트로 확인합니다.',
    demo: 'mini-demo',
  },
  {
    step: '03',
    title: '후보 추천',
    body: '조건에 맞는 상권을 점수순으로 추천받아 후보를 좁힙니다.',
    demo: 'recommend',
  },
  {
    step: '04',
    title: '창업 시뮬레이션',
    body: '예상 비용과 매출을 시뮬레이션해 실행 가능성을 점검합니다.',
    demo: 'simulation',
  },
] as const
```

- [ ] **Step 4: 스티키 컨테이너 구현**

```tsx
// src/components/home/product-story.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import MiniAreaChart from '@/components/home/mini-area-chart'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'
import { activeStepFromProgress } from '@/components/home/scroll-fill'
import { STORY_STEPS, type StoryDemo } from '@/components/home/story-steps'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

const Container = styled.section`
  position: relative;
`

const Track = styled.div`
  height: calc(100dvh * ${STORY_STEPS.length});

  @media (max-width: 640px) {
    height: auto;
  }
`

const Sticky = styled.div`
  position: sticky;
  top: 0;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  align-items: center;
  gap: 40px;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 64px 20px;

  @media (max-width: 640px) {
    position: static;
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 48px 16px;
  }
`

const StepList = styled.ol`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const StepItem = styled.li<{ $active: boolean }>`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-card);
  background: ${p => (p.$active ? 'var(--color-primary-100)' : 'transparent')};
  transition: background-color var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const StepNum = styled.span<{ $active: boolean }>`
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${p =>
    p.$active ? 'var(--color-primary-700)' : 'var(--color-text-caption)'};
`

const StepTitle = styled.h3<{ $active: boolean }>`
  font-size: 17px;
  font-weight: 600;
  line-height: 24px;
  color: ${p =>
    p.$active ? 'var(--color-text-900)' : 'var(--color-text-700)'};
`

const StepBody = styled.p`
  margin-top: 4px;
  font-size: 14px;
  line-height: 21px;
  color: var(--color-text-600);
  word-break: keep-all;
`

const Panel = styled.div`
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SampleLabel = styled.span`
  align-self: flex-start;
  font-size: 12px;
  color: var(--color-text-caption);
`

const RecommendRow = styled.div<{ $lead: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: var(--radius-control);
  border: 1px solid var(--color-border-200);
  background: ${p =>
    p.$lead ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${p =>
    p.$lead ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 14px;
`

const SimGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const SimCard = styled.div`
  border-radius: var(--radius-control);
  background: var(--color-background-muted);
  padding: 14px;
`

const SimLabel = styled.p`
  font-size: 12px;
  color: var(--color-text-600);
  margin: 0 0 4px;
`

const SimValue = styled.p`
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  font-variant-numeric: tabular-nums;
`

const ChartWrap = styled.div`
  color: var(--color-primary-700);
`

const Stack = styled.div`
  width: min(760px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 32px;
  padding: 48px 16px;
`

const StackItem = styled.article`
  display: grid;
  gap: 12px;
`

const StackHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`

function DemoPanel({ demo }: { demo: StoryDemo }) {
  if (demo === 'map') return <SeoulDistrictsMap />
  if (demo === 'mini-demo') return <AnalysisMiniDemo />
  if (demo === 'recommend') {
    const rows = [
      { name: '역삼동 상권', score: '92점', lead: true },
      { name: '서교동 상권', score: '88점', lead: false },
      { name: '연남동 상권', score: '85점', lead: false },
    ]
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map(row => (
          <RecommendRow key={row.name} $lead={row.lead}>
            <span>{row.name}</span>
            <span style={{ fontWeight: 600 }}>{row.score}</span>
          </RecommendRow>
        ))}
      </div>
    )
  }
  return (
    <div>
      <ChartWrap>
        <MiniAreaChart values={[32, 40, 38, 52, 60, 74]} />
      </ChartWrap>
      <SimGrid>
        <SimCard>
          <SimLabel>예상 월매출</SimLabel>
          <SimValue>4,200만</SimValue>
        </SimCard>
        <SimCard>
          <SimLabel>고정비</SimLabel>
          <SimValue>2,600만</SimValue>
        </SimCard>
      </SimGrid>
    </div>
  )
}

function PanelCard({ demo }: { demo: StoryDemo }) {
  return (
    <Panel>
      <SampleLabel>대표 예시 데이터</SampleLabel>
      <DemoPanel demo={demo} />
    </Panel>
  )
}

// 마운트 후에만 true가 될 수 있는 "스택 모드" 판정(reduced-motion 또는 모바일 폭).
// 초기값 false로 SSR/첫 렌더는 항상 스티키 모드 → hydration 일치.
function useStackedMode(): boolean {
  const [stacked, setStacked] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const narrow = window.matchMedia('(max-width: 640px)')
    const update = () => setStacked(reduced.matches || narrow.matches)
    update()
    reduced.addEventListener('change', update)
    narrow.addEventListener('change', update)
    return () => {
      reduced.removeEventListener('change', update)
      narrow.removeEventListener('change', update)
    }
  }, [])
  return stacked
}

export default function ProductStory() {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const progress = useScrollProgress(trackRef)
  const active = activeStepFromProgress(progress, STORY_STEPS.length)
  const stacked = useStackedMode()

  if (stacked) {
    return (
      <Container>
        <Stack>
          {STORY_STEPS.map(item => (
            <StackItem key={item.step}>
              <StackHead>
                <StepNum $active>{item.step}</StepNum>
                <StepTitle $active>{item.title}</StepTitle>
              </StackHead>
              <StepBody>{item.body}</StepBody>
              <PanelCard demo={item.demo} />
            </StackItem>
          ))}
        </Stack>
      </Container>
    )
  }

  return (
    <Container>
      <Track ref={trackRef}>
        <Sticky>
          <StepList>
            {STORY_STEPS.map((item, index) => {
              const isActive = index === active
              return (
                <StepItem key={item.step} $active={isActive}>
                  <StepNum $active={isActive}>{item.step}</StepNum>
                  <div>
                    <StepTitle $active={isActive}>{item.title}</StepTitle>
                    <StepBody>{item.body}</StepBody>
                  </div>
                </StepItem>
              )
            })}
          </StepList>
          <PanelCard demo={STORY_STEPS[active].demo} />
        </Sticky>
      </Track>
    </Container>
  )
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/home/product-story.test.ts`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/components/home/story-steps.ts src/components/home/product-story.tsx src/components/home/product-story.test.ts
git commit -m "feat(home): ② 스티키 제품 데모 스토리텔링 추가"
```

---

### Task 5: ③ 벤토 기능 + CTA (`feature-bento.tsx`)

**Files:**

- Create: `src/components/home/feature-bento.tsx`
- Test: `src/components/home/feature-bento.test.ts`

**Interfaces:**

- Consumes: 재활용 `MiniAreaChart`(`{ values }`), `next/link`, `lucide-react`(`Sparkles`, `Users`, `Bookmark`, `ArrowRight`).
- Produces: `default FeatureBento()` — props 없음. 벤토(대: AI 리포트 + 미니차트 / 소: 커뮤니티, 저장·알림) + CTA 밴드("시작하기"→`/register`, "상권 분석 바로가기"→`/analysis`).

**설계 메모:** 이 컴포넌트는 스크롤 연출 없음(정적). `reveal.tsx`로 카드 등장만 감싸도 됨(선택). `<img>`·3D 미사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/components/home/feature-bento.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FeatureBento from '@/components/home/feature-bento'

describe('FeatureBento', () => {
  it('벤토 카드와 CTA를 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(FeatureBento))
    for (const label of ['AI 리포트', '커뮤니티', '저장', '알림']) {
      expect(html).toContain(label)
    }
    expect(html).toContain('href="/register"')
    expect(html).toContain('href="/analysis"')
    expect(html).not.toContain('<img')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/home/feature-bento.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

```tsx
// src/components/home/feature-bento.tsx
import Link from 'next/link'
import { ArrowRight, Bookmark, Sparkles, Users } from 'lucide-react'
import styled from 'styled-components'
import MiniAreaChart from '@/components/home/mini-area-chart'

const Section = styled.section`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 20px;

  @media (max-width: 640px) {
    min-height: auto;
    padding: 64px 16px;
  }
`

const Inner = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
`

const Header = styled.div`
  max-width: 680px;
  display: grid;
  gap: 10px;
  margin-bottom: 28px;
`

const Eyebrow = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  word-break: keep-all;
`

const Bento = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  grid-template-rows: auto auto;
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const Hero = styled.article`
  grid-row: span 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 22px;

  @media (max-width: 720px) {
    grid-row: auto;
  }
`

const Card = styled.article`
  display: grid;
  gap: 8px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px;
`

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-700);

  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }
`

const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-900);
`

const CardBody = styled.p`
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-600);
  word-break: keep-all;
`

const Badge = styled.span`
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
`

const ChartWrap = styled.div`
  margin-top: auto;
  color: var(--color-primary-700);
`

const Cta = styled.div`
  margin-top: 24px;
  padding: 24px;
  border-radius: var(--radius-card);
  background: var(--color-background-muted);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const CtaTitle = styled.p`
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-900);
`

const CtaBody = styled.p`
  margin-top: 4px;
  font-size: 14px;
  color: var(--color-text-600);
  word-break: keep-all;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const PrimaryLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;

  &:hover {
    background: var(--color-primary-600);
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const SecondaryLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 600;

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

export default function FeatureBento() {
  return (
    <Section>
      <Inner>
        <Header>
          <Eyebrow>더 많은 기능</Eyebrow>
          <Title>분석 이후의 판단까지, 한 곳에서 이어집니다.</Title>
        </Header>

        <Bento>
          <Hero>
            <CardHead>
              <Sparkles aria-hidden="true" />
              <CardTitle>AI 리포트</CardTitle>
              <Badge>실시간 생성</Badge>
            </CardHead>
            <CardBody>
              AI 에이전트가 상권 데이터를 분석해 맞춤형 리포트를 스트리밍으로
              완성합니다.
            </CardBody>
            <ChartWrap>
              <MiniAreaChart values={[20, 34, 30, 48, 54, 70]} />
            </ChartWrap>
          </Hero>

          <Card>
            <CardHead>
              <Users aria-hidden="true" />
              <CardTitle>커뮤니티</CardTitle>
            </CardHead>
            <CardBody>같은 업종 예비 창업자들과 정보를 나눕니다.</CardBody>
          </Card>

          <Card>
            <CardHead>
              <Bookmark aria-hidden="true" />
              <CardTitle>저장 · 알림</CardTitle>
            </CardHead>
            <CardBody>관심 상권을 저장하고 변화를 알림으로 받습니다.</CardBody>
          </Card>
        </Bento>

        <Cta>
          <div>
            <CtaTitle>지금 내 상권을 분석해 보세요.</CtaTitle>
            <CtaBody>
              회원가입 후 분석 리포트와 상권 추천을 이어서 사용할 수 있습니다.
            </CtaBody>
          </div>
          <Actions>
            <PrimaryLink href="/register">
              <Bookmark aria-hidden="true" />
              시작하기
            </PrimaryLink>
            <SecondaryLink href="/analysis">
              <ArrowRight aria-hidden="true" />
              상권 분석 바로가기
            </SecondaryLink>
          </Actions>
        </Cta>
      </Inner>
    </Section>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/home/feature-bento.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/home/feature-bento.tsx src/components/home/feature-bento.test.ts
git commit -m "feat(home): ③ 벤토 기능 요약 + CTA 추가"
```

---

### Task 6: 홈 페이지 조립 + 기존 섹션 제거 (`home-page.tsx`)

**Files:**

- Modify: `src/components/home/home-page.tsx`
- Modify: `src/components/home/home-page.test.ts`

**Interfaces:**

- Consumes: `HeroSection`(기존), `AnchorStatement`(Task 3), `ProductStory`(Task 4), `FeatureBento`(Task 5).
- Produces: 새 `HomePage` — `<HeroSection/> <AnchorStatement/> <ProductStory/> <FeatureBento/>`.

- [ ] **Step 1: 홈 테스트를 새 구조로 갱신(실패 유도)**

`src/components/home/home-page.test.ts`를 아래로 교체한다.

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import HomePage from '@/components/home/home-page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

describe('HomePage', () => {
  it('히어로 + 재설계된 3부(앵커/스토리/벤토)를 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(HomePage))
    const text = html.replace(/<[^>]+>/g, '')

    expect(text).toContain('창업 전에, 상권부터 확인하세요.') // 히어로 유지
    expect(text).toContain('감에 의존하지 마세요.') // ① 앵커
    expect(text).toContain('현황 확인') // ② 스토리 스텝
    expect(text).toContain('AI 리포트') // ③ 벤토
    expect(html).toContain('대표 예시 데이터')
  })

  it('CTA 라우트를 렌더하고 레거시 브랜드/이미지가 없다', () => {
    const html = renderToStaticMarkup(createElement(HomePage))
    for (const href of ['/register', '/analysis']) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).not.toContain('NowDoBoss')
    expect(html).not.toContain('<img')
  })
})
```

> 히어로 카피 문자열(`창업 전에, 상권부터 확인하세요.`)은 현재 `hero-section.tsx`의 실제 카피와 일치해야 한다. 다르면 실제 히어로 카피로 맞춰 교체한다(먼저 `hero-section.tsx`에서 확인).

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/home/home-page.test.ts`
Expected: FAIL — 아직 새 섹션 미조립(앵커/스토리/벤토 카피 없음).

- [ ] **Step 3: `home-page.tsx` 재작성**

기존 `home-page.tsx`에서 `workflowSteps`/`featureCards` 데이터, 미리체험/판단흐름/기능 섹션과 그에 딸린 styled 컴포넌트를 제거하고 아래로 대체한다(불필요해진 import·styled 정의 삭제).

```tsx
import styled from 'styled-components'
import AnchorStatement from '@/components/home/anchor-statement'
import FeatureBento from '@/components/home/feature-bento'
import HeroSection from '@/components/home/hero-section'
import ProductStory from '@/components/home/product-story'

const Page = styled.main`
  background: var(--color-background);
`

export default function HomePage() {
  return (
    <Page>
      <HeroSection />
      <AnchorStatement />
      <ProductStory />
      <FeatureBento />
    </Page>
  )
}
```

> `analysis-mini-demo.tsx`, `mini-area-chart.tsx`, `reveal.tsx`는 하위 컴포넌트에서 계속 쓰이므로 삭제하지 않는다. 제거로 인해 미사용이 되는 import만 정리한다(lint가 `--max-warnings=0`이라 미사용 import는 실패 사유).

- [ ] **Step 4: 홈 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/home/home-page.test.ts`
Expected: PASS.

- [ ] **Step 5: 전체 테스트 확인**

Run: `pnpm test`
Expected: 기존 708 + 신규 테스트 포함 전부 PASS(0 실패). 미리체험/판단흐름 카피를 검사하던 기존 어서션이 없어졌는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/components/home/home-page.tsx src/components/home/home-page.test.ts
git commit -m "feat(home): 히어로 하위 3부(앵커/스토리/벤토) 조립 및 기존 섹션 제거"
```

---

### Task 7: 검증 · 브라우저 확인 · 명세 상태 갱신

**Files:**

- Modify: `docs/features/_index.md`(home 행 비고 갱신)

- [ ] **Step 1: 정적 검증**

Run: `pnpm qa:verify`
Expected: format:check·lint·typecheck·build 전부 PASS. 실패 시 원인 수정 후 재실행(미실행을 통과로 보고하지 않는다).

- [ ] **Step 2: 브라우저 스모크(preview_start)**

`.claude/launch.json`에 dev 서버 설정이 있으면 `preview_start`로 홈을 띄운다. 확인 항목:

- 앵커 문장이 스크롤에 따라 채워진다(데스크톱).
- ② 좌측 스텝이 sticky로 고정되고 스크롤에 따라 활성 스텝·데모 패널이 바뀐다.
- ③ 벤토·CTA가 정상 표시되고 링크가 동작한다.
- `prefers-reduced-motion` / 모바일 폭(≤640px)에서 스택 레이아웃으로 정상 표시.
- 콘솔 에러 없음(`read_console_messages`).

- [ ] **Step 3: 명세 인덱스 갱신**

`docs/features/_index.md`의 home 행 비고에 "히어로 하위 섹션 스크롤리텔링 재설계(앵커·스티키 데모·벤토) 구현 — spec: below-hero-scrollytelling.md, plan: 2026-08-11-home-below-hero-scrollytelling.md" 추가.

- [ ] **Step 4: 커밋**

```bash
git add docs/features/_index.md
git commit -m "docs(home): _index 비고에 히어로 하위 섹션 재설계 반영"
```

---

## Self-Review

**Spec coverage:**

- D2-1 앵커 채움 → Task 1(`filledWordCount`)·Task 3. ✅
- D2-2 sticky 활성 스텝 → Task 1(`activeStepFromProgress`)·Task 4. ✅
- D2-3 데모 패널 전환 → Task 4(`DemoPanel`). ✅
- D2-4 미니데모 재활용 → Task 4(`AnalysisMiniDemo`). ✅
- D2-5 벤토 위계·서포트 기능 → Task 5. ✅
- D2-6 모바일 스택 → Task 4(`@media`)·Task 5. ✅
- D2-7 reduced-motion → Task 2(훅→1)·Task 3/4(transition 제거). ✅
- D2-8 디자인 토큰·금지사항 → 전 Task styled 토큰 사용, Task 5/6 `<img>` 부재 테스트. ✅
- D2-9 rAF 스로틀 → Task 2. ✅
- D8 테스트 → Task 1·3·4·5·6 각 테스트. ✅

**Placeholder scan:** TBD/TODO 없음. 모든 코드 스텝에 실제 코드 포함.

**Type consistency:** `viewportProgress`/`filledWordCount`/`activeStepFromProgress`(Task 1) 시그니처가 Task 2·3·4 사용처와 일치. `STORY_STEPS`/`StoryStep`/`StoryDemo`(Task 4) 일치. `MiniAreaChart` props(`values`) 일치. `SeoulDistrictsMap`/`AnalysisMiniDemo` default import 일치.

**주의(실행자):**

- reduced-motion/모바일은 Task 4 `useStackedMode`로 스택 모드 전환(스텝별 텍스트+데모 전부 나열)되어 단일-활성 고정 문제가 없다. `mounted` 게이트로 SSR=스티키 초기 렌더와 일치시켜 hydration 불일치를 피한다. Task 7-2에서 reduced-motion 데스크톱·모바일 폭 둘 다 스택으로 뜨는지 확인.
- `matchMedia('(max-width: 640px)')`의 640px 경계는 Sticky/Track의 `@media(max-width: 640px)`와 일치시켜 유지한다(둘 다 640px). 한쪽만 바꾸지 말 것.
- 히어로 카피 문자열은 Task 6-1에서 실제 `hero-section.tsx` 값과 대조 후 확정.
