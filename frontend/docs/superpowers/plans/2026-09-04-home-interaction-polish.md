# 홈 인터랙션·가독성 2차 개선(R1~R6) 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 개편 1차 결과물(4단계 스토리·듀얼 랭킹·카운터·손익 데모)의 헤더 겹침 결함을 고치고, 인사이트 자리 예약·01단계 Top10·카운터 흐름 시각화·손익 관계 표현·랭킹 스크롤 전환까지 6건을 반영한다.

**Architecture:** 새 백엔드 호출이 0건이다. 6건 모두 기존 응답(`GET /districts/top-ten`, `GET /analysis-rankings`)의 **표현 레이어**만 바꾼다. 스토리가 이미 검증한 Track+Sticky 패턴과 순수 함수(`activeStepFromProgress`)를 랭킹 섹션에 재사용하고, 두 컴포넌트가 공유해야 하는 것(헤더 높이 상수·스택 모드 판정·pin 구간 클램프)은 공용 모듈로 추출해 판정 기준이 갈리지 않게 한다.

**Tech Stack:** Next.js App Router, TypeScript, styled-components(SSR), @tanstack/react-query, lucide-react(기존 의존성), vitest(node 환경 + `renderToStaticMarkup` 문자열 assertion)

**Spec:** `frontend/docs/features/home/interaction-polish.md` (선행: `frontend/docs/features/home/story-and-rankings.md`)

## Global Constraints

- **새 패키지·새 백엔드 호출·새 CSS 토큰을 만들지 않는다.** 색·모션·radius·spacing 은 `DESIGN.md` 토큰만 쓴다.
- **그라데이션 금지.** `DESIGN.md` 1368행이 요구하는 범위는 **`home-page.tsx`** 다 — `rg -n "linear-gradient|radial-gradient|backdrop-filter|glassmorphism" src/components/home/home-page.tsx` 가 무결과여야 한다. `src/components/home` 전체로 넓히면 안 된다: 히어로 글래스(`hero-section.tsx`·`hero-window.tsx`)가 의도적으로 `backdrop-filter` 를 쓰고 있어 원래부터 히트가 난다. 새로 만지는 파일에 `gradient` 를 넣지 않는 것이 지켜야 할 선이다.
- 테스트는 jsdom 없이 **node 환경 + `renderToStaticMarkup` 문자열 assertion**. 조건부 CSS 는 `ServerStyleSheet().getStyleTags()` 로 뽑는다. `$prop` 기반 styled CSS 는 마크업 문자열에 안 나오므로 스타일 시트로 검증한다.
- 홈 컴포넌트 테스트는 **`QueryClientProvider` 로 감싼다**(홈이 BE 를 호출한다).
- 완료 보고 전 `pnpm test` 와 `pnpm qa:verify`(format:check + lint + typecheck + build) 필수.
- `next dev` 를 돌리면 `next-env.d.ts` 가 `.next/types` → `.next/dev/types` 로 바뀐다. **커밋 전 `git checkout -- frontend/next-env.d.ts`.**
- `qa:verify` 는 build 를 돌려 `.next` 를 프로덕션 산출물로 채운다. **dev 서버 띄우기 전 `rm -rf .next`.**
- PR: base 는 **항상 develop**(스택 PR 금지), 라벨 **`frontend-web` 필수**(없으면 Jenkins 가 조용히 배포를 건너뛴다), `--assignee seonghoho`, 머지는 **merge commit**(squash 아님).
- **브라우저 pane 이 숨겨져 있으면 `IntersectionObserver` 콜백이 오지 않고 스크롤 이벤트도 스로틀된다.** R1 은 자동 검증만으로 끝낼 수 없다 — 슬라이스 3 의 사람 눈 확인은 생략 가능한 단계가 아니다.

## 슬라이스 구성과 커밋 경계

| 슬라이스 | 태스크   | 왜 이 경계인가                                                     |
| -------- | -------- | ------------------------------------------------------------------ |
| **1차**  | Task 1~5 | 서로 다른 파일, 저비용. Task 1(R3)만 스크롤·스티키 계산을 건드린다 |
| **2차**  | Task 6   | 단독 컴포넌트 교체. 다른 태스크와 파일이 겹치지 않는다             |
| **3차**  | Task 7~9 | R1. 가장 크고 스크롤 계산을 다시 건드린다                          |

**R3(Task 1)와 R1(Task 9)을 같은 슬라이스에 넣지 않는다.** 둘 다 `top`/`min-height`/pin 구간을 건드려서, 함께 바꾸면 회귀가 났을 때 원인을 분리할 수 없다(명세 D6).

## File Structure

| 파일                                                      | 책임                                                   | 태스크  |
| --------------------------------------------------------- | ------------------------------------------------------ | ------- |
| `src/components/home/layout-constants.ts` (신규)          | 헤더 높이 하나만 export. 세 컴포넌트가 import          | 1       |
| `src/components/home/product-story.tsx` (수정)            | `Sticky` 의 `top`/`min-height`, 로컬 상수·로컬 훅 제거 | 1, 7    |
| `src/components/home/hero-section.tsx` (수정)             | 로컬 `HEADER_HEIGHT` 제거 → import                     | 1       |
| `src/components/home/popular-districts.tsx` (수정)        | 인사이트 슬롯(R2), Top5 명시(R4), 스크롤 트랙(R1)      | 2, 4, 9 |
| `src/lib/home/metric-rankings.ts` (수정)                  | 폴백 10개 확장, `topN` 인자화, 소비처별 상수 2개       | 3, 4    |
| `src/components/home/metric-ranking-board.tsx` (수정)     | Top10 호출                                             | 4       |
| `src/components/home/funnel-counter.tsx` (수정)           | 노드 사이 화살표                                       | 5       |
| `src/components/home/cost-breakdown-bar.tsx` (신규, 개명) | 가로 100% 스택 바. `cost-waterfall.tsx` 를 대체        | 6       |
| `src/hooks/use-stacked-mode.ts` (신규)                    | 스택 모드 판정을 두 컴포넌트가 공유                    | 7       |
| `src/components/home/scroll-fill.ts` (수정)               | `pinnedStepProgress` 순수 함수 추가                    | 8       |
| `src/components/home/scroll-to-pinned-step.ts` (신규)     | 위 순수 함수를 감싼 DOM 스크롤 헬퍼                    | 8       |

---

# 슬라이스 1 — R3 · R2 · R4 · R6

## Task 1: R3 — 헤더 높이 공용 상수 추출 + 스토리 스티키 겹침 해소

**Files:**

- Create: `frontend/src/components/home/layout-constants.ts`
- Modify: `frontend/src/components/home/product-story.tsx` (`Sticky` 66-76행, 로컬 `HEADER_HEIGHT` 177-178행)
- Modify: `frontend/src/components/home/hero-section.tsx` (로컬 `HEADER_HEIGHT` 84행)
- Test: `frontend/src/components/home/product-story.test.ts`

**Interfaces:**

- Consumes: 없음(첫 태스크)
- Produces: `HEADER_HEIGHT: string`(값 `'65px'`) — Task 9 의 `ScrollSticky` 가 같은 것을 import 한다

> ⚠️ **이 추출은 취향이 아니라 필수다.** `Sticky` 는 66행에서 선언되고 로컬 `HEADER_HEIGHT` 는 178행에서 선언된다. styled 템플릿 리터럴은 선언 시점에 **즉시 평가**되므로, 로컬 상수를 그대로 참조하면 `const` 의 TDZ 에 걸려 모듈 로드 시 `ReferenceError: Cannot access 'HEADER_HEIGHT' before initialization` 으로 죽는다. import 는 호이스팅되므로 공용 모듈로 옮기면 이 문제가 사라진다. (상수를 66행 위로 옮기는 것도 가능하지만, 어차피 Task 9 가 세 번째 소비처를 만든다.)

- [ ] **Step 1: 실패하는 테스트 작성**

`product-story.test.ts` 상단 import 에 `ServerStyleSheet` 를 추가한다.

```ts
import { ServerStyleSheet } from 'styled-components'
```

파일 맨 아래에 다음 블록을 추가한다.

```ts
/**
 * SSR 기본 렌더는 스티키 모드다(`useStackedMode` 초기값 false) — 그래서 이 시트에는
 * `Sticky` 규칙만 들어오고 `StackItem` 규칙은 들어오지 않는다. 두 규칙이 같은
 * `calc(100dvh - 65px)` 문자열을 쓰므로, 스택 규칙이 섞이면 이 단언이 무의미해진다.
 */
const renderStoryStyles = (): string => {
  const sheet = new ServerStyleSheet()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  try {
    renderToStaticMarkup(
      sheet.collectStyles(
        createElement(
          QueryClientProvider,
          { client },
          createElement(ProductStory),
        ),
      ),
    )
    return sheet.getStyleTags()
  } finally {
    sheet.seal()
  }
}

describe('ProductStory — 스티키가 헤더를 비껴간다(R3)', () => {
  /*
   * 실측(1440×900): 아이브로가 y 44–64 로 헤더 밴드(0–65) 안에 완전히 들어가
   * 100% 가려졌다. top 을 헤더 높이로 내리면 박스 상단 자체가 y=65 로 밀려
   * 내부 콘텐츠에 그보다 위로 그려질 하한이 없어진다.
   */
  it('Sticky 의 top 이 헤더 높이만큼 내려가 있다', () => {
    expect(renderStoryStyles()).toContain('top:65px')
  })

  it('Sticky 의 min-height 가 헤더 높이를 뺀 값이다', () => {
    expect(renderStoryStyles()).toContain('calc(100dvh - 65px)')
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/product-story.test.ts`
Expected: 두 케이스 FAIL — 현재 `Sticky` 는 `top:0` / `min-height:100dvh` 이므로 `top:65px` 도 `calc(100dvh - 65px)` 도 시트에 없다.

- [ ] **Step 3: 공용 상수 모듈 생성**

`frontend/src/components/home/layout-constants.ts`:

```ts
/**
 * SiteHeader(sticky) 실측 높이(64px + border 1px).
 *
 * hero-section·product-story·popular-districts 세 곳이 같은 값을 알아야 한다.
 * 파일마다 따로 선언하면 헤더 높이가 바뀌는 날 한 곳만 고쳐진다(interaction-polish D8-2).
 *
 * styled 템플릿에서 쓰이므로 **import 로만** 참조한다 — 같은 파일 안에서 아래쪽에
 * const 로 두면 위쪽 styled 선언이 TDZ 에 걸려 모듈 로드가 죽는다.
 */
export const HEADER_HEIGHT = '65px'
```

- [ ] **Step 4: `product-story.tsx` 수정**

import 블록에 추가한다(기존 `@/components/home/` import 들 사이, 알파벳 순서에 맞춰 `AnalysisMiniDemo` 뒤·`CostWaterfall` 앞이 아니라 `FunnelCounter` 뒤 등 lint 가 요구하는 자리에 둔다 — `pnpm lint` 가 판정한다):

```ts
import { HEADER_HEIGHT } from '@/components/home/layout-constants'
```

`Sticky`(66행) 를 고친다:

