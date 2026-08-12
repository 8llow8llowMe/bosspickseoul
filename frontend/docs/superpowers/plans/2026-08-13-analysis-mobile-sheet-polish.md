# 상권분석 모바일 바텀시트 폴리싱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR #112(모바일 바텀시트 통합)의 인터랙션·레이아웃 9개 이슈를 수정해 드래그 스냅·스크롤·헤더·카드 밀도·페이지 높이를 다듬는다.

**Architecture:** 순수 로직(스냅 임계값)만 단위테스트(TDD)로 잠그고, 나머지 CSS/JSX 폴리싱은 실행 중인 dev 서버(5173) 모바일 뷰포트에서 시각 검증한다. 공유 컴포넌트(`AnalysisSelectionPanel`, `AiReportLockCard`)는 데스크탑 흐름을 깨지 않도록 `variant`로 분기하거나 문구만 최소 변경한다.

**Tech Stack:** Next.js App Router / TypeScript / styled-components / Zustand / React Query / vitest

## Global Constraints

- 작업 범위 **FE 전용** — 백엔드 API 계약·엔드포인트 변경 금지.
- 색상·radius·shadow·spacing 은 `DESIGN.md` 토큰만 사용, 임의 토큰 추가 금지.
- 데스크탑(≥1025px) 상권분석 화면의 기존 동작·레이아웃을 회귀시키지 않는다(공유 컴포넌트 주의).
- 완료 보고 전 반드시 `pnpm qa:verify`(format:check && lint && typecheck && build) 통과. 미실행을 통과로 보고 금지.
- 접근성: 드래그/토글의 키보드 조작(`aria-expanded`, click detail===0 경로)과 back 버튼의 `aria-label`을 유지한다.

---

## File Structure

| 파일 | 책임 | 관련 이슈 |
|---|---|---|
| `src/lib/analysis/analysis-sheet-state.ts` | 스냅/드래그 순수 로직 | #1 |
| `src/lib/analysis/analysis-sheet-state.test.ts` | 위 로직 단위테스트 | #1 |
| `src/components/analysis/analysis-mobile-sheet.tsx` | 바텀시트 셸: 드래그, 핸들행 헤더, back, 스크롤 표면 | #2 #3 #4 #7 |
| `src/components/analysis/analysis-mobile-sheet.test.ts` | 시트 SSR 마크업 테스트 | #3 (갱신) |
| `src/components/analysis/analysis-selection-panel.tsx` | 선택 패널(헤더/스텝/카드) — `variant` 분기 | #6 #8 #2 |
| `src/components/analysis/analysis-page.tsx` | 페이지 높이·패널 조립 | #9 |
| `src/components/analysis/ai-report/ai-report-lock-card.tsx` | 비로그인 잠금 카피 | #5 |

---

## Task 1: 드래그 스냅 임계값을 전체 이동의 30%로 (#1)

현재 `resolveAnalysisSheetSnapFromDrag`는 중간점(50% travel) 기준이라 드래그로 스냅을 바꾸려면 시트 여정의 절반 이상을 끌어야 한다 → "클릭할 때만 열린다"는 체감. 방향성 30% 임계값으로 바꿔, 접힘↔펼침 어느 방향이든 `expanded-collapsed` 여정의 30% 이상 끌면 스냅이 전환되게 한다.

**Files:**
- Modify: `src/lib/analysis/analysis-sheet-state.ts:40-65`
- Test: `src/lib/analysis/analysis-sheet-state.test.ts:35-65`

**Interfaces:**
- Produces: `resolveAnalysisSheetSnapFromDrag(startSnap, deltaY, collapsedHeight, expandedHeight): AnalysisSheetSnap` — 시그니처 불변. 판정 규칙만 midpoint→30% 방향 임계값으로 교체.
- Consumes: `analysis-mobile-sheet.tsx`가 pointerup에서 그대로 호출(변경 없음).

- [ ] **Step 1: 30% 경계를 잠그는 실패 테스트 추가**

`analysis-sheet-state.test.ts`의 `resolveAnalysisSheetSnapFromDrag` describe(collapsed=72, expanded=520, travel=448, 30%≈134.4) 안에 추가:

