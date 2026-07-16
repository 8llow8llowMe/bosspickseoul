# NowDoBoss V2 Design Redesign Tasks

## 1. Purpose

이 문서는 `frontend/DESIGN.md`를 기준으로 NowDoBoss V2 프론트엔드 디자인 개편 작업을 순차 실행 가능한 task로 나눈다.

이번 문서의 역할은 구현 범위와 순서를 고정하는 것이다. 실제 UI 수정, dependency 설치, 코드 이동, 컴포넌트 생성은 이 문서 작성 이후 task별로 진행한다.

## 2. Source of Truth

- 최종 디자인 기준은 `frontend/DESIGN.md`다.
- `docs/design-guide.md`는 현재 구현과 가까운 레거시 기준으로 본다.
- 디자인 개편 중 `docs/design-guide.md`와 `frontend/DESIGN.md`가 충돌하면 `frontend/DESIGN.md`를 우선한다.
- `docs/design-guide.md`는 디자인 개편 완료 후 새 기준에 맞춰 갱신하거나 deprecated 문서로 표시한다.

## 3. Non-Goals

- 백엔드 API 계약을 바꾸지 않는다.
- Next.js route path를 바꾸지 않는다.
- 서버 응답 type, request payload, auth/session 흐름을 바꾸지 않는다.
- 디자인 개편과 기능 리팩터링을 같은 task에서 섞지 않는다.
- 실제 Toss Product Sans 또는 Tossface 폰트 자산을 새로 확보하지 않는다. 현재 repo의 Pretendard를 구현 폰트로 유지한다.

## 4. Global Design Rules

모든 task는 아래 기준을 공통 완료 조건으로 사용한다.

- Primary UI color는 `#0ea5e9`다.
- Hover/pressed blue는 `#2272eb`다.
- Informational weak background는 `#e8f3ff`다.
- Text colors는 `#191f28`, `#4e5968`, `#6b7684`, `#8b95a1`를 우선 사용한다.
- Default border는 `#e5e8eb`다.
- Page background는 `#ffffff`, muted surface는 `#f2f4f6` 또는 `#f9fafb`다.
- Input/button radius는 `8px`, card radius는 `12px`, sheet/dialog radius는 `16px`로 맞춘다.
- `9999px` radius는 pill, avatar, switch, chip처럼 실제 pill 형태에만 사용한다.
- Shadow는 단일 black opacity 계열만 사용한다.
- Brand-colored shadow, multi-layer shadow, heavy glassmorphism, decorative glow, orb, bokeh background를 제거한다.
- Blue는 interaction, selection, active state에만 사용한다. 장식용 blue panel, non-clickable blue heading, decorative blue gradient는 사용하지 않는다.
- Viewport 기반 font scaling과 negative letter-spacing을 제거한다.
- 숫자, 금액, 지표, count는 `font-variant-numeric: tabular-nums`를 적용한다.
- UI 문구는 한국어를 우선하고, financial/data context에서는 emoji를 사용하지 않는다.
- `prefers-reduced-motion: reduce`에서는 motion token이 즉시 전환되도록 한다.

## 5. Public Interfaces

- 추가 예정 dependency: `lucide-react`
- 추가 예정 내부 UI surface: `src/components/ui/*`
- 유지해야 하는 외부 interface:
  - API client 함수 signature
  - backend request/response type
  - Next route path
  - query param 기반 flow
  - Zustand store contract
  - React Query query/mutation contract

## 6. Execution Order

아래 순서대로 진행한다. 뒤 task에서 앞 task의 공통 token, primitive, shell 기준을 사용하도록 설계한다.

1. Foundation
2. Common UI Primitives
3. Shell & Navigation
4. Auth & Profile
5. Home
6. Data Workflows
7. Community & Chatting
8. Copy, States, Motion
9. Visual QA

## 7. Task 01. Foundation

### Goal

전역 디자인 토큰과 기본 렌더링 규칙을 `frontend/DESIGN.md` 기준으로 바꾼다.

### Target Scope

