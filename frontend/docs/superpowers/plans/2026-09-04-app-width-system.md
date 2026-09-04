# 앱 전체 폭 체계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 라우트마다 제각각인 컨테이너 폭 리터럴 9종을 셸 토큰 하나 + 컬럼 토큰 셋으로 통일하고, 헤더와 본문의 정렬 어긋남(1920 `/status` 실측 좌우 233px)을 없앤다.

**Architecture:** 정렬을 결정하는 **셸 폭**과 가독성을 결정하는 **컬럼 폭**을 분리한다. 셸은 전 라우트 공통 `calc(100% - 40px)`(헤더와 동일, 상한 없음)이고, 페이지의 최외곽 컨테이너가 이것을 쓴다. 좁혀야 하는 것은 페이지 컨테이너가 아니라 **그 안의 요소**가 컬럼 토큰으로 좁힌다. 셸에 상한이 없으므로 「넓어지면 나빠지는 요소」의 상한은 요소가 진다.

**Tech Stack:** Next.js App Router · styled-components · vitest(node 환경, `renderToStaticMarkup` + `ServerStyleSheet` 문자열 단언) · Claude Browser pane 실측

**Spec:** `frontend/docs/superpowers/specs/2026-09-04-app-width-system-design.md`

## Global Constraints

- 기준 커밋: develop `eefd3fac`. 브랜치 `feature/fe/app-width-system`
- **셸은 페이지의 최외곽 컨테이너에만 건다.** 컬럼 토큰을 페이지 컨테이너에 걸면 이 작업은 무의미해진다(리터럴이 토큰으로 바뀔 뿐 어긋남은 그대로)
- **`var(--w-shell)`은 `calc(100% - …)`이므로 부모가 이미 좁혀진 컨테이너면 안 된다.** 최외곽에서만 쓴다
- 토큰 값: `--shell-gutter: 20px`(≤640px 16px) · `--w-read: 720px` · `--w-form: 880px` · `--w-wide: 1400px`. **이 셋 외의 폭이 필요하면 리터럴이 아니라 토큰을 추가한다**
- 상한 없는 `repeat(auto-fit, …)` 금지 — 반드시 폭 상한과 짝지운다
- styled 템플릿의 CSS 주석 안에 백틱을 쓰면 템플릿이 거기서 끊긴다
- 테스트는 jsdom/testing-library 없이 node 환경 + 문자열 단언. `$prop` 기반 CSS는 마크업에 안 나오므로 `ServerStyleSheet().getStyleTags()`에서 읽는다
- 커밋 단위는 라우트별. 한 화면이 잘못돼도 그 커밋만 되돌릴 수 있어야 한다
- PR base는 `develop`, 라벨 `frontend-web` 필수(배포 게이트), 머지는 merge commit

## 작업 환경

```bash
cd frontend
rm -rf .next && PORT=5173 pnpm dev
```

- `qa:verify`가 `.next`를 프로덕션 산출물로 채우므로 dev 전에 지운다
- `pnpm dev -- -p 5173`은 실패한다(`--`가 그대로 넘어가 `-p`를 디렉터리로 읽는다)
- HMR이 끊겨 옛 CSS가 보이면 dev 서버를 재시작한다
- 숨겨진 브라우저 pane에서는 하이드레이션·rAF·scroll이 죽는다 — pane을 띄운 채로 검증한다
- 1440 이상에서 스크린샷이 백지로 나온다. **수치 실측이 유일하게 믿을 수 있는 근거다**

---

### Task 1: 폭 토큰과 shellWidth 헬퍼

동작 변화가 0이어야 한다. 토큰과 헬퍼를 만들기만 하고 아직 아무도 쓰지 않는다.

**Files:**
- Modify: `frontend/src/styles/global-styles.ts` (`:root` 블록 끝, `--button-disabled-opacity-color` 다음 줄)
- Create: `frontend/src/styles/layout.ts`
- Test: `frontend/src/styles/global-styles.test.ts` (기존 파일에 describe 추가)

**Interfaces:**
- Produces: CSS 변수 `--shell-gutter` · `--w-shell` · `--w-read` · `--w-form` · `--w-wide`
- Produces: `shellWidth`, `centeredColumn(token: string)` — `styled-components`의 `css` 반환값(`FlattenSimpleInterpolation`)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`frontend/src/styles/global-styles.test.ts` 끝에 추가:

```ts
/**
 * DESIGN.md 「셸은 전 라우트 공통, 상한은 요소가 진다」.
 * 폭이 파일마다 박힌 리터럴 9종이던 것을 토큰으로 접었다. 리터럴로 되돌아가면
 * 헤더와 본문 정렬이 다시 어긋나므로 여기서 못박는다.
 */
describe('폭 토큰 (설계 2026-09-04-app-width-system)', () => {
  it('셸 거터와 셸 폭이 정의돼 있다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--shell-gutter:20px;')
    expect(css).toContain('--w-shell:calc(100%-var(--shell-gutter)*2);')
  })

  it('컬럼 토큰은 셋뿐이다 — 미사용 토큰을 미리 만들지 않는다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--w-read:720px;')
    expect(css).toContain('--w-form:880px;')
    expect(css).toContain('--w-wide:1400px;')
    expect(css).not.toContain('--w-standard')
  })

  it('좁은 화면에서 거터가 16px 로 줄어든다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--shell-gutter:16px;')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/styles/global-styles.test.ts`
