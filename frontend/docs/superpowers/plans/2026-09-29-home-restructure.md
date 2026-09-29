# 홈 스크롤 구조 재편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 히어로 아래를 「판단 흐름(탭) → 지금 많이 본 지역 → 더 많은 기능」 세 섹션으로 줄이고, 홈의 스크롤 고정(sticky) 트랙을 전부 없앤다.

**Architecture:** 네 도구 보드·앵커 문장을 지우고, 판단 흐름을 WAI-ARIA 탭(4장) + 패널 하나로 재작성한다. 랭킹은 300dvh 트랙을 걷어내고 `ranking-minimum-sample.md`(n≥3 최소 표본)를 함께 구현한다. 트랙용 모듈(`use-scroll-progress` · `scroll-fill` · `scroll-to-pinned-step` · `useStackedMode`)은 사용처가 사라지므로 삭제한다.

**Tech Stack:** Next.js App Router · React 19 · styled-components · React Query · lucide-react · vitest(node + `renderToStaticMarkup`) · Playwright

**Spec:** `docs/features/home/home-restructure.md` (함께 구현: `docs/features/home/ranking-minimum-sample.md`)

## Global Constraints

- 작업 디렉터리는 `frontend/`. 모든 명령은 `frontend/` 에서 실행한다.
- 파일 인코딩 UTF-8(no BOM). 커밋 prefix `[FE] <type>: <한국어 요약>`, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 새 색·radius·shadow·spacing 토큰을 만들지 않는다(DESIGN.md 기존 토큰만).
- styled 템플릿의 CSS 주석 안에 백틱을 쓰지 않는다(템플릿이 끊긴다).
- 문구는 해요체. 결과 보장 표현(「최적의」·「성공적인」) 금지(home.md S2 #3-1 · #3-2).
- 백엔드 API 계약·쿼리 키·새 네트워크 호출을 추가하지 않는다.
- 완료 전 `pnpm qa:verify`(format:check · lint · typecheck · build) 통과. 미실행 명령을 통과로 보고하지 않는다.
- 테스트는 jsdom 없이 `renderToStaticMarkup` 문자열 단언이다. 스타일은 `ServerStyleSheet` 로 뽑아 `.replace(/\s+/g, '')` 후 비교한다.

---

## File Structure

| 파일                                                                                                                                                  | 상태   | 책임                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `src/components/home/story-steps.ts`                                                                                                                  | 수정   | 네 단계 데이터 정본. `icon`·`note` 추가, `tool` 삭제, body 해요체        |
| `src/components/home/step-tabs.tsx`                                                                                                                   | 신규   | 탭 목록 UI + `nextTabIndex`(키보드 판정) + 탭/패널 id 규칙               |
| `src/components/home/step-tabs.test.ts`                                                                                                               | 신규   | `nextTabIndex` · 탭 마크업                                               |
| `src/components/home/product-story.tsx`                                                                                                               | 재작성 | 판단 흐름 섹션: 헤더 · StepTabs · 패널(설명                              | 데모) · 03 게이트 |
| `src/components/home/product-story.test.ts`                                                                                                           | 재작성 | TC-HR-002~007                                                            |
| `src/lib/home/popular-districts.ts`                                                                                                                   | 수정   | `MIN_VIEW_SAMPLE_SIZE` · `hasEnoughViewSample`                           |
| `src/lib/home/ranking-insight.ts` (+test)                                                                                                             | 수정   | n≥3 가드 · 해요체 문장                                                   |
| `src/components/home/popular-districts.tsx` (+test)                                                                                                   | 수정   | 트랙 제거 · 상태(dual/지표만/조회만/제거) · 상태별 문구 · Title 2줄 예약 |
| `src/components/home/home-page.tsx` (+test)                                                                                                           | 수정   | 섹션 구성 3개                                                            |
| `tool-flow-board.*` · `anchor-statement.*` · `use-scroll-progress.*` · `scroll-fill.*` · `scroll-to-pinned-step.ts` · `src/hooks/use-stacked-mode.ts` | 삭제   | 사용처 없음                                                              |
| `docs/features/home/*.md` · `docs/features/_index.md` · `e2e/baselines/home.*.json`                                                                   | 수정   | 문서·기준선                                                              |

---

### Task 1: 단계 데이터와 탭 컴포넌트

**Files:**

- Modify: `src/components/home/story-steps.ts`
- Create: `src/components/home/step-tabs.tsx`
- Test: `src/components/home/step-tabs.test.ts`

**Interfaces:**

- Produces:
  - `StoryStep` 에 `icon: LucideIcon` · `note?: string` 추가. **`tool` 은 이 태스크에서 지우지 않는다** — 네 도구 보드가 아직 읽는다. Task 4 가 보드와 함께 지운다(커밋마다 typecheck 가 통과해야 한다: rebase 머지라 커밋이 그대로 develop 에 올라간다)
  - `nextTabIndex(current: number, key: string, count: number): number | null`
  - `STORY_PANEL_ID = 'story-panel'`, `storyTabId(step: string): string` → `` `story-tab-${step}` ``
  - `default StepTabs({ steps, selected, figures, onSelect }: { steps: readonly StoryStep[]; selected: number; figures: readonly string[]; onSelect: (index: number) => void })`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/home/step-tabs.test.ts`

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import StepTabs, {
  STORY_PANEL_ID,
  nextTabIndex,
  storyTabId,
} from '@/components/home/step-tabs'
import { STORY_STEPS } from '@/components/home/story-steps'

describe('nextTabIndex — WAI-ARIA 탭 키보드 (TC-HR-001)', () => {
  it('→ 는 다음 탭, 끝에서는 처음으로 돈다', () => {
    expect(nextTabIndex(0, 'ArrowRight', 4)).toBe(1)
    expect(nextTabIndex(3, 'ArrowRight', 4)).toBe(0)
  })

  it('← 는 이전 탭, 처음에서는 끝으로 돈다', () => {
    expect(nextTabIndex(2, 'ArrowLeft', 4)).toBe(1)
    expect(nextTabIndex(0, 'ArrowLeft', 4)).toBe(3)
  })

  it('Home/End 는 처음/끝', () => {
    expect(nextTabIndex(2, 'Home', 4)).toBe(0)
    expect(nextTabIndex(1, 'End', 4)).toBe(3)
  })

  /* ↑/↓ 는 페이지 스크롤로 남긴다 — 2×2 배치여도 탭 순서는 1차원이다. */
  it('그 밖의 키는 null — 기본 동작을 막지 않는다', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'a']) {
      expect(nextTabIndex(1, key, 4)).toBeNull()
    }
  })

  it('탭이 없으면 null', () => {
    expect(nextTabIndex(0, 'ArrowRight', 0)).toBeNull()
  })
})

describe('StepTabs — 마크업', () => {
  const render = (selected = 0) =>
    renderToStaticMarkup(
      createElement(StepTabs, {
        steps: STORY_STEPS,
        selected,
        figures: ['25개 자치구', '강남구 · 카페', '—', '예시'],
        onSelect: () => undefined,
      }),
    )

  it('tablist 하나와 tab 네 개를 그린다', () => {
    const html = render()

    expect(html.match(/role="tablist"/g)).toHaveLength(1)
    expect(html.match(/role="tab"/g)).toHaveLength(4)
  })

  it('선택된 탭만 aria-selected=true 이고 tabindex=0 이다(roving tabindex)', () => {
    const html = render(2)

    expect(html.match(/aria-selected="true"/g)).toHaveLength(1)
    expect(html).toMatch(
      new RegExp(
        `id="${storyTabId('03')}"[^>]*aria-selected="true"[^>]*tabindex="0"`,
      ),
    )
    expect(html.match(/tabindex="-1"/g)).toHaveLength(3)
  })

  it('모든 탭이 같은 패널을 가리킨다', () => {
    expect(
      render().match(new RegExp(`aria-controls="${STORY_PANEL_ID}"`, 'g')),
    ).toHaveLength(4)
  })

  it('탭에 단계 수치를 싣는다', () => {
    const html = render()

    expect(html).toContain('25개 자치구')
    expect(html).toContain('예시')
  })
})

describe('STORY_STEPS — 탭 데이터 (TC-HR-007)', () => {
  it('네 단계 모두 아이콘이 있다', () => {
    for (const step of STORY_STEPS) expect(step.icon).toBeTruthy()
  })

  it('본문은 해요체로 끝난다', () => {
    for (const step of STORY_STEPS) {
      expect(step.body).toMatch(/요\.$/)
    }
  })

  it('04 만 고른 조건과 무관한 예시라는 note 를 갖는다', () => {
    expect(STORY_STEPS.filter(step => step.note)).toHaveLength(1)
    expect(STORY_STEPS[3].note).toBe('이 단계는 고른 조건과 상관없는 예시예요.')
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/components/home/step-tabs.test.ts` → Expected: FAIL (모듈 `step-tabs` 없음)

- [ ] **Step 3: `story-steps.ts` 수정**

타입에 `icon`·`note` 를 넣는다(`tool` 은 Task 4 까지 둔다). 파일 머리에 `import type { LucideIcon } from 'lucide-react'` 와 `import { Calculator, LineChart, Map, Target } from 'lucide-react'` 를 추가한다.

```ts
  /**
   * 탭 아이콘. 네 탭이 글자만 다르면 한 덩어리로 읽힌다 — 아이콘이 각 탭에 눈이 멈출
   * 자리를 만든다(예전 네 도구 보드의 STEP_ICONS 를 옮겼다). 장식이라 스크린리더에서는
   * 숨긴다.
   */
  icon: LucideIcon
  /**
   * 패널에 덧붙이는 한 줄. 04 만 쓴다 — 앞 세 단계는 고른 조건을 따라 움직이는데
   * 04 만 고정 예시라는 사실을 감추지 않는다(POST 가 필요해 랜딩에서 선택을 이어받지 않는다).
   */
  note?: string
```

`STORY_STEPS` 값(`icon` 추가, body 해요체 — 각 항목의 기존 `tool` 줄은 그대로 둔다. 아래 코드에서는 생략했다):

```ts
export const STORY_STEPS: readonly StoryStep[] = [
  {
    step: '01',
    title: '현황 확인',
    body: '서울 25개 자치구를 유동인구·매출·개업 수로 줄 세워 어디부터 볼지 정해요.',
    demo: 'metrics',
    icon: Map,
    outcome: '자치구 25곳을 지표로 줄 세운 순위표',
    cta: { href: '/status', label: '구별 현황 보기' },
  },
  {
    step: '02',
    title: '상권 분석 · AI 리포트',
    body: '지역과 업종을 고르면 매출 추이·경쟁 강도를 읽고, AI 가 판단 근거를 문장으로 정리해 줘요.',
    demo: 'mini-demo',
    icon: LineChart,
    outcome: '업종별 매출 추이와 AI 가 정리한 판단 근거',
    cta: null,
  },
  {
    step: '03',
    title: '후보 추천',
    body: '조건에 맞는 상권을 점수순으로 추천받아 후보를 좁혀요.',
    demo: 'recommend',
    icon: Target,
    outcome: '조건에 맞는 상권만 남긴 후보 목록',
    cta: { href: '/recommend', label: '상권 추천받기' },
  },
  {
    step: '04',
    title: '창업 시뮬레이션',
    body: '예상 비용과 매출로 손익분기에 닿는 시점을 따져 봐요.',
    demo: 'simulation',
    icon: Calculator,
    outcome: '예상 비용과 손익분기에 닿는 시점',
    cta: { href: '/simulation', label: '창업 시뮬레이션 해보기' },
    note: '이 단계는 고른 조건과 상관없는 예시예요.',
  },
] as const
```

- [ ] **Step 4: `step-tabs.tsx` 작성**

```tsx
'use client'

import { useRef, type KeyboardEvent } from 'react'
import styled from 'styled-components'

import type { StoryStep } from '@/components/home/story-steps'

/** 패널은 하나다 — 네 탭이 모두 같은 패널을 가리키고, 패널이 활성 탭으로 이름을 얻는다. */
export const STORY_PANEL_ID = 'story-panel'

/** 홈에 판단 흐름은 한 번뿐이라는 전제의 고정 id. 재사용이 생기면 useId 로 바꾼다. */
export const storyTabId = (step: string) => `story-tab-${step}`

/**
 * WAI-ARIA Tabs 키보드 판정. 숫자면 그 탭을 선택·포커스하고, null 이면 기본 동작을 둔다.
 *
 * ↑/↓ 는 쓰지 않는다 — 2×2 로 접혀도 탭 순서는 01→04 한 줄이고, ↑/↓ 는 페이지 스크롤로
 * 남겨야 키보드 사용자가 섹션을 벗어날 수 있다.
 */
export function nextTabIndex(
  current: number,
  key: string,
  count: number,
): number | null {
  if (count <= 0) return null
  if (key === 'ArrowRight') return (current + 1) % count
  if (key === 'ArrowLeft') return (current - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/*
  4열, 768 이하 2x2. 한 줄 가로 스크롤은 쓰지 않는다 — 숨는 탭이 생겨 네 단계가
  한눈에 보이지 않는다(예전 보드가 하던 일을 탭이 이어받는다).
*/
const List = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
`

const Tab = styled.button<{ $active: boolean }>`
  display: grid;
  align-content: start;
  gap: 6px;
  /* 터치 영역(DESIGN.md §8): 리스트 행 52px 이상. */
  min-height: 52px;
  padding: 16px;
  border: 1px solid
    ${p => (p.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)')};
  border-radius: var(--radius-card);
  background: ${p =>
    p.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: ${p =>
      p.$active ? 'var(--color-primary-600)' : 'var(--color-border-300)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }

  @media (max-width: 768px) {
    padding: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Head = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`

const IconBadge = styled.span<{ $active: boolean }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-control);
  background: ${p =>
    p.$active ? 'var(--color-surface)' : 'var(--color-primary-100)'};
  color: var(--color-primary-700);

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`

const Num = styled.span<{ $active: boolean }>`
  color: ${p =>
    p.$active ? 'var(--color-primary-700)' : 'var(--color-text-caption)'};
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
`

const Title = styled.span`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  word-break: keep-all;

  @media (max-width: 768px) {
    font-size: 14px;
    line-height: 20px;
  }