```ts
const Sticky = styled.div`
  position: sticky;
  /* top 을 헤더 높이로 내려 pin 된 박스 상단 자체를 헤더 아래로 보낸다 — 내부
     콘텐츠(아이브로·h2)가 헤더 밴드로 올라갈 하한이 없어진다(R3, 명세 D4-1). */
  top: ${HEADER_HEIGHT};
  min-height: calc(100dvh - ${HEADER_HEIGHT});
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 32px;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 32px 20px;
`
```

로컬 선언(177-178행)을 삭제한다:

```ts
// SiteHeader(sticky) 실측 높이(64px + border 1px). hero-section.tsx와 동일 상수.
const HEADER_HEIGHT = '65px'
```

- [ ] **Step 5: `hero-section.tsx` 수정**

84행의 로컬 선언을 지우고 import 로 바꾼다.

```ts
import { HEADER_HEIGHT } from '@/components/home/layout-constants'
```

- [ ] **Step 6: 테스트를 돌려 통과를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/product-story.test.ts`
Expected: PASS (신규 2건 + 기존 전부)

- [ ] **Step 7: 전체 테스트 + 정적 검증**

Run: `cd frontend && pnpm test && pnpm qa:verify`
Expected: 전부 통과. `hero-section` 은 스타일 스냅샷 테스트가 없으므로 typecheck·build 가 상수 참조 회귀를 잡는 층이다.

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/components/home/layout-constants.ts frontend/src/components/home/product-story.tsx frontend/src/components/home/hero-section.tsx frontend/src/components/home/product-story.test.ts
git commit -m "[FE] fix: 스토리 아이브로가 헤더에 100% 가려지던 문제 수정"
```

---

## Task 2: R2 — 인사이트 문장 자리 예약

**Files:**

- Modify: `frontend/src/components/home/popular-districts.tsx` (`Insight` styled.p 및 렌더 지점)
- Test: `frontend/src/components/home/popular-districts.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces: `InsightSlot` styled 컴포넌트(같은 파일 안에서만 쓴다). Task 9 가 이 슬롯을 스크롤 트랙 본문(`body`) 안으로 옮긴다

**결정 — 슬롯은 「두 열이 다 있을 때」만 마운트한다.** 인사이트는 두 순위의 차이를 말하는 문장이라 애초에 한쪽 열만 있으면 만들어질 수 없다(`buildRankingInsight` 가 양쪽을 요구한다). 솔로 분기에서까지 74px 를 비워 두면 D5-4 가 없애려던 죽은 여백이 되살아난다. 그래서 예약은 **dual 레이아웃 안에서** 문장 유무에 대해 이뤄진다 — 명세 D4-2 가 금지한 것은 「문장이 없을 때 슬롯을 언마운트하는 것」이고, 이 결정은 거기에 어긋나지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`popular-districts.test.ts` 파일 맨 아래에 추가한다.

```ts
/*
 * 규칙 A·B 가 모두 미해당인 dual 시드 — 조회수 상위 3곳과 지표 상위 3곳의 자치구
 * 집합이 같다. 규칙 A 는 "지표 상위인데 아무도 안 보는 곳"을, 규칙 B 는 "많이 보는데
 * 지표 밖인 곳"을 찾으므로 두 집합이 겹치면 둘 다 걸리지 않고 문장이 null 이 된다.
 */
const createOverlappingRankings = (): AnalysisRankingResponse =>
  createResponse([
    { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
    { rank: 2, areaCode: '11710', areaName: '송파구', viewCount: 987 },
    { rank: 3, areaCode: '11440', areaName: '마포구', viewCount: 654 },
  ])

const createOverlappingTopTen = (): DistrictTopTenResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    footTrafficTopTenItems: [
      {
        districtCode: '11680',
        districtName: '강남구',
        totalFootTraffic: 145_280_452,
        footTrafficChangeRate: 0.7,
      },
      {
        districtCode: '11710',
        districtName: '송파구',
        totalFootTraffic: 120_476_997,
        footTrafficChangeRate: -0.2,
      },
      {
        districtCode: '11440',
        districtName: '마포구',
        totalFootTraffic: 114_208_917,
        footTrafficChangeRate: -1.3,
      },
    ],
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  },
})

describe('PopularDistricts — 인사이트 자리 예약(R2)', () => {
  /*
   * 문장이 없을 때 슬롯을 언마운트하면 그 아래 콘텐츠가 74px 올라온다. 지표를
   * 토글할 때마다 레이아웃이 튀는 원인이라, 색만 투명으로 두고 자리는 남긴다.
   */
  it('문장이 없어도 슬롯은 마운트돼 자리를 예약한다', () => {
    const html = render(createOverlappingRankings(), createOverlappingTopTen())

    expect(html).toContain('aria-live="polite"')
    expect(html).not.toContain('들지 않았습니다')
    expect(html).not.toContain('밖입니다')
  })

  it('문장이 없을 때도 예약 높이는 같다', () => {
    const styles = renderStyles(
      buildElement(createOverlappingRankings(), createOverlappingTopTen()),
    )

    expect(styles).toContain('min-height:74px')
  })

  it('문장이 있으면 같은 슬롯에 문장과 강조 테두리가 함께 온다', () => {
    const element = buildElement(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
      ]),
      createTopTen(),
    )

    expect(renderToStaticMarkup(element)).toContain('들지 않았습니다')

    const styles = renderStyles(element)
    expect(styles).toContain('min-height:74px')
    expect(styles).toContain('var(--color-primary-100)')
  })

  /*
   * 인사이트는 두 순위의 차이를 말하는 문장이다 — 한쪽 열만 있으면 만들어질 수
   * 없으므로 그 분기에서 74px 를 비워 두면 D5-4 가 없앤 죽은 여백이 되살아난다.
   */
  it('한쪽 열만 있는 분기에서는 슬롯 자체를 두지 않는다', () => {
    const html = render(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
      ]),
      createTopTen(false),
    )

    expect(html).toContain('강남구')
    expect(html).not.toContain('aria-live="polite"')
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/popular-districts.test.ts`
Expected: FAIL — `aria-live="polite"` 와 `min-height:74px` 가 아직 없다. (마지막 케이스는 현재도 통과할 수 있다 — 지금은 슬롯 자체가 조건부라서다. 나머지 3건이 빨간 것이 이 단계의 확인 지점이다.)

- [ ] **Step 3: `Insight` 를 `InsightSlot` 으로 교체**

`Insight` styled.p 선언을 지우고 그 자리에 넣는다.

```ts
const InsightSlot = styled.p<{ $visible: boolean }>`
  margin-top: 20px;
  /*
    2줄(line-height 22px × 2) + 상하 패딩(14px × 2) + 테두리(1px × 2) = 74px (D5-5).
    문장이 없을 때도 이 높이를 예약해야 지표를 넘길 때 아래 콘텐츠가 튀지 않는다.
    "가장 좁은 열에서 2줄" 기준이며 모든 브레이크포인트에 같은 값을 쓴다 —
    데스크톱에서 1줄로 끝나 일부가 비어도, 폭마다 다른 예약 높이를 계산하는 것보다
    밀림이 아예 없는 편이 낫다.
  */
  min-height: 74px;
  padding: 14px 16px;
  /*
    테두리를 없애는 대신 transparent 로 둔다 — 2px 를 박스 모델에서 빼지 않아야
    문장이 나타나는 순간 높이가 2px 튀는 것까지 막는다. 색이 투명이라 화면에는
    "빈 상자"가 보이지 않는다.
  */
  border: 1px dashed
    ${props => (props.$visible ? 'var(--color-primary-600)' : 'transparent')};
  border-radius: var(--radius-card);
  background: ${props =>
    props.$visible ? 'var(--color-primary-100)' : 'transparent'};
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-700);
  word-break: keep-all;
`
```

- [ ] **Step 4: 렌더 지점 수정**

`return` 문 안의 `{insight ? <Insight>{insight.sentence}</Insight> : null}` 을 바꾼다. `viewColumn && metricColumn` 판정이 이미 위에 있으므로 그것을 그대로 쓴다.

```tsx
{
  viewColumn && metricColumn ? (
    <Columns>
      {viewColumn}
      {metricColumn}
    </Columns>
  ) : (
    (viewColumn ?? metricColumn)
  )
}
{
  /*
          항상 마운트해 자리를 예약한다(R2). aria-live 는 지표를 넘겨 문장이
          바뀌거나 나타나거나 사라질 때 스크린리더가 그 변화를 읽게 한다.
          두 열이 다 있을 때만 둔다 — 인사이트는 두 순위의 차이를 말하는 문장이라
          솔로 분기에서는 영원히 비어 있을 자리가 된다.
        */
}
{
  viewColumn && metricColumn ? (
    <InsightSlot $visible={insight !== null} aria-live="polite">
      {insight?.sentence ?? null}
    </InsightSlot>
  ) : null
}
```

- [ ] **Step 5: 테스트를 돌려 통과를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/popular-districts.test.ts`
Expected: PASS (신규 4건 + 기존 전부)

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/components/home/popular-districts.tsx frontend/src/components/home/popular-districts.test.ts
git commit -m "[FE] fix: 인사이트 문장 유무로 랭킹 아래가 밀리던 문제 수정"
```

---

## Task 3: 폴백 데이터를 지표당 10개로 확장

**Files:**

- Modify: `frontend/src/lib/home/metric-rankings.ts` (`HOME_METRIC_FALLBACK`)
- Test: `frontend/src/lib/home/metric-rankings.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces: `HOME_METRIC_FALLBACK` 의 각 항목이 `items.length === 10` 을 만족한다. Task 4 가 01단계를 Top10 으로 올릴 때 정상/폴백 개수가 어긋나지 않게 하는 선행 조건이다

**왜 (a) 확장인가(D8-1 결정).** 명세는 (a) 폴백 10개 확장과 (b) 5개 유지 중 (a) 를 권장했고, 실측으로 (a) 가 가능함이 확인됐다 — dev `GET /districts/top-ten` 은 이름 그대로 지표당 **10개**를 주고, 2026-09-04 재조회 결과가 파일에 박힌 2026-09-03 스냅샷과 값까지 동일했다(강남구 유동인구 145,280,452 등). 아래 6~10위 값은 그 응답에서 그대로 옮긴 것이다. **지어낸 숫자를 넣으면 안 된다** — 폴백은 API 장애 시 화면에 그대로 렌더되므로 자릿수가 틀린 숫자는 폴백이 없는 것보다 나쁘다(1차 구현에서 실제로 8배 어긋난 적이 있다).

**변화율 표기 규약.** 기존 5개 항목은 원시 변화율을 소수점 1자리로 손반올림한 값이다(0.6509… → `0.7`). 아래 값도 같은 규약을 따른다. 강동구 유동인구는 원시 0.045 → `0` 이 되는데, `toChangeBadge` 가 `changeRate >= 0` 을 'up' 으로 보므로 실데이터가 왔을 때와 같은 방향 배지가 나온다(실동작과 어긋나지 않는다).

- [ ] **Step 1: 실패하는 테스트 작성**

`metric-rankings.test.ts` 의 `describe('HOME_METRIC_FALLBACK', …)` 블록 안에 추가한다.