Expected: FAIL — `--shell-gutter:20px;` 를 찾지 못함

- [ ] **Step 3: 토큰을 넣는다**

`frontend/src/styles/global-styles.ts`, `:root` 블록의 `--button-disabled-opacity-color: 0.45;` 바로 다음 줄:

```
    /*
      셸 — 헤더·푸터·모든 라우트 본문이 공유하는 최외곽 테두리. 상한이 없다.
      정렬은 오직 이 값으로 결정된다. 페이지마다 상한을 다르게 두면 로고와 메뉴가
      콘텐츠 바깥에 뜬다(1920 폭 /status 에서 좌우 233px 어긋났다).
    */
    --shell-gutter: 20px;
    --w-shell: calc(100% - var(--shell-gutter) * 2);

    /*
      컬럼 — 셸 "안"에서 콘텐츠 유형별 상한. 페이지 컨테이너가 아니라 그 안의
      요소에 건다. 셋뿐인 것은 의도다 — 새 폭이 필요하면 리터럴이 아니라 토큰을
      추가한다. 리터럴 9종의 표류가 이 체계를 부른 원인이다.
    */
    --w-read: 720px;
    --w-form: 880px;
    --w-wide: 1400px;
```

같은 파일에서 `:root { … }` 가 닫힌 **뒤**, `* { … }` 앞에 추가:

```
  @media (max-width: 640px) {
    :root {
      --shell-gutter: 16px;
    }
  }
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/styles/global-styles.test.ts`
Expected: PASS (기존 대비 테스트 3개 증가)

- [ ] **Step 5: 헬퍼를 만든다**

Create `frontend/src/styles/layout.ts`:

```ts
import { css } from 'styled-components'

/*
  셸 — 페이지의 최외곽 컨테이너에만 쓴다.

  var(--w-shell) 은 calc(100% - …) 이라 부모 폭을 기준으로 계산된다. 이미 좁혀진
  컨테이너 안에서 쓰면 두 번 좁혀지므로, 반드시 페이지 최상단에서만 건다.
*/
export const shellWidth = css`
  width: var(--w-shell);
  margin: 0 auto;
`

/*
  중앙 컬럼 — 읽기·폼처럼 넓어지면 나빠지는 화면에 쓴다.

  셸보다 좁으므로 헤더와 어긋난다. 그것은 결함이 아니라 읽기를 위해 지불한
  대가다. 개방할 수 있는 화면에 이것을 쓰면 근거 없는 어긋남이 된다.
*/
export const centeredColumn = (token: string) => css`
  width: min(${token}, var(--w-shell));
  margin: 0 auto;
`
```

- [ ] **Step 6: 타입·린트를 확인한다**

Run: `cd frontend && pnpm qa:verify`
Expected: PASS

- [ ] **Step 7: 커밋한다**

```bash
git add frontend/src/styles/global-styles.ts frontend/src/styles/layout.ts frontend/src/styles/global-styles.test.ts
git commit -m "[FE] feat: 폭 토큰과 셸 헬퍼를 도입한다

컨테이너 폭이 파일마다 박힌 리터럴 9종·거터 4종이라 헤더와 본문이 어긋났다.
정렬을 결정하는 셸 폭과 가독성을 결정하는 컬럼 폭을 토큰으로 분리한다.

아직 아무도 쓰지 않으므로 동작 변화는 없다."
```

---

### Task 2: 헤더·푸터를 토큰으로 전환

앱의 위아래 틀. 둘이 같은 폭이어야 하고, 이후 모든 라우트가 이 폭에 맞춰진다.

**Files:**
- Modify: `frontend/src/components/layout/site-header.tsx:37-64`
- Modify: `frontend/src/components/layout/site-footer.tsx:19-27`
- Test: `frontend/src/components/layout/site-header.test.ts` · `site-footer.test.ts`

**Interfaces:**
- Consumes: Task 1의 `shellWidth`, `--w-shell`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`frontend/src/components/layout/site-footer.test.ts` 에는 이미 `renderFooter()` 가 있고 `{ markup, styles }` 를 돌려준다. 그것을 쓴다. `squeeze` 는 이 파일에 없으므로 함께 넣는다:

```ts
const squeeze = (css: string): string => css.replace(/\s+/g, '')

describe('SiteFooter 폭', () => {
  it('푸터는 셸 폭을 쓴다 — 헤더와 같은 틀이다', () => {
    const css = squeeze(renderFooter().styles)

    expect(css).toContain('width:var(--w-shell);')
    expect(css).not.toContain('min(1120px,calc(100%-40px))')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/layout/site-footer.test.ts`
Expected: FAIL — `width:var(--w-shell);` 없음

