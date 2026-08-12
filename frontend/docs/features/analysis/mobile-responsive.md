# 상권 분석 — 모바일/태블릿 반응형 바텀시트 세부 명세서

> **작성일**: 2026-08-12
> **공통 명세**: [상권 분석 공통 명세](./analysis.md)
> **연관 명세**: [지도 기반 분석 대상 탐색](./explorer.md), [AI 리포트 컴패니언](./ai-report.md)
> **대상**: 웹 (Next.js App Router) — 좁은 뷰포트(`max-width: 1024px`, 태블릿·모바일)
> **작성자**: Claude
> **상태**: 구현 완료 (검증 대기)

이 문서는 상권 분석 탐색(`/analysis`)의 **모바일·태블릿 반응형 UX**를 재설계한다. 기존에는 선택
패널(바텀시트)과 AI 리포트(별도 오버레이)가 **서로 다른 인터랙션 패러다임**으로 공존해 시트가
가려지고 흐름이 어긋났으며, 여닫기 애니메이션이 없었다. 이를 **단일 바텀시트 + 뷰 전환**으로
통합하고, **`status`·`recommend` 바텀시트와 동일한 컨벤션**(높이 드래그·2단 스냅·공유 상태
헬퍼)으로 맞춰 서비스 전반의 사용성 일관성을 확보한다.

[[_TOC_]]

---

## D0. 배경 / 기획 의도

| 항목               | 내용                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 충족 요구사항      | S3 상권 분석 — 좁은 뷰포트(태블릿·모바일)에서 지도 탐색 + 선택 패널 + AI 리포트를 자연스럽게 사용                                                                                      |
| 해결하려는 문제    | 아래 "현재 문제 3가지" — AI 오버레이가 시트를 가림, 열림 패러다임 불일치, 애니메이션 부재                                                                                              |
| 기존 동작 (as-is)  | `AnalysisMobileSheet`가 `height` 토글(72px ↔ `min(72dvh, …)`) 바텀시트로 선택 패널을 열고, AI 리포트(`aiReportSlot`)는 지도 영역 전체를 덮는 별도 `absolute` 오버레이(`AiSlot`)로 표시 |
| 목표 동작 (to-be)  | 하나의 바텀시트가 **선택 뷰 ↔ AI 리포트 뷰**를 전환. 핸들 드래그·탭으로 2단 스냅(접힘/펼침), 뷰는 크로스페이드, reduced-motion 대응. `status`/`recommend` 시트와 동일 패턴             |
| 구현 제외 범위     | 데스크탑(≥1025px) 레이아웃(기존 유지), 리포트 뷰 내 "크게보기" 전체화면 모달(모바일은 시트가 이미 near-full), 3단 스냅(절반), 결과 페이지(`/analysis/result`) 반응형, 서버/데이터 계약 |
| 연관 기능 / 의존성 | [explorer](./explorer.md)(지도 선택 상태), [ai-report](./ai-report.md), `status`/`recommend` 바텀시트 패턴, `DESIGN.md`(motion·sheet 토큰)                                             |

**현재 문제 3가지 (기존 코드 기준)**

1. **AI 슬롯이 시트를 가림** — `AiSlot`은 `position:absolute; inset:0; z-index:21`로 시트
   (`Sheet` `z-index:20`) _위에_ 떠 있었다. 선택 시트를 펼치면 AI 카드/패널이 시트를 덮어 두
   표면이 충돌했다.
2. **열림 방식 불일치** — 선택 시트는 `height` 토글로 올라오는데 AI 리포트는 `inset:0`
   오버레이라 패러다임이 달랐다. 또한 서비스 내 다른 바텀시트(`status`/`recommend`)는 드래그
   가능한 스냅 시트인데 분석 시트만 탭 토글이라 **서비스 간 일관성도 깨져** 있었다.
3. **애니메이션 부재** — `Sheet`는 `transition: height`로만 여닫고, `Body`는
   `display:block/none`(즉시), `AiSlot`은 enter/exit 애니메이션이 없었다.

---

## D1. 기능 개요

좁은 뷰포트에서 지도 위 **단일 바텀시트**가 분석 흐름을 담는다. 시트는 (a) **선택 뷰**(자치구
→ 행정동 → 상권 → 분야 단계 선택)와 (b) **AI 리포트 뷰**(현재 선택 레벨의 컴패니언 리포트)를
같은 표면에서 **크로스페이드 뷰 전환**으로 오간다. 시트는 접힘(핸들만)·펼침 2단 스냅을 가지며,
핸들 **드래그** 또는 **탭**으로 여닫고, `status`/`recommend`와 동일한 높이 클램프 방식으로
움직인다.