`

const Figure = styled.span`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;
`

type StepTabsProps = {
  steps: readonly StoryStep[]
  selected: number
  /** 탭마다 싣는 수치. `steps` 와 같은 순서·길이. */
  figures: readonly string[]
  onSelect: (index: number) => void
}

export default function StepTabs({
  steps,
  selected,
  figures,
  onSelect,
}: StepTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  /*
    자동 활성화: 포커스를 옮기면 바로 선택된다. 패널 전환이 캐시된 쿼리를 다시 그릴
    뿐이라 수동 활성화(Enter 로 확정)를 둘 이유가 없다.
  */
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextTabIndex(selected, event.key, steps.length)
    if (next === null) return
    event.preventDefault()
    onSelect(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <List role="tablist" aria-label="판단 흐름 네 단계">
      {steps.map((step, index) => {
        const active = index === selected
        const Icon = step.icon
        return (
          <Tab
            key={step.step}
            ref={element => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            id={storyTabId(step.step)}
            aria-selected={active}
            aria-controls={STORY_PANEL_ID}
            tabIndex={active ? 0 : -1}
            $active={active}
            onClick={() => onSelect(index)}
            onKeyDown={handleKeyDown}
          >
            <Head>
              <IconBadge $active={active} aria-hidden="true">
                <Icon />
              </IconBadge>
              <Num $active={active}>{step.step}</Num>
            </Head>
            <Title>{step.title}</Title>
            <Figure>{figures[index]}</Figure>
          </Tab>
        )
      })}
    </List>
  )
}
```