- [ ] **Step 3: 푸터를 전환한다**

`frontend/src/components/layout/site-footer.tsx` 의 `Inner` 를 교체:

```ts
const Inner = styled.div`
  ${shellWidth}
  padding: 24px 0 32px;
`
```

`@media (max-width: 640px)` 블록은 **지운다** — 거터가 `:root` 토큰이라 자동으로 좁아진다. 파일 상단에 `import { shellWidth } from '@/styles/layout'` 를 추가한다(경로 별칭은 기존 import 를 따른다).

- [ ] **Step 4: 헤더를 전환한다**

`frontend/src/components/layout/site-header.tsx` 에서 `HEADER_INNER_WIDTH` 상수와 그 위 주석 블록을 지우고, `Inner` 의 `width` 줄을 `${shellWidth}` 로 바꾼다. `@media (max-width: 640px)` 안의 `width` 줄도 지운다(그 미디어쿼리에 다른 선언이 없으면 블록째 지운다). 주석은 다음으로 갈음한다:

```ts
/*
  헤더 콘텐츠 폭은 모든 화면에서 같다 — 셸 토큰 하나를 쓴다.

  예전에는 라우트별로 세 가지였고 페이지를 옮길 때마다 로고와 메뉴가 좌우로 튀었다.
  헤더는 본문의 일부가 아니라 앱 전체의 고정 틀이다. 이제 본문도 같은 셸을 쓰므로
  헤더가 기준이 된다.
*/
```

- [ ] **Step 5: 테스트와 검증을 돌린다**

Run: `cd frontend && pnpm vitest run src/components/layout && pnpm qa:verify`
Expected: PASS

- [ ] **Step 6: 브라우저로 위아래 틀을 실측한다**

```bash
rm -rf .next && PORT=5173 pnpm dev
```

pane 을 띄운 채로 `http://localhost:5173/` 를 열고 1920 폭에서:

```js
const h = document.querySelector('header div').getBoundingClientRect()
const f = document.querySelector('footer div').getBoundingClientRect()
JSON.stringify({ header: [h.left, h.right], footer: [f.left, f.right] })
```

Expected: 헤더와 푸터의 `left`/`right` 가 같다(각각 20 / 1900 부근)

- [ ] **Step 7: 커밋한다**

```bash
git add frontend/src/components/layout
git commit -m "[FE] refactor: 헤더와 푸터를 셸 토큰으로 전환한다

둘이 앱의 위아래 틀이라 같은 폭이어야 한다. 푸터가 1120 상한이라 헤더보다
좁았다. 거터 미디어쿼리 2개는 :root 토큰이 대신하므로 지운다."
```

---

### Task 3: /status 개방 + auto-fit 열 폭주 차단

가장 어려운 케이스이자 이 작업을 부른 화면. 우측 칸의 두 세입자(지도·상세카드)가 폭 선호가 반대다.

**Files:**
- Modify: `frontend/src/components/status/status-page.tsx:46-52` (`PageInner`)
- Modify: `frontend/src/components/status/status-detail.tsx:362-366` (`StatGrid`)
- Test: `frontend/src/components/status/status-detail.test.ts` (신규)

**Interfaces:**
- Consumes: Task 1의 `shellWidth`, `--w-wide`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

Create `frontend/src/components/status/status-detail.test.ts`:

`status-detail.tsx` 를 통째로 렌더하면 SSR 에서 쿼리가 pending 이라 스켈레톤만 그려져 `StatGrid` 스타일이 시트에 안 나온다(리포트 뷰에서 실제로 겪은 함정이다). **`StatGrid` 를 export 하고 단독 렌더한다.** `status-touch-target.test.ts` 의 `renderStyles` 패턴을 그대로 쓴다.

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import { StatGrid } from './status-detail'

const squeeze = (css: string): string => css.replace(/\s+/g, '')

const renderStyles = (element: ReturnType<typeof createElement>): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(element))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
}

/**
 * repeat(auto-fit, …) 은 열 수에 상한이 없다. CSS 에 max-columns 가 없으므로
 * 폭 상한과 짝지어야 한다. 셸에서 상한을 걷어낸 뒤 이 그리드는 2560px 칸에서
 * 18열까지 갔다 — 최소 트랙 폭만으로는 폭주를 막지 못한다.
 */