```
지도 선택 → 바텀시트(선택 뷰) 드래그/탭으로 여닫기 → AI 리포트 가용 시 핸들에 진입 칩 노출
→ 칩 탭 시 같은 시트가 AI 리포트 뷰로 크로스페이드(펼침 보장) → ‹ 뒤로 = 선택 뷰 복귀
```

### D1-1. UI 진입점 / 기능 연결

| 진입점              | 트리거                       | 결과                                     |
| ------------------- | ---------------------------- | ---------------------------------------- |
| 시트 핸들           | 핸들 탭                      | 시트 접힘 ↔ 펼침 토글                    |
| 시트 핸들           | 핸들 세로 드래그             | 이동 방향/중점 기준으로 접힘·펼침 스냅   |
| AI 리포트 진입 칩   | 핸들 우측 "✨ AI 리포트" 탭  | AI 리포트 뷰로 전환(펼침 보장)           |
| 뷰 뒤로가기         | AI 리포트 뷰 헤더의 ‹ 뒤로   | 선택 뷰로 복귀                           |
| 선택/지도 레벨 변경 | 다른 자치구·행정동·상권 선택 | 리포트 대상이 바뀌면 선택 뷰로 자동 복귀 |

- 반응형 분기: `@media (max-width: 1024px)`(status/recommend 시트와 동일). 데스크탑은 `DesktopPanel`, 모바일은 `MobilePanel`
  (`display: contents`)이 `AnalysisMobileSheet`를 렌더한다(`analysis-page.tsx`). 이 분기 자체는
  유지하고 시트 내부만 재설계한다. 데스크탑의 카드→패널(`AiReportCard`/`AiReportPanel`) 흐름은
  그대로 둔다.

---

## D2. 동작 요구사항

| #   | 요구사항                                                                                           | 우선순위 |
| --- | -------------------------------------------------------------------------------------------------- | -------- |
| 1   | 시트·AI 리포트가 **하나의 표면**으로 동작하고 서로 가리지 않는다(`AiSlot` 오버레이 폐기)           | 필수     |
| 2   | 여닫기는 `status`/`recommend`와 동일한 **높이 클램프 드래그 + 2단 스냅**(핸들 드래그·탭)           | 필수     |
| 3   | 뷰 전환(선택 ↔ 리포트)은 **크로스페이드**(레이어 opacity), 리포트 콘텐츠는 리포트 뷰일 때만 마운트 | 필수     |
| 4   | AI 진입 칩은 리포트가 **가용할 때만**(`aiLevelKey` 존재) 핸들에 노출                               | 필수     |
| 5   | 접힘 상태에서도 핸들(단계 라벨 + 선택 요약 + AI 칩)이 지도를 최소 가림으로 노출                    | 필수     |
| 6   | `prefers-reduced-motion: reduce`에서 높이/opacity 트랜지션 제거, 앱은 계속 사용 가능               | 필수     |
| 7   | 시트가 지도 전체를 막지 않아 시트 밖 지도 핀치/이동이 계속 가능(백드롭 없음 — 기존 시트와 동일)    | 필수     |
| 8   | safe-area(홈 인디케이터) 인셋 대응(`env(safe-area-inset-bottom)`)                                  | 필수     |
| 9   | 접근성: `aria-expanded`·`aria-controls`·`aria-hidden`·`inert`, 리포트 진입 시 포커스 이동          | 필수     |
| 10  | 탭/드래그/키보드 click을 구분(드래그 후 마우스 click 무시, 키보드 `detail===0`은 허용)             | 필수     |

---

## D3. 아키텍처 / 시스템 설계

### D3-1. 시스템 구성

- **`lib/analysis/analysis-sheet-state.ts`** (신규): 스냅/드래그 순수 로직.
  `status-state`·`recommend-state`와 같은 형태 — `getAnalysisSheetHeightBounds`,
  `resolveAnalysisSheetSnapFromDrag`, `didAnalysisSheetDrag`, `shouldSuppressAnalysisSheetClick`,
  높이 상수. 단위 테스트로 검증한다.
- **`AnalysisMobileSheet`** (재설계): 바텀시트 컨테이너. 로컬 상태 `snap`(collapsed/expanded),
  `view`(selection/report), `dragVisualState`. 슬롯으로 `children`(선택 패널)과
  `aiReport?: { title; content }`(리포트 뷰 콘텐츠)를 받는다.