- `src/styles/global-styles.ts`
- `src/lib/fonts.ts`
- 전역 CSS variable naming
- motion/reduced-motion token
- semantic color token
- numeric typography defaults

### Required Work

- 기존 primary token을 Toss 기준으로 교체한다.
  - `--color-primary-700` 또는 동등 primary token: `#0ea5e9`
  - hover/pressed token: `#2272eb`
  - weak blue surface token: `#e8f3ff`
- neutral token을 `frontend/DESIGN.md`의 grey scale에 맞춘다.
- semantic token을 `red500`, `green500`, `orange500`, `yellow500`, `teal500`, `purple500` 역할로 정리한다.
- radius token을 `4px`, `8px`, `12px`, `16px`, `9999px`로 제한한다.
- shadow token을 single-layer black opacity로 정리한다.
- motion token을 추가한다.
  - `motion-instant: 0ms`
  - `motion-fast: 150ms`
  - `motion-standard: 250ms`
  - `motion-slow: 400ms`
  - `motion-page: 350ms`
- easing token을 추가한다.
  - `ease-enter`
  - `ease-exit`
  - `ease-standard`
  - `ease-spring`
- `prefers-reduced-motion: reduce`에서 transition/animation duration을 collapse한다.
- `html`, `body`, form control, button의 typography baseline을 Toss/Pretendard 기준으로 맞춘다.
- `font-variant-numeric: tabular-nums`를 숫자 유틸리티 또는 공통 token으로 사용할 수 있게 만든다.

### Remove or Replace

- `#1549b5`
- `#336dd3`
- `rgba(21, 73, 181, ...)`
- colored shadow
- page-level decorative gradient token
- negative letter-spacing baseline

### Done Criteria

- 전역 token만으로 primary, surface, text, border, semantic, shadow, radius를 표현할 수 있다.
- 기존 화면이 compile 가능한 상태를 유지한다.
- 새 token 이름과 legacy token 이름의 호환 전략이 명확하다. 대규모 동시 수정이 어렵다면 legacy token alias를 임시로 유지하고 제거 task를 남긴다.

### Verification

```sh
rg -n "#1549b5|#336dd3|rgba\(21, 73, 181" src app
rg -n "letter-spacing: -" src app
pnpm lint
pnpm typecheck
```

## 8. Task 02. Common UI Primitives

### Goal

화면별로 중복 정의된 button, input, card, tab, empty state를 공통 primitive로 모은다.

### Target Scope

- `src/components/ui/*`
- `src/components/auth/auth-shell.tsx`
- `src/components/profile/profile-ui.tsx`
- 화면별 local styled button/input/card/tab 정의

### Required Work

- `lucide-react`를 dependency로 추가한다.
- 공통 primitive를 `src/components/ui` 하위에 만든다.
  - `Button`
  - `TextField`
  - `Card`
  - `Badge`
  - `Tabs`
  - `Dialog`
  - `EmptyState`
  - `Skeleton`
- Button variant는 최소한으로 제한한다.
  - `primary`: blue fill
  - `secondary`: blue50 또는 grey100 weak surface
  - `dark`: charcoal fill
  - `danger`: red fill
  - `ghost`: text or transparent
- Button size는 `tiny`, `medium`, `large`, `big` 또는 현재 codebase에 맞춘 동등 scale로 제한한다.
- TextField는 background `#f2f4f6`, focus `#0ea5e9`, error `#f04452`를 기준으로 한다.
- Card는 white surface, `12px` radius, optional `1px #e5e8eb` border, minimal shadow로 제한한다.
- Tabs는 active blue text 또는 blue underline, inactive grey text로 통일한다.
- Dialog/Modal은 centered modal과 bottom-sheet 대응이 가능하도록 base style을 제공한다.
- Skeleton은 final layout dimensions와 동일한 block을 만들 수 있게 한다.
- EmptyState는 한 줄 설명과 하나의 action만 허용하는 구조로 만든다.

### Done Criteria