```ts
/*
 * 01단계가 Top10 을 그린다(R4). 폴백이 5개면 API 장애 시 화면 행 수가 10 → 5 로
 * 줄어든다. 정상/폴백의 개수를 맞춰 둔다.
 */
it('지표마다 10개를 갖는다', () => {
  for (const entry of HOME_METRIC_FALLBACK) {
    expect(entry.items).toHaveLength(10)
  }
})

it('순위가 1부터 10까지 빠짐없이 이어진다', () => {
  for (const entry of HOME_METRIC_FALLBACK) {
    expect(entry.items.map(item => item.rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
  }
})

/*
 * 지어낸 숫자 방지 가드. 자릿수가 실제와 어긋난 폴백은 폴백이 없는 것보다 나쁘다
 * — dev 실측 스냅샷의 1위 값을 고정해 둔다.
 */
it('실측 스냅샷의 1위 값을 그대로 갖는다', () => {
  const footTraffic = HOME_METRIC_FALLBACK.find(
    entry => entry.metric === 'footTraffic',
  )

  expect(footTraffic?.items[0]).toMatchObject({
    districtCode: '11680',
    districtName: '강남구',
    value: 145_280_452,
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `cd frontend && pnpm vitest run src/lib/home/metric-rankings.test.ts`
Expected: FAIL — `expected length 10, received 5`(앞의 두 케이스). 마지막 케이스는 통과한다(1위는 이미 맞다).

- [ ] **Step 3: 세 지표의 6~10위를 추가**

`HOME_METRIC_FALLBACK` 의 `footTraffic.items` 배열 끝(5위 마포구 뒤)에 붙인다.

```ts
      {
        rank: 6,
        districtCode: '11500',
        districtName: '강서구',
        value: 113_105_133,
        changeRate: 0.4,
      },
      {
        rank: 7,
        districtCode: '11560',
        districtName: '영등포구',
        value: 108_538_800,
        changeRate: 0.4,
      },
      {
        rank: 8,
        districtCode: '11740',
        districtName: '강동구',
        value: 106_643_794,
        // 원시 0.045 — 반올림해 0.0 이다. 보기 좋으라고 부호를 만들지 않는다.
        changeRate: 0,
      },
      {
        rank: 9,
        districtCode: '11230',
        districtName: '동대문구',
        value: 103_704_520,
        changeRate: -3.6,
      },
      {
        rank: 10,
        districtCode: '11380',
        districtName: '은평구',
        value: 98_440_429,
        changeRate: 0.4,
      },
```

`sales.items` 배열 끝에 붙인다.

```ts
      {
        rank: 6,
        districtCode: '11590',
        districtName: '동작구',
        value: 1_354_678_840_981,
        changeRate: -2.1,
      },
      {
        rank: 7,
        districtCode: '11140',
        districtName: '중구',
        value: 1_343_959_637_931,
        changeRate: -5.7,
      },
      {
        rank: 8,
        districtCode: '11230',
        districtName: '동대문구',
        value: 1_339_652_794_774,
        changeRate: 6.5,
      },
      {
        rank: 9,
        districtCode: '11545',
        districtName: '금천구',
        value: 1_294_857_782_250,
        changeRate: 1.2,
      },
      {
        rank: 10,
        districtCode: '11110',
        districtName: '종로구',
        value: 1_105_629_531_377,
        changeRate: -4.9,
      },
```

`opened.items` 배열 끝에 붙인다.

```ts
      {
        rank: 6,
        districtCode: '11650',
        districtName: '서초구',
        value: 637,
        changeRate: -16.9,
      },
      {
        rank: 7,
        districtCode: '11620',
        districtName: '관악구',
        value: 537,
        changeRate: -23.7,
      },
      {
        rank: 8,
        districtCode: '11740',
        districtName: '강동구',
        value: 535,
        changeRate: -31.5,
      },
      {
        rank: 9,
        districtCode: '11140',
        districtName: '중구',
        value: 510,
        changeRate: -23,
      },
      {
        rank: 10,
        districtCode: '11215',
        districtName: '광진구',
        value: 460,
        changeRate: -15.5,
      },
```

> `sales`·`opened` 의 1~5위 값이 위 6~10위와 이어지는지(값이 단조 감소하는지) 확인하고 붙인다. 기존 5위 값보다 큰 6위를 붙이면 순위와 값이 어긋난다. 실측 기준 `sales` 5위는 용산구 1,360,529,337,238, `opened` 5위는 영등포구 709 다.

- [ ] **Step 4: 주석의 개수 표현 갱신**

`HOME_METRIC_FALLBACK` 선언 위 JSDoc 과 `metric-rankings.ts` D3-3 관련 주석에서 「지표당 5개」로 읽히는 문장을 고친다. 스냅샷 날짜도 갱신한다.

```ts
 * 값은 지어낸 숫자가 아니라 dev `GET /districts/top-ten` 2026-09-04 실측 스냅샷이다
 * (2026-09-03 조회와 값이 동일했다). 지어낸 값은 자릿수가 실제와 8배까지 어긋날 수
 * 있다(1차 구현에서 실제로 그랬다) — 폴백이 API 장애 시 화면에 그대로 렌더되므로,
 * 자릿수가 틀린 숫자는 폴백이 없는 것보다 나쁘다. 변화율이 음수인 것도 실측 그대로다
 * — 보기 좋으라고 부호를 바꾸지 않는다.
 *
 * 지표당 **10개**다 — 01단계가 Top10 을 그리므로(R4) 개수를 정상 상태와 맞춘다.
```

- [ ] **Step 5: 테스트를 돌려 통과를 확인**

Run: `cd frontend && pnpm vitest run src/lib/home/metric-rankings.test.ts`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/lib/home/metric-rankings.ts frontend/src/lib/home/metric-rankings.test.ts
git commit -m "[FE] chore: 폴백 지표 데이터를 실측 10개로 확장"
```

---

## Task 4: R4 — 01단계 Top10, 랭킹 우측 Top5 분리

**Files:**

- Modify: `frontend/src/lib/home/metric-rankings.ts` (`HOME_TOP_N` 제거 → 상수 2개 + `toHomeMetricRankings` 시그니처)
- Modify: `frontend/src/components/home/metric-ranking-board.tsx` (호출부)
- Modify: `frontend/src/components/home/popular-districts.tsx` (호출부)
- Test: `frontend/src/lib/home/metric-rankings.test.ts`, `frontend/src/components/home/metric-ranking-board.test.ts`, `frontend/src/components/home/popular-districts.test.ts`

**Interfaces:**

- Consumes: Task 3 의 10개 폴백
- Produces:
  - `toHomeMetricRankings(body: DistrictTopTenSummary, topN: number): HomeMetricRanking[]` — **`topN` 은 필수 인자다**(기본값 없음)
  - `STORY_METRIC_TOP_N = 10`
  - `RANKING_METRIC_TOP_N = 5`

**왜 필수 인자인가.** 기본값을 두면 두 소비자가 다시 하나의 값을 공유하게 되어 R4 가 고치려는 문제(`HOME_TOP_N` 공유)가 재발한다. **랭킹 우측은 반드시 5를 유지한다** — 좌측 조회수 8행과 높이가 어긋나는 문제 외에, `buildRankingInsight` 규칙 B 가 `metric.items.length` 를 읽어 「Top N 밖」 문장을 만들기 때문이다. 10이 되면 문장이 「Top 10 밖」으로 약해지고 성립 확률도 급감해 랭킹 섹션의 핵심 논지가 조용히 무뎌진다.

- [ ] **Step 1: 실패하는 테스트 작성 — 순수 함수**

`metric-rankings.test.ts` 의 기존 시드(`summary`)는 지표당 항목이 1~2개뿐이라 자르기를 검증할 수 없다. 10개 이상을 가진 시드를 추가한다.

```ts
/** 자르기를 검증하려면 topN 보다 많아야 한다 — 12개를 넣는다. */
const wideSummary: DistrictTopTenSummary = {
  footTrafficTopTenItems: Array.from({ length: 12 }, (_, index) => ({
    districtCode: `1100${index}`,
    districtName: `${index + 1}번구`,
    totalFootTraffic: 100_000 - index,
    footTrafficChangeRate: 0,
  })),
  salesTopTenItems: [],
  openedStoreTopTenItems: [],
  closedStoreTopTenItems: [],
}

describe('toHomeMetricRankings — 소비처별 topN(R4)', () => {
  it('topN=10 이면 10개로 자른다', () => {
    const result = toHomeMetricRankings(wideSummary, STORY_METRIC_TOP_N)
    const footTraffic = result.find(entry => entry.metric === 'footTraffic')

    expect(STORY_METRIC_TOP_N).toBe(10)
    expect(footTraffic?.items).toHaveLength(10)
  })

  it('topN=5 이면 5개로 자른다', () => {
    const result = toHomeMetricRankings(wideSummary, RANKING_METRIC_TOP_N)
    const footTraffic = result.find(entry => entry.metric === 'footTraffic')

    expect(RANKING_METRIC_TOP_N).toBe(5)
    expect(footTraffic?.items).toHaveLength(5)
  })

  /*
   * 규칙 B 문장이 "Top {metric.items.length} 밖" 을 읽는다 — 랭킹 우측이 10이 되면
   * 문장이 약해지고 발동 확률도 급감한다. 두 값이 갈려 있다는 사실 자체를 고정한다.
   */
  it('01단계와 랭킹 우측은 서로 다른 개수를 쓴다', () => {
    expect(STORY_METRIC_TOP_N).not.toBe(RANKING_METRIC_TOP_N)
  })
})
```

import 에 새 상수를 추가한다.

```ts
import {
  HOME_METRIC_FALLBACK,
  RANKING_METRIC_TOP_N,
  STORY_METRIC_TOP_N,
  toHomeMetricRankings,
} from '@/lib/home/metric-rankings'
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `cd frontend && pnpm vitest run src/lib/home/metric-rankings.test.ts`
Expected: FAIL — `STORY_METRIC_TOP_N`·`RANKING_METRIC_TOP_N` 을 export 하지 않아 import 에서 죽는다.

- [ ] **Step 3: `metric-rankings.ts` 수정**

`const HOME_TOP_N = 5` 선언과 그 위 주석을 지우고 대체한다.

```ts
/** 01단계(스토리) 전용. 패널 가용 높이 536px 에 10행(384px)이 152px 여유로 들어간다. */
export const STORY_METRIC_TOP_N = 10

/**
 * 랭킹 섹션 우측 전용. 기존 `HOME_TOP_N` 을 용도가 드러나게 개명한 것이다.
 *
 * **10 으로 올리지 말 것.** 좌측 조회수 8행과 높이가 어긋나는 것 외에,
 * `buildRankingInsight` 규칙 B 가 `metric.items.length` 를 읽어 「{지표} Top N 밖」
 * 문장을 만든다 — 10이 되면 문장이 약해지고 성립 확률도 급감해 이 섹션의 논지
 * (「보는 곳과 숫자가 좋은 곳은 다르다」)가 조용히 무뎌진다.
 */
