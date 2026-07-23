# Mobile Status Detail Scroll and Back Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 상태 상세를 바텀시트 내부에서 끝까지 스크롤할 수 있게 하고 별도 텍스트 복귀 행을 상세 헤더의 화살표 버튼으로 교체한다.

**Architecture:** `StatusMobileSheet`가 세로 스크롤을 전담하고 implicit grid row를 `max-content`로 계산해 내부 상세 카드를 축소하지 않는다. `StatusDetail`은 선택적 `onBack` prop을 받아 기존 헤더 내부에 접근 가능한 아이콘 버튼을 렌더링하며 데스크톱의 `onClose` 흐름은 유지한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, styled-components, lucide-react, Vitest

---

### Task 1: 모바일 상세 스크롤과 헤더 뒤로가기

**Files:**

- Modify: `src/components/status/status-mobile-sheet.test.ts`
- Modify: `src/components/status/status-mobile-sheet.tsx`
- Modify: `src/components/status/status-detail.tsx`

- [ ] **Step 1: 실패하는 스크롤 회귀 테스트 작성**

`src/components/status/status-mobile-sheet.test.ts`의 `renderSheet`가 선택
항목을 받을 수 있게 확장하고, 펼친 본문이 intrinsic content height를
유지하는지 검증한다.

```ts
import type { StatusRankedItem } from '@/types/status'

const selectedItem: StatusRankedItem = {
  rank: 1,
  districtCode: '11650',
  districtName: '서초구',
  value: 123456,
  changeRate: 4.2,
}

const renderSheet = (
  snap: 'collapsed' | 'expanded',
  selectedItemOverride: StatusRankedItem | null = null,
) => {
  const styleSheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      styleSheet.collectStyles(
        createElement(StatusMobileSheet, {
          metric: 'footTraffic',
          items: [],
          selectedItem: selectedItemOverride,
          detail: null,
          isDetailLoading: false,
          detailErrorMessage: null,
          snap,
          onSnapChange: vi.fn(),
          onSelect: vi.fn(),
          onBackToTopTen: vi.fn(),
          onRetryDetail: vi.fn(),
        }),
      ),
    )

    return {
      markup,
      styles: styleSheet.getStyleTags(),
    }
  } finally {
    styleSheet.seal()
  }
}

it('상세 콘텐츠를 축소하지 않고 본문 스크롤 높이에 포함한다', () => {
  const expanded = renderSheet('expanded', selectedItem)
  const expandedBodyStyles = getBodyStyles(expanded.markup, expanded.styles)

  expect(expandedBodyStyles).toContain('grid-auto-rows:max-content')
})
```

- [ ] **Step 2: 스크롤 테스트가 올바르게 실패하는지 확인**

Run:

```bash
pnpm vitest run src/components/status/status-mobile-sheet.test.ts
```

Expected: `grid-auto-rows:max-content`가 아직 없어 새 테스트가 FAIL한다.

- [ ] **Step 3: 실패하는 컴팩트 뒤로가기 테스트 작성**

같은 테스트 파일에 선택 상세 렌더링 계약을 추가한다.

```ts
it('상세 헤더에 아이콘 뒤로가기 버튼을 표시한다', () => {
  const { markup } = renderSheet('expanded', selectedItem)

  expect(markup).toContain('aria-label="상위 10개로 돌아가기"')
  expect(markup).toMatch(
    /<button[^>]*aria-label="상위 10개로 돌아가기"[^>]*><svg/,
  )
  expect(markup).not.toContain('>상위 10개로 돌아가기</button>')
})
```

- [ ] **Step 4: 뒤로가기 테스트가 올바르게 실패하는지 확인**

Run:

```bash
pnpm vitest run src/components/status/status-mobile-sheet.test.ts
```

Expected: 현재 텍스트 버튼에는 `aria-label`과 아이콘이 없어 새 테스트가
FAIL한다.

- [ ] **Step 5: 최소 구현으로 두 회귀 테스트 통과**

`src/components/status/status-mobile-sheet.tsx`의 `SheetBody`에 intrinsic
track 크기를 추가한다.

```ts
const SheetBody = styled.div<{ $isExpanded: boolean }>`
  min-height: 0;
  display: grid;
  grid-auto-rows: max-content;
  align-content: start;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 16px calc(20px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;

  ${props =>
    !props.$isExpanded &&
    `
      visibility: hidden;
      pointer-events: none;
      overflow: hidden;
    `}
`
```

별도 `BackButton` styled component와 렌더 행을 제거하고
`StatusDetail`에 기존 callback을 전달한다.

```tsx
<StatusDetail
  detail={detail}
  errorMessage={detailErrorMessage}
  isLoading={isDetailLoading}
  metric={metric}
  selectedItem={selectedItem}
  onBack={onBackToTopTen}
  onRetry={onRetryDetail}
/>
```

`src/components/status/status-detail.tsx`에서 `ArrowLeft`를 사용하고
`onBack`을 선택적 prop으로 추가한다.

```tsx
import { ArrowLeft } from 'lucide-react'

type StatusDetailProps = {
  metric: StatusMetric
  selectedItem: StatusRankedItem | null
  detail: DistrictDetail | null
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => void
  onBack?: () => void
  onClose?: () => void
}

const BackButton = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-800);
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-text-900);
  }
`
```

`DetailHeader`에서 헤더 콘텐츠보다 먼저 버튼을 렌더링한다.

```tsx
{
  onBack ? (
    <BackButton
      aria-label="상위 10개로 돌아가기"
      type="button"
      onClick={onBack}
    >
      <ArrowLeft aria-hidden="true" size={20} strokeWidth={2} />
    </BackButton>
  ) : null
}
```

- [ ] **Step 6: focused 및 전체 정적 검증**

Run:

```bash
pnpm vitest run \
  src/components/status/status-mobile-sheet.test.ts \
  src/lib/status/status-state.test.ts
pnpm prettier --check \
  src/components/status/status-mobile-sheet.test.ts \
  src/components/status/status-mobile-sheet.tsx \
  src/components/status/status-detail.tsx
pnpm eslint \
  src/components/status/status-mobile-sheet.test.ts \
  src/components/status/status-mobile-sheet.tsx \
  src/components/status/status-detail.tsx \
  --max-warnings=0
pnpm typecheck
git diff --check
```

Expected: 모든 명령 exit code 0.

- [ ] **Step 7: 브라우저 회귀 검증**

`http://localhost:3001/status?metric=footTraffic&district=11650`을 모바일
뷰포트에서 확인한다.

- `SheetBody.scrollHeight > SheetBody.clientHeight`
- 본문 스크롤 후 아래 상세 섹션이 보임
- 헤더 왼쪽에 `상위 10개로 돌아가기` 접근성 이름의 화살표 버튼이 있음
- 화살표 선택 후 URL에서 `district`가 제거되고 펼친 Top10이 보임
- 접힌 시트는 계속 52px이고 본문은 inert/hidden

- [ ] **Step 8: 구현 커밋**

```bash
git add \
  src/components/status/status-mobile-sheet.test.ts \
  src/components/status/status-mobile-sheet.tsx \
  src/components/status/status-detail.tsx
git commit -m "fix: 모바일 상세 스크롤과 뒤로가기 개선"
```
