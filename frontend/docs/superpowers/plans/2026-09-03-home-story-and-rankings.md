# 홈 스토리·듀얼 랭킹·AI 리포트 승격 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 히어로 하위 3부의 CTA 규격 붕괴·히어로 재탕·랭킹 섹션 빈약·AI 리포트 오배치 4건을 고치고, 스토리 01·03단계와 랭킹 섹션을 실데이터로 바꾼다.

**Architecture:** 섹션 순서·구성은 그대로 두고 내용물만 바꾼다. `/status` 가 이미 가진 `top-ten` 뷰모델·포맷터를 홈이 그대로 import 해 포맷팅 계층을 새로 만들지 않는다. 01단계와 랭킹 섹션은 같은 React Query 키를 써서 `top-ten` 호출을 1회로 유지한다. 순위 막대는 `RankBarList` 한 부품으로 통일한다(01·랭킹 좌우·03이 전부 「순위 + 막대 + 값」이다).

**Tech Stack:** Next.js App Router · TypeScript · styled-components · @tanstack/react-query · vitest(node 환경 + `renderToStaticMarkup` 문자열 assertion)

**Spec:** [docs/features/home/story-and-rankings.md](../../features/home/story-and-rankings.md)

## Global Constraints

- **테스트 방식**: jsdom·testing-library 를 쓰지 않는다. `renderToStaticMarkup` 이 낸 HTML **문자열**에 `expect(html).toContain(...)` 으로 단언한다. 순수 함수는 직접 호출한다.
- **React Query 컴포넌트 테스트**: `new QueryClient({ defaultOptions: { queries: { retry: false } } })` 를 만들고 `client.setQueryData(KEY, seed)` 로 캐시를 미리 채운 뒤 `QueryClientProvider` 로 감싸 SSR 한 번에 성공 분기를 그린다. 캐시를 안 채우면 `isPending` 분기가 나온다.
- **디자인 토큰**: 새 색·radius·shadow·spacing 토큰을 만들지 않는다. `DESIGN.md` 의 CSS 변수만 쓴다. 변화율 상승/하락은 `--color-success-500` / `--color-error-500` 계열 기존 변수를 쓴다(파일에서 실제 변수명을 확인하고 쓸 것 — 임의로 짓지 않는다).
- **모션**: `@media (prefers-reduced-motion: reduce)` 에서 막대 `width`·워터폴 `height` 트랜지션을 제거하고 최종 상태를 즉시 그린다.
- **금액 단위**: 시뮬레이션 관련 금액은 **만원**. (simulation Feature 규약)
- **집계 창 표기**: `formatRankingWindow` 결과(`최근 24시간` 등)를 그대로 쓴다.
- **검증**: 완료 보고 전 `pnpm test` 와 `pnpm qa:verify` 를 실제로 실행한다. 미실행 명령을 통과했다고 보고하지 않는다.
- **커밋 메시지**: `[FE] <type>: <한국어 제목>` + 본문. 마지막 줄에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## 슬라이스 구성

| 슬라이스 | 태스크 | 백엔드 의존 | 중간에 멈춰도 홈이 온전한가 |
| -------- | ------ | ----------- | --------------------------- |
| 1        | 1 ~ 3  | 없음        | 예                          |
| 2        | 4 ~ 7  | `top-ten`   | 예                          |
| 3        | 8 ~ 10 | 추천 2종    | 예                          |
| 4        | 11     | 없음        | 예                          |

---

## File Structure

**신규**

| 파일                                           | 책임                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/home/rank-bar-list.tsx`        | 「순위 + 이름 + 막대 + 값(+변화율)」 표시 전용. 데이터 가공 없음 |
| `src/lib/home/metric-rankings.ts`              | `top-ten` 응답 → 홈이 쓰는 3지표 Top5 뷰모델                     |
| `src/lib/home/ranking-insight.ts`              | 두 순위의 집합 차이 → 문장 1개 또는 `null`                       |
| `src/hooks/use-district-top-ten.ts`            | `top-ten` 공유 쿼리(키·staleTime·retry 를 한 곳에 고정)          |
| `src/components/home/metric-ranking-board.tsx` | 01단계: 지표 토글 + `RankBarList`                                |
| `src/lib/home/recommend-preview.ts`            | 추천 응답 → 표시용 뷰모델 + 예시 폴백 데이터                     |
| `src/components/home/recommend-preview.tsx`    | 03단계: 추천 Top5 + 추천 이유 문장                               |
| `src/components/home/cost-waterfall.tsx`       | 04단계: 손익 5칸 워터폴(예시)                                    |

**수정**

| 파일                                         | 무엇을                                        |
| -------------------------------------------- | --------------------------------------------- |
| `src/components/home/product-story.tsx`      | `PanelWithCta` 행 정의, `DemoPanel` 분기 교체 |
| `src/components/home/story-steps.ts`         | 01·02 문구, 01 `demo` 값                      |
| `src/components/home/analysis-mini-demo.tsx` | AI 요약 라벨, CTA 문구                        |
| `src/components/home/popular-districts.tsx`  | 듀얼 랭킹으로 재구성                          |
| `src/components/home/feature-bento.tsx`      | AI 리포트 카드 제거 → 보관함·상권 비교        |
| `src/lib/api/recommend.ts`                   | 홈 시드 상수 추가(엔드포인트 변경 없음)       |

---

# 슬라이스 1 — 백엔드 의존 0

## Task 1: CTA 높이 버그 수정

`PanelWithCta` 가 `display: grid` 인데 행이 `auto auto` 라, 부모 `StoryRow`(`height: 600px`, `align-items: stretch`)가 준 600px 중 남는 216px 가 두 행에 분배된다. CTA 에 `align-self` 가 없어 행 높이(120px)만큼 늘어난다.

**Files:**

- Modify: `src/components/home/product-story.tsx` (`PanelWithCta` 정의)
- Test: `src/components/home/product-story.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces: 없음 (스타일 수정)

- [ ] **Step 1: 현재 스타일을 눈으로 확인한다**

`src/components/home/product-story.tsx` 에서 `PanelWithCta` 를 찾는다. 지금 모습:

```
const PanelWithCta = styled.div`
  display: grid;
  gap: 16px;
  min-width: 0;

  /* justify-items: start 를 쓰면 안 된다 — ... */
  > a {
    justify-self: start;
  }
`
```

- [ ] **Step 2: 행 정의를 추가한다**

`display: grid;` 바로 아래에 한 줄을 넣는다. **`> a { justify-self: start }` 는 지우지 않는다** — 그것은 가로축 담당이고, 없애면 주석에 기록된 「343px → 121px 찌그러짐」 사고가 되돌아온다.

```
const PanelWithCta = styled.div`
  display: grid;
  /* 행을 명시하지 않으면 부모(StoryRow, height:600px + align-items:stretch)가 준
     남는 높이가 두 행에 분배되고, align-self 가 없는 CTA 가 행 높이만큼 늘어난다
     (실측: min-height 48px 선언이 120px 로 렌더됐다). 남는 공간은 패널이 전부 갖는다.
     minmax(0, 1fr) 의 0 은 필수다 — 1fr 만 쓰면 최소 콘텐츠 크기가 하한이 되어
     좁은 폭에서 패널이 넘친다. */
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 16px;
  min-width: 0;

  /* justify-items: start 를 쓰면 안 된다 — 데모 패널까지 내용 폭으로 줄어든다
     (실측: 343px 자리에서 121px 로 찌그러졌다). 폭을 좁히는 건 CTA 뿐이다.
     CSS 주석 안에 백틱을 넣으면 styled 템플릿이 거기서 끊긴다. */
  > a {
    justify-self: start;
  }
`
```

- [ ] **Step 3: 커밋**

이 수정은 브라우저 실측으로만 검증할 수 있다(styled-components 의 계산된 높이는 SSR 문자열에 없다). 실측은 Task 11 의 B1 에서 한다.

```bash
git add src/components/home/product-story.tsx
git commit -m "$(cat <<'EOF'
[FE] fix: 스토리 CTA 가 그리드 행 stretch 로 늘어나던 문제 수정

PanelWithCta 가 display:grid 인데 행이 auto auto 라, 부모 StoryRow 의
height:600px + align-items:stretch 가 준 남는 216px 가 두 행에 분배되고
align-self 가 없는 CTA 가 행 높이만큼 늘어났다. 실측 120px(선언 48px).

grid-template-rows: minmax(0, 1fr) auto 로 남는 공간을 패널이 전부 갖게 한다.
align-self: start 로도 높이는 잡히지만 그때는 패널이 늘어나지 않아 카드가 위로 붙는다.

기존 `> a { justify-self: start }` 는 가로축 담당이라 그대로 둔다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 02단계 AI 리포트 승격

**Files:**

- Modify: `src/components/home/story-steps.ts`
- Modify: `src/components/home/analysis-mini-demo.tsx`
- Test: `src/components/home/product-story.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces: `STORY_STEPS[1].title === '상권 분석 · AI 리포트'`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/home/product-story.test.ts` 에 추가한다.

```ts
import { STORY_STEPS } from '@/components/home/story-steps'