- [ ] **Step 5: 통과 확인** — Run: `pnpm vitest run src/components/home && pnpm typecheck` → Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/home/story-steps.ts src/components/home/step-tabs.tsx src/components/home/step-tabs.test.ts
git commit -m "[FE] feat: 판단 흐름 탭 컴포넌트와 해요체 단계 데이터를 만든다"
```

---

### Task 2: 판단 흐름 섹션 재작성

**Files:**

- Rewrite: `src/components/home/product-story.tsx`
- Rewrite: `src/components/home/product-story.test.ts`

**Interfaces:**

- Consumes: Task 1 의 `StepTabs`, `STORY_PANEL_ID`, `storyTabId`, `StoryStep`(icon·note·cta)
- Produces: `default ProductStory()` — props 없음. 내부 `stepFigure(index, selection, recommend): string`

- [ ] **Step 1: 테스트 재작성** — `src/components/home/product-story.test.ts` 전체를 아래로 바꾼다(스티키·카운터·5:7 행 관련 옛 describe 는 전부 사라진다).

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import ProductStory from '@/components/home/product-story'
import { STORY_PANEL_ID, storyTabId } from '@/components/home/step-tabs'
import { STORY_STEPS } from '@/components/home/story-steps'
import { districts } from '@/data/districts'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

/*
 * 01 데모(MetricRankingBoard)가 useQuery 를 쓰므로 QueryClientProvider 가 필요하다.
 * top-ten 을 캐시에 심지 않는다 — 폴백 렌더로 골격을 본다.
 */
const element = () =>
  createElement(
    QueryClientProvider,
    {
      client: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
    },
    createElement(ProductStory),
  )

const renderStory = () => renderToStaticMarkup(element())

const renderStyles = (): string => {
  const sheet = new ServerStyleSheet()
  try {
    renderToStaticMarkup(sheet.collectStyles(element()))
    return sheet.getStyleTags().replace(/\s+/g, '')
  } finally {
    sheet.seal()
  }
}

describe('ProductStory — 탭 구조 (TC-HR-002)', () => {
  it('탭 네 개와 패널 하나, 기본 선택은 01 이다', () => {
    const html = renderStory()

    expect(html.match(/role="tab"/g)).toHaveLength(4)
    expect(html.match(/role="tabpanel"/g)).toHaveLength(1)
    expect(html).toMatch(
      new RegExp(`id="${storyTabId('01')}"[^>]*aria-selected="true"`),
    )
  })

  it('패널이 활성 탭으로 이름을 얻는다', () => {
    expect(renderStory()).toMatch(
      new RegExp(
        `role="tabpanel"[^>]*id="${STORY_PANEL_ID}"[^>]*aria-labelledby="${storyTabId('01')}"`,
      ),
    )
  })

  it('네 단계 제목을 모두 탭에 싣는다', () => {
    const html = renderStory()
    for (const step of STORY_STEPS) expect(html).toContain(step.title)
  })
})

describe('ProductStory — 활성 패널만 그린다 (TC-HR-003)', () => {
  /*
   * 비활성 패널을 hidden 으로 두면 04 차트·03 추천이 첫 페인트에 마운트돼 요청이
   * 늘어난다(첫 페인트 BFF 2개 유지, 명세 D4-3).
   */
  it('01 패널의 CTA 만 있고 다른 도구 CTA 는 없다', () => {
    const html = renderStory()

    expect(html).toContain('href="/status"')
    expect(html).not.toContain('href="/recommend"')
    expect(html).not.toContain('href="/simulation"')
  })

  it('01 패널은 설명과 손에 남는 것을 싣는다', () => {
    const html = renderStory()

    expect(html).toContain(STORY_STEPS[0].body)
    expect(html).toContain('손에 남는 것')
    expect(html).toContain(STORY_STEPS[0].outcome)
  })

  it('나머지 단계의 CTA 목적지는 데이터로 고정한다', () => {
    expect(STORY_STEPS.map(step => step.cta?.href ?? null)).toEqual([
      '/status',
      null,
      '/recommend',
      '/simulation',
    ])
  })
})

describe('ProductStory — 스크롤 고정이 없다 (TC-HR-004 · 005)', () => {
  it('100dvh 도 sticky 도 쓰지 않는다', () => {
    const css = renderStyles()

    expect(css).not.toContain('100dvh')
    expect(css).not.toContain('position:sticky')
  })

  it('데스크톱 패널은 가장 큰 데모 높이를 예약한다', () => {
    expect(renderStyles()).toContain('min-height:560px')
  })

  it('768 이하에서 탭은 2x2 로 접힌다', () => {
    expect(renderStyles()).toMatch(
      /@media\(max-width:768px\)\{\.\w+\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);/,
    )
  })

  it('섹션은 전폭 배경 밴드 위의 홈 공용 컬럼이다', () => {
    const css = renderStyles()

    expect(css).toContain('background:var(--color-background-muted)')
    expect(css).toContain('width:min(var(--w-wide),var(--w-shell))')
  })
})

describe('ProductStory — 문구 (TC-HR-006)', () => {
  it('제목과 아이브로는 해요체다', () => {
    const html = renderStory()

    expect(html).toContain('이렇게 판단해요')
    expect(html).toContain(
      '자치구 25곳에서 시작해 가게 하나의 손익까지, 네 단계로 좁혀요.',
    )
  })

  it('내부 용어를 쓰지 않는다', () => {
    const html = renderStory()

    expect(html).not.toContain('선택과 무관한 고정 예시')
    expect(html).not.toContain('1개 예시')
  })

  it('탭 수치는 화면에서 유도한다 — 25 를 하드코딩하지 않는다', () => {
    const html = renderStory()

    expect(html).toContain(`${districts.length}개 자치구`)
    expect(html).toContain('강남구 · 카페')
  })

  /* 스토리 도달 전에는 03 연쇄가 꺼져 있다(IntersectionObserver 게이트). */
  it('03 수치는 로딩 표기(—)로 남는다', () => {
    expect(renderStory()).toContain('—')
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/components/home/product-story.test.ts` → Expected: FAIL(`role="tab"` 없음 등)