- **`AnalysisExplorer`** (`analysis-page.tsx`): 시트에 선택 패널과 `aiReport`를 주입.
  `aiReport.content`는 `<AiReportBody selection variant="compact" />`(로그인 게이팅·SSE fetch
  내장). 데스크탑 슬롯(`AiReportCardSlot`/`AiReportPanelSlot`)은 유지.
- **백드롭 없음**: `status`/`recommend` 시트와 동일하게 백드롭을 두지 않아 지도가 계속
  조작 가능하다. `AiSlot` 오버레이는 폐기.

### D3-2. 데이터 흐름

```
analysis-page(선택/AI 레벨 계산)
  ├─ panel(선택 패널)                         → AnalysisMobileSheet children (선택 레이어)
  └─ aiLevelKey ? { title, <AiReportBody/> }  → AnalysisMobileSheet aiReport (리포트 레이어)

AnalysisMobileSheet(로컬 UI 상태만)
  snap:  collapsed | expanded   (핸들 드래그/탭 → analysis-sheet-state 헬퍼)
  view:  selection | report     (AI 칩 / ‹ 뒤로)
  effectiveView = aiReport ? view : 'selection'   (리포트 없으면 항상 선택 뷰)
```

- 시트는 **UI 상태만** 로컬 소유. 선택·AI 데이터는 상위가 소유하고 슬롯으로 내려준다.
- 리포트 대상(`aiReport.title`)이 바뀌면 렌더 단계 파생(이전 제목 비교)으로 선택 뷰로 되돌린다
  (`useEffect` 내 setState 금지 규칙 준수).

### D3-3. 상태 모델

| 상태              | 값                        | 소유       | 비고                                                    |
| ----------------- | ------------------------- | ---------- | ------------------------------------------------------- |
| `snap`            | `collapsed` \| `expanded` | 시트(로컬) | 높이 클램프 드래그의 목표 스냅                          |
| `view`            | `selection` \| `report`   | 시트(로컬) | `report` 전환 시 `snap='expanded'` 보장                 |
| `dragVisualState` | `{ deltaY, startSnap }`   | 시트(로컬) | 드래그 중 실시간 높이 오프셋                            |
| `effectiveView`   | (파생)                    | —          | `aiReport ? view : 'selection'` — 리포트 없으면 선택 뷰 |

### D3-4. 사용 라이브러리 / 기술 (역할 기준)

| 기술                                 | 역할                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| styled-components                    | 시트/레이어 스타일, `height` clamp + `opacity` 트랜지션                           |
| `analysis-sheet-state`(신규)         | 스냅 경계·드래그 판정 순수 로직(status/recommend와 동형)                          |
| Pointer Events + `setPointerCapture` | 핸들 드래그(터치/마우스 공통), 탭/드래그 판정                                     |
| `DESIGN.md` 토큰                     | `motion-standard`/`ease-standard`, `radius-sheet`/`radius-pill`, `shadow-level-4` |
| `env(safe-area-inset-*)`             | 홈 인디케이터 인셋                                                                |
| `inert` + `aria-*`                   | 비활성 레이어/접힘 바디를 포커스·스크린리더에서 제외                              |

---

## D4. 상세 동작 정의

### D4-1. 여닫기 (높이 클램프 드래그 + 2단 스냅)

- **레이아웃**: `status`/`recommend`와 동일하게 시트 `height`를 `clamp(collapsed, base -
dragDeltaY, expanded)`로 계산한다. `base`는 현재 스냅 높이, `dragDeltaY`는 드래그 중 실시간
  이동량. 드래그 중 `transition: none`, 놓으면 `transition: height var(--motion-standard)
var(--ease-standard)`로 스냅.
  - 접힘 높이 `72px`(단계 라벨+요약+칩을 담아 status(52)/recommend(44)보다 큼), 펼침 높이
    `max(72px, min(72dvh, calc(100% - 180px)))`.
- **드래그 판정**: `getAnalysisSheetHeightBounds(viewportHeight)`로 경계 계산 →
  `resolveAnalysisSheetSnapFromDrag(startSnap, deltaY, …)`가 드래그 높이의 중점 기준으로 스냅
  결정. 이동량이 임계(`4px`) 미만이면 탭으로 간주(`didAnalysisSheetDrag`).