export const RANKING_METRIC_TOP_N = 5
```

`toHomeMetricRankings` 를 고친다.

```ts
/**
 * `top-ten` 응답을 홈이 쓰는 모양으로 옮긴다.
 *
 * 값·변화율 계산은 `normalizeStatusTopTen` 이 이미 한다 — 여기서 다시 하지 않는다.
 * 홈에서 따로 포맷하면 같은 숫자가 `/status` 와 홈에서 다르게 보이는 날이 온다.
 *
 * `topN` 은 **기본값이 없는 필수 인자**다. 기본값을 두면 두 소비자(01단계·랭킹 우측)가
 * 다시 하나의 값을 공유하게 되어 R4 가 고치려는 문제가 재발한다.
 */
export const toHomeMetricRankings = (
  body: DistrictTopTenSummary,
  topN: number,
): HomeMetricRanking[] => {
  const normalized = normalizeStatusTopTen(body)

  return HOME_METRICS.map(metric => ({
    metric,
    label: METRIC_LABELS[metric],
    items: normalized[metric].slice(0, topN),
  }))
}
```

- [ ] **Step 4: 두 호출부 수정**

`metric-ranking-board.tsx`:

```ts
import {
  HOME_METRICS,
  HOME_METRIC_FALLBACK,
  STORY_METRIC_TOP_N,
  homeMetricLabel,
  toHomeMetricRankings,
  type HomeMetric,
} from '@/lib/home/metric-rankings'
```

```ts
const rankingsFromApi =
  query.data && isApiSuccess(query.data)
    ? toHomeMetricRankings(query.data.dataBody, STORY_METRIC_TOP_N)
    : null
```

`popular-districts.tsx`:

```ts
import {
  toHomeMetricRankings,
  HOME_METRICS,
  RANKING_METRIC_TOP_N,
  homeMetricLabel,
  type HomeMetric,
} from '@/lib/home/metric-rankings'
```

```ts
const metricRankings =
  metricQuery.data && isApiSuccess(metricQuery.data)
    ? toHomeMetricRankings(metricQuery.data.dataBody, RANKING_METRIC_TOP_N)
    : null
```

- [ ] **Step 5: 기존 1인자 호출 수정**

`metric-rankings.test.ts` 의 기존 케이스들이 `toHomeMetricRankings(summary)` 로 부른다. 전부 두 번째 인자를 준다 — 기존 케이스의 관심사는 「3지표만 낸다」·「closed 없음」 이므로 `RANKING_METRIC_TOP_N` 을 넘겨 의미를 바꾸지 않는다.

Run: `cd frontend && rg -n 'toHomeMetricRankings\(' src` 로 남은 1인자 호출이 없는지 확인한다.

- [ ] **Step 6: 컴포넌트 테스트 추가 — 두 화면의 행 수가 다르다**

`metric-ranking-board.test.ts` 에 추가한다. 12개 항목을 가진 top-ten 시드를 캐시에 심고 `<li` 개수를 센다.

```ts
/*
 * 01단계는 Top10 이다(R4). 패널 가용 높이 536px 에 10행(384px)이 들어간다는
 * 실측 근거로 올린 값이라, 5로 되돌아가면 그 판단이 조용히 사라진다.
 */
it('01단계는 10행을 그린다', () => {
  const html = renderBoard(createWideTopTen())

  expect((html.match(/<li/g) ?? []).length).toBe(10)
})
```

`popular-districts.test.ts` 에 추가한다.

```ts
/*
 * 같은 응답을 받아도 랭킹 우측은 5행이다 — 좌측 조회수 8행과의 높이,
 * 그리고 규칙 B 의 「Top 5 밖」 문장을 지키기 위한 분리다(R4).
 */
it('랭킹 우측은 같은 응답에서도 5행만 그린다', () => {
  const html = render(
    createResponse([
      { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
    ]),
    createWideTopTen(),
  )

  const metricSection = html.slice(html.indexOf('상위 자치구'))
  expect((metricSection.match(/<li/g) ?? []).length).toBe(5)
})
```

> 두 파일 각각에 `createWideTopTen()`(footTraffic 12개, 나머지 지표 빈 배열) 헬퍼를 둔다. `metric-ranking-board.test.ts` 의 기존 렌더 헬퍼 이름은 파일을 열어 확인하고 그대로 쓴다 — 위 `renderBoard` 는 자리표시자가 아니라 **그 파일의 기존 헬퍼 이름으로 바꿔 부르라는 뜻**이다.

- [ ] **Step 7: 테스트를 돌려 통과를 확인**

Run: `cd frontend && pnpm test`
Expected: PASS. 폴백 분기 테스트(선택 지표가 빈 배열)는 이제 5개가 아니라 10행을 기대해야 한다 — Task 3 으로 폴백이 10개가 됐으므로 해당 케이스의 기대값을 함께 고친다.

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/lib/home/metric-rankings.ts frontend/src/lib/home/metric-rankings.test.ts frontend/src/components/home/metric-ranking-board.tsx frontend/src/components/home/metric-ranking-board.test.ts frontend/src/components/home/popular-districts.tsx frontend/src/components/home/popular-districts.test.ts
git commit -m "[FE] feat: 01단계를 Top10 으로 올리고 랭킹 우측은 Top5 로 분리한다"
```

---

## Task 5: R6 — 카운터 4노드를 화살표로 잇는다

**Files:**

- Modify: `frontend/src/components/home/funnel-counter.tsx`
- Test: `frontend/src/components/home/funnel-counter.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces: 없음(내부 시각 변경)

**색은 쓰지 않는다.** 그라데이션은 `DESIGN.md` 가 `home-page.tsx` 에 대해 grep 무결과를 요구하고, 노드별 고유색도 쓰지 않는다 — 네 노드는 같은 흐름의 **국면**이지 서로 다른 범주가 아니라서 색을 다르게 칠하면 없는 의미 차이를 암시한다. 게다가 활성 노드 강조(`$active`)가 이미 `--color-primary-700` 테두리 + `--color-primary-100` 배경을 쓰므로 노드별 색을 더하면 「활성 강조색」과 「카테고리색」이 한 노드 위에서 충돌한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`funnel-counter.test.ts` 에 추가한다. `ServerStyleSheet` import 가 없으면 추가한다.

```ts
describe('FunnelCounter — 노드 연결(R6)', () => {
  /*
   * 4노드가 서로 무관한 박스 4개처럼 보였다. 흐름을 보여주는 건 화살표만이고,
   * 의미는 이미 <ol> 순서와 aria-current 가 나른다 — 그래서 순수 장식이다.
   */
  it('노드 사이에 화살표를 3개 둔다(4노드 사이니까 3개)', () => {
    const html = renderCounter()

    expect((html.match(/lucide-arrow-right/g) ?? []).length).toBe(3)
  })

  it('화살표는 접근성 트리에서 감춘다', () => {
    const html = renderCounter()

    // 이 컴포넌트에서 aria-hidden 을 쓰는 것은 화살표뿐이다.
    expect((html.match(/aria-hidden="true"/g) ?? []).length).toBe(3)
  })

  it('2열로 접히는 폭에서는 화살표를 숨긴다', () => {
    const styles = renderCounterStyles()

    // 2열이 되면 1→2 오른쪽, 2→3 아래-왼쪽, 3→4 오른쪽으로 방향이 깨진다.
    expect(styles).toContain('@media (max-width:640px)')
    expect(styles).toContain('display:none')
  })

  /*
   * DESIGN.md 는 재무 데이터 표시에 장식을 더하지 말라고 못 박고, home-page.tsx 에
   * 대해 gradient grep 무결과를 요구한다. 「더 강조하고 싶다」가 색으로 새지 않게
   * 가드를 둔다.
   */
  it('그라데이션을 쓰지 않는다', () => {
    expect(renderCounter() + renderCounterStyles()).not.toContain('gradient')
  })
})
```

> `renderCounter()`·`renderCounterStyles()` 는 이 파일의 기존 렌더 방식(`createElement(FunnelCounter, { selection, recommend })`)을 감싼 지역 헬퍼로 만든다. 기본 렌더는 `active` 를 주지 않는 스택 모드 형태로도 화살표가 나와야 한다 — 화살표는 활성 강조와 무관한 정적 장식이다.

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/funnel-counter.test.ts`
Expected: FAIL — `lucide-arrow-right` 가 0개다.

- [ ] **Step 3: 스타일 추가**

`List` 를 고친다.

```ts
const List = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  /* row-gap 은 그대로 8px, column-gap 만 넓혀 화살표가 놓일 자리를 만든다. */
  gap: 8px 20px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    /* 2열에서는 화살표를 숨기므로 넓힌 열 간격도 원래대로 되돌린다. */
    gap: 8px;
  }
`
```

`Node` 에 `position: relative;` 를 추가한다(선언 첫 줄 `display: grid;` 위나 아래 어디든).

`Node` 선언 뒤에 `Connector` 를 추가한다.

```ts
/**
 * 노드 사이 방향 화살표. `<ol>` 의 자식은 `<li>` 여야 유효하므로 별도 리스트 항목이
 * 아니라 **각 노드(마지막 제외) 안에 절대 위치로** 넣는다.
 *
 * 순수 장식이다 — 순서의 의미는 `<ol>` 과 `aria-current="step"` 이 이미 나른다.
 */
const Connector = styled.span`
  position: absolute;
  top: 50%;
  right: -20px;
  transform: translate(50%, -50%);
  display: flex;
  color: var(--color-border-300);

  @media (max-width: 640px) {
    display: none;
  }
`
```

- [ ] **Step 4: 앞 세 노드에 화살표 삽입**

import 에 추가한다.

```ts
import { ArrowRight } from 'lucide-react'
```

01·02·03 노드의 닫는 `</Node>` 바로 앞에 넣는다(04 노드에는 넣지 않는다).

```tsx
<Connector aria-hidden="true">
  <ArrowRight size={16} />
</Connector>
```

- [ ] **Step 5: 테스트를 돌려 통과를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/funnel-counter.test.ts`
Expected: PASS

> `@media (max-width:640px)` 의 공백 형식은 styled-components 출력에 따라 다를 수 있다. FAIL 이면 실제 `getStyleTags()` 출력을 찍어 보고 단언 문자열을 그 출력에 맞춘다 — 값을 바꾸지 말고 표기만 맞춘다.

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/components/home/funnel-counter.tsx frontend/src/components/home/funnel-counter.test.ts
git commit -m "[FE] feat: 카운터 4노드를 화살표로 이어 흐름으로 읽히게 한다"
```

- [ ] **Step 7: 슬라이스 1 전체 검증**

Run: `cd frontend && pnpm test && pnpm qa:verify`
Expected: 전부 통과.

Run: `cd frontend && rg -n "linear-gradient|radial-gradient|backdrop-filter|glassmorphism" src/components/home/home-page.tsx`
Expected: 무결과. (범위를 `src/components/home` 전체로 넓히지 말 것 — 히어로 글래스가 의도적으로 `backdrop-filter` 를 쓴다.)

---

# 슬라이스 2 — R5 손익 그래프

## Task 6: R5 — 세로 막대 5개를 가로 100% 스택 바로 바꾸고 개명한다

**Files:**

- Create: `frontend/src/components/home/cost-breakdown-bar.tsx`
- Create: `frontend/src/components/home/cost-breakdown-bar.test.ts`
- Delete: `frontend/src/components/home/cost-waterfall.tsx`, `frontend/src/components/home/cost-waterfall.test.ts`
- Modify: `frontend/src/components/home/product-story.tsx` (import·`DemoPanel` 반환·298행 주석)

**Interfaces:**

- Consumes: 없음
- Produces:
  - `default function CostBreakdownBar(): JSX.Element`
  - `export const segmentShare = (amount: number, total: number): number` — 소수점 1자리 백분율

**진단이 요청보다 크다.** 이름은 워터폴인데 렌더는 독립 막대 5개다. 워터폴의 정의적 특징(각 막대가 앞 막대가 끝난 지점에서 시작하고 연결선이 잔액을 보여주는 것)이 없어서 `4,200 − 1,050 − 1,200 − 350 = 1,600` 이라는 **관계가 화면에 존재하지 않고 독자가 암산해야 한다.** 「보기 안 좋다」의 원인은 색이나 형태가 아니라 이 관계의 부재다.

**개명 근거(D8-7).** 사용처가 `product-story.tsx` 한 곳(import + `DemoPanel` 반환)과 자기 테스트뿐이라 변경 비용이 낮다. 명세 D8-7 은 사용처를 `story-steps.ts` 라고 적었지만 **실제로는 `product-story.tsx:284` 다** — `story-steps.ts` 는 `demo` 키 문자열만 갖고 컴포넌트를 모르므로 개명 영향이 없다.

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/components/home/cost-breakdown-bar.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import CostBreakdownBar, {
  segmentShare,
} from '@/components/home/cost-breakdown-bar'

const render = () => renderToStaticMarkup(createElement(CostBreakdownBar))

describe('segmentShare', () => {
  /*
   * 네 세그먼트를 합치면 매출과 정확히 같다 — 이것이 세로 막대 5개와의 핵심
   * 차이다. 반올림 후에도 합이 100.0 이어야 폭 배분이 어긋나지 않는다.
   */
  it('만원 단위 예시를 소수점 1자리 백분율로 바꾼다', () => {
    expect(segmentShare(1050, 4200)).toBe(25)
    expect(segmentShare(1200, 4200)).toBe(28.6)
    expect(segmentShare(350, 4200)).toBe(8.3)
    expect(segmentShare(1600, 4200)).toBe(38.1)
  })

  it('네 세그먼트 비율의 합이 100 이다', () => {
    const total = 4200
    const sum = [1050, 1200, 350, 1600].reduce(
      (acc, amount) => acc + segmentShare(amount, total),
      0,
    )

    expect(sum).toBeCloseTo(100, 1)
  })
})

describe('CostBreakdownBar', () => {
  it('매출을 전체로 두고 비용 3항목과 순이익을 세그먼트로 나눈다', () => {
    const html = render()

    for (const label of ['월매출', '임차료', '인건비', '기타', '순이익']) {
      expect(html).toContain(label)
    }
  })

  it('금액 단위는 만원이다', () => {
    // 시뮬레이션 Feature 규약.
    expect(render()).toContain('만원')
  })

  it('합계가 맞는다', () => {
    // 4,200 - 1,050 - 1,200 - 350 = 1,600
    const html = render()

    expect(html).toContain('4,200')
    expect(html).toContain('1,600')
  })

  it('예시 데이터임을 계속 밝힌다', () => {
    expect(render()).toContain('대표 예시 데이터')
  })

  /*
   * 의미는 role="img" 의 aria-label 하나가 전담한다 — 세그먼트·범례를 각각
   * 읽히게 하면 같은 숫자를 세 번 듣는다(기존 패턴 유지).
   */
  it('그래프 전체를 한 문장으로 읽힌다', () => {
    expect(render()).toContain('role="img"')
    expect(render()).toContain(
      '월 손익 구조 예시. 월매출 4,200만원에서 임차료·인건비·기타를 빼면 순이익 1,600만원입니다.',
    )
  })

  /*
   * 카테고리 3개에 억지로 3가지 색을 배정하지 않는다(R6 과 같은 원칙). 비용은
   * 한 색, 순이익은 한 색 — 두 가지만 쓴다.
   */
  it('색은 비용·순이익 두 가지만 쓴다', () => {
    const html = render()

    expect((html.match(/--color-border-200/g) ?? []).length).toBe(3)
    expect((html.match(/--color-primary-600/g) ?? []).length).toBe(1)
  })
})
```

> 마지막 케이스는 세그먼트 색을 인라인 `style` 로 걸 때만 문자열에 나타난다. `$kind` 기반 styled CSS 로 걸면 마크업에 안 나오므로, **폭과 색을 함께 인라인 style 로 건다**(저장소 규약: styled 의 `$prop` CSS 는 문자열 출력에 안 나오므로 색은 인라인 style 로 건다). 범례 스와치도 같은 방식이라 개수가 3/1 이 아니라 6/2 가 되면 단언 수를 실제 렌더에 맞춰 고친다 — 색이 **두 종류뿐**이라는 것이 지켜야 할 불변식이다.

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/cost-breakdown-bar.test.ts`
Expected: FAIL — 모듈이 없다.

- [ ] **Step 3: 새 컴포넌트 작성**

`frontend/src/components/home/cost-breakdown-bar.tsx`:

```tsx
'use client'

import styled from 'styled-components'

/**
 * 대표 예시 수치 — 실데이터가 아니다.
 *
 * 실 API 를 쓰지 않는 이유: `POST /simulations/reports` 는 쓰기 동사이고
 * `store-sizes` GET 이 선행돼야 해서, 랜딩 방문자마다 계산 요청이 나간다.
 * 데모 하나가 치를 값이 아니다.
 */
const REVENUE = 4200

/**
 * 매출이 어디로 가는가. **넷을 합치면 매출과 정확히 같다** — 매출은 또 하나의
 * 세그먼트가 아니라 막대의 "전체"이므로 헤더로 따로 적는다.
 *
 * 이전 구현(`CostWaterfall`)은 이름만 워터폴이고 렌더는 독립 막대 5개였다.
 * 각 막대가 앞 막대가 끝난 지점에서 시작하지 않아 4,200 − 1,050 − 1,200 − 350
 * = 1,600 이라는 관계가 화면에 없었고, 독자가 암산해야 했다.
 */
const SEGMENTS = [
  { key: 'rent', label: '임차료', amount: 1050, kind: 'cost' },
  { key: 'labor', label: '인건비', amount: 1200, kind: 'cost' },
  { key: 'etc', label: '기타', amount: 350, kind: 'cost' },
  { key: 'net', label: '순이익', amount: 1600, kind: 'net' },
] as const

const COST_COLOR = 'var(--color-border-200)'
const NET_COLOR = 'var(--color-primary-600)'

const segmentColor = (kind: 'cost' | 'net'): string =>
  kind === 'net' ? NET_COLOR : COST_COLOR

/** 소수점 1자리 백분율. 반올림 후에도 네 값의 합이 100.0 이다. */
export const segmentShare = (amount: number, total: number): number =>
  Math.round((amount / total) * 1000) / 10

const Wrap = styled.div`
  display: grid;
  gap: 10px;
`

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`

const HeadLabel = styled.span`
  font-size: 12px;
  color: var(--color-text-600);
`

const HeadAmount = styled.span`
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-900);
`

const Bar = styled.div`
  display: flex;
  height: 40px;
  border-radius: var(--radius-control);
  overflow: hidden;