- [ ] **Step 3: `product-story.tsx` 재작성** — 파일 전체를 아래로 바꾼다.

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'

import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import BreakEvenChart from '@/components/home/break-even-chart'
import { HOME_COLUMN } from '@/components/home/layout-constants'
import MetricRankingBoard from '@/components/home/metric-ranking-board'
import RecommendPreview from '@/components/home/recommend-preview'
import StepTabs, {
  STORY_PANEL_ID,
  storyTabId,
} from '@/components/home/step-tabs'
import { STORY_STEPS, type StoryDemo } from '@/components/home/story-steps'
import {
  DEFAULT_SELECTION,
  findDistrictOption,
  findIndustryOption,
  type DemoSelection,
} from '@/data/home-demo'
import { districts } from '@/data/districts'
import {
  useRecommendPreview,
  type RecommendPreviewState,
} from '@/hooks/use-recommend-preview'

/*
  판단 흐름 — 네 단계를 탭으로 바꿔 보는 섹션(home-restructure.md).

  예전엔 네 도구 보드 · 앵커 문장 · 스티키 스토리(400dvh)가 같은 네 단계를 세 번
  말했다. 지금은 여기 한 번이고, 스크롤을 붙잡지 않는다. 전폭 배경 밴드(#223)는 유지한다.
*/
const Container = styled.section`
  position: relative;
  background: var(--color-background-muted);
  padding: 96px 0;

  @media (max-width: 900px) {
    padding: 72px 0;
  }

  @media (max-width: 640px) {
    padding: 56px 0;
  }
`

const Inner = styled.div`
  ${HOME_COLUMN}
  display: grid;
  gap: 24px;
`

const Lead = styled.div`
  display: grid;
  gap: 10px;
`

const Eyebrow = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const LeadTitle = styled.h2`
  max-width: 680px;
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  word-break: keep-all;

  @media (max-width: 768px) {
    font-size: 24px;
    line-height: 34px;
  }

  @media (max-width: 480px) {
    font-size: 21px;
    line-height: 30px;
  }
`

/*
  데스크톱 패널은 가장 큰 데모(02 미니데모 실측 519px) + 패딩 40 을 예약한다. 탭을
  바꿔도 아래 랭킹 섹션이 밀리지 않는다(명세 D4-2). 데모가 커지면 이 값을 다시 잰다.
  모바일은 예약하지 않는다 — 밀리는 것은 보고 있는 패널 아래다.
*/
const Panel = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 40px;
  min-height: 560px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    min-height: 0;
    padding: 16px;
  }
`

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 8px 4px;
`

const PanelTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  word-break: keep-all;
`

const Body = styled.p`
  color: var(--color-text-600);
  font-size: 15px;
  line-height: 24px;
  word-break: keep-all;
`

const Outcome = styled.div`
  display: grid;
  gap: 2px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-200);
`

const OutcomeLabel = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
`

const OutcomeText = styled.span`
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  word-break: keep-all;
`

const Note = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

/* CTA 는 설명 묶음의 바닥에 둔다 — 데스크톱에서 패널 높이가 예약돼 있어 위치가 흔들리지 않는다. */
const Cta = styled(Link)`
  margin-top: auto;
  min-height: 48px;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-primary-600);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

/*
  데모는 세로 가운데. justify-content: center 대신 자식 margin-block: auto — 넘칠 때
  위쪽이 잘리지 않는다(PR #424 규칙 승계).
*/
const DemoArea = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  > * {
    margin-block: auto;
  }
`

function DemoPanel({
  demo,
  selection,
  onSelectionChange,
}: {
  demo: StoryDemo
  selection: DemoSelection
  onSelectionChange: (selection: DemoSelection) => void
}) {
  if (demo === 'metrics') return <MetricRankingBoard />
  if (demo === 'mini-demo') {
    return (
      <AnalysisMiniDemo
        selection={selection}
        onSelectionChange={onSelectionChange}
      />
    )
  }
  if (demo === 'recommend') return <RecommendPreview selection={selection} />
  return <BreakEvenChart />
}