```ts
it('접힘에서 travel의 30% 이상 위로 끌면 펼침으로 스냅한다', () => {
  // -150px 위로 = 150 > 134.4 → 펼침 (기존 midpoint(224) 기준이면 접힘으로 오판)
  expect(
    resolveAnalysisSheetSnapFromDrag('collapsed', -150, collapsed, expanded),
  ).toBe('expanded')
})

it('접힘에서 travel의 30% 미만이면 접힘을 유지한다', () => {
  expect(
    resolveAnalysisSheetSnapFromDrag('collapsed', -120, collapsed, expanded),
  ).toBe('collapsed')
})

it('펼침에서 travel의 30% 이상 아래로 끌면 접힘으로 스냅한다', () => {
  expect(
    resolveAnalysisSheetSnapFromDrag('expanded', 150, collapsed, expanded),
  ).toBe('collapsed')
})

it('펼침에서 travel의 30% 미만이면 펼침을 유지한다', () => {
  expect(
    resolveAnalysisSheetSnapFromDrag('expanded', 120, collapsed, expanded),
  ).toBe('expanded')
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/lib/analysis/analysis-sheet-state.test.ts`
Expected: 신규 케이스 중 `-150 → expanded`, `120 → expanded`가 FAIL(현재 midpoint 로직이 각각 collapsed/collapsed로 판정).

- [ ] **Step 3: 30% 방향 임계값으로 로직 교체**

`analysis-sheet-state.ts` 상단에 상수 추가하고 함수 본문 교체:

```ts
/** 드래그로 스냅을 전환하는 최소 이동 비율(전체 여정 대비). */
export const ANALYSIS_SHEET_SNAP_RATIO = 0.3

export const resolveAnalysisSheetSnapFromDrag = (
  startSnap: AnalysisSheetSnap,
  deltaY: number,
  collapsedHeight: number,
  expandedHeight: number,
): AnalysisSheetSnap => {
  if (
    !Number.isFinite(deltaY) ||
    !Number.isFinite(collapsedHeight) ||
    !Number.isFinite(expandedHeight) ||
    collapsedHeight <= 0 ||
    expandedHeight <= collapsedHeight
  ) {
    return startSnap
  }

  const travel = expandedHeight - collapsedHeight
  const threshold = travel * ANALYSIS_SHEET_SNAP_RATIO
  // deltaY<0 = 위로(펼치는 방향), deltaY>0 = 아래로(접는 방향)
  if (startSnap === 'collapsed') {
    return -deltaY >= threshold ? 'expanded' : 'collapsed'
  }
  return deltaY >= threshold ? 'collapsed' : 'expanded'
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/lib/analysis/analysis-sheet-state.test.ts`
Expected: PASS (기존 -300/-40/300 케이스와 신규 30% 경계 케이스 모두 통과).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/analysis/analysis-sheet-state.ts src/lib/analysis/analysis-sheet-state.test.ts
git commit -m "fix(analysis): 바텀시트 드래그 스냅 임계값 midpoint→travel 30%"
```

---

## Task 2: 핸들행 헤더 재구성 — 리포트 뷰 back+제목, 확장 화살표 제거 (#3 #4 #7)

접힘/선택 뷰: `[스텝라벨+요약]` + `[AI 리포트 칩]` (확장 chevron 제거). 리포트 뷰: `[< 아이콘만]` + `[답십리1동 AI 리포트 제목]`로 핸들행을 교체하고, 리포트 Layer 안의 중복 `ReportHeader`를 제거한다. back 버튼은 테두리·프로그램 포커스 아웃라인 없이 아이콘만.

**Files:**
- Modify: `src/components/analysis/analysis-mobile-sheet.tsx` (HandleRow 렌더 `:442-474`, ReportHeader/BackButton 스타일 `:231-266`, 리포트 Layer `:484-506`, Icon import/사용 `:13,146-165,460-462`)
- Test: `src/components/analysis/analysis-mobile-sheet.test.ts:25-43`

**Interfaces:**
- Consumes: `AnalysisMobileSheetProps`(stepLabel, summary, aiReport, children) 불변. 내부 `SheetView`, `effectiveView`, 드래그 핸들러 재사용.
- Produces: 외부 API 변화 없음. `openReport`/`setView('selection')` 흐름 유지.

- [ ] **Step 1: 확장 화살표(Icon/ChevronUp) 제거 (#7)**

`analysis-mobile-sheet.tsx`에서 `HandleToggle` 내부의 `<Icon $expanded={isExpanded} aria-hidden><ChevronUp /></Icon>` 블록(`:460-462`)을 삭제한다. `Icon` styled 정의(`:146-165`)와 `ChevronUp` import(`:13`)도 제거한다(다른 사용처 없음 — 파일 내 grep로 확인). 드래그 핸들 바(`HandleRow::before`)가 유일한 확장 어포던스가 된다.

- [ ] **Step 2: BackButton을 아이콘 전용·무테두리로 변경 (#4)**

`BackButton` styled(`:244-266`)를 아이콘 전용으로 교체:

```ts
const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-700);
  cursor: pointer;

  svg {
    width: 20px;
    height: 20px;
  }

  /* 프로그램 포커스 시 UA 기본 아웃라인(검은 테두리)이 뜨지 않게 함 */
  &:focus {
    outline: none;
  }
  &:hover,
  &:focus-visible {
    background: var(--color-surface-muted);
    color: var(--color-text-900);
  }