- 새 UI primitive가 token을 직접 사용하고, hard-coded legacy blue를 쓰지 않는다.
- 각 primitive는 keyboard focus style을 가진다.
- Button icon은 inline SVG component로 받고 `currentColor`를 따른다.
- 기존 화면을 한 번에 모두 이관하지 않아도, 신규 task가 primitive를 사용할 수 있다.

### Verification

```sh
pnpm add lucide-react
pnpm lint
pnpm typecheck
```

## 9. Task 03. Shell & Navigation

### Goal

전체 app shell을 Toss식 white top app bar와 절제된 navigation으로 정리한다.

### Target Scope

- `src/components/layout/site-header.tsx`
- `src/components/layout/site-footer.tsx`
- `app/(shell)/layout.tsx`
- route navigation items
- authenticated user menu

### Required Work

- Header background를 white 또는 white with subtle blur로 제한한다.
- Header shadow는 제거하거나 Level 1 shadow로 낮춘다.
- Nav active state는 `#0ea5e9`와 weak blue background로 통일한다.
- Mobile menu button은 text-only button보다 icon button으로 전환한다.
- Mobile navigation은 bottom tab 도입 후보로 문서화하고 구현 여부를 task 안에서 결정한다.
- Footer는 service description 중심의 가벼운 white surface로 유지하되, 색상과 spacing을 token화한다.
- Avatar fallback gradient를 제거하고 neutral 또는 single blue interactive treatment로 정리한다.

### Done Criteria

- Header와 footer가 더 이상 legacy navy gradient, colored shadow, radius `>16px`를 사용하지 않는다.
- Header touch target은 mobile에서 최소 `40px`, 주요 action은 `48px` 이상이다.
- Nav active/inactive 상태가 모든 route에서 일관된다.

### Verification

```sh
pnpm lint
pnpm typecheck
```

Manual routes:

- `/`
- `/status`
- `/analysis`
- `/recommend`
- `/community/list`
- `/chatting/list`
- `/profile/settings`

## 10. Task 04. Auth & Profile

### Goal

인증과 프로필 화면을 Toss form, input, card 기준으로 정리한다.

### Target Scope

- `src/components/auth/*`
- `src/components/profile/*`
- auth/profile shared UI currently in `auth-shell.tsx` and `profile-ui.tsx`

### Required Work

- Login/register shells의 heavy gradient, glass card, large marketing composition을 제거한다.
- Form card는 white surface 또는 grey100 contained form으로 정리한다.
- Input height는 `44px` 또는 `48px`로 통일한다.
- Primary CTA는 `#0ea5e9` fill, disabled는 opacity treatment로 통일한다.
- Social login button은 icon/image 사용을 유지하되 size, border, radius를 token에 맞춘다.
- Profile content card radius를 `12px`로 낮추고 shadow를 최소화한다.
- Profile tabs는 common Tabs primitive로 전환한다.
- Empty bookmark state는 "왜 비어 있는지" 한 줄과 하나의 action만 제공한다.

### Done Criteria

- Auth/Profile 화면에서 `border-radius: 20px` 이상 card radius가 제거된다. Pill 예외는 허용한다.
- Auth/Profile 화면에서 decorative gradient background가 제거된다.
- Error message는 구체적이고 action-oriented Korean sentence를 사용한다.

### Verification

```sh
pnpm lint
pnpm typecheck
```

Manual routes:

- `/login`
- `/register`
- `/register/general`
- `/account-deleted`
- `/profile/settings`
- `/profile/bookmarks`

## 11. Task 05. Home

### Goal

현재 marketing hero 중심 홈을 white canvas 중심의 앱형 진입 화면으로 재구성한다.

### Target Scope

- `src/components/home/home-page.tsx`
- home page assets under `public/images`

### Required Work