`

/*
  비용 3항목은 색이 아니라 1px 구분선과 아래 범례 순서로 구분한다 — 카테고리
  3개에 억지로 3가지 색을 배정하지 않는다. 마지막 세그먼트에는 구분선을 두지
  않는다(막대 오른쪽 끝에 선이 남는다).
*/
const Segment = styled.span`
  display: block;
  height: 100%;
  border-right: 1px solid var(--color-surface);

  &:last-child {
    border-right: none;
  }
`

/* 범례 순서는 세그먼트 순서와 같다 — 다르면 위치 대응이 깨진다. */
const Legend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const LegendItem = styled.li`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-600);
`

const Swatch = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 2px;
`

const LegendAmount = styled.span`
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-700);
`

const LegendShare = styled.span`
  font-variant-numeric: tabular-nums;
  color: var(--color-text-caption);
`

const Caption = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--color-text-caption);
`

export default function CostBreakdownBar() {
  return (
    <Wrap>
      <Head aria-hidden="true">
        <HeadLabel>월매출</HeadLabel>
        <HeadAmount>{REVENUE.toLocaleString('ko-KR')}만원</HeadAmount>
      </Head>
      <Bar
        role="img"
        aria-label="월 손익 구조 예시. 월매출 4,200만원에서 임차료·인건비·기타를 빼면 순이익 1,600만원입니다."
      >
        {SEGMENTS.map(segment => (
          <Segment
            key={segment.key}
            aria-hidden="true"
            style={{
              width: `${segmentShare(segment.amount, REVENUE)}%`,
              background: segmentColor(segment.kind),
            }}
          />
        ))}
      </Bar>
      {/* 라벨을 막대 밖에 두면 「기타」가 8.3% 로 얇아도 읽힌다(세로 막대에서는
          그 막대 자체가 13px 였다). */}
      <Legend aria-hidden="true">
        {SEGMENTS.map(segment => (
          <LegendItem key={segment.key}>
            <Swatch style={{ background: segmentColor(segment.kind) }} />
            {segment.label}
            <LegendAmount>
              {segment.amount.toLocaleString('ko-KR')}
            </LegendAmount>
            <LegendShare>
              {segmentShare(segment.amount, REVENUE).toFixed(1)}%
            </LegendShare>
          </LegendItem>
        ))}
      </Legend>
      <Caption>단위: 만원 · 대표 예시 데이터</Caption>
    </Wrap>
  )
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/cost-breakdown-bar.test.ts`
Expected: PASS. 색 개수 단언이 6/2 로 나오면(스와치까지 세어서) 실제 값으로 고친다 — 두 종류뿐이라는 불변식만 지킨다.

- [ ] **Step 5: 호출부 교체 후 옛 파일 삭제**

`product-story.tsx`:

```ts
import CostBreakdownBar from '@/components/home/cost-breakdown-bar'
```

```tsx
return <CostBreakdownBar />
```

298행 주석의 `CostWaterfall` 을 `CostBreakdownBar` 로 고친다.

```bash
git rm frontend/src/components/home/cost-waterfall.tsx frontend/src/components/home/cost-waterfall.test.ts
```

Run: `cd frontend && rg -n 'CostWaterfall|cost-waterfall' src app docs`
Expected: `docs/features/**` 명세의 서술만 남는다(그건 이력이라 그대로 둔다). `src`·`app` 에는 무결과.

- [ ] **Step 6: 전체 테스트 + 정적 검증**