/**
 * 탭에 싣는 수치. 모든 숫자는 화면에서 유도한다(하드코딩 금지).
 * 04 는 POST 가 필요해 선택을 이어받지 않는다 — 「예시」라고만 적고 이유는 패널 note 가 말한다.
 */
function stepFigure(
  index: number,
  selection: DemoSelection,
  recommend: RecommendPreviewState,
): string {
  if (index === 0) return `${districts.length}개 자치구`

  if (index === 1) {
    const district = findDistrictOption(selection.districtId)?.name ?? '—'
    const industry = findIndustryOption(selection.industryId)?.name ?? '—'
    return `${district} · ${industry}`
  }

  if (index === 2) {
    if (recommend.isLoading) return '—'
    const picked = recommend.view.rows.length
    if (recommend.view.isSample) return `추천 ${picked}곳 · 예시`
    return `상권 ${recommend.commercialsCount}곳 중 추천 ${picked}곳`
  }

  return '예시'
}

export default function ProductStory() {
  const [selected, setSelected] = useState(0)

  /* 02(미니데모)·03(추천)·탭 수치가 같은 선택을 봐야 네 단계가 실제로 이어진다. */
  const [selection, setSelection] = useState<DemoSelection>(DEFAULT_SELECTION)

  /*
    03 탭 수치를 위해 추천 연쇄를 섹션 수준에서 부른다. 섹션은 히어로 아래라 첫
    화면에 보이지 않는다 — 곧장 켜면 스크롤을 안 해도 GET 3개가 나가 「첫 페인트 =
    GET 2개」가 깨진다. 섹션이 뷰포트에 들어온 뒤 한 번 켜고 다시 끄지 않는다.
  */
  const [inView, setInView] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (inView) return
    const element = sectionRef.current
    if (!element) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setInView(true)
        observer.disconnect()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [inView])

  /* 03 패널의 RecommendPreview 도 같은 훅·같은 selection 이라 캐시를 공유한다(요청 1회). */
  const recommendState = useRecommendPreview(selection, { enabled: inView })

  const step = STORY_STEPS[selected]
  const figures = STORY_STEPS.map((_, index) =>
    stepFigure(index, selection, recommendState),
  )

  return (
    <Container ref={sectionRef} aria-label="판단 흐름">
      <Inner>
        <Lead>
          <Eyebrow>이렇게 판단해요</Eyebrow>
          <LeadTitle>
            자치구 25곳에서 시작해 가게 하나의 손익까지, 네 단계로 좁혀요.
          </LeadTitle>
        </Lead>

        <StepTabs
          steps={STORY_STEPS}
          selected={selected}
          figures={figures}
          onSelect={setSelected}
        />

        {/*
          활성 패널만 렌더한다 — 비활성 패널을 hidden 으로 두면 데모가 모두 마운트돼
          요청이 늘어난다. 02 는 미니데모가 CTA 를 들고 있어 여기 CTA 가 없다.
        */}
        <Panel
          role="tabpanel"
          id={STORY_PANEL_ID}
          aria-labelledby={storyTabId(step.step)}
          tabIndex={0}
        >
          <Copy>
            <PanelTitle>{step.title}</PanelTitle>
            <Body>{step.body}</Body>
            <Outcome>
              <OutcomeLabel>손에 남는 것</OutcomeLabel>
              <OutcomeText>{step.outcome}</OutcomeText>
            </Outcome>
            {step.note ? <Note>{step.note}</Note> : null}
            {step.cta ? <Cta href={step.cta.href}>{step.cta.label}</Cta> : null}
          </Copy>
          <DemoArea>
            <DemoPanel
              demo={step.demo}
              selection={selection}
              onSelectionChange={setSelection}
            />
          </DemoArea>
        </Panel>
      </Inner>
    </Container>
  )
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/components/home && pnpm typecheck` → Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/home/product-story.tsx src/components/home/product-story.test.ts
git commit -m "[FE] feat: 판단 흐름을 스크롤 고정 대신 탭으로 바꾼다"
```

---

### Task 3: 지금 많이 본 지역 — 트랙 제거 + 최소 표본

**Files:**

- Modify: `src/lib/home/popular-districts.ts`
- Modify: `src/lib/home/ranking-insight.ts`, `src/lib/home/ranking-insight.test.ts`
- Modify: `src/components/home/popular-districts.tsx`, `src/components/home/popular-districts.test.ts`

**Interfaces:**

- Produces: `MIN_VIEW_SAMPLE_SIZE = 3`, `hasEnoughViewSample(view: PopularDistrictsView): boolean` (`src/lib/home/popular-districts.ts`)
- `buildRankingInsight` 시그니처 불변, `views.length < 3` 이면 `null`

- [ ] **Step 1: lib 테스트 먼저** — `src/lib/home/ranking-insight.test.ts`

기존 두 문장 단언을 해요체로 바꾼다:

- `'매출 2위 중구는 지금 많이 본 2곳에 들지 않았습니다.'` → 이 케이스는 views 2건이라 이제 `null` 이 된다. 해당 테스트의 views 픽스처에 세 번째 항목(`{ rank: 3, districtCode: '11110', name: '종로구', viewCount: 10, href: '/analysis?districtCode=11110' }`)을 추가하고 기대 문장을 `'매출 2위 중구는 지금 많이 본 3곳에 들지 않았어요.'` 로 바꾼다.
- `'조회수 3위 성동구는 매출 Top 2 밖입니다.'` → `'조회수 3위 성동구는 매출 Top 2 밖이에요.'`

아래 테스트를 추가한다:

```ts
import { MIN_VIEW_SAMPLE_SIZE } from '@/lib/home/popular-districts'

describe('buildRankingInsight — 최소 표본', () => {
  const metric = {
    metric: 'footTraffic' as const,
    label: '유동인구',
    items: [
      {
        rank: 1,
        districtCode: '11140',
        districtName: '중구',
        value: 100,
        changeRate: 1,
      },
    ],
  }
  const view = (code: string, rank: number) => ({
    rank,
    districtCode: code,
    name: code,
    viewCount: 10,
    href: `/analysis?districtCode=${code}`,
  })

  it('조회 항목이 3곳 미만이면 문장을 만들지 않는다', () => {
    expect(MIN_VIEW_SAMPLE_SIZE).toBe(3)
    expect(
      buildRankingInsight([view('11680', 1), view('11440', 2)], metric),
    ).toBeNull()
  })

  it('3곳이면 문장을 만든다', () => {
    expect(
      buildRankingInsight(
        [view('11680', 1), view('11440', 2), view('11110', 3)],
        metric,
      )?.sentence,
    ).toBe('유동인구 1위 중구는 지금 많이 본 3곳에 들지 않았어요.')
  })
})
```