- 대형 gradient hero, glass panel, glow, decorative radial gradient를 제거한다.
- 첫 화면은 NowDoBoss의 핵심 action을 빠르게 선택할 수 있는 구조로 바꾼다.
- H1은 과도한 display scale 대신 `30px` 또는 `26px` 계열에서 시작한다.
- CTA는 하나의 primary action만 둔다. 다른 actions는 secondary 또는 list row로 낮춘다.
- 서비스 카드 radius를 `12px` 또는 `16px`로 제한한다.
- Feature image는 실제 서비스 이해에 도움이 되는 경우만 유지한다.
- Home에서 blue는 clickable CTA, link, active/selected state에만 사용한다.
- Section spacing은 mobile baseline `20px` horizontal padding과 8px spacing scale로 정리한다.

### Done Criteria

- `home-page.tsx`에서 decorative `HeroGlow`, glass panel, radial decorative background가 제거된다.
- Home first viewport가 mobile 375px에서 overflow 없이 핵심 action을 보여준다.
- CTA hierarchy가 하나의 primary action 중심으로 정리된다.

### Verification

```sh
pnpm lint
pnpm typecheck
```

Manual route:

- `/`

Viewports:

- 375px
- 768px
- 1280px

## 12. Task 06. Data Workflows

### Goal

상권 데이터 관련 workflow 화면을 Toss식 data card, metric, form, filter 기준으로 정리한다.

### Target Scope

- `src/components/status/status-page.tsx`
- `src/components/recommend/recommend-page.tsx`
- `src/components/analysis/analysis-page.tsx`
- `src/components/analysis/analysis-result-page.tsx`
- `src/components/simulation/*`
- `src/components/location/location-selector.tsx`

### Required Work

- Page hero를 compact page header로 전환한다.
- Panel/card radius를 `12px`로 낮추고 shadow를 Level 1 또는 Level 2로 제한한다.
- Metric/card 숫자는 700 weight와 tabular numerals를 적용한다.
- Positive/negative data는 green/red semantic token을 사용한다.
- Filter, tab, select, chip은 common primitive 기준으로 정리한다.
- CTA는 화면당 하나의 primary action을 우선한다.
- Loading amount/metric은 skeleton block 대신 `--` fallback을 사용한다.
- Empty state는 "데이터가 없습니다" 대신 why + one action 기준으로 바꾼다.
- Map/chart 대체 UI도 blue decoration 없이 interaction 중심으로 표현한다.

### Done Criteria

- Data workflow 화면에서 legacy blue panel/gradient가 제거된다.
- Metric typography가 body text와 구분된다.
- All filters and selectable cards have visible selected/focus states.
- API/data behavior is unchanged.

### Verification

```sh
pnpm lint
pnpm typecheck
pnpm build
```

Manual routes:

- `/status`
- `/recommend`
- `/analysis`
- `/analysis/result`
- `/simulation`
- `/simulation/report`
- `/simulation/compare`
- `/share/[token]`

## 13. Task 07. Community & Chatting

### Goal

커뮤니티와 채팅 화면을 list row, form, dialog, message surface 중심으로 정리한다.

### Target Scope

- `src/components/community/*`
- `src/components/chatting/*`

### Required Work

- Community list hero를 compact page header로 전환한다.
- Featured blue gradient cards를 white card 또는 list row로 바꾼다.
- Category chip, filter, badge는 common Badge/Tabs primitive 기준으로 정리한다.
- Community detail content card는 white surface, `12px` radius, minimal shadow로 정리한다.
- Community register form은 common TextField, Button, Card 기준으로 맞춘다.
- Chatting list rail/card 구조는 mobile에서 single-column flow로 안정화한다.
- Chat room modal은 Dialog primitive 기준으로 정리한다.
- Message bubble은 내가 보낸 메시지만 blue interactive-equivalent surface를 허용하고, 상대 메시지는 white/grey surface로 둔다.
- Chat input은 `48px` height, focus blue, send icon button 기준으로 바꾼다.

### Done Criteria

- Community/Chatting 화면에서 decorative gradient card가 제거된다.
- Modal, input, button, tab style이 common primitive 기준과 일치한다.
- Realtime/STOMP/FCM 동작은 변경하지 않는다.

### Verification

```sh
pnpm lint
pnpm typecheck
```

Manual routes:

- `/community/list`
- `/community/[communityId]`
- `/community/register`
- `/chatting/list`
- `/chatting/[roomId]`

## 14. Task 08. Copy, States, Motion

### Goal

문구, 상태 표현, motion을 `frontend/DESIGN.md`의 voice/state/motion 기준에 맞춘다.

### Target Scope

- Error, empty, loading, success text across `src/components`
- Toast-like inline messages
- Skeleton/loading UI
- Transitions and animations

### Required Work

- Financial/data context에서 emoji를 제거한다.
- Forbidden phrase를 제거한다.
  - `불편을 드려 죄송합니다`
  - `Oops`
  - `죄송하지만`
  - `문제가 발생했습니다`
  - `데이터가 없습니다`
- Error text는 specific + blameless + actionable Korean sentence로 바꾼다.
- Empty first-use state는 why + one secondary action으로 정리한다.
- Filter empty state는 one-line grey caption으로 정리한다.
- Loading first paint는 skeleton blocks를 final layout dimensions에 맞춘다.
- Refresh loading은 blocking overlay를 만들지 않는다.
- Button loading은 text replacement 또는 stable-width loading treatment로 정리한다.
- Transitions는 motion token을 사용한다.
- Spring easing은 money-moved success checkmark에만 허용한다. 현재 서비스에 해당 화면이 없다면 사용하지 않는다.

### Done Criteria

- 금지 문구와 emoji가 UI text에서 제거된다.
- Loading, empty, error, success 상태가 route별로 일관된다.
- `prefers-reduced-motion`에서 animation이 비활성 또는 즉시 전환된다.

### Verification

```sh
rg -n "불편을 드려 죄송합니다|Oops|죄송하지만|문제가 발생했습니다|데이터가 없습니다" src app
pnpm lint
pnpm typecheck
```

## 15. Task 09. Visual QA

### Goal

디자인 개편 후 route별 시각 회귀와 정적 기준 위반을 확인한다.

### Target Scope

- 전체 app route smoke
- CSS/static style search
- mobile/tablet/desktop visual QA
- docs follow-up

### Required Work

- 주요 route를 375px, 768px, 1280px에서 확인한다.
- Text overlap, horizontal overflow, clipped button text, card nesting, invalid touch target을 확인한다.
- Static search로 legacy style 잔존 여부를 확인한다.
- `docs/design-guide.md`를 새 기준에 맞춰 갱신하거나 legacy/deprecated 상태로 표시한다.
- 완료 후 `docs/done-checklist.md` 또는 별도 QA note에 검증 결과를 남긴다.

### Route Checklist

- `/`
- `/login`
- `/register`
- `/status`
- `/recommend`
- `/analysis`
- `/analysis/result`
- `/simulation`
- `/simulation/report`
- `/simulation/compare`
- `/community/list`
- `/community/register`
- `/chatting/list`
- `/profile/settings`
- `/profile/bookmarks`

### Static Search Checklist

```sh
rg -n "#1549b5|#336dd3|rgba\(21, 73, 181" src app
rg -n "linear-gradient|radial-gradient|backdrop-filter|filter: blur|box-shadow" src/components app
rg -n "border-radius: (1[7-9]|[2-9][0-9])px" src/components app
rg -n "letter-spacing: -" src/components app
rg -n "font-size: clamp|vw" src/components app
```

### Automated Verification

```sh
pnpm lint
pnpm typecheck
pnpm build
```

### Done Criteria

- All major routes render without layout overflow at 375px.
- Primary CTA hierarchy is clear on every route.
- No decorative blue gradient/glass/orb remains on app surfaces.
- Remaining exceptions are documented with reason and follow-up owner.

## 16. Implementation Notes

- Work in small PR-sized batches. Do not redesign every route in one commit.
- Prefer replacing local styled duplicates with primitives before visual tuning.
- When a route still uses local styles, use global tokens rather than adding one-off colors.
- If a task uncovers behavior bugs, record them separately unless the bug blocks visual completion.
- The design system should become stricter over time: Foundation may keep temporary aliases, but Visual QA should remove or document them.