Run: `cd frontend && pnpm test && pnpm qa:verify`
Expected: 전부 통과. `product-story.test.ts` 의 「대표 예시 데이터」 단언은 새 컴포넌트도 그 캡션을 유지하므로 그대로 통과한다.

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/components/home/cost-breakdown-bar.tsx frontend/src/components/home/cost-breakdown-bar.test.ts frontend/src/components/home/product-story.tsx
git commit -m "[FE] feat: 손익 그래프를 매출 대비 가로 스택 바로 바꾼다"
```

---

# 슬라이스 3 — R1 랭킹 스크롤 전환

> 이 슬라이스는 **자동 검증만으로 끝낼 수 없다.** 브라우저 pane 이 숨겨져 있으면 스크롤 이벤트가 스로틀되고 `IntersectionObserver` 콜백이 오지 않는다. Task 9 의 Step 8(사람 눈 확인)은 생략 가능한 단계가 아니다.

## Task 7: `useStackedMode` 를 공용 훅으로 추출

**Files:**

- Create: `frontend/src/hooks/use-stacked-mode.ts`
- Modify: `frontend/src/components/home/product-story.tsx` (로컬 `useStackedMode` 제거 → import)

**Interfaces:**

- Consumes: 없음
- Produces: `useStackedMode(): boolean` — `prefers-reduced-motion: reduce` 이거나 뷰포트 폭 ≤768px 이면 `true`. Task 9 가 같은 훅을 import 한다

**왜 추출인가(D8-3).** R1 조건②가 스토리와 **정확히 같은** 판정을 요구한다. 각자 다시 작성하면 두 판정 기준이 시간이 지나며 갈리고, 한쪽만 고쳐지는 사고가 난다.

> 이 태스크에는 **새 유닛 테스트를 두지 않는다.** 훅은 `window.matchMedia` 와 `useEffect` 에 의존하고 이 저장소는 jsdom 없이 node 환경에서 SSR 문자열만 검증한다 — 훅을 실행할 수 있는 층이 없다. 순수 이동이므로 안전망은 ① 기존 `product-story.test.ts` 가 계속 스티키 분기를 렌더하는 것(초기값 `false` 가 유지된다는 증거) ② typecheck·build 다. 테스트를 지어내는 대신 이 사실을 명시한다.

- [ ] **Step 1: 이동 전 기준선 확보**

Run: `cd frontend && pnpm vitest run src/components/home/product-story.test.ts`
Expected: PASS (전부). 이 초록이 이동 후 비교 기준이다.

- [ ] **Step 2: 훅 파일 생성**

`frontend/src/hooks/use-stacked-mode.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'

/**
 * "스택 모드" 판정 — `prefers-reduced-motion: reduce` 이거나 뷰포트 폭 ≤768px.
 *
 * 초기값 `false` 로 SSR·첫 렌더는 항상 스티키 모드다(hydration 일치). 마운트 후에만
 * `true` 가 될 수 있다.
 *
 * `product-story.tsx` 안의 비공개 함수였다. 랭킹 섹션(`popular-districts.tsx`)의
 * 스크롤 트랙 폴백이 스토리와 **정확히 같은** 기준을 써야 해서 공용으로 뽑았다 —
 * 각자 다시 작성하면 두 판정 기준이 갈릴 위험이 있다(interaction-polish D8-3).
 */