(`metric` 픽스처 필드명은 같은 파일의 기존 픽스처와 맞춘다 — `HomeMetricRanking` 타입을 따른다.)

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/lib/home/ranking-insight.test.ts` → Expected: FAIL

- [ ] **Step 3: lib 구현**

`src/lib/home/popular-districts.ts` 끝에 추가:

```ts
/**
 * 좌측(조회수) 열과 인사이트 문장이 성립하는 최소 표본.
 *
 * 1~2곳짜리 「순위」는 비교 대상이 되지 못한다 — 사회적 증거는 표본이 작을수록
 * 역효과다(dev 실측: 강남구 1회 1건). 인사이트 가드와 같은 값을 쓴다.
 */
export const MIN_VIEW_SAMPLE_SIZE = 3

export const hasEnoughViewSample = (view: PopularDistrictsView): boolean =>
  view.items.length >= MIN_VIEW_SAMPLE_SIZE
```

`src/lib/home/ranking-insight.ts`:

```ts
import { MIN_VIEW_SAMPLE_SIZE } from '@/lib/home/popular-districts'
// …
  if (views.length < MIN_VIEW_SAMPLE_SIZE || metric.items.length === 0)
    return null
// 규칙 A 문장
      sentence: `${metric.label} ${unseen.rank}위 ${unseen.districtName}는 지금 많이 본 ${views.length}곳에 들지 않았어요.`,
// 규칙 B 문장
      sentence: `조회수 ${outside.rank}위 ${outside.name}는 ${metric.label} Top ${metric.items.length} 밖이에요.`,
```

(`ranking-insight.ts` 가 `popular-districts.ts` 의 타입을 이미 import 하므로 순환은 없다. `popular-districts.ts` 는 `ranking-insight` 를 import 하지 않는다.)

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/lib/home` → Expected: PASS

- [ ] **Step 5: 컴포넌트 테스트 수정** — `src/components/home/popular-districts.test.ts`

1. 파일 상단 픽스처 근처에 공용 3건 응답을 둔다:

```ts
/** 최소 표본(3곳)을 넘는 조회 순위 — dual 이 성립하는 가장 작은 입력. */
const THREE_VIEWS = [
  { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1284 },
  { rank: 2, areaCode: '11440', areaName: '마포구', viewCount: 1102 },
  { rank: 3, areaCode: '11110', areaName: '종로구', viewCount: 950 },
]
```

2. 「듀얼 랭킹」·「리뷰 수정」·「넓은 화면 배치」·「인사이트 자리 예약(R2)」·「랭킹 우측은 Top5」 describe 에서 **좌측 열이 있어야 하는** 케이스의 `createResponse([...1~2건])` 를 `createResponse(THREE_VIEWS)` 로 바꾼다. (좌측 링크 `href="/analysis?districtCode=11680"` 를 기대하는 케이스 전부.)
3. 문자열을 해요체로: `'들지 않았습니다'` → `'들지 않았어요'`, `'밖입니다'` → `'밖이에요'`, `'이 지표는 집계가 없습니다'` → `'이 지표는 아직 집계가 없어요'`.
4. `describe('PopularDistricts — 스크롤 지표 전환(R1)')` 를 통째로 지운다. 「두 열이 모두 있을 때만 화면 높이를 붙잡는다」·「혼합 pending — 한쪽만 먼저 응답해도 트랙을 유지한다」 케이스도 지운다(트랙이 없다).
5. 아래 describe 를 추가한다:

```ts
describe('PopularDistricts — 트랙 없음 (TC-HR-009)', () => {
  it('두 열이어도 스크롤 트랙을 만들지 않는다', () => {
    const styles = renderStyles(
      buildElement(createResponse(THREE_VIEWS), createTopTen()),
    ).replace(/\s+/g, '')

    expect(styles).not.toContain('calc(100dvh')
    expect(styles).not.toContain('position:sticky')
  })

  it('지표 토글은 링크가 아닌 버튼이다 — 그 자리에서 목록만 바꾼다', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen())

    expect(html).toContain('aria-label="지표 선택"')
    expect(html).toMatch(/<button[^>]*>유동인구<\/button>/)
  })
})

describe('PopularDistricts — 최소 표본 (TC-HR-010 · ranking-minimum-sample D7)', () => {
  const two = createResponse(THREE_VIEWS.slice(0, 2))

  it('조회 2곳이면 좌측 열 없이 지표만 그린다', () => {
    const html = render(two, createTopTen())

    expect(html).not.toContain('href="/analysis?districtCode=11680"')
    expect(html).toContain('유동인구')
    expect(html).not.toContain('aria-live="polite"')
  })

  it('지표만 상태의 아이브로·제목', () => {
    const html = render(two, createTopTen())

    expect(html).toContain('자치구 지표 순위')
    expect(html).toContain('유동인구·매출·개업 수로 자치구를 비교해요.')
    expect(html).not.toContain('숫자가 좋은 곳은')
  })

  it('3곳이면 dual 문구와 인사이트 슬롯', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen())

    expect(html).toContain('다른 사람들이 보는 곳과, 숫자가 좋은 곳은 달라요.')
    expect(html).toContain('aria-live="polite"')
  })

  it('조회만(지표 결손) 상태의 제목', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen(false))

    expect(html).toContain('지금은 이 자치구들을 많이 보고 있어요.')
  })

  it('조회 2곳 + 지표 결손이면 섹션을 뺀다', () => {
    expect(render(two, createTopTen(false))).toBe('')
  })

  it('스켈레톤은 지표만 문구를 쓴다 — 어느 최종 상태에서도 거짓이 되지 않는다', () => {
    const html = render()

    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('자치구 지표 순위')
    expect(html).toContain('유동인구·매출·개업 수로 자치구를 비교해요.')
  })

  it('제목은 2줄 높이를 예약한다', () => {
    const styles = renderStyles(buildElement(two, createTopTen())).replace(
      /\s+/g,
      '',
    )

    expect(styles).toContain('min-height:72px')
  })
})
```

(`createTopTen(false)` 가 기존 픽스처에서 「지표 전부 결손」 응답을 만든다 — 파일의 기존 정의를 따른다. 다르면 `createEmptyTopTen()` 을 쓴다.)

