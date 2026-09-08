# 시뮬레이션 입력 단계 아코디언 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 창업 시뮬레이션 입력 화면에서 네 단계를 동시에 펼쳐 두던 것을 「한 번에 한 단계」로 바꿔, 1440×900 한 화면의 버튼 59개를 그 단계 것만 남긴다.

**Architecture:** 단계 선택 로직(어느 단계를 열 것인가)을 순수 함수로 `src/lib/simulation/step-flow.ts` 에 분리하고, `simulation-condition-section.tsx` 를 접힘/펼침을 아는 카드로 바꾼다. 페이지는 열린 단계 하나를 상태로 들고 그 함수에 물어본다. 조건 상태 훅(`useSimulationConditions`)과 `SIMULATION_CONDITION_SECTIONS` 4개 구성은 **건드리지 않는다** — 브랜드는 업종 단계 안에서 접는다.

**Tech Stack:** Next.js App Router · TypeScript · styled-components · vitest(node 환경, `renderToStaticMarkup` + `ServerStyleSheet` 문자열 단언)

**Spec:** `frontend/docs/features/simulation/simulation-report.md` **D4-1-1** (상위: `simulation.md` S3 #2)

## Global Constraints

- 기준 커밋: develop `c233c15d`. 브랜치 `feature/fe/simulation-step-flow`
- **단계는 항상 4개다**(`franchise` · `district` · `service` · `store`). `SIMULATION_CONDITION_SECTIONS` 를 가변으로 만들지 않는다. 브랜드는 `service` 단계 안에서 접는다 (D4-1-1 규칙 7)
- **펼쳐진 단계는 항상 하나.** 나머지는 「번호 · 제목 · 고른 값 · 변경」 한 줄
- **「다음」 버튼을 두지 않는다.** 단일 선택 단계는 고르는 순간이 완료다
- **자동 진행의 대상은 「다음 미완료 단계」다.** 없으면 전부 접는다 (D4-1-1 규칙 5)
- **무효화 연쇄를 숨기지 않는다.** 앞 단계를 바꿔 뒤가 비워지면 비워진 첫 단계를 즉시 편다 — `selectService` 는 `franchiseeId`·`brandName`·`storeSize` 를, `selectFranchisee` 는 브랜드를 비운다
- **자동 진행 시 새로 펼쳐진 단계의 헤더 버튼으로 포커스를 옮긴다**
- 잠긴 단계(`store`, `serviceCode` 전)는 `<button>` 이 아니라 정적 요소다
- 우측 비용 패널과 1023px 이하 `SimulationSummaryBar` 는 **그대로 둔다**
- 테스트는 jsdom 없이 node 환경 + 문자열 단언. `$prop` CSS 는 `ServerStyleSheet().getStyleTags()` 에서 읽는다
- styled 템플릿의 CSS 주석 안에 백틱을 쓰면 템플릿이 거기서 끊긴다
- PR base `develop`, 라벨 `frontend-web`(배포 게이트), assignee `seonghoho`
- 완료 보고 전 `pnpm qa:verify`

## 작업 환경

```bash
cd frontend
rm -rf .next && PORT=5173 pnpm dev
```

`/simulation` 은 로그인·백엔드 없이 열린다(자치구·업종이 정적 상수다). 브랜드 검색만 BE 를 탄다.

## 파일 구조

| 파일                                                                | 책임                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/lib/simulation/step-flow.ts` (신규)                            | 「어느 단계를 열 것인가」 순수 함수. 화면·React 를 모른다 |
| `src/lib/simulation/step-flow.test.ts` (신규)                       | 위 함수의 분기 전부                                       |
| `src/components/simulation/simulation-condition-section.tsx` (수정) | 접힘/펼침을 아는 카드. 접히면 요약 한 줄                  |
| `src/components/simulation/simulation-choice-search.tsx` (신규)     | 선택지 검색 한 줄. 자치구·업종이 공유                     |
| `src/components/simulation/simulation-builder-page.tsx` (수정)      | 열린 단계 상태 + 포커스 이동                              |

---

### Task 1: 단계 선택 순수 함수

화면을 건드리기 전에 「어느 단계가 열리는가」를 함수 하나로 못박는다. 이 함수가 첫 입력·프리필·복원·재편집·무효화 연쇄를 **전부 같은 경로로** 처리한다.

**Files:**

- Create: `frontend/src/lib/simulation/step-flow.ts`
- Test: `frontend/src/lib/simulation/step-flow.test.ts`

**Interfaces:**

- Consumes: `SimulationConditionState`, `SimulationConditionSection`, `isSimulationSectionComplete`, `SIMULATION_CONDITION_SECTIONS` (모두 `@/lib/simulation/conditions`)
- Produces: `resolveOpenSection(state, opened) => SimulationConditionSection | null`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

Create `frontend/src/lib/simulation/step-flow.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { createSimulationConditionState } from '@/lib/simulation/conditions'
import { resolveOpenSection } from '@/lib/simulation/step-flow'

const state = (
  over: Parameters<typeof createSimulationConditionState>[0] = {},
) => createSimulationConditionState(over)

describe('resolveOpenSection', () => {
  it('빈 상태면 첫 단계를 연다', () => {
    expect(resolveOpenSection(state(), null)).toBe('franchise')
  })

  it('앞이 채워져 있으면 첫 미완료 단계를 연다 — 프리필과 복원이 같은 경로다', () => {
    expect(
      resolveOpenSection(
        state({ franchisee: false, districtCode: '11680' }),
        null,
      ),
    ).toBe('service')
  })

  it('전부 완료면 열지 않는다 — 결과로 시선을 넘긴다', () => {
    const complete = state({
      franchisee: false,
      districtCode: '11680',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })

    expect(resolveOpenSection(complete, null)).toBeNull()
  })

  /*
    사용자가 완료된 단계를 직접 눌러 편집 중이면 그 의사를 이긴다.
    이게 없으면 재편집 화면이 열자마자 닫힌다.
  */
  it('사용자가 연 단계가 아직 유효하면 그대로 둔다', () => {
    const complete = state({
      franchisee: false,
      districtCode: '11680',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })

    expect(resolveOpenSection(complete, 'district')).toBe('district')
  })

  /*
    selectService 가 storeSize 를 비운다. 접힌 화면에서는 그 빈칸이 안 보이므로
    비워진 첫 단계를 강제로 연다 — 사용자가 연 단계보다 우선한다.
  */
  it('앞을 고쳐 뒤가 비워지면 비워진 단계를 연다', () => {
    const broken = state({
      franchisee: false,
      districtCode: '11680',
      serviceCode: 'CS100001',
      storeSize: null,
      floorType: 'FIRST_FLOOR',
    })

    expect(resolveOpenSection(broken, 'service')).toBe('store')
  })

  it('잠긴 단계는 열지 않는다 — 업종 전 매장 조건', () => {
    expect(
      resolveOpenSection(
        state({ franchisee: false, districtCode: '11680' }),
        'store',
      ),
    ).toBe('service')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/lib/simulation/step-flow.test.ts`
Expected: FAIL — `step-flow` 모듈 없음

- [ ] **Step 3: 함수를 만든다**

Create `frontend/src/lib/simulation/step-flow.ts`:

```ts
import {
  SIMULATION_CONDITION_SECTIONS,
  isSimulationSectionComplete,
  type SimulationConditionSection,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'

/**
 * 매장 조건은 업종 전이면 잠긴다. 잠긴 단계는 펼칠 수 없다.
 * 게이팅 자체는 원래 화면에도 있던 규칙이고, 여기서는 "열 수 있는가"만 판정한다.
 */
const isLocked = (
  state: SimulationConditionState,
  section: SimulationConditionSection,
): boolean => section === 'store' && state.serviceCode === null

const firstIncomplete = (
  state: SimulationConditionState,
): SimulationConditionSection | null =>
  SIMULATION_CONDITION_SECTIONS.find(
    section =>
      !isSimulationSectionComplete(state, section) && !isLocked(state, section),
  ) ?? null

/**
 * 어느 단계를 펼칠 것인가. 화면·React 를 모르는 순수 함수다.
 *
 * 첫 입력 · 분석에서 넘어온 프리필 · 이력 복원 · 재편집 · 무효화 연쇄를 **한 규칙으로**
 * 처리한다: 「비어 있는 첫 단계를 연다. 없으면 사용자가 연 단계를 존중하고, 그것도
 * 없으면 닫는다.」
 *
 * 비어 있는 단계가 사용자 의사를 이기는 것이 핵심이다. selectService 가 storeSize 를
 * 비우는데(업종별 값이라 남기면 근거 없는 입력이 된다) 접힌 화면에서는 그 빈칸이
 * 보이지 않는다. 강제로 열지 않으면 "다 골랐다"고 믿는 채로 미완성 상태가 된다.
 *
 * @param opened 사용자가 직접 펼친 단계. 없으면 null.
 */
export const resolveOpenSection = (
  state: SimulationConditionState,
  opened: SimulationConditionSection | null,
): SimulationConditionSection | null => {
  const gap = firstIncomplete(state)
  if (gap !== null) return gap

  if (opened !== null && !isLocked(state, opened)) return opened

  return null
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/lib/simulation/step-flow.test.ts`
Expected: PASS — 6건

> 5번째 테스트(「사용자가 연 단계가 아직 유효하면 그대로 둔다」)가 통과하려면 `gap` 이 `null` 이어야 한다. 완료 상태이므로 `firstIncomplete` 가 `null` 을 주고 `opened` 가 살아남는다.

- [ ] **Step 5: 커밋한다**

```bash
git add frontend/src/lib/simulation/step-flow.ts frontend/src/lib/simulation/step-flow.test.ts
git commit -m "[FE] feat: 어느 단계를 펼칠지 정하는 순수 함수를 만든다

첫 입력·프리필·복원·재편집·무효화 연쇄를 한 규칙으로 처리한다.
비어 있는 단계가 사용자 의사를 이긴다 — selectService 가 storeSize 를
비우는데 접힌 화면에서는 그 빈칸이 보이지 않기 때문이다."
```

---

### Task 2: 선택지 검색 한 줄

자치구 25·업종 30은 단계를 나눠도 그 단계를 그대로 채운다. 두 단계가 공유할 검색 입력을 먼저 만든다.

**Files:**

- Create: `frontend/src/components/simulation/simulation-choice-search.tsx`
- Test: `frontend/src/components/simulation/simulation-choice-search.test.ts`

**Interfaces:**

- Produces: `SimulationChoiceSearch` — props `{ label: string; value: string; shown: number; total: number; onChange: (value: string) => void }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

Create `frontend/src/components/simulation/simulation-choice-search.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationChoiceSearch from './simulation-choice-search'

const render = (props: Parameters<typeof SimulationChoiceSearch>[0]) =>
  renderToStaticMarkup(createElement(SimulationChoiceSearch, props))

const base = {
  label: '자치구 이름으로 찾기',
  value: '',
  shown: 25,
  total: 25,
  onChange: () => {},
}

describe('SimulationChoiceSearch', () => {
  it('라벨을 접근 이름으로 준다 — 시각 라벨 없이 placeholder 만 두지 않는다', () => {
    const html = render(base)

    expect(html).toContain('aria-label="자치구 이름으로 찾기"')
  })

  it('좁혀지지 않았으면 개수를 적지 않는다 — 25/25 는 정보가 없다', () => {
    expect(render(base)).not.toContain('25/25')
  })

  it('좁혀졌으면 남은 개수를 적는다', () => {
    expect(render({ ...base, value: '강', shown: 4 })).toContain('4/25')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/simulation/simulation-choice-search.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 컴포넌트를 만든다**

Create `frontend/src/components/simulation/simulation-choice-search.tsx`:

```tsx
'use client'

import { Search } from 'lucide-react'
import styled from 'styled-components'

export type SimulationChoiceSearchProps = {
  /** 접근 이름 겸 placeholder. 예: "자치구 이름으로 찾기" */
  label: string
  value: string
  /** 필터링 후 남은 개수. total 과 같으면 적지 않는다. */
  shown: number
  total: number
  onChange: (value: string) => void
}

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-background-muted);

  &:focus-within {
    border-color: var(--color-primary-600);
    background: var(--color-surface);
  }

  svg {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    color: var(--color-grey-400);
  }
`

const Field = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-900);
  font: inherit;
  font-size: 14px;

  &:focus {
    outline: none;
  }
`

const Count = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-caption);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

/**
 * 선택지가 많은 단계(자치구 25 · 업종 30)의 검색 한 줄.
 *
 * 단계를 나눠도 그 단계 하나는 여전히 칩 25~30개다. 검색이 없으면 단계만 얇아지고
 * 고르는 일은 그대로다 (D4-1-1).
 */
export default function SimulationChoiceSearch({
  label,
  value,
  shown,
  total,
  onChange,
}: SimulationChoiceSearchProps) {
  return (
    <Root>
      <Search aria-hidden="true" />
      <Field
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
      {shown === total ? null : <Count>{`${shown}/${total}`}</Count>}
    </Root>
  )
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/simulation/simulation-choice-search.test.ts`
Expected: PASS — 3건

- [ ] **Step 5: 커밋한다**

```bash
git add frontend/src/components/simulation/simulation-choice-search.tsx frontend/src/components/simulation/simulation-choice-search.test.ts
git commit -m "[FE] feat: 선택지가 많은 단계에 쓸 검색 한 줄을 만든다

자치구 25·업종 30은 단계를 나눠도 그 단계를 그대로 채운다.
좁혀지지 않았을 때 25/25 를 적지 않는 것은 정보가 없어서다."
```

---

### Task 3: 접히는 단계 카드

`SimulationConditionSectionCard` 를 접힘/펼침을 아는 카드로 바꾼다. 페이지는 아직 전부 펼친 채로 넘겨주므로 **이 태스크만으로는 화면이 그대로다** — 그게 의도다.

**Files:**

- Modify: `frontend/src/components/simulation/simulation-condition-section.tsx`
- Test: `frontend/src/components/simulation/simulation-condition-section.test.ts` (신규)

**Interfaces:**

- Consumes: 없음
- Produces: `SimulationConditionSectionCard` — 기존 props 에 `expanded: boolean`, `summary: string | null`, `locked?: boolean`, `onToggle?: () => void`, `headerRef?: Ref<HTMLButtonElement>` 추가

- [ ] **Step 1: 실패하는 테스트를 쓴다**

Create `frontend/src/components/simulation/simulation-condition-section.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationConditionSectionCard from './simulation-condition-section'

const render = (
  over: Partial<Parameters<typeof SimulationConditionSectionCard>[0]> = {},
) =>
  renderToStaticMarkup(
    createElement(SimulationConditionSectionCard, {
      id: 'simulation-section-district',
      index: 2,
      title: '자치구',
      complete: false,
      expanded: true,
      summary: null,
      children: createElement('p', null, '내용'),
      ...over,
    }),
  )

describe('SimulationConditionSectionCard', () => {
  it('펼쳐지면 내용을 그리고 aria-expanded 가 true 다', () => {
    const html = render()

    expect(html).toContain('내용')
    expect(html).toContain('aria-expanded="true"')
  })

  it('접히면 내용을 그리지 않고 고른 값을 한 줄로 보여준다', () => {
    const html = render({ expanded: false, complete: true, summary: '강남구' })

    expect(html).not.toContain('내용')
    expect(html).toContain('강남구')
    expect(html).toContain('변경')
    expect(html).toContain('aria-expanded="false"')
  })

  /*
    잠긴 단계를 button 으로 두면 눌러도 아무 일이 없는 컨트롤이 생긴다.
    누를 수 없는 것은 button 이 아니어야 한다.
  */
  it('잠기면 버튼이 아니다', () => {
    const html = render({
      expanded: false,
      locked: true,
      summary: '업종을 고르면 열려요',
    })

    expect(html).not.toContain('<button')
    expect(html).toContain('업종을 고르면 열려요')
  })

  it('아직 안 고른 단계는 변경이 아니라 안내를 적는다', () => {
    const html = render({ expanded: false, summary: null })

    expect(html).toContain('선택 전')
    expect(html).not.toContain('변경')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/simulation/simulation-condition-section.test.ts`
Expected: FAIL — `expanded` prop 이 없어 항상 내용을 그린다

- [ ] **Step 3: 카드를 고친다**

`frontend/src/components/simulation/simulation-condition-section.tsx` 의 props 타입과 본문을 교체한다. 기존 `Root`/`Head` styled 는 남기고 아래를 반영한다:

```tsx
export type SimulationConditionSectionCardProps = {
  id: string
  index: number
  title: string
  description?: ReactNode
  meta?: ReactNode
  complete: boolean
  /** 펼쳐졌는가. 접히면 children 을 렌더하지 않는다 — DOM 에서 빼야 탭 순서에서도 빠진다. */
  expanded: boolean
  /** 접혔을 때 헤더에 적을 고른 값. 아직 안 골랐으면 null. */
  summary: string | null
  /** 잠긴 단계는 펼칠 수 없고 button 도 아니다. */
  locked?: boolean
  onToggle?: () => void
  /** 자동 진행 시 포커스를 옮길 대상. */
  headerRef?: Ref<HTMLButtonElement>
  children: ReactNode
}
```

본문:

```tsx
export default function SimulationConditionSectionCard({
  id,
  index,
  title,
  description,
  meta,
  complete,
  expanded,
  summary,
  locked = false,
  onToggle,
  headerRef,
  children,
}: SimulationConditionSectionCardProps) {
  const headContent = (
    <>
      <Index $done={complete && !expanded}>
        {complete && !expanded ? <Check aria-hidden="true" /> : index}
      </Index>
      <Title>{title}</Title>
      <Value>
        {expanded
          ? description
          : (summary ?? (locked ? '업종을 고르면 열려요' : '선택 전'))}
      </Value>
      {meta && expanded ? <Meta>{meta}</Meta> : null}
      {complete && !expanded ? <Edit>변경</Edit> : null}
    </>
  )

  return (
    <Root id={id} $expanded={expanded} $locked={locked}>
      {locked ? (
        <Head as="div">{headContent}</Head>
      ) : (
        <Head
          as="button"
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          ref={headerRef}
        >
          {headContent}
        </Head>
      )}
      {expanded ? <Panel>{children}</Panel> : null}
    </Root>
  )
}
```

기존 `Root`/`Head` 를 아래로 교체하고 나머지를 추가한다:

```tsx
const Root = styled.section<{ $expanded: boolean; $locked: boolean }>`
  overflow: hidden;
  border: 1px solid
    ${props =>
      props.$expanded ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-card);
  background: ${props =>
    props.$locked ? 'var(--color-background-muted)' : 'var(--color-surface)'};
`

/* as 로 button/div 를 갈아끼우므로 버튼 기본 스타일을 여기서 지운다. */
const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 12px 20px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;

  &:is(button) {
    cursor: pointer;
  }

  &:is(button):hover {
    background: var(--color-background-muted);
  }

  &:is(button):focus-visible {
    outline: 2px solid var(--color-primary-600);
    outline-offset: -2px;
  }

  @media (max-width: 640px) {
    padding: 12px 16px;
  }
`

const Index = styled.span<{ $done: boolean }>`
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$done ? 'var(--color-primary-600)' : 'var(--color-grey-100)'};
  color: ${props => (props.$done ? '#ffffff' : 'var(--color-text-caption)')};
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  svg {
    width: 14px;
    height: 14px;
  }
`

const Title = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
`

const Value = styled.span`
  flex: 1 1 auto;
  overflow: hidden;
  color: var(--color-text-600);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Meta = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-caption);
  font-size: 12px;
`

const Edit = styled.span`
  flex: 0 0 auto;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 600;
`

const Panel = styled.div`
  display: grid;
  gap: 12px;
  padding: 0 20px 20px;

  @media (max-width: 640px) {
    padding: 0 16px 16px;
  }
`
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/simulation/simulation-condition-section.test.ts`
Expected: PASS — 4건

- [ ] **Step 5: 호출부를 컴파일 가능하게 맞춘다**

`simulation-builder-page.tsx` 의 카드 4개에 `expanded={true} summary={null}` 을 임시로 넘긴다. **화면은 지금과 같아야 한다** — 이 태스크의 검증 지점이다.

Run: `cd frontend && pnpm typecheck && pnpm vitest run src/components/simulation src/lib/simulation`
Expected: PASS

- [ ] **Step 6: 커밋한다**

```bash
git add frontend/src/components/simulation/simulation-condition-section.tsx frontend/src/components/simulation/simulation-condition-section.test.ts frontend/src/components/simulation/simulation-builder-page.tsx
git commit -m "[FE] refactor: 단계 카드가 접힘·펼침을 알게 한다

접히면 children 을 렌더하지 않는다 — DOM 에서 빼야 탭 순서에서도 빠진다.
잠긴 단계는 button 이 아니다. 누를 수 없는 컨트롤을 만들지 않는다.

호출부는 아직 전부 펼친 채로 넘기므로 화면은 그대로다."
```

---

### Task 4: 페이지를 아코디언으로 전환

열린 단계 상태를 페이지에 두고 Task 1 의 함수에 물어본다. **여기서 화면이 실제로 바뀐다.**

**Files:**

- Modify: `frontend/src/components/simulation/simulation-builder-page.tsx`

**Interfaces:**

- Consumes: `resolveOpenSection` (Task 1), 카드의 `expanded`/`summary`/`locked`/`onToggle`/`headerRef` (Task 3), `SimulationChoiceSearch` (Task 2)
- Consumes: 기존 `describeSimulationSectionValue(state, section)` — 접힌 줄에 적을 값 문구를 이미 만들어 준다 (`@/lib/simulation/conditions`)

- [ ] **Step 1: 열린 단계 상태를 넣는다**

`simulation-builder-page.tsx` 컴포넌트 본문 상단:

```tsx
/*
  사용자가 직접 펼친 단계. 실제로 열리는 단계는 resolveOpenSection 이 정한다 —
  비어 있는 단계가 이 값을 이긴다(무효화 연쇄를 숨기지 않기 위해).
*/
const [openedByUser, setOpenedByUser] =
  useState<SimulationConditionSection | null>(null)
const openSection = resolveOpenSection(state, openedByUser)
```

`useState` 와 `SimulationConditionSection` 을 import 에 추가하고 `resolveOpenSection` 을 `@/lib/simulation/step-flow` 에서 가져온다.

- [ ] **Step 2: 자동 진행 시 포커스를 옮긴다**

```tsx
/*
  React 19 의 콜백 ref 는 정리 함수만 반환할 수 있다. `node => map.set(...)` 처럼
  식 본문으로 쓰면 Map 이 반환돼 타입 오류가 난다 — 블록 본문으로 감싼다.
*/
const headerRefs = useRef(
  new Map<SimulationConditionSection, HTMLButtonElement | null>(),
)
const lastFocused = useRef<SimulationConditionSection | null>(null)

/*
  단계가 자동으로 바뀌면 새 헤더로 포커스를 옮긴다. 옮기지 않으면 키보드·스크린리더
  사용자는 방금 사라진 요소 자리에 남아 화면이 바뀐 것을 모른다.
*/
useEffect(() => {
  if (openSection === null || lastFocused.current === openSection) return
  lastFocused.current = openSection
  headerRefs.current.get(openSection)?.focus()
}, [openSection])
```

- [ ] **Step 3: 카드 4개에 접힘 정보를 넘긴다**

각 카드에서 `expanded={true} summary={null}`(Task 3 의 임시값)를 다음으로 바꾼다. `franchise` 예:

```tsx
<SimulationConditionSectionCard
  id={simulationSectionDomId('franchise')}
  index={1}
  title={SIMULATION_CONDITION_SECTION_LABELS.franchise}
  description="프랜차이즈면 브랜드 가맹 부담금까지 반영해요."
  complete={conditions.isSectionComplete('franchise')}
  expanded={openSection === 'franchise'}
  summary={describeSimulationSectionValue(state, 'franchise')}
  onToggle={() =>
    setOpenedByUser(openSection === 'franchise' ? null : 'franchise')
  }
  headerRef={node => {
    headerRefs.current.set('franchise', node)
  }}
>
```

나머지 세 카드에 넣을 prop 묶음이다. **네 곳을 모두 고쳐야 한다** — 하나라도 빠뜨리면
그 단계만 항상 펼쳐진 채로 남는다.

```tsx
/* district 카드 */
  expanded={openSection === 'district'}
  summary={describeSimulationSectionValue(state, 'district')}
  onToggle={() =>
    setOpenedByUser(openSection === 'district' ? null : 'district')
  }
  headerRef={node => {
    headerRefs.current.set('district', node)
  }}

/* service 카드 */
  expanded={openSection === 'service'}
  summary={describeSimulationSectionValue(state, 'service')}
  onToggle={() =>
    setOpenedByUser(openSection === 'service' ? null : 'service')
  }
  headerRef={node => {
    headerRefs.current.set('service', node)
  }}

/* store 카드 — 잠금이 붙는다 */
  expanded={openSection === 'store'}
  summary={describeSimulationSectionValue(state, 'store')}
  locked={state.serviceCode === null}
  onToggle={() => setOpenedByUser(openSection === 'store' ? null : 'store')}
  headerRef={node => {
    headerRefs.current.set('store', node)
  }}
```

- [ ] **Step 4: 잠금 안내 블록을 걷어낸다**

`store` 카드 안의 `LockedBlock`(업종 먼저 안내)은 이제 접힌 헤더가 같은 말을 한다. 카드 본문을 `SimulationStoreConditionFields` 하나로 줄이고 `LockedBlock` 분기를 지운다. 브랜드 쪽 `LockedBlock` 은 **남긴다** — 업종 단계 안에서 여전히 순서를 드러내야 한다.

- [ ] **Step 5: 화면을 실측한다**

```bash
cd frontend && rm -rf .next && PORT=5173 pnpm dev
```

`http://localhost:5173/simulation` 을 1440×900 으로 열고:

```js
const main = document.querySelector('main')
JSON.stringify({
  pageH: Math.round(document.documentElement.scrollHeight),
  buttons: main.querySelectorAll('button').length,
  expanded: main.querySelectorAll('[aria-expanded="true"]').length,
})
```

Expected: `expanded` 가 **1**, `buttons` 가 처음 화면에서 10 미만(창업 형태 2 + 헤더 4 + 계산하기 등), `pageH` 가 1301 보다 작다.

- [ ] **Step 6: 무효화 연쇄를 실화면에서 확인한다**

조건 4개를 다 고른 뒤 「업종」 줄을 눌러 다른 업종을 고른다.
Expected: **매장 조건 단계가 자동으로 펼쳐진다**(`selectService` 가 `storeSize` 를 비우므로).

- [ ] **Step 7: 검증하고 커밋한다**

Run: `cd frontend && pnpm qa:verify`

```bash
git add frontend/src/components/simulation/simulation-builder-page.tsx
git commit -m "[FE] feat: 입력 단계를 한 번에 하나만 편다

1440x900 에서 버튼 59개가 동시에 놓이던 것을 그 단계 것만 남긴다.
어느 단계를 열지는 resolveOpenSection 이 정하고, 화면은 그 답을 그린다.

자동 진행 시 새 헤더로 포커스를 옮긴다 — 옮기지 않으면 키보드 사용자가
사라진 요소 자리에 남는다."
```

---

### Task 5: 자치구·업종 단계에 검색 붙이기

**Files:**

- Modify: `frontend/src/components/simulation/simulation-builder-page.tsx`

**Interfaces:**

- Consumes: `SimulationChoiceSearch` (Task 2), `SIMULATION_DISTRICT_OPTIONS`, `SIMULATION_SERVICE_TYPES`

- [ ] **Step 1: 검색어 상태를 넣는다**

```tsx
/*
  검색어는 그 단계를 벗어나면 버린다(D4-1-1). 단계를 다시 열면 전체 목록에서
  시작하는 편이, 지난번에 걸어둔 필터 때문에 원하는 항목이 안 보이는 것보다 낫다.
*/
const [districtQuery, setDistrictQuery] = useState('')
const [serviceQuery, setServiceQuery] = useState('')

useEffect(() => {
  if (openSection !== 'district') setDistrictQuery('')
  if (openSection !== 'service') setServiceQuery('')
}, [openSection])
```

- [ ] **Step 2: 목록을 필터링한다**

```tsx
const districtChoices = districtQuery.trim()
  ? SIMULATION_DISTRICT_OPTIONS.filter(item =>
      item.name.includes(districtQuery.trim()),
    )
  : SIMULATION_DISTRICT_OPTIONS

const serviceChoices = serviceQuery.trim()
  ? SIMULATION_SERVICE_TYPES.filter(item =>
      item.name.includes(serviceQuery.trim()),
    )
  : SIMULATION_SERVICE_TYPES
```

- [ ] **Step 3: 카드 안에 검색을 넣는다**

`district` 카드 본문:

```tsx
;<SimulationChoiceSearch
  label="자치구 이름으로 찾기"
  value={districtQuery}
  shown={districtChoices.length}
  total={SIMULATION_DISTRICT_OPTIONS.length}
  onChange={setDistrictQuery}
/>
{
  districtChoices.length === 0 ? (
    <EmptyText>{`'${districtQuery.trim()}'와 맞는 자치구가 없어요.`}</EmptyText>
  ) : (
    <SimulationChoiceGrid
      label="자치구"
      choices={districtChoices}
      selectedCode={state.districtCode}
      onSelect={conditions.setDistrict}
      minColumnWidth={96}
    />
  )
}
```

`service` 카드 본문(칩 격자 부분만. 브랜드 검색 블록은 그 아래 그대로 둔다):

```tsx
;<SimulationChoiceSearch
  label="업종 이름으로 찾기"
  value={serviceQuery}
  shown={serviceChoices.length}
  total={SIMULATION_SERVICE_TYPES.length}
  onChange={setServiceQuery}
/>
{
  serviceChoices.length === 0 ? (
    <EmptyText>{`'${serviceQuery.trim()}'와 맞는 업종이 없어요.`}</EmptyText>
  ) : (
    <SimulationChoiceGrid
      label="업종"
      choices={serviceChoices}
      selectedCode={state.serviceCode}
      onSelect={conditions.setService}
      minColumnWidth={132}
    />
  )
}
```

`EmptyText` styled 를 추가한다:

```tsx
const EmptyText = styled.p`
  padding: 18px 0;
  color: var(--color-text-caption);
  font-size: 13px;
  text-align: center;
`
```

- [ ] **Step 4: 검색 동작을 실화면에서 확인한다**

`/simulation` 에서 자치구 단계를 열고 「강」을 입력한다.
Expected: 칩이 4개(강남·강동·강북·강서)로 줄고 카운트가 `4/25` 로 뜬다. 비우면 25개로 돌아온다. 다른 단계로 갔다가 돌아오면 검색어가 비어 있다.

- [ ] **Step 5: 검증하고 커밋한다**

Run: `cd frontend && pnpm qa:verify`

```bash
git add frontend/src/components/simulation/simulation-builder-page.tsx
git commit -m "[FE] feat: 자치구·업종 단계에 이름 검색을 붙인다

단계를 나눠도 그 단계는 여전히 칩 25~30개다. 검색이 없으면 단계만
얇아지고 고르는 일은 그대로다. 검색어는 단계를 벗어나면 버린다."
```

---

### Task 6: 업종 단계 안에서 칩을 접는다

브랜드는 별도 단계가 아니다(D4-1-1 규칙 7). 업종을 고르면 30칩을 한 줄로 줄여 브랜드 검색에 자리를 내준다.

**Files:**

- Modify: `frontend/src/components/simulation/simulation-builder-page.tsx`

- [ ] **Step 1: 업종 칩을 조건부로 접는다**

`service` 카드 본문에서, `state.serviceCode` 가 있고 프랜차이즈면 칩 격자 대신 한 줄을 그린다:

```tsx
{
  state.serviceCode && state.franchisee === true && !serviceQuery ? (
    <PickedRow>
      <span>{describeSimulationSectionValue(state, 'service')}</span>
      <button type="button" onClick={() => conditions.setService('')}>
        업종 변경
      </button>
    </PickedRow>
  ) : (
    <>
      <SimulationChoiceSearch
        label="업종 이름으로 찾기"
        value={serviceQuery}
        shown={serviceChoices.length}
        total={SIMULATION_SERVICE_TYPES.length}
        onChange={setServiceQuery}
      />
      {serviceChoices.length === 0 ? (
        <EmptyText>{`'${serviceQuery.trim()}'와 맞는 업종이 없어요.`}</EmptyText>
      ) : (
        <SimulationChoiceGrid
          label="업종"
          choices={serviceChoices}
          selectedCode={state.serviceCode}
          onSelect={conditions.setService}
          minColumnWidth={132}
        />
      )}
    </>
  )
}
```

```tsx
const PickedRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--color-primary-600);
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 600;

  button {
    border: 0;
    background: transparent;
    color: var(--color-primary-700);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
`
```

> `conditions.setService('')` 는 `serviceCode` 를 빈 문자열로 만들어 칩 격자를 되살린다. `isSimulationServiceCode('')` 가 false 이므로 단계는 미완료로 돌아가고, 브랜드·매장 크기도 `selectService` 가 함께 비운다 — 의도된 연쇄다.

- [ ] **Step 2: 개인 창업이면 접지 않는지 확인한다**

개인 창업은 업종을 고르는 순간 단계가 완료라 카드 자체가 접힌다. 칩을 한 줄로 줄이는 것은 **브랜드 검색에 자리를 내주기 위한 것**이므로 프랜차이즈에만 적용한다. 위 조건의 `state.franchisee === true` 가 그것이다.

- [ ] **Step 3: 실화면으로 확인한다**

`/simulation` 에서 프랜차이즈 → 자치구 → 업종을 고른다.
Expected: 업종 칩 30개가 「커피-음료 · 업종 변경」 한 줄로 바뀌고 그 아래 브랜드 검색이 열린다. 「업종 변경」을 누르면 칩이 돌아온다.

- [ ] **Step 4: 검증하고 커밋한다**

Run: `cd frontend && pnpm qa:verify`

```bash
git add frontend/src/components/simulation/simulation-builder-page.tsx
git commit -m "[FE] feat: 업종을 고르면 칩을 한 줄로 줄여 브랜드 검색에 자리를 낸다

브랜드는 별도 단계가 아니라 업종 단계의 완료 조건이다. 칩 30개와 검색을
함께 두면 그 단계만 다시 무거워진다."
```

---

### Task 7: 전체 흐름 실측과 명세 상태 갱신

**Files:**

- Modify: `frontend/docs/features/simulation/simulation.md` (S3 #2 상태)
- Create: `frontend/docs/features/simulation/step-flow-verification.md`

- [ ] **Step 1: 세 화면 폭에서 실측한다**

1440×900 · 1024×768 · 375×812 에서 `/simulation` 을 열고 각 단계마다:

```js
const main = document.querySelector('main')
JSON.stringify({
  vw: window.innerWidth,
  pageH: Math.round(document.documentElement.scrollHeight),
  buttons: main.querySelectorAll('button').length,
  expanded: main.querySelectorAll('[aria-expanded="true"]').length,
})
```

Expected: 모든 폭·모든 단계에서 `expanded` 가 0 또는 1. 1440×900 에서 최대 `pageH` 가 1301 미만.

- [ ] **Step 2: 다섯 시나리오를 사람 눈으로 확인한다**

1. 빈 상태 → 1단계가 열려 있다
2. 끝까지 고른다 → 전부 접히고 금액이 뜬다
3. 「자치구」 줄을 눌러 다른 구를 고른다 → 나머지 세 단계가 완료 상태를 유지한다
4. 「업종」 줄을 눌러 다른 업종을 고른다 → **매장 조건이 자동으로 펼쳐진다**
5. `/analysis` 에서 시뮬레이션으로 넘어간다 → 채워진 단계는 접혀 있고 첫 빈 단계가 열려 있다

- [ ] **Step 3: 결과를 문서로 남긴다**

`frontend/docs/features/simulation/step-flow-verification.md` 에 폭 × 단계 표와 다섯 시나리오 결과를 적는다. **확인하지 못한 것은 「미검증」으로 명시한다.**

- [ ] **Step 4: S3 #2 상태를 갱신한다**

`simulation.md` S3 표에서 #2 의 상태를 `부분 구현` → `구현 완료` 로 바꾸고, 그 아래 「#2 가 「부분 구현」인 이유」 인용 블록을 실측 결과 한 줄로 교체한다.

- [ ] **Step 5: 커밋한다**

```bash
git add frontend/docs/features/simulation
git commit -m "[FE] docs: 단계 전환 실측 결과를 기록하고 S3 #2 를 완료로 바꾼다"
```

---

## 완료 기준

- [ ] 모든 폭·모든 단계에서 펼쳐진 단계가 **1개 이하**
- [ ] 1440×900 최대 페이지 높이가 **1301px 미만**
- [ ] 업종을 재편집하면 매장 조건이 **자동으로 펼쳐진다**(무효화 연쇄 노출)
- [ ] 자치구를 재편집해도 나머지 단계가 완료 상태를 유지한다
- [ ] 잠긴 매장 조건 단계가 `<button>` 이 아니다
- [ ] 자치구·업종 검색이 동작하고 단계를 벗어나면 검색어가 비워진다
- [ ] `pnpm qa:verify` 통과
- [ ] `SIMULATION_CONDITION_SECTIONS` 가 여전히 4개이고 가변이 아니다
- [ ] PR 라벨 `frontend-web`, base `develop`, assignee `seonghoho`