describe('/status 상세카드 지표 그리드', () => {
  it('auto-fit 그리드는 폭 상한과 짝을 이룬다', () => {
    const css = squeeze(renderStyles(createElement(StatGrid)))

    expect(css).toContain('repeat(auto-fit,minmax(200px,1fr))')
    expect(css).toContain('max-width:var(--w-wide)')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/status/status-detail.test.ts`
Expected: FAIL

- [ ] **Step 3: StatGrid 에 상한을 건다**

`frontend/src/components/status/status-detail.tsx`:

```ts
/*
  auto-fit 은 열 수에 상한이 없다. 셸에서 폭 상한을 걷어낸 뒤 2560px 칸에서
  18열까지 갔다. CSS 에 max-columns 가 없으므로 그리드 자체에 폭 상한을 건다.
  최소 트랙을 140 -> 200 으로 올려 지표 카드 가독성도 함께 올린다.
*/
export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  max-width: var(--w-wide);
  gap: 12px;
`
```

`export` 를 붙이는 이유는 Step 1 의 테스트가 단독 렌더해야 하기 때문이다.

- [ ] **Step 4: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/status/status-detail.test.ts`
Expected: PASS

- [ ] **Step 5: PageInner 를 개방한다**

`frontend/src/components/status/status-page.tsx`:

```ts
const PageInner = styled.div`
  ${shellWidth}
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
```

(나머지 선언은 그대로 둔다. `width` 줄과 `margin: 0 auto;` 만 `${shellWidth}` 로 갈음한다.)

- [ ] **Step 6: 세 폭에서 정렬과 열 수를 실측한다**

dev 서버에서 `http://localhost:5173/status` 를 열고 자치구를 하나 클릭해 상세카드를 띄운 뒤, 1440 · 1920 · 2560 각각에서:

```js
const h = document.querySelector('header div').getBoundingClientRect()
const inner = document.querySelector('main > div, main div').getBoundingClientRect()
const grid = [...document.querySelectorAll('div')].find(d =>
  getComputedStyle(d).gridTemplateColumns.split(' ').length > 2)
JSON.stringify({
  header: [h.left, h.right],
  body: [inner.left, inner.right],
  cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null,
})
```

Expected: `header` 와 `body` 의 값이 같다(어긋남 0). `cols` 가 2560 에서 7 이하다.

- [ ] **Step 7: 커밋한다**

```bash
git add frontend/src/components/status
git commit -m "[FE] feat: 구별현황을 셸 전폭으로 열고 지표 그리드 열 폭주를 막는다

우측 칸의 지도는 넓을수록 좋아지지만 상세카드의 auto-fit 그리드는 열이 폭주한다
(2560px 칸에서 18열). CSS 에 max-columns 가 없어 그리드에 폭 상한을 짝지운다.
최소 트랙을 200px 로 올려 지표 카드 가독성도 함께 올린다.

1920 폭에서 헤더와 본문이 좌우 233px 어긋나던 것이 0 이 된다."
```

---

### Task 4: 홈 4개 섹션

3개는 개방, 스토리는 `--w-wide` 중앙. 홈은 히어로 카피가 읽기 폭을 넘지 않게 해야 한다.

**Files:**
- Modify: `frontend/src/components/home/hero-section.tsx:100,114`
- Modify: `frontend/src/components/home/popular-districts.tsx:97`
- Modify: `frontend/src/components/home/feature-bento.tsx:30`
- Modify: `frontend/src/components/home/product-story.tsx:94`

**Interfaces:**
- Consumes: Task 1의 `shellWidth`, `centeredColumn`, `--w-read`, `--w-wide`

- [ ] **Step 1: 개방 대상 3개를 전환한다**

`hero-section.tsx` · `popular-districts.tsx` · `feature-bento.tsx` 에서 `width: min(1120px, 100%);` 를 `${shellWidth}` 로 바꾼다. 각 파일에 `import { shellWidth } from '@/styles/layout'` 를 추가한다.

**주의**: 이 세 파일의 부모가 `padding: 0 20px` 를 들고 있다(`hero-section.tsx:87`). 셸이 거터를 지므로 **부모의 좌우 padding 을 0 으로** 바꾼다(상하 padding 은 유지). 그러지 않으면 거터가 두 번 걸려 40px 이 아니라 80px 이 된다.

- [ ] **Step 2: 히어로 카피에 읽기 폭을 건다**

`hero-section.tsx` 에서 제목·부제를 감싸는 블록(`display: flex` 세로 스택, 100~120줄 부근)에 추가:

```
  max-width: var(--w-read);
```

셸이 전폭이 되면 카피 줄 길이가 2560 에서 그대로 늘어나므로 필요하다.

- [ ] **Step 3: 스토리를 중앙 컬럼으로 둔다**

`product-story.tsx`:

```ts
/*
  스토리만 중앙 컬럼이다. 스티키 스텝목록 + 패널 구조인데 패널을 flex: 0 1 600px
  으로 늘어나지 않게 못박아 뒀다(R5 가로 스택 바가 짧아 늘리면 헐렁해진다).
  셸 전폭으로 열면 그 결정 때문에 우측이 크게 빈다. 패널 확장 재설계는 04단계
  패널 여백 문제와 한 덩어리라 따로 다룬다.
*/
const Inner = styled.div`
  ${centeredColumn('var(--w-wide)')}
```

- [ ] **Step 4: 1920 에서 홈을 실측한다**

`http://localhost:5173/` 에서:

```js
const h = document.querySelector('header div').getBoundingClientRect()
JSON.stringify([...document.querySelectorAll('section')].map(s => {
  const inner = s.firstElementChild?.getBoundingClientRect()
  return inner ? [s.className.slice(0, 12), inner.left, inner.right] : null
}).concat([['header', h.left, h.right]]))
```

Expected: 히어로·인기지역·벤토의 `left`/`right` 가 헤더와 같다. 스토리만 다르다(중앙 1400).

- [ ] **Step 5: 검증하고 커밋한다**

Run: `cd frontend && pnpm qa:verify`

```bash
git add frontend/src/components/home
git commit -m "[FE] feat: 홈 섹션을 셸 폭으로 열고 카피에 읽기 폭을 건다

히어로·인기지역·벤토는 카드 그리드라 넓어질수록 이득이므로 셸 전폭으로 연다.
부모의 좌우 padding 은 셸이 거터를 지므로 지운다.

스토리만 중앙 1400 이다 — 패널을 늘어나지 않게 못박은 결정 때문에 전폭으로
열면 우측이 크게 빈다."
```

---

### Task 5: 커뮤니티 3개 화면

상세는 개방, 목록·등록은 중앙. 이 라우트가 거터 미디어쿼리를 가장 많이 들고 있다(4개).

**Files:**
- Modify: `frontend/src/components/community/community-list-view.tsx:49-58`
- Modify: `frontend/src/components/community/community-register-page.tsx:50-59`
- Modify: `frontend/src/components/community/community-detail-view.tsx:80-87`

**Interfaces:**
- Consumes: Task 1의 `shellWidth`, `centeredColumn`, `--w-form`, `--w-read`

- [ ] **Step 1: 목록과 등록을 중앙 폼 폭으로 둔다**

두 파일 모두 컨테이너를 다음으로 바꾸고 `@media (max-width: 640px)` 의 `width` 줄을 지운다:

```ts
  ${centeredColumn('var(--w-form)')}
```

목록에는 근거 주석을 단다:

```ts
/*
  목록은 중앙 컬럼이다. 글 목록 행이 minmax(0,1fr) auto 라 넓히면 제목과 메타가
  멀어져 나빠진다. 셸 전폭으로 열려면 우측을 채울 사이드바가 필요한데 그것은
  폭 체계가 아니라 커뮤니티 기능 기획이다.
*/
```

- [ ] **Step 2: 상세를 개방하고 본문에 읽기 폭을 건다**

`community-detail-view.tsx` 의 컨테이너를 `${shellWidth}` 로 바꾸고 `@media` 의 `width` 줄을 지운다. 그 아래 `grid-template-columns: minmax(0, 1fr) 300px;`(112줄) 는 그대로 두되, 본문 열 안의 글 영역에 `max-width: var(--w-read);` 를 건다 — 셸이 전폭이면 본문 열이 2560 에서 2200px 이 되어 읽기 폭을 크게 넘는다.

- [ ] **Step 3: 세 화면을 실측한다**

`/community/list` · `/community/register` · `/community/<id>` 를 1920 에서 열고 Task 3 의 실측 스니펫으로 헤더 대비 `left`/`right` 를 잰다.

Expected: 상세는 어긋남 0. 목록·등록은 880 중앙(좌 520 부근) — 의도된 값이다.

- [ ] **Step 4: 검증하고 커밋한다**

Run: `cd frontend && pnpm qa:verify`

```bash
git add frontend/src/components/community
git commit -m "[FE] feat: 커뮤니티 폭을 토큰으로 정리한다

상세는 이미 본문+사이드바 구조라 셸 전폭으로 열고 본문에 읽기 폭을 건다.
목록과 등록은 넓히면 나빠지므로 중앙 880 이다 — 목록 행은 넓힐수록 제목과
메타가 멀어지고, 등록은 폼이다.

상한 1180/880 두 리터럴과 거터 미디어쿼리 4개가 사라진다."
```

---

### Task 6: 분석 2개 화면

결과는 개방, AI 리포트는 중앙. 결과 뷰는 브라우저로 열 수 없으므로 실측이 불가능하다.

**Files:**
- Modify: `frontend/src/components/analysis/analysis-result-view.tsx:205,291,305` (세 곳 모두 같은 리터럴)
- Modify: `frontend/src/components/analysis/ai-report-page-view.tsx:14`

**Interfaces:**
- Consumes: Task 1의 `shellWidth`, `centeredColumn`, `--w-read`

- [ ] **Step 1: 결과 뷰 세 컨테이너를 개방한다**

`analysis-result-view.tsx` 의 `width: min(1320px, calc(100% - 40px));` 세 곳을 모두 `${shellWidth}` 로 바꾼다. **세 곳이 같은 값이므로 하나라도 빠뜨리면 섹션 간에 폭이 어긋난다.**

- [ ] **Step 2: AI 리포트를 중앙 읽기 폭으로 둔다**

`ai-report-page-view.tsx`:

```ts
/*
  AI 리포트는 생성된 산문이라 읽기 화면이다. 넓히면 줄 길이가 길어져 나빠진다.
*/
  ${centeredColumn('var(--w-read)')}
```

- [ ] **Step 3: 가로막대·미터 상한이 살아 있는지 확인한다**

셸이 전폭이 되면 이 뷰의 full 스팬 섹션 7개가 2560 까지 늘어난다. 다음 두 상한이 요소에 걸려 있는지 grep 으로 확인한다:

Run: `cd frontend && grep -rn "560px\|360px" src/components/analysis/ | grep -i "max-width\|width:"`
Expected: 가로막대 560px · 미터 360px 상한이 존재한다. 없으면 그 요소에 건다.

- [ ] **Step 4: AI 리포트를 실측한다**

`/analysis/report` 를 1920 에서 열고 헤더 대비 값을 잰다.
Expected: 중앙 720(좌 600 부근).

- [ ] **Step 5: 결과 뷰는 미검증으로 남긴다**

`/analysis/result` 는 선택 상태 없이 열리지 않는다. 먼저 분석 흐름을 실제로 태워 도달을 시도한다(`/analysis` 에서 지역·업종을 골라 결과까지). **도달하면 실측하고, 못 하면 이 사실을 PR 본문에 미검증으로 명시한다.** 조용히 넘기지 않는다.

- [ ] **Step 6: 검증하고 커밋한다**

Run: `cd frontend && pnpm qa:verify`

```bash
git add frontend/src/components/analysis
git commit -m "[FE] feat: 분석 결과를 셸 전폭으로 열고 AI 리포트를 읽기 폭으로 둔다

결과 뷰는 세로막대·도넛이 많아 넓어질수록 이득이다. 가로막대와 미터는 이미
요소 상한(560/360)을 지고 있어 전폭에서도 무너지지 않는다.

AI 리포트는 생성된 산문이라 읽기 화면이므로 중앙 720 이다."
```

---

### Task 7: 시뮬레이션 3개 화면

빌더·비교는 개방, 리포트는 중앙.

**Files:**
- Modify: `frontend/src/components/simulation/simulation-builder-page.tsx:62`
- Modify: `frontend/src/components/simulation/compare/simulation-compare-page.tsx:48`
- Modify: `frontend/src/components/simulation/report/simulation-report-page.tsx:44`

- [ ] **Step 1: 빌더와 비교를 개방한다**

두 파일의 `width: min(…, calc(100% - 40px));` 를 `${shellWidth}` 로 바꾼다. 빌더는 `minmax(0, 1fr) 380px` 2단이라 좌측 폼이 넓어져 이득이고, 비교는 `repeat(2, minmax(0, 1fr))` 이라 열이 시나리오 수다.

- [ ] **Step 2: 리포트를 중앙 읽기 폭으로 둔다**

```ts
  ${centeredColumn('var(--w-read)')}
```

800 → 720 으로 살짝 좁아진다. 리터럴을 토큰에 맞추는 것이 이 작업의 목적이므로 의도된 변화다.

- [ ] **Step 3: 실측한다**

`/simulation` · `/simulation/compare` · `/simulation/report` 를 1920 에서 연다.
Expected: 앞의 둘은 어긋남 0, 리포트는 중앙 720.

- [ ] **Step 4: 검증하고 커밋한다**

Run: `cd frontend && pnpm qa:verify`

```bash
git add frontend/src/components/simulation
git commit -m "[FE] feat: 시뮬레이션 폭을 토큰으로 정리한다

빌더는 좌측 폼이 넓어지면 이득이고 비교는 열이 시나리오 수라 둘 다 연다.
리포트는 읽기 화면이라 중앙 720 이다(800 리터럴을 토큰에 맞춘다)."
```

---

### Task 8: 추천 비교와 프로필

남은 두 곳. 프로필은 미들웨어 보호라 실측에 로그인이 필요하다.

**Files:**
- Modify: `frontend/src/components/recommend/compare/recommend-compare-page.tsx:45`
- Modify: `frontend/src/components/profile/profile-shell.tsx:20,32,134`

- [ ] **Step 1: 추천 비교를 개방한다**

`max-width: 1120px;` 를 `${shellWidth}` 로 바꾼다. **이 파일만 `max-width` 를 쓰고 나머지는 `width` 를 쓴다** — 함께 `width` 기준으로 맞춘다. 비교표라 열이 비교 항목 수이므로 넓어질수록 이득이다.

- [ ] **Step 2: 프로필을 개방한다**

`profile-shell.tsx` 의 20줄·134줄 두 컨테이너를 `${shellWidth}` 로 바꾸고, 32줄의 `@media` 안 `width` 줄을 지운다. `grid-template-columns: 320px minmax(0, 1fr)` 좌측 내비 + 우측 본문 구조라 우측이 넓어진다.

우측 본문의 성격을 먼저 확인한다:

Run: `cd frontend && ls src/components/profile/`

`profile/settings/*`(수정·비밀번호·탈퇴)는 폼이므로 그 화면들의 컨테이너에 `max-width: var(--w-form);` 를 건다. `profile/bookmarks/*`는 카드 목록이므로 넓어질수록 이득이라 그대로 둔다.

- [ ] **Step 3: 추천 비교를 실측하고, 프로필은 로그인 여부에 따른다**

`/recommend/compare` 는 실측한다. `/profile/*` 은 미들웨어 보호라 로그인해야 열린다 — **로그인할 수 있으면 실측하고, 못 하면 사람 검증 항목으로 남긴다.**

- [ ] **Step 4: 검증하고 커밋한다**

Run: `cd frontend && pnpm qa:verify`

```bash
git add frontend/src/components/recommend frontend/src/components/profile
git commit -m "[FE] feat: 추천 비교와 프로필을 셸 폭으로 연다

추천 비교는 열이 비교 항목 수라 넓어질수록 이득이다. 이 파일만 max-width 를
쓰고 있던 것도 width 기준으로 맞춘다.

프로필은 좌측 내비 + 우측 본문이라 우측이 넓어진다. 우측이 폼 성격이면
안쪽에 폼 폭을 건다."
```

---

### Task 9: 전 라우트 정렬 실측

각 태스크에서 화면별로 쟀지만, 여기서 한 번에 훑어 빠진 곳을 찾는다. **이것이 이 작업의 주 증거다.**

**Files:**
- Create: `frontend/docs/features/layout/width-system-verification.md`

- [ ] **Step 1: 실측 스크립트를 준비한다**

pane 을 띄운 채로(숨기면 하이드레이션이 죽는다) 각 라우트에서 실행:

```js
;(() => {
  const h = document.querySelector('header')?.firstElementChild?.getBoundingClientRect()
  const m = document.querySelector('main')
  const body = m?.firstElementChild?.getBoundingClientRect()
  return JSON.stringify({
    w: window.innerWidth,
    header: h && [Math.round(h.left), Math.round(h.right)],
    body: body && [Math.round(body.left), Math.round(body.right)],
    delta: h && body && [Math.round(body.left - h.left), Math.round(h.right - body.right)],
  })
})()
```

- [ ] **Step 2: 1440 · 1920 · 2560 세 폭 × 개방 라우트를 순회한다**

대상: `/` · `/status` · `/community/<id>` · `/recommend` · `/recommend/compare` · `/simulation` · `/simulation/compare`

Expected: `delta` 가 `[0, 0]`

- [ ] **Step 3: 중앙 라우트의 어긋남이 의도값인지 확인한다**

대상과 기대 폭: `/community/list` 880 · `/community/register` 880 · `/analysis/report` 720 · `/simulation/report` 720

Expected: `body` 폭이 토큰 값과 같다(1440 에서는 거터에 걸려 더 좁을 수 있다)

- [ ] **Step 4: 결과를 문서로 남긴다**

`frontend/docs/features/layout/width-system-verification.md` 에 라우트 × 폭 표로 실측값을 적는다. **실측하지 못한 `/analysis/result` 와 `/profile/*` 은 「미검증」으로 명시한다** — 지난번 B2·B4·B5 를 미검증으로 머지하고 추적을 잃은 전례가 있다.

- [ ] **Step 5: 커밋한다**

```bash
git add frontend/docs/features/layout
git commit -m "[FE] docs: 폭 체계 실측 결과를 기록한다

1440·1920·2560 세 폭에서 개방 라우트의 헤더-본문 어긋남과 중앙 라우트의
의도된 폭을 잰다. 실측하지 못한 라우트는 미검증으로 명시한다."
```

---

### Task 10: DESIGN.md 규칙 갱신

다음 사람이 리터럴로 되돌아가지 않게 규칙을 박는다. 이것이 없으면 6개월 뒤 상한 9종이 다시 생긴다.

**Files:**
- Modify: `frontend/DESIGN.md` §5 Layout Principles (207줄 부근), §4 Navigation (185줄 부근), §4 Charts (151줄 부근)

- [ ] **Step 1: §5 Layout Principles 에 폭 체계를 넣는다**

`### Grid & Container` 아래에 추가:

```markdown
### 폭 체계 — 셸과 컬럼

**셸 폭과 컬럼 폭은 다른 것이다.** 셸은 헤더·본문이 공유하는 최외곽 테두리로
**정렬을 결정**하고, 컬럼은 셸 안에서 콘텐츠 유형별 상한으로 **가독성을 결정**한다.
둘을 리터럴 하나로 뭉개면 헤더와 본문이 어긋난다(1920 폭 /status 에서 좌우 233px).

- 셸은 전 라우트 공통 `var(--w-shell)` = `calc(100% - 40px)`, **상한이 없다**
- 컬럼은 `--w-read`(720) · `--w-form`(880) · `--w-wide`(1400) 셋뿐이다.
  **새 폭이 필요하면 리터럴이 아니라 토큰을 추가한다**
- **셸은 페이지의 최외곽 컨테이너에만 건다.** 컬럼 토큰을 페이지 컨테이너에 걸면
  리터럴이 토큰으로 바뀔 뿐 어긋남은 그대로다

**넓어질 때 무엇이 좋아지는지는 요소마다 다르다.** 반응형은 좁아질 때를 다루지만,
넓어질 때는 요소별로 따로 정해야 한다. 셸에 상한이 없으므로 **상한은 요소가 진다.**
「반응형이니까 괜찮다」는 좁아지는 방향에만 참이다.

| 넓어질수록 좋아짐 | 무관 | 넓어질수록 나빠짐 — 상한 필수 |
| --- | --- | --- |
| 지도 | 아이콘 · 배지 | 가로 막대 → 560px |
| 세로막대 · 꺾은선 · 도넛 | 버튼 | 미터 행 → 360px |
| 비교표 (열 = 비교 항목) | | 읽기 텍스트 → `--w-read` |
| 카드 그리드 (열 증가, 상한 있음) | | 리스트 행 (제목과 메타가 멀어진다) |
| | | 폼 필드 → `--w-form` |

**상한 없는 `repeat(auto-fit, …)` 은 금지한다.** 열 수에 상한이 없고 CSS 에
`max-columns` 가 없으므로 반드시 폭 상한과 짝지운다. `/status` 지표 그리드가
`minmax(140px, 1fr)` 만으로 2560px 칸에서 18열까지 갔다 — 최소 트랙 폭은 폭주를
막지 못한다.
```

- [ ] **Step 2: §4 Navigation 의 헤더 규칙을 갱신한다**

기존 「헤더 콘텐츠 폭은 라우트마다 다르게 두지 않는다」 항목의 예전 리터럴 나열을 지우고, 본문도 같은 셸을 쓰게 됐다는 사실로 갱신한다. `scrollbar-gutter: stable` 항목은 그대로 둔다.

- [ ] **Step 3: §4 Charts 의 중복을 정리한다**

가로막대 560 · 미터 360 · 15:1 규칙은 §5 의 일반 규칙과 겹친다. Charts 절에는 차트 고유 사항만 남기고 폭 일반 규칙은 §5 를 가리키게 한다. **수치는 지우지 않는다** — 요소별 상한값은 Charts 에 있는 편이 찾기 쉽다.

- [ ] **Step 4: 커밋한다**

```bash
git add frontend/DESIGN.md
git commit -m "[FE] docs: 폭 체계를 DESIGN.md 규칙으로 박는다

셸 폭과 컬럼 폭의 구분, 넓어질 때의 요소별 판정, auto-fit 금지 조항을 넣는다.
이 규칙이 없으면 상한 9종이 다시 생긴다."
```

---

### Task 11 (선택): 중앙 라우트의 배경 밴드

스펙 §5 가 중앙 그룹의 잔여 어긋남 처리로 약속한 것이다. **시각 변경이라 사람 눈 승인이 필요하고, 보기 나쁘면 버린다.** 건너뛰어도 회귀는 없다 — 중앙 화면들이 지금과 같은 모습으로 남을 뿐이다.

**Files:**
- Modify: 중앙 라우트 5곳의 페이지 컨테이너 — `product-story.tsx` · `ai-report-page-view.tsx` · `simulation-report-page.tsx` · `community-list-view.tsx` · `community-register-page.tsx`

- [ ] **Step 1: 밴드를 헬퍼로 만든다**

`frontend/src/styles/layout.ts` 에 추가:

```ts
/*
  중앙 컬럼 화면의 배경 밴드.

  셸보다 좁은 화면은 헤더와 어긋난다. 전폭 배경을 깔면 좁은 카드가 넓은 판 위에
  놓인 것으로 읽혀 어긋남이 아니게 된다 — 헤더 하단 보더가 전폭으로 이어지는
  것과 같은 원리다.
*/
export const centeredBand = css`
  width: 100%;
  background: var(--color-background-muted);
`
```

- [ ] **Step 2: 한 화면에만 먼저 걸고 눈으로 본다**

`/analysis/report` 하나에만 적용해 1920 에서 스크린샷을 찍는다. **여기서 판단이 갈린다** — 좋아 보이면 나머지 4곳에 적용하고, 아니면 헬퍼째 되돌린다.

- [ ] **Step 3: 판단 결과에 따라 진행하거나 되돌린다**

적용하는 경우에만 커밋한다:

```bash
git add frontend/src/styles/layout.ts frontend/src/components
git commit -m "[FE] feat: 중앙 컬럼 화면에 전폭 배경 밴드를 깐다

셸보다 좁은 화면은 헤더와 어긋난다. 전폭 배경을 깔면 좁은 카드가 넓은 판 위에
놓인 것으로 읽혀 어긋남이 아니게 된다."
```

---

## 완료 기준

- [ ] 개방 라우트 7곳에서 1440·1920·2560 모두 헤더-본문 `delta` 가 `[0, 0]`
- [ ] 중앙 라우트 4곳의 폭이 토큰 값과 일치
- [ ] `pnpm qa:verify` 통과
- [ ] `--w-standard` 같은 미사용 토큰 없음
- [ ] 상한 없는 `auto-fit` 없음 — `grep -rn "repeat(auto-fit" frontend/src` 결과가 모두 폭 상한과 짝을 이룸
- [ ] 미검증 라우트(`/analysis/result` · `/profile/*`)가 PR 본문과 검증 문서에 명시됨
- [ ] PR 라벨 `frontend-web` 부착, base `develop`