- [ ] **Step 6: 실패 확인** — Run: `pnpm vitest run src/components/home/popular-districts.test.ts` → Expected: FAIL(해요체·최소 표본·트랙 케이스)

- [ ] **Step 7: 컴포넌트 구현** — `src/components/home/popular-districts.tsx`

1. import 정리: `useScrollProgress`·`activeStepFromPinnedProgress`·`scrollToPinnedStep`·`useStackedMode`·`HEADER_HEIGHT` 를 지운다. `hasEnoughViewSample` 를 `@/lib/home/popular-districts` import 에 추가한다.
2. `ScrollTrack`·`ScrollSticky` styled 선언과 그 위 R1 주석을 지운다.
3. `Title` 에 2줄 예약을 넣는다:

```ts
const Title = styled.h2`
  /*
    상태(스켈레톤 → dual / 지표만 / 조회만)마다 문구가 바뀌어 줄 수가 달라질 수 있다.
    2줄분을 예약해 교체가 아래 목록을 밀지 않게 한다(ranking-minimum-sample D4-2).
  */
  min-height: 72px;
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  word-break: keep-all;

  @media (max-width: 640px) {
    min-height: 60px;
    font-size: 22px;
    line-height: 30px;
  }

  @media (max-width: 480px) {
    min-height: 56px;
    font-size: 20px;
    line-height: 28px;
  }
`
```

4. 상태별 문구 상수를 컴포넌트 위에 둔다:

```ts
/*
  상태별 두 줄 문구(ranking-minimum-sample D4-2). 각 상태에서 **참인 문장**만 쓴다 —
  좌측 열이 없는데 「많이 본」을 약속하지 않는다.
*/
const COPY = {
  dual: {
    eyebrow: '지금 많이 본 지역',
    title: '다른 사람들이 보는 곳과, 숫자가 좋은 곳은 달라요.',
  },
  metricOnly: {
    eyebrow: '자치구 지표 순위',
    title: '유동인구·매출·개업 수로 자치구를 비교해요.',
  },
  viewOnly: {
    eyebrow: '지금 많이 본 지역',
    title: '지금은 이 자치구들을 많이 보고 있어요.',
  },
} as const
```

5. `RankingSkeleton` 의 아이브로·제목을 `COPY.metricOnly` 로 바꾼다.
6. `view` 정의에 최소 표본을 넣는다:

```ts
// 빈 목록(배포 직후)과 표본 부족(1~2곳)은 같은 결과 — 좌측 열이 없다.
const view =
  rawView && rawView.items.length > 0 && hasEnoughViewSample(rawView)
    ? rawView
    : null
```

7. 트랙 관련 코드를 지운다: `useScrollProgress(...)` 구조분해, `useStackedMode()`, `useScrollTrack`, `scrollIndex`. 지표 정본은 `pickedMetric` 하나:

```ts
const metric = pickedMetric
```

토글 `onChange` 는 `onChange={setPickedMetric}` 로 줄인다. 8. `dual` 계산은 그대로 두되 주석을 「두 열 레이아웃을 쓸지」로 고친다(트랙 언급 삭제). 9. 헤더 문구를 상태로 고른다(`body` 안 `Header`):

```ts
const copy =
  viewColumn && metricColumn
    ? COPY.dual
    : viewColumn
      ? COPY.viewOnly
      : COPY.metricOnly
```

`<Eyebrow>` 의 텍스트를 `{copy.eyebrow}`, `<Title>` 을 `{copy.title}` 로 바꾼다. (`copy` 는 `viewColumn`·`metricColumn` 선언 뒤에 둔다.) 10. `MetricEmptyNotice` 문구를 `이 지표는 아직 집계가 없어요.` 로 바꾼다. 11. 마지막 `if (useScrollTrack) { … }` 분기를 지우고 `return <Section aria-label="지금 많이 본 자치구">{body}</Section>` 하나만 남긴다.

- [ ] **Step 8: 통과 확인** — Run: `pnpm vitest run src/components/home src/lib/home && pnpm typecheck` → Expected: PASS

- [ ] **Step 9: 커밋**

```bash
git add src/lib/home src/components/home/popular-districts.tsx src/components/home/popular-districts.test.ts
git commit -m "[FE] feat: 인기지역 스크롤 트랙을 걷어내고 조회 3곳 미만이면 지표 순위만 보여 준다"
```

---

### Task 4: 섹션 구성 정리와 트랙 모듈 삭제

**Files:**

- Modify: `src/components/home/home-page.tsx`, `src/components/home/home-page.test.ts`
- Delete: `src/components/home/tool-flow-board.tsx`, `tool-flow-board.test.ts`, `anchor-statement.tsx`, `anchor-statement.test.ts`, `use-scroll-progress.ts`, `use-scroll-progress.test.ts`, `scroll-fill.ts`, `scroll-fill.test.ts`, `scroll-to-pinned-step.ts`, `src/hooks/use-stacked-mode.ts`

- [ ] **Step 1: 테스트 수정** — `home-page.test.ts`

`ANCHOR_SENTENCES` import 를 지우고 첫 두 `it` 과 TC-004 `it` 을 아래로 바꾼다(나머지 `it` 은 유지):

```ts
it('히어로 + 판단 흐름 + 랭킹 + 벤토를 렌더한다 (TC-HR-008)', () => {
  const text = render().replace(/<[^>]+>/g, '')

  expect(text).toContain('창업 전에, 상권부터 확인하세요.') // 히어로
  expect(text).toContain('이렇게 판단해요') // 판단 흐름
  expect(text).toContain('AI 리포트') // 벤토
})

/* 네 도구를 세 번 말하던 보드·앵커가 없다(home-restructure.md D2 #1). */
it('네 도구 보드와 앵커 문장을 렌더하지 않는다', () => {
  const text = render().replace(/<[^>]+>/g, '')

  expect(text).not.toContain('창업할 지역과 업종을 네 단계로 좁힙니다.')
  expect(text).not.toContain('구별 현황은 서울 자치구 25곳을')
})

it('판단 흐름이 벤토보다 앞에 온다', () => {
  const html = render()

  expect(html.indexOf('이렇게 판단해요')).toBeGreaterThan(-1)
  expect(html.indexOf('이렇게 판단해요')).toBeLessThan(
    html.indexOf('분석 이후의 판단까지'),
  )
})

/*
 * TC-004(개정). 01 패널 CTA(/status) · 미니데모 경로(/analysis) · 히어로 추천 갈래
 * (/recommend) 는 첫 렌더에 있다. /simulation 은 04 탭 패널에만 있다 — 데이터로 고정한다.
 */
it('첫 렌더가 세 도구로 나가고, 04 탭은 시뮬레이션으로 나간다 (TC-004)', () => {
  const html = render()

  for (const href of ['/status', '/analysis', '/recommend']) {
    expect(html).toContain(`href="${href}"`)
  }
  expect(STORY_STEPS[3].cta?.href).toBe('/simulation')
})
```