export function useStackedMode(): boolean {
  const [stacked, setStacked] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const narrow = window.matchMedia('(max-width: 768px)')
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
```

- [ ] **Step 3: `product-story.tsx` 에서 로컬 함수 제거**

324-341행의 `useStackedMode` 함수와 그 위 주석 2줄을 지우고 import 를 추가한다.

```ts
import { useStackedMode } from '@/hooks/use-stacked-mode'
```

`useState` import 는 남긴다(`selection`·`storyInView` 가 계속 쓴다). `useEffect` 도 `IntersectionObserver` 블록이 계속 쓴다.

- [ ] **Step 4: 기준선과 같은지 확인**

Run: `cd frontend && pnpm vitest run src/components/home/product-story.test.ts && pnpm typecheck`
Expected: Step 1 과 동일하게 PASS. `useState`·`useEffect` 가 미사용이 되면 lint 가 잡는다.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/hooks/use-stacked-mode.ts frontend/src/components/home/product-story.tsx
git commit -m "[FE] refactor: 스택 모드 판정을 공용 훅으로 뽑는다"
```

---

## Task 8: pin 구간 클램프를 순수 함수로 뽑는다

**Files:**

- Modify: `frontend/src/components/home/scroll-fill.ts`
- Create: `frontend/src/components/home/scroll-to-pinned-step.ts`
- Modify: `frontend/src/components/home/product-story.tsx` (`scrollToStep`)
- Test: `frontend/src/components/home/scroll-fill.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces:
  - `pinnedStepProgress(index: number, stepCount: number, trackHeight: number, viewportHeight: number, margin?: number): number`
  - `scrollToPinnedStep(el: HTMLElement, index: number, stepCount: number): void`

**왜 공용화인가.** pin 구간 클램프 공식이 두 곳에서 따로 틀리면 한쪽만 고쳐지는 사고가 난다(명세 D4-6 조건①). 계산은 순수 함수로 떼어 테스트하고, DOM 읽기·`window.scrollTo` 는 얇은 래퍼가 맡는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`scroll-fill.test.ts` 에 추가한다.

```ts
describe('pinnedStepProgress', () => {
  /*
   * useScrollProgress 의 진행도 정의: progress = (vh - top) / (H + vh).
   * 스티키가 실제로 pin 되는 구간은 progress ∈ [vh/(H+vh), H/(H+vh)] 이므로,
   * 스텝 중앙 목표를 그 범위로 클램프해야 트랙 위/아래로 튀지 않는다.
   */
  it('스토리(4스텝, 3600px 트랙, 900px 뷰포트)의 첫·끝 스텝을 pin 구간으로 클램프한다', () => {
    // denom 4500 → pinStart 0.2, pinEnd 0.8, margin 0.02
    expect(pinnedStepProgress(0, 4, 3600, 900)).toBeCloseTo(0.22, 5)
    expect(pinnedStepProgress(3, 4, 3600, 900)).toBeCloseTo(0.78, 5)
  })

  it('가운데 스텝은 중앙값을 그대로 쓴다', () => {
    expect(pinnedStepProgress(1, 4, 3600, 900)).toBeCloseTo(0.375, 5)
    expect(pinnedStepProgress(2, 4, 3600, 900)).toBeCloseTo(0.625, 5)
  })

  /*
   * 랭킹 섹션은 지표 3종 → 2700px 트랙이다(300dvh, 900px 뷰포트 기준).
   * 같은 공식이 스텝 수와 트랙 높이만 달라져도 성립해야 한다.
   */
  it('랭킹(3지표, 2700px 트랙)에도 같은 공식이 성립한다', () => {
    // denom 3600 → pinStart 0.25, pinEnd 0.75
    expect(pinnedStepProgress(0, 3, 2700, 900)).toBeCloseTo(0.27, 5)
    expect(pinnedStepProgress(1, 3, 2700, 900)).toBeCloseTo(0.5, 5)
    expect(pinnedStepProgress(2, 3, 2700, 900)).toBeCloseTo(0.73, 5)
  })

  it('높이가 0이면 0을 낸다(0 나눗셈 방지)', () => {
    expect(pinnedStepProgress(0, 3, 0, 0)).toBe(0)
    expect(pinnedStepProgress(0, 0, 2700, 900)).toBe(0)
  })
})
```

import 를 갱신한다.

```ts
import {
  activeStepFromProgress,
  filledWordCount,
  pinnedStepProgress,
  viewportProgress,
} from '@/components/home/scroll-fill'
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/scroll-fill.test.ts`
Expected: FAIL — `pinnedStepProgress` 를 export 하지 않는다.

- [ ] **Step 3: 순수 함수 추가**

`scroll-fill.ts` 맨 아래에 추가한다.

```ts
/**
 * 스텝 중앙 목표를 스티키가 실제로 pin 되는 progress 구간으로 클램프한다.
 *
 * progress 정의는 `viewportProgress` 와 같다: (vh - top) / (H + vh).
 * pin 구간은 [vh/(H+vh), H/(H+vh)] 이므로 그 밖으로 나가면 트랙 위/아래로 튄다.
 *
 * 스토리(4스텝)와 랭킹 섹션(3지표)이 **같은 공식을 공유**한다 — 두 곳에서 따로
 * 계산하면 한쪽만 고쳐지는 사고가 난다.
 */
export function pinnedStepProgress(
  index: number,
  stepCount: number,
  trackHeight: number,
  viewportHeight: number,
  margin = 0.02,
): number {
  const denom = trackHeight + viewportHeight
  if (denom <= 0 || stepCount <= 0) return 0

  const pinStart = viewportHeight / denom
  const pinEnd = trackHeight / denom
  const center = (index + 0.5) / stepCount

  return Math.min(pinEnd - margin, Math.max(pinStart + margin, center))
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/scroll-fill.test.ts`
Expected: PASS

- [ ] **Step 5: DOM 래퍼 생성**

`frontend/src/components/home/scroll-to-pinned-step.ts`:

```ts
'use client'

import { pinnedStepProgress } from '@/components/home/scroll-fill'

/**
 * 스텝 인덱스가 화면 중앙에 오도록 스크롤한다. 계산은 `pinnedStepProgress` 가 하고
 * 여기서는 DOM 읽기와 `window.scrollTo` 만 한다.
 *
 * `behavior: 'smooth'` 는 애니메이션이 끝나기까지 몇 프레임이 걸리고 그동안 활성
 * 스텝이 스크롤 이벤트에 맞춰 점진적으로 갱신된다 — 스토리가 이미 갖고 있던 특성이라
 * 새로 도입하는 결함이 아니다.
 */
export function scrollToPinnedStep(
  el: HTMLElement,
  index: number,
  stepCount: number,
): void {
  const vh = window.innerHeight
  const trackHeight = el.offsetHeight
  const trackTop = el.getBoundingClientRect().top + window.scrollY
  const denom = trackHeight + vh
  const targetProgress = pinnedStepProgress(index, stepCount, trackHeight, vh)
  const target = targetProgress * denom - vh + trackTop
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  window.scrollTo({
    top: Math.max(0, target),
    behavior: reduce ? 'auto' : 'smooth',
  })
}
```

- [ ] **Step 6: `product-story.tsx` 의 `scrollToStep` 을 래퍼로 교체**

406-432행의 `scrollToStep` 본문과 그 위 주석 4줄을 대체한다.

```ts
// 스텝 클릭 시 해당 스텝 구간의 중앙으로 스크롤한다.
// pin 구간 클램프 공식은 랭킹 섹션과 공유한다(scroll-to-pinned-step.ts).
const scrollToStep = (index: number) => {
  const el = trackRef.current
  if (!el) return
  scrollToPinnedStep(el, index, STORY_STEPS.length)
}
```

import 를 추가한다.

```ts
import { scrollToPinnedStep } from '@/components/home/scroll-to-pinned-step'
```

- [ ] **Step 7: 전체 테스트 + 정적 검증**

Run: `cd frontend && pnpm test && pnpm qa:verify`
Expected: 전부 통과.

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/components/home/scroll-fill.ts frontend/src/components/home/scroll-fill.test.ts frontend/src/components/home/scroll-to-pinned-step.ts frontend/src/components/home/product-story.tsx
git commit -m "[FE] refactor: pin 구간 클램프를 순수 함수로 뽑아 공유한다"
```

---

## Task 9: R1 — 랭킹 섹션 300dvh 트랙 + 스크롤 지표 전환

**Files:**

- Modify: `frontend/src/components/home/popular-districts.tsx`
- Test: `frontend/src/components/home/popular-districts.test.ts`

**Interfaces:**

- Consumes: `HEADER_HEIGHT`(Task 1), `useStackedMode`(Task 7), `scrollToPinnedStep`(Task 8), `activeStepFromProgress`·`useScrollProgress`(기존)
- Produces: 없음

**적용 범위(스코프 한정).** 300dvh 트랙은 **`dual`(좌우 두 열이 최종적으로 있을 것) 이고 `stacked` 가 아닐 때만** 적용한다. 좌측 열 없이 우측 지표 하나만 300dvh 를 핀 고정하면 비교 맥락(「보는 곳」)이 없어 서사가 성립하지 않는다. 실패·솔로 분기는 기존 렌더를 그대로 쓴다.

**⚠️ 훅 순서와 계산 순서를 바꿔야 한다.** `useScrollTrack` 은 `viewWillExist`/`metricWillExist` 에 의존하고, 이 둘은 현재 **조기 반환(`if (!view && !activeMetric)`) 뒤에** 계산된다. 그런데 `metric` 은 조기 반환 **앞의** `activeMetric` 계산에 필요하다. 다음 순서로 재배치한다.

```
1. 두 쿼리
2. 훅: useState(pickedMetric), useRef(trackRef), useScrollProgress(trackRef), useStackedMode()
      ← 훅은 전부 조기 반환 앞에 있어야 한다
3. rawView / view
4. metricRankings
5. hasMetricData
6. viewPending / metricPending / viewWillExist / metricWillExist / dual / useScrollTrack   ← 위로 올린다
7. scrollIndex / metric
8. activeMetric / insight
9. 조기 반환 (기존 위치 유지)
```

- [ ] **Step 1: 실패하는 테스트 작성**

`popular-districts.test.ts` 에 추가한다.

```ts
describe('PopularDistricts — 스크롤 지표 전환(R1)', () => {
  /*
   * 트랙 높이는 임의 값이 아니라 스토리가 쓰는 공식(100dvh × 스텝 수)을 지표 3종에
   * 그대로 적용한 값이다. 지표를 늘리면 트랙도 같이 늘어나야 하므로
   * HOME_METRICS.length 로 계산한다 — 300dvh 를 하드코딩하지 않는다.
   */
  it('두 열이 다 있으면 지표 수만큼의 스크롤 트랙을 준다', () => {
    const styles = renderStyles(
      buildElement(
        createResponse([
          { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
        ]),
        createTopTen(),
      ),
    )

    expect(styles).toContain('calc(100dvh * 3)')
  })

  it('스티키는 헤더 높이만큼 내려가 있다', () => {
    const styles = renderStyles(
      buildElement(
        createResponse([
          { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
        ]),
        createTopTen(),
      ),
    )

    expect(styles).toContain('top:65px')
    expect(styles).toContain('calc(100dvh - 65px)')
  })

  /*
   * 한쪽 열만 살아 있으면 비교 맥락이 없어 300dvh 를 핀 고정할 이유가 없다.
   * 기존 솔로 렌더(높이 auto)를 그대로 쓴다.
   */
  it('한쪽 열만 있으면 트랙을 만들지 않는다', () => {
    const styles = renderStyles(
      buildElement(
        createResponse([
          { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
        ]),
        createTopTen(false),
      ),
    )

    expect(styles).not.toContain('calc(100dvh * 3)')
  })

  /*
   * SSR·첫 렌더는 스티키(스크롤) 모드다 — 그래서 서버 마크업에는 기본 지표
   * (유동인구)가 온다. 지표가 스크롤로 바뀌는 것은 마운트 후 동작이라 이 층에서
   * 검증할 수 없다(D7 B4 사람 눈 확인 대상).
   */
  it('첫 렌더는 기본 지표를 그린다', () => {
    const html = render(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
      ]),
      createTopTen(),
    )

    expect(html).toContain('유동인구')
    expect(html).toContain('aria-label="지표 선택"')
  })
})
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `cd frontend && pnpm vitest run src/components/home/popular-districts.test.ts`
Expected: 신규 케이스 중 앞의 2건 FAIL(`calc(100dvh * 3)`·`top:65px` 없음). 3번째는 지금도 통과한다.

- [ ] **Step 3: 기존 100dvh 단언 3건을 새 불변식으로 갱신**

`min-height:100dvh` 를 기대하는 기존 케이스 세 곳(「두 열이 모두 있을 때만 100dvh 를 준다」, 「혼합 pending — 한쪽만 먼저 응답해도 100dvh 를 유지한다」의 두 단언)은 dual 일 때 이제 스크롤 트랙이 렌더되므로 그대로는 깨진다. **원래 의도를 그대로 옮긴다** — dual 이면 화면 하나 이상을 차지하고, 솔로면 여백으로 채우지 않는다.

```ts
  /*
   * B. D5-4 는 한쪽 열만 살아 있으면 화면 높이를 붙잡지 말라고 못 박는다.
   * R1 이후 dual 의 표현이 min-height:100dvh 에서 300dvh 스크롤 트랙으로 바뀌었을
   * 뿐, 「솔로는 여백으로 채우지 않는다」는 불변식은 그대로다.
   */
  it('두 열이 모두 있을 때만 화면 높이를 붙잡는다', () => {
    const dualStyles = renderStyles(
      buildElement(createResponse([…]), createTopTen()),
    )
    expect(dualStyles).toContain('calc(100dvh * 3)')

    const singleStyles = renderStyles(
      buildElement(createResponse([…]), createTopTen(false)),
    )
    expect(singleStyles).not.toContain('calc(100dvh * 3)')
    expect(singleStyles).not.toContain('min-height:100dvh')
  })

  /*
   * 한쪽만 먼저 도착했을 때 "지금 렌더된 열" 기준으로 판정하면, 아직 안 온 쪽을
   * "없다"로 오판해 수축했다가 도착하면 재팽창한다(스켈레톤 → 수축 → 재팽창).
   * pending 인 쪽은 "최종적으로 있을 것"으로 가정해 트랙을 유지해야 한다.
   */
  it('혼합 pending — 한쪽만 먼저 응답해도 트랙을 유지한다', () => {
    const viewOnlyStyles = renderStyles(
      buildElement(createResponse([…]), undefined),
    )
    expect(viewOnlyStyles).toContain('calc(100dvh * 3)')

    const metricOnlyStyles = renderStyles(
      buildElement(undefined, createTopTen()),
    )
    expect(metricOnlyStyles).toContain('calc(100dvh * 3)')
  })
```

> `[…]` 는 각 케이스의 **기존 시드 배열을 그대로 옮겨 오라는 표시**다. 새 시드를 만들지 말고 원래 케이스가 쓰던 것을 쓴다 — 시드가 달라지면 무엇이 바뀌어서 통과·실패하는지 알 수 없다.

- [ ] **Step 4: 스타일 추가**

`popular-districts.tsx` 의 `Section` 선언 뒤에 추가한다.

```ts
/*
  R1: 지표를 스크롤로 넘긴다. 트랙 높이는 스토리가 쓰는 공식(100dvh × 스텝 수)을
  지표 개수에 그대로 적용한 값이다 — 300dvh 를 하드코딩하면 지표를 늘릴 때 어긋난다.

  dual 이고 스택 모드가 아닐 때만 쓴다(D5-3). 좌측 열 없이 우측 지표 하나만 핀
  고정하면 비교 맥락이 없어 서사가 성립하지 않는다.
*/
const ScrollTrack = styled.section`
  height: calc(100dvh * ${HOME_METRICS.length});
`

const ScrollSticky = styled.div`
  position: sticky;
  top: ${HEADER_HEIGHT};
  min-height: calc(100dvh - ${HEADER_HEIGHT});
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 20px;

  @media (max-width: 900px) {
    padding: 56px 20px;
  }

  @media (max-width: 640px) {
    padding: 48px 16px;
  }
`
```

import 를 추가한다.

```ts
import { HEADER_HEIGHT } from '@/components/home/layout-constants'
import { activeStepFromProgress } from '@/components/home/scroll-fill'
import { scrollToPinnedStep } from '@/components/home/scroll-to-pinned-step'
import { useScrollProgress } from '@/components/home/use-scroll-progress'
import { useStackedMode } from '@/hooks/use-stacked-mode'
```

`useRef` 를 react import 에 추가한다.

```ts
import { useRef, useState } from 'react'
```

- [ ] **Step 5: 훅·계산 순서 재배치와 지표 정본 전환**

`useState` 선언을 바꾸고 훅 3개를 그 옆에 둔다.

```ts
/* 스크롤 트랙이 아닐 때(폴백·솔로)의 지표 정본. 트랙 모드에서는 스크롤이 정본이다. */
const [pickedMetric, setPickedMetric] = useState<HomeMetric>('footTraffic')

const trackRef = useRef<HTMLElement | null>(null)
const progress = useScrollProgress(trackRef)
const stacked = useStackedMode()
```

`hasMetricData` 계산 **직후**로 pending/dual 계산을 올린다(기존 자리에서는 지운다).

```ts
/*
    아직 안 온 것(isPending)과 죽은 것을 구별한다. pending 인 쪽은 결론이 안 났으니
    "있을 것"으로 가정한다 — "지금 렌더된 열" 기준으로 판정하면 한쪽이 먼저 도착했을 때
    나머지를 "없다"로 오판해 수축했다가 재팽창하는 깜빡임이 정상 로드마다 발생한다.
  */
const viewPending = rankingQuery.isPending
const metricPending = metricQuery.isPending
const viewWillExist = viewPending || view !== null
const metricWillExist = metricPending || hasMetricData
const dual = viewWillExist && metricWillExist

/*
    D5-3. 스크롤 트랙은 dual 이고 스택 모드가 아닐 때만 쓴다. 모바일(≤768px)·
    reduced-motion 은 스토리와 **같은 판정**(useStackedMode)으로 폴백한다.
  */
const useScrollTrack = dual && !stacked

/*
    트랙 모드에서는 스크롤 진행도가 지표의 정본이다 — 로컬 state 를 정본으로 두면
    클릭 직후에도 스크롤 리스너가 progress 를 재계산해 다음 스크롤 이벤트(휠 관성·
    리사이즈)에서 상태가 스크롤 위치로 되돌아간다(클릭이 무시된 것처럼 보인다).
    신규 스크롤 계산 함수는 만들지 않는다 — activeStepFromProgress 가 이미
    임의의 스텝 수에 제네릭하다.
  */
const scrollIndex = activeStepFromProgress(progress, HOME_METRICS.length)
const metric = useScrollTrack ? HOME_METRICS[scrollIndex] : pickedMetric
```

`activeMetric`·`insight` 는 그 아래에 그대로 둔다. 조기 반환도 위치를 바꾸지 않는다.

- [ ] **Step 6: 토글 onChange 를 스크롤 이동으로 바꾼다**

`metricColumn` 의 `MetricToggleGroup` 을 고친다.

```tsx
<MetricToggleGroup
  options={HOME_METRICS}
  value={metric}
  getLabel={homeMetricLabel}
  onChange={next => {
    /*
              트랙 모드에서 setState 만 하면 다음 스크롤 이벤트가 값을 되돌린다 —
              스크롤 위치 자체를 그 지표 구간으로 옮겨 정본을 덮어쓴다(조건①).
            */
    if (useScrollTrack && trackRef.current) {
      scrollToPinnedStep(
        trackRef.current,
        HOME_METRICS.indexOf(next),
        HOME_METRICS.length,
      )
      return
    }
    setPickedMetric(next)
  }}
  ariaLabel="지표 선택"
/>
```

> `value={metric}` 로 바꾼다(기존 `value={metric}` 이 로컬 state 를 가리켰다면 이제 파생값을 가리킨다 — 이름이 같으므로 코드 변경은 없지만 의미가 달라졌음을 확인한다).

- [ ] **Step 7: 렌더를 본문 + 두 껍데기로 나눈다**

`return` 문 앞에서 본문을 변수로 뽑고, `useScrollTrack` 여부로 껍데기를 고른다.

```tsx
const body = (
  <Inner>
    <Header>
      <Eyebrow>
        <TrendingUp aria-hidden="true" />
        지금 많이 본 지역
      </Eyebrow>
      <Title>다른 사람들이 보는 곳과, 숫자가 좋은 곳은 다릅니다.</Title>
    </Header>
    {viewColumn && metricColumn ? (
      <Columns>
        {viewColumn}
        {metricColumn}
      </Columns>
    ) : (
      (viewColumn ?? metricColumn)
    )}
    {viewColumn && metricColumn ? (
      <InsightSlot $visible={insight !== null} aria-live="polite">
        {insight?.sentence ?? null}
      </InsightSlot>
    ) : null}
  </Inner>
)

if (useScrollTrack) {
  return (
    <ScrollTrack ref={trackRef} aria-label="지금 많이 본 자치구">
      <ScrollSticky>{body}</ScrollSticky>
    </ScrollTrack>
  )
}

return (
  <Section aria-label="지금 많이 본 자치구" $dual={dual}>
    {body}
  </Section>
)
```

- [ ] **Step 8: 테스트를 돌려 통과를 확인**

Run: `cd frontend && pnpm test && pnpm qa:verify`
Expected: 전부 통과.

- [ ] **Step 9: 브라우저 실측 — 사람 눈 확인(생략 불가)**

```bash
cd frontend && rm -rf .next && pnpm dev
```

`.claude/launch.json` 으로 dev 서버를 띄우려 하지 말 것 — 런처의 `sh` 가 접근 불가한 cwd 로 시작해 `cd` 이전에 `getcwd: Operation not permitted` 로 죽는다. **Bash 로 백그라운드 실행한 뒤 `preview_start({url})` 로 attach 한다.** 포트를 확인할 때는 HTTP 200 만 보지 말고 `lsof -p <pid>` 로 cwd 를, 페이지 본문에 우리 문구가 있는지까지 대조한다(다른 프로젝트 서버를 우리 것으로 오인한 적이 있다).

**브라우저 pane 을 열어 둔 상태로** 확인한다 — 숨겨져 있으면 하이드레이션 자체가 돌지 않고 스크롤 이벤트도 오지 않는다. 뷰포트를 바꿀 때는 **맞춘 뒤 리로드**한다(좁게 열었다 resize 하면 `matchMedia` change 가 반영되지 않아 데스크톱에서도 모바일 분기가 남는다 — 회귀로 오인하기 쉽다).

| #   | 확인                                    | 방법                                         | 기대                                                     |
| --- | --------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| B1  | 아이브로·h2 가 헤더와 겹치지 않는다(R3) | `getBoundingClientRect()` — 헤더·아이브로·h2 | 아이브로·h2 의 top ≥ 65px                                |
| B2  | 스텝 전환 체감(R3 부작용)               | 각 스텝 버튼 클릭 + 자연 스크롤              | 같은 스텝에서 같은 패널. 어색한 점프 없음                |
| B3  | 인사이트 자리 예약(R2)                  | 문장 있음/없음 두 경우의 아래 콘텐츠 y 비교  | 유무와 무관하게 동일                                     |
| B4  | 랭킹 300dvh 스크롤 전환(R1)             | 스크롤하며 우측 지표 관찰                    | 유동인구→매출→개업 순서 전환. 토글 클릭 시 즉시 이동     |
| B5  | 769–900px 엣지(D8-4)                    | 그 폭에서 리로드 후 스크롤                   | 세로 스택 상태에서도 전환이 자연스럽다(아니면 이슈 기록) |
| B6  | 모바일·reduced-motion 폴백              | 375px 로 리사이즈 후 **리로드**              | 트랙 없이 1화면 클릭 토글                                |
| B7  | 01단계 10행이 패널을 넘치지 않는다(R4)  | `getBoundingClientRect()` — 패널 vs 목록     | 목록 높이 ≤ 패널 가용 높이, 스크롤 없이 다 보임          |
| B8  | 카운터 화살표(R6)                       | 데스크톱·모바일 폭                           | 4열: 3개. 2열: 없음. 그라데이션 없음                     |
| B9  | 손익 스택 바 가독성(R5)                 | 육안 + 「기타」 라벨 rect                    | 라벨이 잘리거나 겹치지 않는다                            |
| B10 | 콘솔                                    | `read_console_messages`                      | 오류 0                                                   |

**추가 확인(이 계획에서 새로 발견한 위험) —** 조회수는 도착했고 지표 쿼리가 **최종 실패**하면 `dual` 이 true→false 로 바뀌어 2700px 트랙이 auto 높이로 붕괴한다. 스크롤 중이었다면 페이지가 점프한다. 기존 코드도 같은 전이(100dvh→auto)를 갖고 있었으나 크기가 3배로 커졌다. 실측 방법: 지표 쿼리를 실패시킨 뒤(네트워크 차단 또는 시드 조작) 랭킹 섹션까지 스크롤한다. 점프가 실사용에서 거슬리면 **이슈로 기록**하고, 이번 범위에서 고치지 않는다(명세가 `dual` 게이트를 결정으로 못 박았다).

- [ ] **Step 10: 커밋**

```bash
git checkout -- frontend/next-env.d.ts
git add frontend/src/components/home/popular-districts.tsx frontend/src/components/home/popular-districts.test.ts
git commit -m "[FE] feat: 랭킹 섹션 지표를 스크롤로 넘긴다"
```

---

# 마무리

- [ ] **명세 상태 갱신**

`frontend/docs/features/home/interaction-polish.md` 의 상태를 `초안` → `구현 완료` 로 바꾸고, D8 을 갱신한다.

| D8 #                         | 처리                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1 `HOME_METRIC_FALLBACK` 5개 | **해결.** (a) 채택 — dev 실측으로 10개 확장(Task 3)                                                                  |
| 2 `HEADER_HEIGHT` 중복       | **해결.** (a) 채택 — `layout-constants.ts` 로 추출(Task 1). TDZ 때문에 선택이 아니라 필수였음을 기록                 |
| 3 `useStackedMode` 비공개    | **해결.** (a) 채택 — `src/hooks/use-stacked-mode.ts`(Task 7)                                                         |
| 4 769–900px 엣지             | 구현 후 관찰. B5 결과를 여기에 적는다                                                                                |
| 5 디스커버러빌리티           | (a) 채택 — 마이크로카피 없음. `MetricToggleGroup` 3버튼이 발견 가능성을 담당(스토리 선례와 동일)                     |
| 6 R6 모션                    | 보류(범위 밖)                                                                                                        |
| 7 `cost-waterfall` 개명      | **해결.** (a) 채택 — `CostBreakdownBar`(Task 6). 사용처는 `story-steps.ts` 가 아니라 `product-story.tsx` 였음을 정정 |
| 8 실행 순서                  | 이 계획대로 3슬라이스                                                                                                |
| **9 (신규)**                 | dual true→false 전이 시 2700px→auto 붕괴. B4 추가 확인 결과를 적는다                                                 |

- [ ] **PR 생성**

base 는 **develop**, 라벨 **`frontend-web`**(배포 게이트), `--assignee seonghoho`.

```bash
gh pr create --base develop --assignee seonghoho --label frontend-web --title "[FE] feat: 홈 인터랙션·가독성 2차 개선(R1~R6)" --body "..."
```

PR 본문에는 ① 슬라이스별 무엇이 바뀌었는지 ② 사람 눈으로 확인한 항목(B1~B10)과 그 결과 ③ **자동 검증이 불가능해 사람 확인에 의존한 항목**(B4·B5·B6)을 명시한다. 검증하지 못한 것을 검증했다고 쓰지 않는다.

- [ ] **CI 확인 후 머지**

```bash
gh pr checks <번호> --watch --interval 20
```

`UNSTABLE`(빌드 중)일 수 있으니 기다린다. 머지는 **merge commit**. `--delete-branch` 는 붙이지 않는다(워크트리가 develop 을 점유 중이면 실패한다) — 머지 후 `git push origin --delete <브랜치>` 로 정리한다.

---

## Self-Review

**명세 커버리지.** D2 요구사항 1~15 대응: 1·2 → Task 1(+B1·B2) / 3·4 → Task 2 / 5·6 → Task 4 / 7·8·9 → Task 5 / 10 → Task 6 / 11·12 → Task 9 / 13 → Task 7+9 / 14 → Task 9 Step 5 의 `useScrollTrack` 게이트 / 15 → Global Constraints + Task 5·6 의 gradient 가드. D7 저장소 테스트 1~16 중 16(`scrollToMetric` 순수 계산)은 Task 8 의 `pinnedStepProgress` 테스트가 대신한다. D7 브라우저 B1~B10 은 Task 9 Step 9 표에 그대로 있다.

**명세와 다르게 정한 것(근거 포함).**

1. **인사이트 슬롯은 dual 일 때만 마운트한다**(Task 2). 명세 D4-2 의 「조건부 마운트 금지」는 dual 안에서 문장 유무에 대한 것이고, 솔로 분기에서 74px 를 비워 두면 D5-4 가 없앤 죽은 여백이 되살아난다.
2. **`HEADER_HEIGHT` 추출은 권장이 아니라 필수**(Task 1). 명세 D3-1 은 「기존 상수 재사용, 새로 만들지 않는다」였지만, `Sticky`(66행)가 로컬 상수(178행)를 참조하면 TDZ ReferenceError 로 모듈이 죽는다.
3. **`CostWaterfall` 사용처는 `story-steps.ts` 가 아니라 `product-story.tsx`**(Task 6). 개명 비용 판단은 그대로 유효하다.
4. **D8-1 은 (a) 로 확정**(Task 3). dev 실측으로 지표당 10개를 확보했고 2026-09-03 스냅샷과 값이 동일했다.

**남은 위험(계획으로 해소하지 않은 것).** `dual` true→false 전이 시 트랙 붕괴(Task 9 Step 9 추가 확인). 명세가 `dual` 게이트를 결정으로 못 박았으므로 구현은 명세대로 하고 관찰 결과를 D8-9 로 남긴다.