`
```

- [ ] **Step 3: 핸들행을 뷰에 따라 분기하도록 렌더 교체 (#3)**

`HandleRow`(`:442-474`)를 다음으로 교체. `HandleToggle`은 두 뷰 공통 드래그/토글 표면으로 유지하되 내부 카피만 스왑하고, back 버튼은 리포트 뷰에서 `HandleToggle` 왼쪽에 별도 버튼으로 둔다(버튼 중첩 금지):

```tsx
<HandleRow>
  {aiReport && effectiveView === 'report' ? (
    <BackButton
      ref={backButtonRef}
      type="button"
      aria-label="선택으로 돌아가기"
      onClick={() => setView('selection')}
    >
      <ChevronLeft aria-hidden />
    </BackButton>
  ) : null}
  <HandleToggle
    ref={toggleRef}
    type="button"
    aria-controls={bodyId}
    aria-expanded={isExpanded}
    aria-label={isExpanded ? '선택 패널 접기' : '선택 패널 펼치기'}
    onClick={handleToggle}
    onLostPointerCapture={handleLostPointerCapture}
    onPointerCancel={handlePointerCancel}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
  >
    {aiReport && effectiveView === 'report' ? (
      <ReportTitle>{aiReport.title}</ReportTitle>
    ) : (
      <HandleCopy>
        <strong>{stepLabel}</strong>
        <small>{summary}</small>
      </HandleCopy>
    )}
  </HandleToggle>
  {aiReport && effectiveView === 'selection' ? (
    <AiChip type="button" aria-label="AI 리포트 보기" onClick={openReport}>
      <Sparkles aria-hidden />
      AI 리포트
    </AiChip>
  ) : null}
</HandleRow>
```

- [ ] **Step 4: 리포트 Layer의 중복 ReportHeader 제거 (#3)**

리포트 `<Layer>`(`:484-506`) 내부에서 `<ReportHeader>...</ReportHeader>` 블록을 삭제하고 본문만 남긴다:

```tsx
<Layer
  $active={effectiveView === 'report'}
  aria-hidden={effectiveView !== 'report'}
  inert={effectiveView !== 'report' || undefined}
>
  {aiReport && effectiveView === 'report' ? aiReport.content : null}
</Layer>
```

사용되지 않게 된 `ReportHeader` styled 정의(`:231-242`)를 제거한다. `ReportTitle`은 Step 3에서 핸들행이 사용하므로 유지한다. `backButtonRef` 포커스 이동 effect(`:317-321`)는 유지(리포트 진입 시 back으로 포커스).

- [ ] **Step 5: SSR 마크업 테스트 갱신 (#3)**

`analysis-mobile-sheet.test.ts:25-43`의 두 번째 케이스는 기본(접힘·선택 뷰) SSR이라 리포트 제목이 더 이상 마크업에 없다. 안정적으로 참인 명제로 갱신:

```ts
it('aiReport가 있으면 선택 뷰에서 진입 칩을 렌더한다', () => {
  const markup = renderToStaticMarkup(
    createElement(
      AnalysisMobileSheet,
      {
        stepLabel: '자치구 선택',
        summary: '서울 전체',
        aiReport: {
          title: '강남구 AI 리포트',
          content: createElement('div', null, 'AI_BODY'),
        },
      },
      createElement('div', null, '선택 본문'),
    ),
  )
  expect(markup).toContain('AI 리포트')
  // 리포트 제목은 리포트 뷰 진입 시에만 핸들행에 노출된다(기본 접힘/선택 뷰엔 없음)
  expect(markup).not.toContain('강남구 AI 리포트')
})
```

- [ ] **Step 6: 단위테스트 + 시각 검증**

Run: `pnpm vitest run src/components/analysis/analysis-mobile-sheet.test.ts`
Expected: PASS.
그다음 dev 서버(5173) 모바일(375×812)에서 `/analysis` → 상권까지 선택 → "AI 리포트" 칩 탭 → 핸들행이 `[<] 답십리1동 AI 리포트`로 바뀌고, 리포트 본문 위 중복 헤더가 사라지고, back 아이콘에 검은 테두리가 없는지 스크린샷으로 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/components/analysis/analysis-mobile-sheet.tsx src/components/analysis/analysis-mobile-sheet.test.ts
git commit -m "feat(analysis): 시트 핸들행 헤더 재구성(리포트 back+제목), 확장 화살표 제거"
```

---

## Task 3: 바텀시트 스크롤바 숨기기 (스크롤은 유지) (#2)

선택 뷰의 스크롤은 패널 내부 `Body`, 리포트 뷰의 스크롤은 시트 `Layer`에서 발생한다. 두 표면 모두 스크롤바만 감추고 스크롤은 유지한다. 패널은 데스크탑과 공유되므로 `variant`(Task 4에서 도입)로 시트에서만 숨긴다.

**Files:**
- Modify: `src/components/analysis/analysis-mobile-sheet.tsx` — `Layer` styled(`:208-229`)
- Modify: `src/components/analysis/analysis-selection-panel.tsx` — `Body` styled(`:143-148`), Task 4의 `variant`와 결합

**Interfaces:**
- Consumes: Task 4가 `AnalysisSelectionPanel`에 추가하는 `variant?: 'panel' | 'sheet'`.

- [ ] **Step 1: 시트 Layer 스크롤바 숨김**

`Layer` styled에 크로스브라우저 스크롤바 숨김 추가(스크롤 기능 유지):

```ts
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* legacy Edge */
  &::-webkit-scrollbar {
    display: none;
  }
```

- [ ] **Step 2: 패널 Body 스크롤바 숨김(시트 변형에서만)**

Task 4에서 `Body`가 `$variant`를 받으므로, `$variant === 'sheet'`일 때만 위와 동일한 스크롤바 숨김 CSS를 적용한다. 데스크탑(`panel`)은 기존대로 스크롤바 노출.

- [ ] **Step 3: 시각 검증**

dev 서버 모바일 뷰에서 시트를 펼쳐 선택 리스트를 스크롤 → 스크롤바 미표시·스크롤 정상. 리포트 뷰에서도 동일 확인. `getComputedStyle` 또는 스크린샷으로 확인.

- [ ] **Step 4: 커밋** (Task 4와 함께 커밋해도 됨 — variant 의존)

```bash
git add src/components/analysis/analysis-mobile-sheet.tsx src/components/analysis/analysis-selection-panel.tsx
git commit -m "style(analysis): 바텀시트 스크롤바 숨김(스크롤 유지)"
```

---

## Task 4: 선택 패널 시트 변형 — 큰 헤더 숨김 + 상권/업종 다열 카드 (#6 #8)

`AnalysisSelectionPanel`에 `variant?: 'panel' | 'sheet'`(기본 `'panel'`)를 도입한다. `sheet`에서: (a) `Header`(Eyebrow/Title/Description) 숨김 → 스텝 상자+카드가 바로 보이게(#6), (b) 상권/업종 후보를 한 줄에 여러 개 보이는 격자로(글자 잘림 없이)(#8), (c) Task 3의 스크롤바 숨김 적용. 데스크탑(`panel`)은 전부 기존 유지.

**Files:**
- Modify: `src/components/analysis/analysis-selection-panel.tsx` (`AnalysisSelectionPanelProps` `:23-34`, `Header`/`Body`/`CandidateList`/`CandidateCopy` styled, 렌더 `:358-508`)
- Modify: `src/components/analysis/analysis-page.tsx` — 시트에 넣는 패널에 `variant="sheet"` 전달 (`:709-717`)

**Interfaces:**
- Produces: `AnalysisSelectionPanelProps`에 `variant?: 'panel' | 'sheet'` 추가(옵셔널, 기본 `'panel'`). 기존 호출부(데스크탑 `:659-672`)는 무변경.
- Consumes: `analysis-page.tsx`가 `children={panel}` 대신 시트 전용 `variant="sheet"` 패널을 전달.

- [ ] **Step 1: variant prop 추가 + 데스크탑/시트 패널 분리**

`analysis-selection-panel.tsx`:
- `AnalysisSelectionPanelProps`에 `variant?: 'panel' | 'sheet'` 추가, 함수 시그니처에서 `variant = 'panel'` 기본값.

`analysis-page.tsx`:
- 기존 `const panel = (<AnalysisSelectionPanel ... />)`(데스크탑용, variant 생략=panel)는 그대로.
- 시트용 별도 엘리먼트를 만들어 전달(같은 props + `variant="sheet"`):

```tsx
const sheetPanel = <AnalysisSelectionPanel {/* panel과 동일 props */} variant="sheet" />
...
mobilePanel={
  <AnalysisMobileSheet
    stepLabel={`${ANALYSIS_STEP_LABELS[activeStep]} 선택`}
    summary={selectionSummary}
    aiReport={mobileAiReport}
  >
    {sheetPanel}
  </AnalysisMobileSheet>
}
```

> 데스크탑 `desktopPanel={panel}`은 변경 없음. `memo` 비교를 위해 props 객체 동일성 유지에 유의(추가 prop은 `variant` 리터럴뿐).

- [ ] **Step 2: 시트 변형에서 큰 헤더 숨김 (#6)**

렌더에서 `Header`(`:360-366`)를 `variant !== 'sheet'`일 때만 렌더:

```tsx
{variant !== 'sheet' ? (
  <Header>
    <Eyebrow>상권 분석</Eyebrow>
    <Title>분석할 지역을 선택해 주세요</Title>
    <Description>지도와 목록에서 지역을 좁힌 뒤 원하는 업종을 선택하세요.</Description>
  </Header>
) : null}
```

시트에서는 `StepList`(4개 단계 상자) + `Body`(카드)가 곧바로 보인다. `StepList`/`Body` 상단 패딩이 헤더 제거 후에도 자연스러운지 확인, 필요하면 `sheet`에서 `StepList` `padding` 상단만 소폭 축소(토큰/기존 값 범위 내).

- [ ] **Step 3: 상권/업종 카드를 다열 격자로 (#8)**

`CandidateList`(`:169-172`)와 `CandidateCopy`(`:198-217`)를 `$variant` 반응형으로:

```ts
const CandidateList = styled.ul<{ $variant: 'panel' | 'sheet' }>`
  display: grid;
  gap: 8px;
  ${props =>
    props.$variant === 'sheet' &&
    `grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));`}
`
```

`CandidateCopy strong`은 시트에서 이름이 잘리지 않게 말줄임 대신 줄바꿈 허용:

```ts
const CandidateCopy = styled.span<{ $variant: 'panel' | 'sheet' }>`
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;

  strong {
    font-size: 14px;
    font-weight: 650;
    ${props =>
      props.$variant === 'sheet'
        ? 'white-space: normal; word-break: keep-all;'
        : 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'}
  }

  small {
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
  }
`
```

렌더에서 `CandidateList`/`CandidateCopy`에 `$variant={variant}` 전달. `CandidateButton`은 격자 셀에서 높이가 제각각이지 않도록 `height: 100%` 및 `align-items: flex-start` 유지(이름 2줄+설명 대비). 데스크탑(`panel`)은 `grid-template-columns` 미적용 → 기존 1열 리스트 유지.

> 결정: #8을 `sheet` 변형에만 적용해 데스크탑 380px 패널의 기존 1열 행 레이아웃 회귀를 피한다.

- [ ] **Step 4: Task 3 스크롤바 숨김을 Body에 결합**

`Body`(`:143-148`)를 `$variant` 받도록 바꾸고 `sheet`에서만 스크롤바 숨김 CSS 적용, 렌더에서 `$variant={variant}` 전달.

- [ ] **Step 5: qa:verify + 시각 검증**

Run: `pnpm qa:verify`
Expected: PASS.
dev 서버 모바일: 시트 펼침 시 큰 헤더 없이 4단계 상자+카드가 바로 보이고, 상권/업종 단계에서 카드가 한 줄에 2개 이상·글자 안 잘림. 데스크탑(≥1025px)에서 좌측 패널은 헤더·1열 리스트 그대로인지 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/components/analysis/analysis-selection-panel.tsx src/components/analysis/analysis-page.tsx
git commit -m "feat(analysis): 선택 패널 sheet 변형 — 헤더 숨김·상권/업종 다열 카드"
```

---

## Task 5: 비로그인 잠금 카피에서 중복 CTA 문구 제거 (#5)

버튼 "로그인하고 AI 리포트 보기"가 바로 아래 있으므로 카피의 "— 로그인하고 확인하기"는 중복. 문구만 제거한다. 이 카드는 데스크탑 카드/모바일 리포트 뷰(ReportInsightSection locked)가 공유하므로 양쪽에 동시 반영된다.

**Files:**
- Modify: `src/components/analysis/ai-report/ai-report-lock-card.tsx:84-87`

- [ ] **Step 1: 문구 교체**

```tsx
<Copy>이 지역의 강점·리스크·추천 업종을 AI가 요약해 드려요</Copy>
```

- [ ] **Step 2: 시각 검증**

모바일 리포트 뷰(비로그인)와 데스크탑 잠금 카드 모두에서 "— 로그인하고 확인하기"가 사라지고 버튼만 남는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/components/analysis/ai-report/ai-report-lock-card.tsx
git commit -m "copy(analysis): 잠금 카드 중복 CTA 문구 제거"
```

---

## Task 6: 페이지 높이 100dvh 오버플로 제거 (#9)

측정 결과: 헤더 실제 높이 **65px**(Inner min-height 64px + Header `border-bottom` 1px, 스크롤 여부와 무관하게 transparent 1px도 레이아웃 점유), `Page`는 `calc(100dvh - 64px)`만 빼서 헤더 65 + 본문 748 = **813px > 812** → 1px 세로 스크롤. 헤더 실높이만큼 빼 정확히 100dvh를 채운다.

**Files:**
- Modify: `src/components/analysis/analysis-page.tsx:99-106` (`Page` styled)

- [ ] **Step 1: Page 높이 보정**

`Page`의 `height: calc(100dvh - 64px)` → `height: calc(100dvh - 65px)`로 변경(헤더 border 1px 포함). `min-height: 560px`는 매우 낮은 뷰포트 보호용으로 유지(일반 모바일 812px에선 발동 안 함).

```ts
const Page = styled.main`
  position: relative;
  width: 100%;
  height: calc(100dvh - 65px); /* 헤더 64px + border-bottom 1px */
  min-height: 560px;
  overflow: hidden;
  background: var(--color-surface-muted);
`
```

> 결정: 헤더가 sticky·단일행이라 65px가 안정적. 매직넘버 회피를 위한 루트 레이아웃(flex column 100dvh) 전면 리팩터는 범위(FE 상권분석) 밖이라 지양.

- [ ] **Step 2: 측정 검증**

dev 서버 모바일 `/analysis`에서 `document.documentElement.scrollHeight - clientHeight === 0`(오버플로 0)인지 `javascript_tool`로 확인. 데스크탑 뷰에서도 세로 스크롤이 생기지 않는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/components/analysis/analysis-page.tsx
git commit -m "fix(analysis): 페이지 높이 헤더 65px 보정으로 100dvh 오버플로 제거"
```

---

## Self-Review

**1. Spec coverage (9개 이슈):**
- #1 드래그 30% 스냅 → Task 1 ✅
- #2 스크롤바 숨김(스크롤 유지) → Task 3(+Task 4 Body 결합) ✅
- #3 리포트 헤더를 핸들행으로 통합 → Task 2 ✅
- #4 back 버튼 아이콘 전용·무테두리 → Task 2 Step 2 ✅
- #5 잠금 카피 중복 CTA 제거 → Task 5 ✅
- #6 시트에서 큰 헤더 숨김 → Task 4 Step 2 ✅
- #7 확장 화살표(chevron) 제거 → Task 2 Step 1 ✅
- #8 상권/업종 다열 카드 → Task 4 Step 3 ✅
- #9 100dvh 오버플로 → Task 6 ✅

**2. Placeholder scan:** 각 스텝에 실제 CSS/TSX/테스트 코드 포함. "적절히 처리" 류 없음.

**3. Type consistency:** `variant: 'panel' | 'sheet'`를 Task 3/4에서 일관되게 사용(`$variant` styled prop 포함). `resolveAnalysisSheetSnapFromDrag` 시그니처 불변. `AnalysisMobileSheetProps` 불변. `ReportTitle`은 Task 2에서 핸들행이 재사용(제거하지 않음), `ReportHeader`/`Icon`/`ChevronUp`만 제거.

**주의(리뷰 포인트):**
- Task 4에서 데스크탑 패널 `memo` 리렌더 회귀 없는지(추가 prop은 리터럴 `variant`뿐).
- Task 2 back 버튼 프로그램 포커스 시 `:focus { outline:none }`로 검은 테두리 제거하되, 키보드 사용자 `:focus-visible` 표시는 유지.