describe('STORY_STEPS — AI 리포트 배치', () => {
  it('02단계 제목이 AI 리포트를 명시한다', () => {
    // AI 리포트는 /analysis/report 와 분석 결과 사이드바에 사는 분석의 산출물이다.
    // 벤토의 「분석 이후」 칸이 아니라 이 단계가 그것을 말해야 한다.
    expect(STORY_STEPS[1].title).toBe('상권 분석 · AI 리포트')
  })

  it('02단계 본문이 AI 가 무엇을 해 주는지 말한다', () => {
    expect(STORY_STEPS[1].body).toContain('AI')
  })

  it('02단계는 여전히 CTA 를 갖지 않는다', () => {
    // 데모(analysis-mini-demo)가 자체 CTA 를 들고 있다. 여기서 또 그리면 버튼이 둘이 된다.
    expect(STORY_STEPS[1].cta).toBeNull()
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm exec vitest run src/components/home/product-story.test.ts`
Expected: FAIL — `expected '상권 분석' to be '상권 분석 · AI 리포트'`

- [ ] **Step 3: `story-steps.ts` 02단계를 고친다**

```ts
  {
    step: '02',
    title: '상권 분석 · AI 리포트',
    body: '지역과 업종을 고르면 매출 추이·경쟁 강도를 읽고, AI 가 판단 근거를 문장으로 정리합니다.',
    demo: 'mini-demo',
    cta: null,
  },
```

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm exec vitest run src/components/home/product-story.test.ts`
Expected: PASS

- [ ] **Step 5: 미니데모의 AI 요약 라벨 테스트를 쓴다**

`src/components/home/analysis-mini-demo.test.ts` 가 없으면 새로 만든다.

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'

describe('AnalysisMiniDemo — AI 리포트 표기', () => {
  it('인사이트 문장에 AI 리포트 라벨을 붙인다', () => {
    const html = renderToStaticMarkup(createElement(AnalysisMiniDemo))

    expect(html).toContain('AI 리포트 요약')
  })

  it('라벨 안에 「예시」를 함께 적는다', () => {
    // 이 문장은 home-demo.ts 의 하드코딩 문자열이다.
    // 「AI 리포트 요약」이라고만 쓰면 하드코딩이 AI 출력인 척하게 된다.
    const html = renderToStaticMarkup(createElement(AnalysisMiniDemo))
    const labelIndex = html.indexOf('AI 리포트 요약')
    const window = html.slice(labelIndex, labelIndex + 80)

    expect(window).toContain('예시')
  })

  it('CTA 가 AI 리포트로 이어진다고 말한다', () => {
    const html = renderToStaticMarkup(createElement(AnalysisMiniDemo))

    expect(html).toContain('AI 리포트 받기')
    expect(html).toContain('href="/analysis"')
  })
})
```

- [ ] **Step 6: 실패를 확인한다**

Run: `pnpm exec vitest run src/components/home/analysis-mini-demo.test.ts`
Expected: FAIL — `AI 리포트 요약` 없음

- [ ] **Step 7: 미니데모를 고친다**

`analysis-mini-demo.tsx` 의 `Insight` 위에 라벨 요소를 넣는다. `SampleLabel`/`SampleBadge` 와 같은 캡션 스타일을 재사용한다(새 토큰 금지).

```tsx
const InsightLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-caption);
`
```

렌더 부분(현재 `<Insight>{sample.insight}</Insight>` 자리):

```tsx
{/*
  「예시」를 라벨 안에 넣는 것이 요점이다. 이 문장은 home-demo.ts 의 하드코딩
  문자열이라, 「AI 리포트 요약」이라고만 쓰면 하드코딩이 AI 출력인 척하게 된다.
*/}
<InsightLabel>AI 리포트 요약 · 예시</InsightLabel>
<Insight>{sample.insight}</Insight>
```

CTA 문구를 바꾼다(목적지는 그대로).

```tsx
<Cta href="/analysis">이 조건으로 AI 리포트 받기</Cta>
```

- [ ] **Step 8: 통과를 확인한다**

Run: `pnpm exec vitest run src/components/home/analysis-mini-demo.test.ts src/components/home/product-story.test.ts`
Expected: PASS

- [ ] **Step 9: 커밋**

```bash
git add src/components/home/story-steps.ts src/components/home/analysis-mini-demo.tsx src/components/home/analysis-mini-demo.test.ts src/components/home/product-story.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: AI 리포트를 02단계로 승격한다

AI 리포트는 /analysis/report 와 분석 결과 사이드바에 사는 분석의 산출물인데,
홈은 앵커 문장에서 크게 약속해놓고 정작 02단계에서는 침묵했다.

02단계 제목을 「상권 분석 · AI 리포트」로 바꾸고 본문이 AI 가 무엇을 하는지 말하게 한다.
미니데모의 인사이트 문장에는 「AI 리포트 요약 · 예시」 라벨을 붙인다 — 이 문장은
home-demo.ts 의 하드코딩 문자열이라 「예시」를 라벨 안에 함께 적어야 한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 벤토에서 AI 리포트 카드 제거

벤토 제목은 「분석 **이후**의 판단까지, 한 곳에서 이어집니다」다. AI 리포트는 분석 **중**에 나오는 산출물이라 이 칸의 전제와 어긋난다.

**Files:**

- Modify: `src/components/home/feature-bento.tsx`
- Test: `src/components/home/feature-bento.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/home/feature-bento.test.ts` 에 추가한다.

```ts
describe('FeatureBento — 「분석 이후」 칸의 진실성', () => {
  it('AI 리포트를 이 칸에서 소개하지 않는다', () => {
    // AI 리포트는 분석의 산출물이라 「분석 이후」 칸의 전제와 어긋난다.
    // 02단계(story-steps)가 그것을 말한다.
    const html = render()

    expect(html).not.toContain('AI 리포트')
  })

  it('실제로 분석을 마친 뒤 쓰는 기능을 소개한다', () => {
    const html = render()

    expect(html).toContain('분석 화면 보관함')
    expect(html).toContain('상권 비교')
  })

  it('제목은 그대로 둔다', () => {
    const html = render()

    expect(html).toContain('분석 이후의 판단까지, 한 곳에서 이어집니다.')
  })
})
```

> `render()` 헬퍼가 이 파일에 이미 있으면 그대로 쓴다. 없으면 파일 상단에 만든다:
> `const render = () => renderToStaticMarkup(createElement(FeatureBento))`

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm exec vitest run src/components/home/feature-bento.test.ts`
Expected: FAIL — `AI 리포트` 가 여전히 있음

- [ ] **Step 3: Hero 카드와 소형 카드 하나를 교체한다**

`feature-bento.tsx` 의 `<Hero>` 블록 전체(`FileText` 아이콘 · `AI 리포트` 제목 · `실시간 생성` 배지 · `ReportCard` 미리보기)를 아래로 바꾼다.

```tsx
<Hero>
  <CardHead>
    <Bookmark aria-hidden="true" />
    <CardTitle>분석 화면 보관함</CardTitle>
  </CardHead>
  <CardBody>분석한 화면을 그대로 저장하고, 링크 하나로 공유합니다.</CardBody>
</Hero>
```

세 번째 카드(`저장 · 알림`)를 바꾼다.

```tsx
<Card>
  <CardHead>
    <Columns3 aria-hidden="true" />
    <CardTitle>상권 비교</CardTitle>
  </CardHead>
  <CardBody>후보 상권을 나란히 놓고 지표로 비교합니다.</CardBody>
</Card>
```

import 를 정리한다: `FileText`·`Check` 를 지우고 `Columns3` 를 넣는다. `Bookmark` 는 이미 있다.

```tsx
import {
  ArrowRight,
  Bookmark,
  Columns3,
  MessageSquare,
  UserPlus,
} from 'lucide-react'
```

`ReportCard`·`ReportTop`·`ReportTitle`·`ReportGrade`·`ReportRow`·`ReportKey`·`ReportValue`·`ReportFoot`·`Badge` styled 정의는 **쓰는 곳이 없어지므로 함께 지운다**(lint 가 미사용으로 잡는다). `DevBadge` 는 커뮤니티 카드가 계속 쓰므로 남긴다.

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm exec vitest run src/components/home/feature-bento.test.ts`
Expected: PASS

- [ ] **Step 5: 슬라이스 1 전체 검증**

Run: `pnpm test && pnpm lint`
Expected: 전부 통과. 실패하면 고치고 다시 돌린다.

- [ ] **Step 6: 커밋**

```bash
git add src/components/home/feature-bento.tsx src/components/home/feature-bento.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 벤토에서 AI 리포트를 빼고 분석 이후 기능으로 채운다

벤토 제목은 「분석 이후의 판단까지, 한 곳에서 이어집니다」인데 대표 카드가
분석 중에 나오는 산출물(AI 리포트)이라 제목이 스스로를 배반하고 있었다.

보관함(분석 화면을 저장·공유)과 상권 비교로 바꾼다. 둘 다 실제로 분석을
마친 뒤에 쓰는 기능이라 제목이 참이 된다. AI 리포트는 02단계가 말한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

# 슬라이스 2 — `top-ten` 연결

## Task 4: 공유 쿼리 훅 + 지표 뷰모델

**Files:**

- Create: `src/hooks/use-district-top-ten.ts`
- Create: `src/lib/home/metric-rankings.ts`
- Test: `src/lib/home/metric-rankings.test.ts`

**Interfaces:**

- Consumes: `fetchStatusTopTen()` (`src/lib/api/status.ts`), `normalizeStatusTopTen()` (`src/lib/status/status-adapter.ts`), `retryUnlessClientError()` (`src/lib/api/api-error.ts`)
- Produces:
  - `HOME_TOP_TEN_QUERY_KEY: readonly ['home', 'districtTopTen']`
  - `useDistrictTopTen(): UseQueryResult<DistrictTopTenResponse>`
  - `type HomeMetric = 'footTraffic' | 'sales' | 'opened'`
  - `type HomeMetricRanking = { metric: HomeMetric; label: string; items: StatusRankedItem[] }`
  - `HOME_METRICS: readonly HomeMetric[]`
  - `toHomeMetricRankings(body: DistrictTopTenSummary): HomeMetricRanking[]`
  - `HOME_METRIC_FALLBACK: HomeMetricRanking[]`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/home/metric-rankings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  HOME_METRIC_FALLBACK,
  toHomeMetricRankings,
} from '@/lib/home/metric-rankings'
import type { DistrictTopTenSummary } from '@/types/status'

const summary: DistrictTopTenSummary = {
  footTrafficTopTenItems: [
    {
      districtCode: '11680',
      districtName: '강남구',
      totalFootTraffic: 1842,
      footTrafficChangeRate: 3.2,
    },
    {
      districtCode: '11710',
      districtName: '송파구',
      totalFootTraffic: 1455,
      footTrafficChangeRate: 1.1,
    },
  ],
  salesTopTenItems: [
    {
      districtCode: '11680',
      districtName: '강남구',
      totalSalesAmount: 42100,
      salesChangeRate: 5.1,
    },
  ],
  openedStoreTopTenItems: [
    {
      districtCode: '11440',
      districtName: '마포구',
      openedStoreCount: 892,
      openingChangeRate: 7.4,
    },
  ],
  closedStoreTopTenItems: [
    {
      districtCode: '11170',
      districtName: '용산구',
      closedStoreCount: 310,
      closureChangeRate: 2.0,
    },
  ],
}

describe('toHomeMetricRankings', () => {
  it('홈이 쓰는 3지표만 낸다', () => {
    const result = toHomeMetricRankings(summary)

    expect(result.map(entry => entry.metric)).toEqual([
      'footTraffic',
      'sales',
      'opened',
    ])
  })

  it('폐업은 내지 않는다', () => {
    // 폐업은 상위가 나쁜 것이라 다른 셋과 방향이 반대다. 같은 토글에 섞으면
    // 랜딩에서 「폐업 1위」를 순위표처럼 자랑하게 되고 인사이트 문장이 뒤집힌다.
    const result = toHomeMetricRankings(summary)

    expect(result.some(entry => entry.metric === 'closed')).toBe(false)
  })

  it('순위·값·변화율을 status 어댑터가 낸 그대로 옮긴다', () => {
    const [footTraffic] = toHomeMetricRankings(summary)

    expect(footTraffic.items[0]).toMatchObject({
      rank: 1,
      districtCode: '11680',
      districtName: '강남구',
      value: 1842,
      changeRate: 3.2,
    })
  })

  it('각 지표를 최대 5개로 자른다', () => {
    const many: DistrictTopTenSummary = {
      ...summary,
      footTrafficTopTenItems: Array.from({ length: 10 }, (_, index) => ({
        districtCode: String(11000 + index),
        districtName: `구${index}`,
        totalFootTraffic: 1000 - index,
        footTrafficChangeRate: 0,
      })),
    }

    expect(toHomeMetricRankings(many)[0].items).toHaveLength(5)
  })

  it('한국어 라벨을 붙인다', () => {
    expect(toHomeMetricRankings(summary).map(entry => entry.label)).toEqual([
      '유동인구',
      '매출',
      '개업',
    ])
  })
})

describe('HOME_METRIC_FALLBACK', () => {
  it('실 데이터와 같은 모양이라 화면이 분기 없이 그린다', () => {
    expect(HOME_METRIC_FALLBACK.map(entry => entry.metric)).toEqual([
      'footTraffic',
      'sales',
      'opened',
    ])
    expect(HOME_METRIC_FALLBACK.every(entry => entry.items.length > 0)).toBe(
      true,
    )
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm exec vitest run src/lib/home/metric-rankings.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `metric-rankings.ts` 를 쓴다**

```ts
import { normalizeStatusTopTen } from '@/lib/status/status-adapter'
import type { DistrictTopTenSummary, StatusRankedItem } from '@/types/status'

/**
 * 홈이 노출하는 지표. `StatusMetric` 에서 `closed` 를 뺀 것이다.
 *
 * 폐업은 **상위가 나쁜 것**이라 다른 세 지표와 방향이 반대다. 같은 토글에 섞으면
 * ① 랜딩에서 「폐업 1위 자치구」를 순위표처럼 자랑하게 되고 ② 두 순위의 불일치를
 * 말하는 인사이트 문장(`ranking-insight`)이 정반대 의미가 된다.
 * `/status` 는 현황 조회가 목적이라 4지표를 그대로 유지한다.
 */
export type HomeMetric = 'footTraffic' | 'sales' | 'opened'

export const HOME_METRICS: readonly HomeMetric[] = [
  'footTraffic',
  'sales',
  'opened',
] as const

const METRIC_LABELS: Record<HomeMetric, string> = {
  footTraffic: '유동인구',
  sales: '매출',
  opened: '개업',
}

export const homeMetricLabel = (metric: HomeMetric): string =>
  METRIC_LABELS[metric]

export type HomeMetricRanking = {
  metric: HomeMetric
  label: string
  items: StatusRankedItem[]
}

/** 홈은 Top5 만 그린다. 좌측 조회수 8행 + 토글과 높이가 맞는다. */
const HOME_TOP_N = 5

/**
 * `top-ten` 응답을 홈이 쓰는 모양으로 옮긴다.
 *
 * 값·변화율 계산은 `normalizeStatusTopTen` 이 이미 한다 — 여기서 다시 하지 않는다.
 * 홈에서 따로 포맷하면 같은 숫자가 `/status` 와 홈에서 다르게 보이는 날이 온다.
 */
export const toHomeMetricRankings = (
  body: DistrictTopTenSummary,
): HomeMetricRanking[] => {
  const normalized = normalizeStatusTopTen(body)

  return HOME_METRICS.map(metric => ({
    metric,
    label: METRIC_LABELS[metric],
    items: normalized[metric].slice(0, HOME_TOP_N),
  }))
}

/**
 * `top-ten` 이 죽었을 때 01단계가 쓰는 예시. **랭킹 섹션은 이걸 쓰지 않는다** —
 * 거기서는 우측을 통째로 빼고, 스토리에서만 쓴다(단계 번호 01~04 에 구멍이 나면 안 된다).
 * 화면이 분기 없이 그리도록 실 데이터와 모양이 같다.
 */
export const HOME_METRIC_FALLBACK: HomeMetricRanking[] = [
  {
    metric: 'footTraffic',
    label: METRIC_LABELS.footTraffic,
    items: [
      {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 18_420_000,
        changeRate: 3.2,
      },
      {
        rank: 2,
        districtCode: '11710',
        districtName: '송파구',
        value: 14_550_000,
        changeRate: 1.1,
      },
      {
        rank: 3,
        districtCode: '11440',
        districtName: '마포구',
        value: 13_010_000,
        changeRate: 4.8,
      },
      {
        rank: 4,
        districtCode: '11560',
        districtName: '영등포구',
        value: 12_440_000,
        changeRate: -0.6,
      },
      {
        rank: 5,
        districtCode: '11650',
        districtName: '서초구',
        value: 11_900_000,
        changeRate: 2.0,
      },
    ],
  },
  {
    metric: 'sales',
    label: METRIC_LABELS.sales,
    items: [
      {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 4_210_000_000_000,
        changeRate: 5.1,
      },
      {
        rank: 2,
        districtCode: '11140',
        districtName: '중구',
        value: 3_140_000_000_000,
        changeRate: -1.2,
      },
      {
        rank: 3,
        districtCode: '11650',
        districtName: '서초구',
        value: 2_820_000_000_000,
        changeRate: 2.4,
      },
      {
        rank: 4,
        districtCode: '11710',
        districtName: '송파구',
        value: 2_600_000_000_000,
        changeRate: 0.9,
      },
      {
        rank: 5,
        districtCode: '11440',
        districtName: '마포구',
        value: 2_130_000_000_000,
        changeRate: 6.3,
      },
    ],
  },
  {
    metric: 'opened',
    label: METRIC_LABELS.opened,
    items: [
      {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 1204,
        changeRate: 2.8,
      },
      {
        rank: 2,
        districtCode: '11440',
        districtName: '마포구',
        value: 892,
        changeRate: 7.4,
      },
      {
        rank: 3,
        districtCode: '11710',
        districtName: '송파구',
        value: 811,
        changeRate: 1.6,
      },
      {
        rank: 4,
        districtCode: '11200',
        districtName: '성동구',
        value: 744,
        changeRate: 11.2,
      },
      {
        rank: 5,
        districtCode: '11560',
        districtName: '영등포구',
        value: 690,
        changeRate: -2.1,
      },
    ],
  },
]
```

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm exec vitest run src/lib/home/metric-rankings.test.ts`
Expected: PASS

- [ ] **Step 5: 공유 쿼리 훅을 쓴다**

`src/hooks/use-district-top-ten.ts`:

```ts
'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchStatusTopTen } from '@/lib/api/status'
import { retryUnlessClientError } from '@/lib/api/api-error'

/**
 * 01단계(스토리)와 랭킹 섹션 우측이 **같은 키**를 쓴다. React Query 가 dedupe 하므로
 * 두 곳이 그려도 네트워크 요청은 1회다. 키를 문자열로 두 번 적으면 언젠가 한쪽만 바뀐다.
 */
export const HOME_TOP_TEN_QUERY_KEY = ['home', 'districtTopTen'] as const

export const useDistrictTopTen = () =>
  useQuery({
    queryKey: HOME_TOP_TEN_QUERY_KEY,
    queryFn: fetchStatusTopTen,
    retry: retryUnlessClientError(1),
    staleTime: 5 * 60 * 1000,
  })
```

- [ ] **Step 6: 타입 검사**

Run: `pnpm exec tsc --noEmit --incremental false`
Expected: 오류 없음. `retryUnlessClientError` 의 실제 시그니처가 다르면 `src/lib/api/api-error.ts` 를 열어 맞춘다.

- [ ] **Step 7: 커밋**

```bash
git add src/hooks/use-district-top-ten.ts src/lib/home/metric-rankings.ts src/lib/home/metric-rankings.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 홈 지표 랭킹 뷰모델과 top-ten 공유 쿼리 훅

01단계와 랭킹 섹션 우측이 같은 쿼리 키를 써서 GET /districts/top-ten 호출을
1회로 유지한다. 키를 두 곳에 문자열로 적으면 언젠가 한쪽만 바뀌므로 훅에 고정한다.

지표는 3종만 낸다. 폐업은 상위가 나쁜 것이라 다른 셋과 방향이 반대고, 같은
토글에 섞으면 인사이트 문장이 정반대 의미가 된다. /status 는 4종을 유지한다.

값·변화율은 status 어댑터가 이미 계산한다. 홈에서 다시 포맷하지 않는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 인사이트 문장 생성기

**Files:**

- Create: `src/lib/home/ranking-insight.ts`
- Test: `src/lib/home/ranking-insight.test.ts`

**Interfaces:**

- Consumes: `PopularDistrict` (`src/lib/home/popular-districts.ts`), `HomeMetricRanking` (Task 4)
- Produces: `type RankingInsight = { sentence: string; highlightCode: string }`, `buildRankingInsight(views, metric): RankingInsight | null`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/home/ranking-insight.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { buildRankingInsight } from '@/lib/home/ranking-insight'
import type { HomeMetricRanking } from '@/lib/home/metric-rankings'
import type { PopularDistrict } from '@/lib/home/popular-districts'

const view = (rank: number, code: string, name: string): PopularDistrict => ({
  rank,
  districtCode: code,
  name,
  viewCount: 1000 - rank,
  href: `/analysis?districtCode=${code}`,
})

const ranking = (
  items: Array<[number, string, string]>,
): HomeMetricRanking => ({
  metric: 'sales',
  label: '매출',
  items: items.map(([rank, districtCode, districtName]) => ({
    rank,
    districtCode,
    districtName,
    value: 1000 - rank,
    changeRate: 0,
  })),
})

describe('buildRankingInsight', () => {
  it('규칙 A — 지표 상위인데 조회수 목록에 없는 곳을 먼저 말한다', () => {
    const views = [view(1, '11680', '강남구'), view(2, '11440', '마포구')]
    const metric = ranking([
      [1, '11680', '강남구'],
      [2, '11140', '중구'], // 조회수 목록에 없다
      [3, '11650', '서초구'],
    ])

    const result = buildRankingInsight(views, metric)

    expect(result).not.toBeNull()
    expect(result?.sentence).toBe(
      '매출 2위 중구는 지금 많이 본 2곳에 들지 않았습니다.',
    )
    expect(result?.highlightCode).toBe('11140')
  })

  it('규칙 B — 규칙 A 가 없을 때 조회수 상위인데 지표 밖인 곳을 말한다', () => {
    const views = [
      view(1, '11680', '강남구'),
      view(2, '11200', '성동구'), // 지표 Top5 에 없다
    ]
    const metric = ranking([
      [1, '11680', '강남구'],
      [2, '11440', '마포구'],
      [3, '11650', '서초구'],
    ])
    // 지표 Top3 중 조회수 밖인 것: 마포구·서초구 → 규칙 A 가 먼저 걸린다.
    // 규칙 B 만 성립하게 하려면 지표 Top3 가 전부 조회수 안에 있어야 한다.
    const metricAllSeen = ranking([
      [1, '11680', '강남구'],
      [2, '11200', '성동구'],
      [3, '11680', '강남구'],
    ])

    expect(buildRankingInsight(views, metricAllSeen)).toBeNull()
    expect(buildRankingInsight(views, metric)?.sentence).toContain('매출')
  })

  it('규칙 A 와 B 가 둘 다 성립하면 A 를 고른다', () => {
    // A 가 「아무도 안 보는데 지표 상위」라 창업 후보를 찾는 사람에게 더 값지다.
    const views = [view(1, '11200', '성동구'), view(2, '11680', '강남구')]
    const metric = ranking([
      [1, '11140', '중구'], // A: 조회수 밖
      [2, '11680', '강남구'],
      [3, '11650', '서초구'],
    ])

    expect(buildRankingInsight(views, metric)?.highlightCode).toBe('11140')
  })

  it('양쪽 상위가 완전히 겹치면 문장을 만들지 않는다', () => {
    const views = [view(1, '11680', '강남구'), view(2, '11440', '마포구')]
    const metric = ranking([
      [1, '11680', '강남구'],
      [2, '11440', '마포구'],
    ])

    expect(buildRankingInsight(views, metric)).toBeNull()
  })

  it('지표 목록이 비면 문장을 만들지 않는다', () => {
    expect(
      buildRankingInsight([view(1, '11680', '강남구')], ranking([])),
    ).toBeNull()
  })

  it('조회수 목록이 비면 문장을 만들지 않는다', () => {
    // 두 목록의 차이를 말하는 문장이라 한쪽만으로는 만들 수 없다.
    expect(
      buildRankingInsight([], ranking([[1, '11680', '강남구']])),
    ).toBeNull()
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm exec vitest run src/lib/home/ranking-insight.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `ranking-insight.ts` 를 쓴다**

```ts
import type { HomeMetricRanking } from '@/lib/home/metric-rankings'
import type { PopularDistrict } from '@/lib/home/popular-districts'

export type RankingInsight = {
  /** 화면에 그대로 쓰는 문장. */
  sentence: string
  /** 양쪽 목록에서 함께 강조할 자치구 코드. */
  highlightCode: string
}

/** 상위 몇 개까지를 「상위」로 볼 것인가. */
const TOP_N = 3

/**
 * 두 순위의 **집합 차이**에서 문장 하나를 만든다.
 *
 * 문장은 소속만 진술한다 — 「좋다/나쁘다/유망하다」로 해석하지 않는다.
 * 지표 상위가 곧 좋은 상권이라는 근거가 우리에게 없다.
 *
 * 규칙에 걸리는 게 없으면 `null` 이다. **억지 문장을 만들지 않는다.**
 */
export const buildRankingInsight = (
  views: readonly PopularDistrict[],
  metric: HomeMetricRanking,
): RankingInsight | null => {
  if (views.length === 0 || metric.items.length === 0) return null

  const viewCodes = new Set(views.map(item => item.districtCode))
  const metricCodes = new Set(metric.items.map(item => item.districtCode))

  // 규칙 A — 지표 상위인데 아무도 안 보는 곳. 창업 후보를 찾는 사람에게 더 값지다.
  const unseen = metric.items
    .slice(0, TOP_N)
    .find(item => !viewCodes.has(item.districtCode))

  if (unseen) {
    return {
      sentence: `${metric.label} ${unseen.rank}위 ${unseen.districtName}는 지금 많이 본 ${views.length}곳에 들지 않았습니다.`,
      highlightCode: unseen.districtCode,
    }
  }

  // 규칙 B — 많이 보는데 지표 Top5 밖인 곳.
  const outside = views
    .slice(0, TOP_N)
    .find(item => !metricCodes.has(item.districtCode))

  if (outside) {
    return {
      sentence: `조회수 ${outside.rank}위 ${outside.name}는 ${metric.label} Top ${metric.items.length} 밖입니다.`,
      highlightCode: outside.districtCode,
    }
  }

  return null
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm exec vitest run src/lib/home/ranking-insight.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/home/ranking-insight.ts src/lib/home/ranking-insight.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 두 순위의 불일치를 문장으로 만드는 규칙

조회수 순위와 실제 지표 순위의 집합 차이에서 문장 하나를 만든다.
「지표 상위인데 아무도 안 보는 곳」을 먼저 말한다 — 창업 후보를 찾는
사람에게 더 값진 정보다.

문장은 집합 소속만 진술한다. 지표 상위가 곧 좋은 상권이라는 근거가
우리에게 없으므로 좋다/유망하다로 해석하지 않는다.

규칙에 걸리는 게 없으면 null 이다. 억지 문장을 만들지 않는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `RankBarList` 공용 막대 부품

01단계·랭킹 좌우·03단계가 전부 「순위 + 이름 + 막대 + 값」이다. 한 부품으로 통일한다.

**Files:**

- Create: `src/components/home/rank-bar-list.tsx`
- Test: `src/components/home/rank-bar-list.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces:

```ts
export type RankBarRow = {
  key: string
  rank: number
  name: string
  /** 막대 길이 계산에 쓰는 원값. 음수는 0 으로 본다. */
  value: number
  /** 포맷이 끝난 표시용 문자열. 이 부품은 포맷하지 않는다. */
  valueLabel: string
  /** 변화율 표시 문자열. 없으면 배지를 그리지 않는다. */
  changeLabel?: string
  /** 변화 방향. `changeLabel` 이 있을 때만 본다. */
  changeDirection?: 'up' | 'down'
  href?: string
  ariaLabel?: string
}

export type RankBarListProps = {
  rows: readonly RankBarRow[]
  /** 이 키의 행을 강조한다(인사이트 문장이 가리키는 행). */
  highlightKey?: string | null
  ariaLabel: string
}
```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/home/rank-bar-list.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'

const rows: RankBarRow[] = [
  { key: 'a', rank: 1, name: '강남구', value: 100, valueLabel: '100회' },
  { key: 'b', rank: 2, name: '마포구', value: 50, valueLabel: '50회' },
]

const render = (props: Partial<Parameters<typeof RankBarList>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(RankBarList, { rows, ariaLabel: '순위', ...props }),
  )

describe('RankBarList', () => {
  it('순위·이름·값을 그린다', () => {
    const html = render()

    expect(html).toContain('강남구')
    expect(html).toContain('100회')
    expect(html).toContain('마포구')
  })

  it('1위 대비 비율로 막대 폭을 정한다', () => {
    const html = render()

    expect(html).toContain('width:100%')
    expect(html).toContain('width:50%')
  })

  it('값이 전부 0이면 막대를 0%로 두고 나눗셈을 하지 않는다', () => {
    const html = render({
      rows: [
        { key: 'z', rank: 1, name: '어딘가', value: 0, valueLabel: '0회' },
      ],
    })

    expect(html).toContain('width:0%')
    expect(html).not.toContain('NaN')
  })

  it('음수 값은 0으로 본다', () => {
    const html = render({
      rows: [
        { key: 'a', rank: 1, name: '가', value: 10, valueLabel: '10' },
        { key: 'b', rank: 2, name: '나', value: -5, valueLabel: '-5' },
      ],
    })

    expect(html).toContain('width:0%')
    expect(html).not.toContain('width:-')
  })

  it('href 가 있으면 링크로, 없으면 링크 없이 그린다', () => {
    expect(render()).not.toContain('<a ')
    expect(
      render({
        rows: [{ ...rows[0], href: '/analysis?districtCode=11680' }],
      }),
    ).toContain('href="/analysis?districtCode=11680"')
  })

  it('변화율 배지는 changeLabel 이 있을 때만 그린다', () => {
    expect(render()).not.toContain('+3.2%')
    expect(
      render({
        rows: [{ ...rows[0], changeLabel: '+3.2%', changeDirection: 'up' }],
      }),
    ).toContain('+3.2%')
  })

  it('강조 행에 aria-current 를 준다', () => {
    const html = render({ highlightKey: 'b' })

    expect(html).toContain('aria-current="true"')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm exec vitest run src/components/home/rank-bar-list.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `rank-bar-list.tsx` 를 쓴다**

막대 폭은 인라인 `style` 로 준다 — styled-components 의 동적 클래스는 SSR 문자열에서 폭을 확인할 수 없어 위 테스트가 성립하지 않는다.

```tsx
'use client'

import Link from 'next/link'
import styled from 'styled-components'

export type RankBarRow = {
  key: string
  rank: number
  name: string
  /** 막대 길이 계산에 쓰는 원값. 음수는 0 으로 본다. */
  value: number
  /** 포맷이 끝난 표시용 문자열. 이 부품은 포맷하지 않는다. */
  valueLabel: string
  changeLabel?: string
  changeDirection?: 'up' | 'down'
  href?: string
  ariaLabel?: string
}

export type RankBarListProps = {
  rows: readonly RankBarRow[]
  highlightKey?: string | null
  ariaLabel: string
}

const List = styled.ol`
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Row = styled.li<{ $highlighted: boolean }>`
  display: grid;
  grid-template-columns: 18px minmax(64px, auto) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  border-radius: var(--radius-control);
  background: ${p =>
    p.$highlighted ? 'var(--color-primary-100)' : 'transparent'};
`

const RowLink = styled(Link)`
  display: contents;
`

const Rank = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-caption);
`

const Name = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-900);
  white-space: nowrap;
`

const Track = styled.span`
  display: block;
  height: 14px;
  border-radius: var(--radius-control);
  background: var(--color-background-muted);
  overflow: hidden;
`

const Fill = styled.span`
  display: block;
  height: 100%;
  border-radius: var(--radius-control);
  background: var(--color-primary-600);
  transition: width var(--motion-slow) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Value = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-600);
  white-space: nowrap;
`

const Change = styled.span<{ $direction: 'up' | 'down' }>`
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${p =>
    p.$direction === 'up'
      ? 'var(--color-success-500)'
      : 'var(--color-error-500)'};
`

/** 1위 대비 비율. 최대값이 0 이하면 나눗셈을 하지 않는다(NaN 방지). */
export const barPercent = (value: number, max: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return Math.max(0, Math.min(100, (value / max) * 100))
}

export default function RankBarList({
  rows,
  highlightKey = null,
  ariaLabel,
}: RankBarListProps) {
  const max = Math.max(0, ...rows.map(row => (row.value > 0 ? row.value : 0)))

  return (
    <List aria-label={ariaLabel}>
      {rows.map(row => {
        const percent = barPercent(row.value, max)
        const body = (
          <>
            <Rank aria-hidden="true">{row.rank}</Rank>
            <Name>{row.name}</Name>
            <Track aria-hidden="true">
              <Fill style={{ width: `${percent}%` }} />
            </Track>
            <Value>
              {row.valueLabel}
              {row.changeLabel ? (
                <Change $direction={row.changeDirection ?? 'up'}>
                  {row.changeLabel}
                </Change>
              ) : null}
            </Value>
          </>
        )

        return (
          <Row
            key={row.key}
            $highlighted={row.key === highlightKey}
            aria-current={row.key === highlightKey ? 'true' : undefined}
          >
            {row.href ? (
              <RowLink href={row.href} aria-label={row.ariaLabel}>
                {body}
              </RowLink>
            ) : (
              body
            )}
          </Row>
        )
      })}
    </List>
  )
}
```

> `--color-success-500` / `--color-error-500` / `--color-background-muted` / `--radius-control` / `--motion-slow` 가 실제로 있는 변수인지 `src/styles/global-styles.ts` 에서 확인한다. 이름이 다르면 **거기 있는 이름으로 맞춘다**. 없는 변수를 새로 만들지 않는다.

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm exec vitest run src/components/home/rank-bar-list.test.ts`
Expected: PASS. `width:100%` 가 안 맞으면 React 가 낸 실제 인라인 스타일 문자열(공백 유무)을 확인해 테스트를 그 형태로 맞춘다.

- [ ] **Step 5: 커밋**

```bash
git add src/components/home/rank-bar-list.tsx src/components/home/rank-bar-list.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 홈 순위 막대 공용 부품

01단계 지표 랭킹·랭킹 섹션 좌우·03단계 추천이 전부 「순위 + 이름 + 막대 + 값」
이라 한 부품으로 통일한다. 여기만 Recharts 를 쓰면 한 화면에서 같은 개념이
두 가지로 그려지고, ResponsiveContainer 는 SSR 에서 폭이 0 이라 이 저장소의
문자열 assertion 으로 값을 검증할 수도 없다.

막대 폭은 인라인 style 로 준다 — styled-components 의 동적 클래스는 SSR
문자열에서 확인할 수 없다. 최대값이 0 이하면 나눗셈을 건너뛴다(NaN 방지).

포맷은 하지 않는다. 호출부가 status 포맷터로 만든 문자열을 넘긴다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 듀얼 랭킹 섹션

**Files:**

- Modify: `src/components/home/popular-districts.tsx`
- Test: `src/components/home/popular-districts.test.ts`

**Interfaces:**

- Consumes: `useDistrictTopTen`, `HOME_TOP_TEN_QUERY_KEY`, `toHomeMetricRankings`, `buildRankingInsight`, `RankBarList`, `formatStatusValue`, `formatStatusChange`, `formatViewCount`
- Produces: 없음

- [ ] **Step 1: 실패하는 테스트를 쓴다**

기존 `popular-districts.test.ts` 의 `render` 헬퍼를 두 쿼리를 채울 수 있게 넓히고 케이스를 더한다.

```ts
import { HOME_TOP_TEN_QUERY_KEY } from '@/hooks/use-district-top-ten'
import type { DistrictTopTenResponse } from '@/types/status'

const createTopTen = (success = true): DistrictTopTenResponse => ({
  dataHeader: {
    success,
    resultCode: null,
    resultMessage: null,
  },
  dataBody: {
    footTrafficTopTenItems: [
      {
        districtCode: '11140',
        districtName: '중구',
        totalFootTraffic: 1_900_000,
        footTrafficChangeRate: 3.2,
      },
      {
        districtCode: '11680',
        districtName: '강남구',
        totalFootTraffic: 1_800_000,
        footTrafficChangeRate: -1.1,
      },
    ],
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  },
})

// 기존 render 를 두 시드를 받게 바꾼다.
const render = (
  rankingSeed?: AnalysisRankingResponse,
  topTenSeed?: DistrictTopTenResponse,
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (rankingSeed) client.setQueryData(QUERY_KEY, rankingSeed)
  if (topTenSeed) client.setQueryData(HOME_TOP_TEN_QUERY_KEY, topTenSeed)

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PopularDistricts),
    ),
  )
}
```

케이스:

```ts
describe('PopularDistricts — 듀얼 랭킹', () => {
  const rankings = createResponse([
    { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1284 },
    { rank: 2, areaCode: '11440', areaName: '마포구', viewCount: 1102 },
  ])

  it('두 순위가 다 있으면 좌우를 모두 그리고 인사이트를 낸다', () => {
    const html = render(rankings, createTopTen())

    expect(html).toContain('강남구')
    expect(html).toContain('유동인구')
    // 중구는 지표 1위인데 조회수 목록에 없다 → 규칙 A
    expect(html).toContain('중구')
    expect(html).toContain('들지 않았습니다')
  })

  it('지표 쪽 변화율에는 부호를 붙인다', () => {
    const html = render(rankings, createTopTen())

    expect(html).toContain('+3.2%')
  })

  it('조회수 쪽에는 변화율을 붙이지 않는다', () => {
    // 조회수 집계에 전기가 없다. 0 으로 채우면 「변동 없음」이라는 틀린 말이 된다.
    const html = render(rankings, createTopTen())
    const viewSection = html.slice(0, html.indexOf('유동인구'))

    expect(viewSection).not.toContain('%')
  })

  it('지표가 죽으면 좌측만 그리고 인사이트를 내지 않는다', () => {
    const html = render(rankings)

    expect(html).toContain('강남구')
    expect(html).not.toContain('유동인구')
    expect(html).not.toContain('들지 않았습니다')
  })

  it('조회수가 죽으면 우측만 그린다', () => {
    const html = render(undefined, createTopTen())

    expect(html).toContain('유동인구')
    expect(html).not.toContain('href="/analysis?districtCode=11680"')
  })

  it('둘 다 죽으면 섹션을 통째로 뺀다', () => {
    // 홈은 랜딩 내러티브라 오류 카드가 서 있으면 첫인상이 고장난 서비스가 된다.
    const failed = createResponse([], { success: false })
    const html = render(failed)

    expect(html).toBe('')
  })
})
```

> 기존 테스트들이 `render(seed)` 를 한 인자로 부르고 있으므로, 두 번째 인자를 선택값으로 두면 그대로 통과한다. 실패하면 기존 케이스를 먼저 통과시킨 뒤 진행한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm exec vitest run src/components/home/popular-districts.test.ts`
Expected: FAIL — `유동인구` 없음

- [ ] **Step 3: 섹션을 재구성한다**

`popular-districts.tsx` 를 고친다. **기존에 잘 되어 있는 것은 건드리지 않는다** — 좌측 항목의 `href`, `aria-label` 문구, `formatViewCount`, `RANKING_SIZE = 8`, 스켈레톤, 실패 시 `return null`.

바뀌는 것:

1. `useDistrictTopTen()` 을 추가로 호출한다.
2. 지표 토글 상태를 `useState<HomeMetric>('footTraffic')` 로 둔다(URL 에 싣지 않는다 — 홈은 공유 대상 상태가 없다).
3. 좌우 2단 그리드 + `min-height: 100dvh`.
4. 좌측 카드 그리드를 `RankBarList` 로 바꾼다.
5. 인사이트 문장은 양쪽이 다 있을 때만 그린다.

```tsx
const Section = styled.section`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 20px;

  /* 900px 이하에서는 2단이 1단으로 접힌다. 두 목록을 한 화면에 넣으면 글자가 안 읽힌다. */
  @media (max-width: 900px) {
    min-height: auto;
    padding: 56px 20px;
  }

  @media (max-width: 640px) {
    padding: 48px 16px;
  }
`

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const Insight = styled.p`
  margin-top: 20px;
  padding: 14px 16px;
  border: 1px dashed var(--color-primary-600);
  border-radius: var(--radius-card);
  background: var(--color-primary-100);
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-700);
  word-break: keep-all;
`
```

본문 로직:

```tsx
const metricQuery = useDistrictTopTen()

const [metric, setMetric] = useState<HomeMetric>('footTraffic')

const metricRankings =
  metricQuery.data && isApiSuccess(metricQuery.data)
    ? toHomeMetricRankings(metricQuery.data.dataBody)
    : null

const activeMetric =
  metricRankings?.find(entry => entry.metric === metric) ?? null

// 두 순위의 차이를 말하는 문장이므로 양쪽이 다 있을 때만 만들 수 있다.
const insight =
  view && activeMetric ? buildRankingInsight(view.items, activeMetric) : null

// 조회수도 지표도 없으면 섹션 자체가 할 말이 없다.
if (!view && !activeMetric) return null
```

좌측 행 만들기(변화율 **없음**):

```tsx
const viewRows: RankBarRow[] = (view?.items ?? []).map(item => ({
  key: item.districtCode,
  rank: item.rank,
  name: item.name,
  value: item.viewCount,
  valueLabel: formatViewCount(item.viewCount),
  href: item.href,
  ariaLabel: `${item.rank}위 ${item.name}, 조회 ${item.viewCount.toLocaleString('ko-KR')}회${
    view?.windowLabel ? ` (${view.windowLabel})` : ''
  }. 이 자치구로 상권분석 시작하기`,
}))
```

우측 행 만들기(변화율 **있음**):

```tsx
const metricRows: RankBarRow[] = (activeMetric?.items ?? []).map(item => ({
  key: item.districtCode,
  rank: item.rank,
  name: item.districtName,
  value: item.value,
  valueLabel: formatStatusValue(activeMetric!.metric, item.value),
  changeLabel: formatStatusChange(item.changeRate),
  changeDirection: item.changeRate >= 0 ? 'up' : 'down',
}))
```

제목을 바꾼다.

```tsx
<Title>다른 사람들이 보는 곳과, 숫자가 좋은 곳은 다릅니다.</Title>
```

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm exec vitest run src/components/home/popular-districts.test.ts`
Expected: PASS (기존 케이스 포함 전부)

- [ ] **Step 5: 슬라이스 2 전체 검증**

Run: `pnpm test && pnpm lint`
Expected: 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add src/components/home/popular-districts.tsx src/components/home/popular-districts.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 인기 지역 섹션을 듀얼 랭킹으로 바꾼다

섹션이 422px 로 꺼져 있었고(뷰포트 900px), 4열 균등 카드라 1위와 8위가
시각적으로 동등했다. 순위표의 유일한 값어치인 격차가 안 읽혔다.

높이를 늘리는 게 해법이 아니다 — 지금 콘텐츠로 900px 을 채우면 여백만
900px 이 된다. GET /districts/top-ten 을 붙여 「사람들이 보는 곳」과
「숫자가 좋은 곳」을 나란히 놓고, 두 목록의 불일치를 문장으로 낸다.

변화율은 top-ten 쪽에만 붙인다. 조회수 집계에는 전기가 없어서 0 으로
채우면 「변동 없음」이라는 틀린 말이 된다(기존 판단 승계).

두 쿼리는 독립적으로 실패한다. 한쪽만 살아 있으면 그쪽만 그리고,
인사이트는 양쪽이 다 있을 때만 만들 수 있다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

# 슬라이스 3 — 스토리 실데이터

## Task 8: 01단계를 지도에서 지표 랭킹으로

**Files:**

- Create: `src/components/home/metric-ranking-board.tsx`
- Modify: `src/components/home/story-steps.ts`
- Modify: `src/components/home/product-story.tsx`
- Test: `src/components/home/metric-ranking-board.test.ts`, `src/components/home/product-story.test.ts`

**Interfaces:**

- Consumes: `useDistrictTopTen`, `toHomeMetricRankings`, `HOME_METRIC_FALLBACK`, `HOME_METRICS`, `homeMetricLabel`, `RankBarList`, `formatStatusValue`, `formatStatusChange`
- Produces: `StoryDemo` 에 `'metrics'` 추가, `'map'` 제거

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/home/metric-ranking-board.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import MetricRankingBoard from '@/components/home/metric-ranking-board'
import { HOME_TOP_TEN_QUERY_KEY } from '@/hooks/use-district-top-ten'
import type { DistrictTopTenResponse } from '@/types/status'

const seed: DistrictTopTenResponse = {
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    footTrafficTopTenItems: [
      {
        districtCode: '11680',
        districtName: '강남구',
        totalFootTraffic: 1_842_000,
        footTrafficChangeRate: 3.2,
      },
    ],
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  },
}

const render = (data?: DistrictTopTenResponse) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  if (data) client.setQueryData(HOME_TOP_TEN_QUERY_KEY, data)

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MetricRankingBoard),
    ),
  )
}

describe('MetricRankingBoard', () => {
  it('지도를 그리지 않는다', () => {
    // 히어로가 이미 같은 지도를 그린다. 여기서 또 그리면 왔던 곳을 다시 안내하는 셈이다.
    const html = render(seed)

    expect(html).not.toContain('<svg')
  })

  it('지표 토글 3종을 낸다', () => {
    const html = render(seed)

    expect(html).toContain('유동인구')
    expect(html).toContain('매출')
    expect(html).toContain('개업')
  })

  it('폐업 토글은 없다', () => {
    expect(render(seed)).not.toContain('폐업')
  })

  it('실 데이터가 오면 그린다', () => {
    expect(render(seed)).toContain('강남구')
  })

  it('top-ten 이 죽어도 단계가 비지 않는다', () => {
    // 스토리에서 한 단계만 사라지면 번호 01~04 에 구멍이 난다.
    const html = render()

    expect(html).toContain('유동인구')
    expect(html.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm exec vitest run src/components/home/metric-ranking-board.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `metric-ranking-board.tsx` 를 쓴다**

```tsx
'use client'

import { useState } from 'react'
import styled from 'styled-components'

import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'
import { useDistrictTopTen } from '@/hooks/use-district-top-ten'
import { isApiSuccess } from '@/lib/api/response'
import {
  HOME_METRICS,
  HOME_METRIC_FALLBACK,
  homeMetricLabel,
  toHomeMetricRankings,
  type HomeMetric,
} from '@/lib/home/metric-rankings'
import {
  formatStatusChange,
  formatStatusValue,
} from '@/lib/status/status-formatters'

const Toggles = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`

const Toggle = styled.button<{ $active: boolean }>`
  border: 1px solid
    ${p => (p.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)')};
  background: ${p =>
    p.$active ? 'var(--color-primary-600)' : 'var(--color-surface)'};
  color: ${p => (p.$active ? '#ffffff' : 'var(--color-text-600)')};
  border-radius: var(--radius-pill);
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

const Sample = styled.p`
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-caption);
`

export default function MetricRankingBoard() {
  const query = useDistrictTopTen()
  const [metric, setMetric] = useState<HomeMetric>('footTraffic')

  /*
    top-ten 이 죽어도 단계를 비우지 않는다 — 스토리에서 한 단계만 사라지면
    번호 01~04 에 구멍이 난다. 폴백은 실 데이터와 모양이 같아 분기가 없다.
  */
  const rankings =
    query.data && isApiSuccess(query.data)
      ? toHomeMetricRankings(query.data.dataBody)
      : HOME_METRIC_FALLBACK
  const isFallback = !(query.data && isApiSuccess(query.data))

  const active = rankings.find(entry => entry.metric === metric) ?? rankings[0]

  const rows: RankBarRow[] = active.items.map(item => ({
    key: item.districtCode,
    rank: item.rank,
    name: item.districtName,
    value: item.value,
    valueLabel: formatStatusValue(active.metric, item.value),
    changeLabel: formatStatusChange(item.changeRate),
    changeDirection: item.changeRate >= 0 ? 'up' : 'down',
  }))

  return (
    <div>
      <Toggles role="group" aria-label="지표 선택">
        {HOME_METRICS.map(item => (
          <Toggle
            key={item}
            type="button"
            $active={item === active.metric}
            aria-pressed={item === active.metric}
            onClick={() => setMetric(item)}
          >
            {homeMetricLabel(item)}
          </Toggle>
        ))}
      </Toggles>
      <RankBarList
        rows={rows}
        ariaLabel={`자치구 ${active.label} 상위 ${rows.length}곳`}
      />
      {isFallback ? <Sample>대표 예시 데이터</Sample> : null}
    </div>
  )
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm exec vitest run src/components/home/metric-ranking-board.test.ts`
Expected: PASS

- [ ] **Step 5: 01단계 상수를 바꾸는 테스트를 쓴다**

`src/components/home/product-story.test.ts` 에 추가:

```ts
describe('STORY_STEPS — 01단계 히어로 재탕 제거', () => {
  it('01단계는 지도를 데모로 쓰지 않는다', () => {
    // 히어로가 같은 SeoulDistrictsMap 을 이미 그린다.
    expect(STORY_STEPS[0].demo).not.toBe('map')
  })

  it('01단계 본문이 지표로 줄 세운다고 말한다', () => {
    expect(STORY_STEPS[0].body).toContain('유동인구')
  })

  it('01단계 CTA 목적지는 그대로다', () => {
    expect(STORY_STEPS[0].cta?.href).toBe('/status')
  })
})
```

- [ ] **Step 6: 실패를 확인한다**

Run: `pnpm exec vitest run src/components/home/product-story.test.ts`
Expected: FAIL — `demo` 가 여전히 `'map'`

- [ ] **Step 7: `story-steps.ts` 와 `product-story.tsx` 를 고친다**

`story-steps.ts`:

```ts
export type StoryDemo = 'metrics' | 'mini-demo' | 'recommend' | 'simulation'
```

```ts
  {
    step: '01',
    title: '현황 확인',
    body: '서울 25개 자치구를 유동인구·매출·개업 수로 줄 세워 어디부터 볼지 정합니다.',
    demo: 'metrics',
    cta: { href: '/status', label: '구별 현황 보기' },
  },
```

`product-story.tsx` 의 `DemoPanel`:

```tsx
function DemoPanel({ demo }: { demo: StoryDemo }) {
  if (demo === 'metrics') return <MetricRankingBoard />
  if (demo === 'mini-demo') return <AnalysisMiniDemo />
  if (demo === 'recommend') return <RecommendPreview />
  return <CostWaterfall />
}
```

`SeoulDistrictsMap` import 를 지운다. **컴포넌트 파일 자체는 지우지 않는다** — 히어로가 쓴다.

`PanelCard` 의 「대표 예시 데이터」 라벨 분기를 고친다. 01·02·03 은 각자 라벨을 들고 있으므로 여기서는 그리지 않는다.

```tsx
{
  /*
  각 데모가 자기 라벨을 들고 있다 — 미니데모는 SampleBadge, 지표 보드와 추천
  미리보기는 폴백일 때만 붙인다(실 데이터인데 「예시」라고 적으면 거짓말이다).
  워터폴만 항상 예시라 여기서 그린다.
*/
}
{
  demo === 'simulation' ? <SampleLabel>대표 예시 데이터</SampleLabel> : null
}
```

> `RecommendPreview` 와 `CostWaterfall` 은 Task 9·10 에서 만든다. 이 단계에서는
> `demo === 'recommend'` / 기본 분기를 **기존 `BarChart` 코드 그대로 두고**, 01 분기만
> 바꾼다. Task 10 에서 마지막으로 교체한다. `import BarChart` 도 그때 지운다.

- [ ] **Step 8: 통과를 확인한다**

Run: `pnpm exec vitest run src/components/home/`
Expected: PASS

- [ ] **Step 9: 커밋**

```bash
git add src/components/home/metric-ranking-board.tsx src/components/home/metric-ranking-board.test.ts src/components/home/story-steps.ts src/components/home/product-story.tsx src/components/home/product-story.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 01단계를 히어로 지도 재탕에서 지표 랭킹으로 바꾼다

히어로와 스토리 01단계가 같은 SeoulDistrictsMap 을 그리고 있었다. 착시가
아니라 문자 그대로 동일 컴포넌트다. 게다가 히어로 지도는 조작이 되는데
여기서는 같은 그림을 다시 보여주며 「구별 현황 보기」로 나가라고 했다.

Task 4 의 공유 쿼리를 쓰므로 top-ten 호출은 늘지 않는다. 죽으면 예시로
폴백한다 — 단계가 사라지면 번호 01~04 에 구멍이 난다.

SeoulDistrictsMap 은 히어로가 쓰므로 참조만 뺀다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 03단계 추천 미리보기

**Files:**

- Modify: `src/lib/api/recommend.ts` (시드 상수만 추가)
- Create: `src/lib/home/recommend-preview.ts`
- Create: `src/components/home/recommend-preview.tsx`
- Test: `src/lib/home/recommend-preview.test.ts`, `src/components/home/recommend-preview.test.ts`

**Interfaces:**

- Consumes: `fetchCommercials`, `fetchCommercialRecommendations`, `RECOMMENDATION_PERIOD_CODE`, `RECOMMENDATION_TOP_N` (`src/lib/api/recommend.ts`), `RankBarList`
- Produces:
  - `HOME_RECOMMEND_SEED: { districtCode; administrationCode; serviceCode; label }`
  - `type RecommendPreviewRow = { key: string; rank: number; name: string; score: number; scoreLabel: string }`
  - `type RecommendPreviewView = { rows: RecommendPreviewRow[]; reason: string | null; isSample: boolean }`
  - `toRecommendPreview(body): RecommendPreviewView`
  - `RECOMMEND_PREVIEW_FALLBACK: RecommendPreviewView`

- [ ] **Step 1: 시드 상수를 넣는다**

`src/lib/api/recommend.ts` 끝에 추가한다. **값은 dev 백엔드로 실제 호출해 확인한 것이다**
(`11680` → `11680640` → 상권 14곳 → 추천 5건, `success: true`).

```ts
/**
 * 홈 03단계 데모가 쓰는 고정 시드.
 *
 * 방문자 지역과 무관한 고정값이므로 **화면에 지역명을 반드시 적는다** — 안 적으면
 * 사용자가 자기 지역 결과로 오해한다. 코드가 개편되면 폴백이 동작하지만,
 * 그때 고칠 자리가 한 곳이어야 하므로 여기에만 둔다.
 */
export const HOME_RECOMMEND_SEED = {
  districtCode: '11680', // 강남구
  administrationCode: '11680640', // 역삼1동
  serviceCode: 'CS100010', // 커피-음료
  label: '강남구 역삼1동 · 커피-음료',
} as const
```

- [ ] **Step 2: 뷰모델 테스트를 쓴다**

`src/lib/home/recommend-preview.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  RECOMMEND_PREVIEW_FALLBACK,
  toRecommendPreview,
} from '@/lib/home/recommend-preview'

const body = {
  serviceCode: 'CS100010',
  periodCode: '20233',
  topN: 5,
  items: [
    {
      rank: 1,
      commercialCode: '3120197',
      commercialName: '역삼역',
      compositeScore: 83.99470969264185,
      selectionReason: '공격형 기준으로 기회도 높음을 우선 반영했습니다.',
    },
    {
      rank: 2,
      commercialCode: '3110958',
      commercialName: '역삼역 4번',
      compositeScore: 71.2,
      selectionReason: '두 번째 이유',
    },
  ],
}

describe('toRecommendPreview', () => {
  it('순위·이름·점수를 옮긴다', () => {
    const view = toRecommendPreview(body as never)

    expect(view.rows[0]).toMatchObject({
      rank: 1,
      name: '역삼역',
      score: 83.99470969264185,
    })
  })

  it('점수를 소수 첫째 자리까지 적는다', () => {
    expect(toRecommendPreview(body as never).rows[0].scoreLabel).toBe('84.0점')
  })

  it('1위의 추천 이유만 쓴다', () => {
    const view = toRecommendPreview(body as never)

    expect(view.reason).toBe('공격형 기준으로 기회도 높음을 우선 반영했습니다.')
  })

  it('items 가 비면 예시로 본다', () => {
    const view = toRecommendPreview({ ...body, items: [] } as never)

    expect(view.isSample).toBe(true)
    expect(view.rows.length).toBeGreaterThan(0)
  })

  it('점수가 null 인 행은 버린다', () => {
    // 막대 길이를 정할 수 없어 목록 안에서 혼자 죽은 행이 된다.
    const view = toRecommendPreview({
      ...body,
      items: [body.items[0], { ...body.items[1], compositeScore: null }],
    } as never)

    expect(view.rows).toHaveLength(1)
    expect(view.isSample).toBe(false)
  })

  it('점수 있는 행이 하나도 없으면 예시로 간다', () => {
    const view = toRecommendPreview({
      ...body,
      items: body.items.map(item => ({ ...item, compositeScore: null })),
    } as never)

    expect(view.isSample).toBe(true)
  })

  it('selectionReason 이 없으면 이유를 비운다', () => {
    const view = toRecommendPreview({
      ...body,
      items: [{ ...body.items[0], selectionReason: null }],
    } as never)

    expect(view.reason).toBeNull()
  })
})

describe('RECOMMEND_PREVIEW_FALLBACK', () => {
  it('예시 표시가 켜져 있다', () => {
    expect(RECOMMEND_PREVIEW_FALLBACK.isSample).toBe(true)
    expect(RECOMMEND_PREVIEW_FALLBACK.rows).toHaveLength(5)
  })
})
```

- [ ] **Step 3: 실패를 확인한다**

Run: `pnpm exec vitest run src/lib/home/recommend-preview.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 4: `recommend-preview.ts` 를 쓴다**

`CandidateCommercialsResponse` 의 `dataBody` 실제 타입 이름을 `src/types/recommend.ts` 에서 확인해 `toRecommendPreview` 의 인자 타입에 쓴다. `as never` 는 테스트에서만 쓰고 구현에는 쓰지 않는다.

```ts
import type { CandidateCommercials } from '@/types/recommend'

export type RecommendPreviewRow = {
  key: string
  rank: number
  name: string
  score: number
  scoreLabel: string
}

export type RecommendPreviewView = {
  rows: RecommendPreviewRow[]
  /** 1위의 추천 이유. 없으면 null — 문장을 지어내지 않는다. */
  reason: string | null
  isSample: boolean
}

const formatScore = (score: number): string =>
  `${(Math.round(score * 10) / 10).toFixed(1)}점`

/** 추천이 죽거나 비었을 때 03단계가 쓰는 예시. 실 데이터와 모양이 같다. */
export const RECOMMEND_PREVIEW_FALLBACK: RecommendPreviewView = {
  rows: [
    { key: 's1', rank: 1, name: '역삼역', score: 92, scoreLabel: '92.0점' },
    {
      key: 's2',
      rank: 2,
      name: '선정릉역 4번',
      score: 88,
      scoreLabel: '88.0점',
    },
    { key: 's3', rank: 3, name: '국기원', score: 85, scoreLabel: '85.0점' },
    { key: 's4', rank: 4, name: '언주역 8번', score: 83, scoreLabel: '83.0점' },
    { key: 's5', rank: 5, name: '역삼역 8번', score: 79, scoreLabel: '79.0점' },
  ],
  reason: null,
  isSample: true,
}

export const toRecommendPreview = (
  body: CandidateCommercials,
): RecommendPreviewView => {
  /*
    `compositeScore` 는 `number | null` 이다. 점수 없는 행은 막대 길이를 정할 수
    없어 목록 안에서 혼자 죽은 행이 되므로 **버린다**. 전부 버려지면 예시로 간다
    — 「추천 0건」을 그리느니 예시가 낫다(스토리 단계가 비면 번호에 구멍이 난다).
  */
  const scored = (body.items ?? []).filter(
    (item): item is typeof item & { compositeScore: number } =>
      typeof item.compositeScore === 'number' &&
      Number.isFinite(item.compositeScore),
  )

  if (scored.length === 0) return RECOMMEND_PREVIEW_FALLBACK

  return {
    rows: scored.map(item => ({
      key: item.commercialCode,
      rank: item.rank,
      name: item.commercialName,
      score: item.compositeScore,
      scoreLabel: formatScore(item.compositeScore),
    })),
    reason: scored[0].selectionReason?.trim() || null,
    isSample: false,
  }
}
```

- [ ] **Step 5: 통과를 확인한다**

Run: `pnpm exec vitest run src/lib/home/recommend-preview.test.ts`
Expected: PASS

- [ ] **Step 6: 컴포넌트 테스트를 쓴다**

`src/components/home/recommend-preview.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import RecommendPreview from '@/components/home/recommend-preview'
import type { CandidateCommercialsResponse } from '@/types/recommend'

/** 구현의 쿼리 키와 문자 그대로 같아야 한다. */
const PREVIEW_KEY = ['home', 'recommendPreview']

const createRecommendations = (): CandidateCommercialsResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    serviceCode: 'CS100010',
    periodCode: '20233',
    preset: { code: 'AGGRESSIVE_OPPORTUNITY', name: '공격형', description: '' },
    priorityMetric: {
      code: 'OPPORTUNITY_SCORE',
      name: '기회도',
      description: '',
      scoreDescription: '',
    },
    topN: 5,
    summary: '',
    items: [
      {
        rank: 1,
        commercialCode: '3120197',
        commercialName: '역삼역',
        compositeScore: 83.99,
        grade: 'HIGH',
        summaryLabel: '공격형 추천',
        selectionReason: '공격형 기준으로 기회도 높음을 우선 반영했습니다.',
        opportunityLabel: '기회도 높음',
        riskLabel: '위험도 보통',
        metricBreakdown: [],
        reasonTags: [],
      },
    ],
  },
})

const render = (recommendations?: CandidateCommercialsResponse) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (recommendations) client.setQueryData(PREVIEW_KEY, recommendations)

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(RecommendPreview),
    ),
  )
}

describe('RecommendPreview', () => {
  it('시드 지역명을 화면에 적는다', () => {
    // 고정 시드라 방문자 지역과 무관하다. 안 적으면 자기 지역 결과로 오해한다.
    expect(render()).toContain('강남구 역삼1동 · 커피-음료')
  })

  it('추천이 죽으면 예시 5행과 예시 라벨을 그린다', () => {
    const html = render()

    expect(html).toContain('역삼역')
    expect(html).toContain('대표 예시 데이터')
  })

  it('실 응답이 오면 추천 이유 문장을 그리고 예시 라벨을 뺀다', () => {
    const html = render(createRecommendations())

    expect(html).toContain('기회도 높음을 우선 반영했습니다')
    expect(html).not.toContain('대표 예시 데이터')
  })
})
```

> `ScoreMetricMetadata` 의 실제 필드가 위와 다르면 `src/types/recommend.ts` 를 보고 맞춘다.
> 시드 쿼리(`['home','recommendSeed']`)는 채우지 않는다 — `enabled` 가 꺼져도
> `recommendPreview` 캐시가 있으면 성공 분기가 그려진다.

- [ ] **Step 7: `recommend-preview.tsx` 를 쓴다**

두 쿼리를 연쇄한다. `staleTime` 은 30분 — 고정 시드라 사람마다 다를 이유가 없다.

```tsx
const seedQuery = useQuery({
  queryKey: ['home', 'recommendSeed'],
  queryFn: () =>
    fetchCommercials(
      HOME_RECOMMEND_SEED.districtCode,
      HOME_RECOMMEND_SEED.administrationCode,
    ),
  retry: retryUnlessClientError(1),
  staleTime: 30 * 60 * 1000,
})

const commercialCodes =
  seedQuery.data && isApiSuccess(seedQuery.data)
    ? seedQuery.data.dataBody.map(area => area.commercialCode)
    : []

const previewQuery = useQuery({
  queryKey: ['home', 'recommendPreview'],
  queryFn: () =>
    fetchCommercialRecommendations({
      serviceCode: HOME_RECOMMEND_SEED.serviceCode,
      commercialCodes,
      periodCode: RECOMMENDATION_PERIOD_CODE,
      topN: RECOMMENDATION_TOP_N,
    }),
  enabled: commercialCodes.length > 0,
  retry: retryUnlessClientError(1),
  staleTime: 30 * 60 * 1000,
})

const view =
  previewQuery.data && isApiSuccess(previewQuery.data)
    ? toRecommendPreview(previewQuery.data.dataBody)
    : RECOMMEND_PREVIEW_FALLBACK
```

렌더:

```tsx
<div>
  <SeedLabel>{HOME_RECOMMEND_SEED.label}</SeedLabel>
  <RankBarList
    rows={view.rows}
    ariaLabel={`추천 상권 상위 ${view.rows.length}곳`}
  />
  {view.reason ? <Reason>{view.reason}</Reason> : null}
  {view.isSample ? <Sample>대표 예시 데이터</Sample> : null}
</div>
```

`RankBarList` 가 받을 행은 `RecommendPreviewRow` 를 옮긴 것이다:

```tsx
rows={view.rows.map(row => ({
  key: row.key,
  rank: row.rank,
  name: row.name,
  value: row.score,
  valueLabel: row.scoreLabel,
}))}
```

- [ ] **Step 8: 통과를 확인한다**

Run: `pnpm exec vitest run src/components/home/recommend-preview.test.ts src/lib/home/recommend-preview.test.ts`
Expected: PASS

- [ ] **Step 9: 커밋**

```bash
git add src/lib/api/recommend.ts src/lib/home/recommend-preview.ts src/lib/home/recommend-preview.test.ts src/components/home/recommend-preview.tsx src/components/home/recommend-preview.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 03단계 추천 데모를 실 API 로 바꾼다

고정 시드(강남구 역삼1동·커피-음료)로 상권 목록 → 추천을 연쇄 호출한다.
dev 백엔드로 실제 확인한 경로다.

응답이 compositeScore 뿐 아니라 selectionReason 을 주므로 「왜 이 상권인가」를
서비스가 직접 말한다. 정적 막대에서 가장 크게 달라지는 지점이다.

시드 지역명을 화면에 적는다 — 방문자 지역과 무관한 고정값이라 안 적으면
자기 지역 결과로 오해한다.

실패·빈 응답이면 예시로 폴백하고 라벨을 붙인다. 실 데이터인데 「예시」라고
적으면 거짓말이므로 폴백일 때만 붙인다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 04단계 손익 워터폴

실 API 를 쓰지 않는다. `POST /simulations/reports` 는 쓰기 동사이고 `store-sizes` GET 이 선행돼야 해서, 랜딩 방문자마다 계산 요청이 나가게 된다.

**Files:**

- Create: `src/components/home/cost-waterfall.tsx`
- Modify: `src/components/home/product-story.tsx` (`BarChart` 분기 제거)
- Test: `src/components/home/cost-waterfall.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import CostWaterfall from '@/components/home/cost-waterfall'

const render = () => renderToStaticMarkup(createElement(CostWaterfall))

describe('CostWaterfall', () => {
  it('매출에서 비용을 빼 순이익에 이르는 5칸을 그린다', () => {
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
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm exec vitest run src/components/home/cost-waterfall.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `cost-waterfall.tsx` 를 쓴다**

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
const STEPS = [
  { key: 'revenue', label: '월매출', amount: 4200, kind: 'base' },
  { key: 'rent', label: '임차료', amount: 1050, kind: 'cost' },
  { key: 'labor', label: '인건비', amount: 1200, kind: 'cost' },
  { key: 'etc', label: '기타', amount: 350, kind: 'cost' },
  { key: 'net', label: '순이익', amount: 1600, kind: 'net' },
] as const

const MAX = 4200

const Wrap = styled.div`
  display: grid;
  gap: 10px;
`

const Row = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 160px;
`

const Column = styled.div`
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
`

const Amount = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-700);
`

const Bar = styled.span<{ $kind: 'base' | 'cost' | 'net' }>`
  display: block;
  width: 100%;
  border-radius: var(--radius-control) var(--radius-control) 0 0;
  background: ${p =>
    p.$kind === 'net'
      ? 'var(--color-primary-600)'
      : p.$kind === 'cost'
        ? 'var(--color-border-200)'
        : 'var(--color-primary-100)'};
  transition: height var(--motion-slow) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Label = styled.span`
  font-size: 12px;
  color: var(--color-text-600);
  white-space: nowrap;
`

const Caption = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--color-text-caption);
`

export default function CostWaterfall() {
  return (
    <Wrap>
      <Row
        role="img"
        aria-label="월 손익 구조 예시. 월매출 4,200만원에서 임차료·인건비·기타를 빼면 순이익 1,600만원입니다."
      >
        {STEPS.map(step => (
          <Column key={step.key}>
            <Amount aria-hidden="true">
              {step.amount.toLocaleString('ko-KR')}
            </Amount>
            <Bar
              aria-hidden="true"
              $kind={step.kind}
              style={{ height: `${(step.amount / MAX) * 100}%` }}
            />
            <Label aria-hidden="true">{step.label}</Label>
          </Column>
        ))}
      </Row>
      <Caption>단위: 만원 · 대표 예시 데이터</Caption>
    </Wrap>
  )
}
```

> `--radius-control` · `--motion-slow` · `--ease-standard` · `--color-primary-100` 이
> 실제로 있는 변수인지 `src/styles/global-styles.ts` 에서 확인하고, 이름이 다르면
> **거기 있는 이름으로 맞춘다.** 없는 변수를 새로 만들지 않는다.

- [ ] **Step 4: 통과를 확인한다**

Run: `pnpm exec vitest run src/components/home/cost-waterfall.test.ts`
Expected: PASS

- [ ] **Step 5: `product-story.tsx` 에서 `BarChart` 를 뺀다**

`DemoPanel` 을 Task 8 Step 7 에 적은 최종 형태로 만들고, `import BarChart` 와
`SampleLabel` 의 이전 분기를 정리한다.

```tsx
function DemoPanel({ demo }: { demo: StoryDemo }) {
  if (demo === 'metrics') return <MetricRankingBoard />
  if (demo === 'mini-demo') return <AnalysisMiniDemo />
  if (demo === 'recommend') return <RecommendPreview />
  return <CostWaterfall />
}
```

- [ ] **Step 6: 슬라이스 3 전체 검증**

Run: `pnpm test && pnpm lint && pnpm exec tsc --noEmit --incremental false`
Expected: 전부 통과. `BarChart` 미사용 import 가 남아 있으면 lint 가 잡는다.

- [ ] **Step 7: 커밋**

```bash
git add src/components/home/cost-waterfall.tsx src/components/home/cost-waterfall.test.ts src/components/home/product-story.tsx
git commit -m "$(cat <<'EOF'
[FE] feat: 04단계를 손익 워터폴로 바꾼다

막대 3개(월매출/고정비/순이익)로는 비용 구조가 안 보였다. 매출에서 임차료·
인건비·기타를 빼 순이익에 이르는 5칸으로 바꾼다.

실 API 는 붙이지 않는다. POST /simulations/reports 는 쓰기 동사이고
store-sizes GET 이 선행돼야 해서 랜딩 방문자마다 계산 요청이 나간다.
「대표 예시 데이터」 라벨을 유지한다.

홈에서 Recharts BarChart 참조가 사라진다. 순위 막대는 RankBarList 로 통일했다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

# 슬라이스 4 — 검증과 마무리

## Task 11: 브라우저 실측 검증 + 문서 갱신

이 계획의 출발점이 실측값이었으므로, 끝도 실측이어야 한다.

**Files:**

- Modify: `docs/features/_index.md` (home 행 상태)
- Modify: `docs/features/home/story-and-rankings.md` (상태: 초안 → 구현 완료)

- [ ] **Step 1: 전체 검증을 돌린다**

Run: `pnpm test && pnpm qa:verify`
Expected: 전부 통과. **실행하지 않고 통과했다고 적지 않는다.**

- [ ] **Step 2: dev 서버를 띄운다**

`.claude/launch.json` 의 설정으로 `preview_start` 를 쓴다. 워크트리 경로가 다르면 먼저 고친다.

```json
{
  "name": "bosspick-home-dev",
  "runtimeExecutable": "sh",
  "runtimeArgs": [
    "-c",
    "cd / && cd <워크트리>/frontend && exec ./node_modules/.bin/next dev -p 5178"
  ],
  "port": 5178
}
```

> 브라우저 pane 이 **숨겨져 있으면 하이드레이션이 돌지 않는다** — 스크린샷이 백지로 나오고
> `innerWidth` 가 0 이 된다. 측정 전에 pane 이 표시 상태인지 `tabs_context` 로 확인한다.

- [ ] **Step 3: B1 — CTA 높이를 잰다**

뷰포트를 1440×900 으로 맞추고, 스토리 03·04단계가 활성화된 스크롤 위치에서 각각 잰다.

```js
;[...document.querySelectorAll('a')]
  .filter(a => /시뮬레이션 해보기|추천받기/.test(a.innerText))
  .map(a => ({
    t: a.innerText.trim(),
    h: Math.round(a.getBoundingClientRect().height),
  }))
```

Expected: 두 버튼 모두 `h: 48`

- [ ] **Step 4: B2·B3 — 랭킹 섹션 높이를 잰다**

```js
const s = [...document.querySelectorAll('main > section')]
s.map(e => Math.round(e.getBoundingClientRect().height))
```

Expected: 1440×900 에서 랭킹 섹션 ≥ 900. 375 폭으로 줄이면 100dvh 가 아니다.

- [ ] **Step 5: B4 — 네트워크 요청을 확인한다**

`read_network_requests` 로 `/api/bff` 요청을 본다.

Expected: GET 4종(`analysis-rankings`, `districts/top-ten`, `commercials`, `recommendations`). **`districts/top-ten` 은 1회**(01단계와 랭킹이 공유). **POST 0회.**

- [ ] **Step 6: B5 — 콘솔을 확인한다**

`read_console_messages` (onlyErrors)
Expected: 오류 0

- [ ] **Step 7: 실측값이 기대와 다르면 고친다**

여기서 발견한 것은 **코드를 고쳐서** 해결한다. 명세의 기대값을 실측에 맞춰 낮추지 않는다.

- [ ] **Step 8: 문서를 갱신한다**

`docs/features/home/story-and-rankings.md` 의 `상태: 초안` → `상태: 구현 완료`.
D0-1 실측 표 아래에 **개편 후 실측값**을 한 줄씩 덧붙인다.

`docs/features/_index.md` 의 home 행에 구현 완료를 적는다.

- [ ] **Step 9: 커밋**

```bash
git add docs/
git commit -m "$(cat <<'EOF'
[FE] docs: 홈 개편 명세 상태를 구현 완료로 갱신

브라우저 실측으로 확인한 값을 명세에 덧붙인다. 이 작업의 출발점이
실측값이었으므로 끝도 실측이다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: PR 을 만든다**

`--label frontend-web` 은 **배포 게이트**다. 라벨 없이 머지하면 Jenkins 가
「배포 대상 아님 - 생략」으로 조용히 끝난다(fail-closed).

```bash
gh pr create --base develop \
  --title "[FE] feat: 홈 스토리·듀얼 랭킹·AI 리포트 배치 개편" \
  --body-file <파일> \
  --assignee seonghoho \
  --label frontend-web
```

---

## 다음 슬라이스 (이 계획 밖)

| 항목                                                | 근거                                                    |
| --------------------------------------------------- | ------------------------------------------------------- |
| 「좁혀지는 후보 카운터」 — 4단계 상태 승계 25→8→3→1 | 명세 D8-3. 이 계획이 그 전제(각 단계 실데이터)를 세운다 |
| 앵커 문장 카피 톤 정리                              | 명세 D8-1. 카피 단독 PR                                 |
| 04단계 시뮬레이션 실 API                            | 명세 D8-2. 보류                                         |