- **탭/키보드**: 핸들 `onClick`은 `shouldSuppressAnalysisSheetClick`으로 드래그 뒤 따라오는
  마우스 click을 무시하고, 키보드 click(`detail===0`)은 허용해 토글한다.
- **핸들**: 상단 grabber pill(`radius-pill`·`border-300`, 40×4) + 단계 라벨(`strong`) + 선택
  요약(`small`) + (가용 시) AI 칩 + chevron(펼침 시 180° 회전). `touch-action: none`으로 드래그
  중 페이지 스크롤 차단.

### D4-2. 뷰 전환 (선택 ↔ AI 리포트, 크로스페이드)

- **레이어 구조**: 바디에 두 개의 절대 위치 레이어(선택/리포트)를 겹쳐 두고 `opacity`+
  `visibility`로 크로스페이드(`transition: opacity var(--motion-standard)`). 각 레이어는 독립
  세로 스크롤(`overflow-y:auto; overscroll-behavior:contain`).
  - 크로스페이드는 reduced-motion 규칙(슬라이드→크로스페이드)과 자연히 정합. 비활성 레이어는
    `pointer-events:none` + `inert` + `aria-hidden`.
- **진입**: AI 칩 탭 → `view='report'`, `snap='expanded'`. 리포트 콘텐츠(`AiReportBody`)는
  `effectiveView==='report'`일 때만 마운트해 **배경에서 SSE/쿼리가 조기 실행되지 않게** 한다.
- **복귀**: 리포트 헤더 ‹ 뒤로 → `view='selection'`. 진입 시 포커스를 뒤로 버튼으로 이동.
- **자동 복귀**: `aiReport` 부재 또는 대상 변경(제목 변화) 시 선택 뷰로 되돌림.

### D4-3. z-index / 레이어 정리

| 레이어      | 기존                         | 변경                                |
| ----------- | ---------------------------- | ----------------------------------- |
| 지도        | 기본                         | 유지(시트 밖은 계속 조작 가능)      |
| AI 오버레이 | `AiSlot` `z-index:21` (덮음) | **폐기** — 시트 내부 뷰로 흡수      |
| 시트        | `z-index:20`                 | 유지(단일 표면, `recommend`와 동일) |

---

## D5. 비즈니스 로직

### 처리 흐름

```
1. analysis-page: aiLevelKey 있으면 aiReport={ title, <AiReportBody/> } 주입
2. 시트: collapsed 초기 — 핸들 + (가용 시) AI 칩
3. 핸들 드래그/탭 → snap 토글(analysis-sheet-state 헬퍼로 스냅 결정)
4. AI 칩 탭 → view=report(+expanded), 리포트 레이어 크로스페이드·콘텐츠 마운트
5. ‹ 뒤로 → view=selection / 선택 대상 변경 → 자동 selection
6. reduced-motion → height/opacity 트랜지션 제거(즉시 전환)
```

### 스냅/전환 판정 규칙

| 트리거             | 조건                           | 결과                           |
| ------------------ | ------------------------------ | ------------------------------ |
| 핸들 탭(비드래그)  | click `detail!==0` 아님/키보드 | `snap` 토글                    |
| 핸들 드래그 릴리스 | `didDrag`                      | 드래그 높이 중점 기준 스냅     |
| AI 칩 탭           | `aiReport` 존재                | `view=report`, `snap=expanded` |
| ‹ 뒤로 탭          | `view=report`                  | `view=selection`               |
| 리포트 대상 변경   | `title` 변화 && `view=report`  | `view=selection`(파생 복귀)    |

---

## D6. 주의사항

- **컨벤션 일관성**: 새 시트는 `status`/`recommend` 시트의 인터랙션·시각(높이 드래그·2단 스냅·
  grabber·`radius-sheet`·백드롭 없음)을 그대로 따른다. 신규 패러다임(transform 슬라이드·백드롭)을
  도입하지 않아 서비스 전반의 사용성이 일관된다.
- **데스크탑 회귀 금지**: `@media (max-width: 1024px)` 밖은 `AiReportCardSlot`/`AiReportPanelSlot`
  (지도 위 카드·좌측 패널)과 카드→패널 게이팅을 그대로 쓴다. 모바일 경로만 변경.
- **모바일 AI 게이팅**: 모바일은 카드→패널 2스텝 대신 칩 → `AiReportBody` 직접 렌더. 미인증
  사용자는 `AiReportBody` 내부 인사이트 섹션의 로그인 CTA가 잠금 역할을 하며, 별도
  `AiReportLockCard`는 모바일에서 쓰지 않는다.