(`import { STORY_STEPS } from '@/components/home/story-steps'` 추가. 벤토 제목 문자열은 `feature-bento.tsx` 의 h2 를 확인해 맞춘다 — 2026-09-29 기준 「분석 이후의 판단까지, 한 곳에서 이어집니다.」.)

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/components/home/home-page.test.ts` → Expected: FAIL(보드 문구가 아직 있음)

- [ ] **Step 3: `home-page.tsx` 구성 변경**

```tsx
import styled from 'styled-components'
import FeatureBento from '@/components/home/feature-bento'
import HeroSection from '@/components/home/hero-section'
import PopularDistricts from '@/components/home/popular-districts'
import ProductStory from '@/components/home/product-story'

const Page = styled.main`
  background: var(--color-background);
`

export default function HomePage() {
  return (
    <Page>
      <HeroSection />
      {/*
        판단 흐름이 히어로 바로 뒤다 — 네 도구가 1 화면 안에 탭으로 보인다
        (예전 네 도구 보드의 역할, home-restructure.md).
      */}
      <ProductStory />
      {/*
        스토리(무엇을 해 주는가) 다음, 벤토 CTA(가입) 앞에 라이브 근거를 둔다.
        실패하거나 집계가 비면 이 섹션은 스스로 빠지므로 순서에 구멍이 나지 않는다.
      */}
      <PopularDistricts />
      <FeatureBento />
    </Page>
  )
}
```

- [ ] **Step 4: 파일 삭제 + `tool` 필드 제거**

`story-steps.ts` 에서 `tool` 타입 필드(JSDoc 포함)와 네 항목의 `tool:` 줄을 지운다. `step-tabs.test.ts` 의 「네 단계 모두 아이콘이 있다」 옆에 아래 케이스를 추가한다:

```ts
it('보드 전용이던 tool 필드가 없다', () => {
  for (const step of STORY_STEPS) expect('tool' in step).toBe(false)
})
```

```bash
git rm src/components/home/tool-flow-board.tsx src/components/home/tool-flow-board.test.ts \
  src/components/home/anchor-statement.tsx src/components/home/anchor-statement.test.ts \
  src/components/home/use-scroll-progress.ts src/components/home/use-scroll-progress.test.ts \
  src/components/home/scroll-fill.ts src/components/home/scroll-fill.test.ts \
  src/components/home/scroll-to-pinned-step.ts src/hooks/use-stacked-mode.ts
grep -rn "use-scroll-progress\|scroll-fill\|scroll-to-pinned-step\|use-stacked-mode\|tool-flow-board\|anchor-statement" src app e2e
```

Expected: grep 출력 없음. 있으면 그 import 를 정리한다(`hero-section.tsx` 등 다른 파일이 `HEADER_HEIGHT` 만 쓰는 것은 그대로 둔다). `layout-constants.ts` 의 `HEADER_HEIGHT` 주석에서 「product-story·popular-districts」 언급을 실제 사용처로 고친다.

- [ ] **Step 5: 전체 확인** — Run: `pnpm vitest run && pnpm typecheck` → Expected: 전부 PASS

- [ ] **Step 6: 커밋**

```bash
git add -A src
git commit -m "[FE] refactor: 네 도구 보드·앵커 문장과 스크롤 트랙 모듈을 걷어낸다"
```

---

### Task 5: 문서·e2e 기준선·브라우저 실측

**Files:**

- Modify: `docs/features/home/home.md`, `docs/features/_index.md`, `docs/features/home/home-restructure.md`, `docs/features/home/ranking-minimum-sample.md`, `docs/features/home/interaction-polish.md`, `docs/features/home/story-and-rankings.md`
- Modify: `e2e/baselines/home.desktop.json`, `e2e/baselines/home.mobile.json`

- [ ] **Step 1: 품질 게이트** — Run: `rm -rf .next && pnpm qa:verify` → Expected: exit 0

- [ ] **Step 2: e2e** — dev 서버를 띄우고(`PORT=5181 pnpm dev -p 5181` 백그라운드) Run: `PLAYWRIGHT_BASE_URL=http://localhost:5181 pnpm test:e2e`. 기준선보다 나빠진 지표가 있으면 원인을 고친다. 나아진 지표는 `home-metrics.spec.ts` 의 기준선 갱신 절차(파일 머리 주석)대로 `e2e/baselines/home.*.json` 을 새 값으로 내린다. `bffRequests` 는 2 여야 한다(TC-HR-102).

- [ ] **Step 3: 브라우저 실측(gstack browse)** — 375×812 · 1440×900 · 1920×1080:
  - 문서 높이 / 화면 수, 가로 스크롤 없음(`scrollWidth ≤ innerWidth`)
  - 탭 01→04 클릭 전후 랭킹 섹션 `getBoundingClientRect().top + scrollY` 가 같다(1440, TC-HR-103)
  - 키보드: 탭에 포커스 후 `ArrowRight`·`End` 로 `aria-selected` 이동(TC-HR-104)
  - 전후 스크린샷

- [ ] **Step 4: 문서 갱신**
  - `home.md`: S3 #3(판단 흐름) 행을 탭 구조로(스티키/스택 서술 삭제), TC-004·TC-005 행을 `home-restructure.md` D7-3 대로, 변경 이력 2.8 추가
  - `home-restructure.md`: 상태 `구현 완료`, D0-2 표에 실측값 병기
  - `ranking-minimum-sample.md`: 상태 `구현 완료(home-restructure 와 함께)`, D5-3(트랙) 서술에 「트랙 없음(home-restructure)」 개정 노트
  - `interaction-polish.md` R1 · `story-and-rankings.md` 스티키 스토리 절에 「철회 — home-restructure.md」 노트
  - `_index.md` home 행 비고에 재편 한 줄
  - Run: `pnpm prettier --write docs e2e/baselines`

- [ ] **Step 5: 커밋**

```bash
git add docs e2e/baselines
git commit -m "[FE] docs: 홈 재편 명세·기준선을 실측값으로 갱신한다"
```