- **조기 fetch 방지**: 리포트 콘텐츠는 `effectiveView==='report'`일 때만 마운트한다.
- **effect 내 setState 금지**: 대상 변경 시 선택 뷰 복귀는 렌더 단계 파생(이전 제목 비교)으로
  구현(ESLint `react-hooks/set-state-in-effect` 준수).
- **토큰 준수**: 색·radius·shadow·motion은 `DESIGN.md` 토큰만 사용.

---

## D7. 테스트케이스

| #   | 시나리오           | 입력/조작                          | 기대 결과                                            |
| --- | ------------------ | ---------------------------------- | ---------------------------------------------------- |
| 1   | 기본 접힘 + 접근성 | 초기 렌더                          | `aria-expanded=false`, "선택 패널 펼치기", 단계 라벨 |
| 2   | AI 칩/제목 노출    | `aiReport` 주입                    | 진입 칩 "AI 리포트" + 리포트 헤더 제목 렌더          |
| 3   | AI 칩 미노출       | `aiReport` 없음                    | 진입 칩("AI 리포트 보기") 미렌더                     |
| 4   | 스냅 경계 계산     | `getAnalysisSheetHeightBounds`     | 지도 최소 여백/비율 규칙대로 펼침 높이 산출          |
| 5   | 드래그 스냅 판정   | `resolveAnalysisSheetSnapFromDrag` | 중점 기준 접힘/펼침, 비정상 경계는 시작 스냅 유지    |
| 6   | 드래그/탭 구분     | `didAnalysisSheetDrag`             | 임계 초과만 드래그                                   |
| 7   | click 억제         | `shouldSuppressAnalysisSheetClick` | 드래그 후 마우스 click만 무시, 키보드 허용           |

> 스냅/드래그 순수 로직은 `analysis-sheet-state.test.ts`, 컴포넌트 SSR 계약은
> `analysis-mobile-sheet.test.ts`로 검증. 실기기 드래그·크로스페이드·reduced-motion은 로컬
> 확인(`pnpm dev`, 375px, reduced-motion 토글).

---

## D8. 결정 사항 (2026-08-12 확정)

| #   | 항목           | 결정                                                                 | 근거                                                                                         |
| --- | -------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | 여닫기 방식    | **높이 클램프 드래그 + 2단 스냅**(status/recommend 컨벤션 재사용)    | 서비스 전반 바텀시트와 동일 인터랙션 → 사용성 일관. 검증된 패턴이라 품질·안정성 확보         |
| 2   | 뷰 전환        | **크로스페이드 레이어**(선택 ↔ 리포트)                               | reduced-motion 규칙과 자연 정합, 구현 단순·안정. 선택 패널 리마운트 없이 스크롤 보존         |
| 3   | 드래그 제스처  | **핸들 드래그 포함**                                                 | 바텀시트 프리미엄 감. 핸들 한정이라 지도 조작과 충돌 없음                                    |
| 4   | AI 진입점      | **핸들 우측 AI 칩**(리포트 가용 시)                                  | 접힘 상태에서도 발견성 유지, 단일 표면 일관성                                                |
| 5   | AI 뷰 통합     | 리포트 뷰 = ‹ 뒤로 헤더 + **`AiReportBody`**(로그인 게이팅·SSE 내장) | 카드→패널 2스텝 제거. `/analysis/report` 페이지와 동일 컴포넌트로 일관성. `AiSlot` 폐기      |
| 6   | 백드롭         | **없음**                                                             | status/recommend와 동일. 지도 계속 조작 가능(요구사항 #7)                                    |
| 7   | 브레이크포인트 | **1024px**(`analysis-page.tsx`, 840→1024)                            | status/recommend 시트와 동일 분기 → 태블릿 범위 포함 일관. 결과 페이지(별도 표면)는 840 유지 |

**미결(후속 슬라이스)**

| #   | 항목                                                  | 상태 |
| --- | ----------------------------------------------------- | ---- |
| 1   | 3단 스냅(절반) 도입 여부 — 사용 데이터 관찰 후 판단   | 후속 |
| 2   | 리포트 뷰 내 "크게보기" 전체화면 모달(모바일 v1 제외) | 후속 |

---

## 변경 이력

| 날짜       | 작성자 | 내용                                                                   |
| ---------- | ------ | ---------------------------------------------------------------------- |
| 2026-08-12 | Claude | 최초 초안(transform 방향) → 기존 status/recommend 컨벤션으로 확정·구현 |
