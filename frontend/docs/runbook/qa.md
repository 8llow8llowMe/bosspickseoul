# QA Runbook

목적: 배포 전 자동 검증, 수동 smoke test, 기능 완료 체크리스트를 하나의 문서에서 관리한다.
원출처: `../_archive/qa-runbook.md`, `../_archive/done-checklist.md`

## 1. 자동 검증

> 원출처: `../_archive/qa-runbook.md`

### 1. 목적

- 이 문서는 `NowDoBoss-V2/frontend`의 Phase 8 QA 기준 문서다.
- 목표는 배포 전 회귀 검증 절차를 반복 가능하게 고정하는 것이다.
- 자동 검증과 수동 smoke test를 분리해서 기록한다.

### 2. 사전 조건

- Node 는 **22.12 이상**(22 계열)이다. vitest 5 의 `engines` 가 `^22.12.0 || ^24.0.0 || >=26.0.0` 이다.
  Node 20 은 지원 밖이다(돌아가더라도 보장하지 않는다). 로컬 기본이 20 이면 `nvm use 22` 로 맞춘다.
  CI(`setup-node` `'22'`)·배포 이미지(`node:22-alpine`)는 22 다. Jenkins 빌더(`jenkins-builder-agent`)의 22 부 버전은 저장소 밖이라 거기서 확인한다.
- `pnpm install`이 완료되어 있다.
- `.env.local`이 [`.env.example`](../../.env.example) 기준으로 채워져 있다.
- 백엔드 API와 websocket endpoint가 접근 가능하다.
- 테스트 계정과 커뮤니티/채팅 확인용 샘플 데이터가 준비되어 있다.

### 3. 자동 검증

자동 검증은 아래 한 줄로 실행한다.

```bash
pnpm qa:verify
```

포함 항목:

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

자동 검증 통과 기준:

- 포맷 오류가 없다.
- ESLint 오류가 없다.
- TypeScript 오류가 없다.
- Next production build가 성공한다.

PR 에서는 같은 검사에 `pnpm test` 를 더해 두 곳에서 돈다(#497).

- GitHub Actions `frontend-ci / verify`: `frontend/**` 를 바꾼 모든 PR 과 develop push 에서 돌고, 결과가 PR 체크로 보인다. `frontend/` 에서 문서(`docs/**` 와, `src`·`app`·`public` 밖의 `.md`)만 바뀌면 `format:check` 만 돈다. 판정은 `scripts/classify-frontend-changes.sh`.
- Jenkins 프론트 PR 빌드(`RUN_TESTS`): `frontend-web` 라벨이 붙은 PR 에서 Vault env 를 넣고 돈다. 라벨은 PR 을 만들 때 붙인다. 빠뜨리면 `label` 워크플로가 보정한다.

역할 분담 정본은 `backend/docs/jenkins-cicd-dev-deploy-guide.md` §1-2.

### 4. 도구 메이저 보류

Dependabot `fe-major` 그룹(#524, 2026-10-10)에서 `@types/node` 26 · `vitest` 5 는 올렸고
아래 셋은 보류했다. 보류한 메이저는 `.github/dependabot.yml` 의 `ignore` 가 제안을 막는다 — 그래서
**스스로 다시 열리지 않는다.** 확인 시점에 아래 조건을 보고, 풀렸으면 `ignore` 항목을 지우고 올린다.

| 패키지       | 보류한 메이저 | 막는 것                                                                                                                                                                                                                                                                                                                                                                | 풀리는 조건                                                                                                                                                                                                                                                                   | 다음 확인                                                                             |
| ------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `eslint`     | 10            | `eslint-config-next`(16.4.0 까지)가 끌어오는 `eslint-plugin-react` 7.37.5 가 v10 에서 지운 `context.getFilename()` 을 불러 `pnpm lint` 가 첫 파일에서 죽는다. `eslint-plugin-import`·`jsx-a11y` 도 peer 가 `^9` 까지다                                                                                                                                                 | `eslint-plugin-react` 가 v10 을 지원하는 판을 내고(jsx-eslint/eslint-plugin-react#3977) `eslint-config-next` 가 그 판을 쓴다                                                                                                                                                  | Next 마이너를 올릴 때, 늦어도 2026-12 첫 주                                           |
| `typescript` | 7             | 7.0 패키지는 `require('typescript')` 가 버전 문자열만 내놓는다(기존 컴파일러 API 가 없다). `typescript-eslint` 8.x 의 peer 가 `<6.1.0` 이고 `next build` 의 타입 검사도 그 API 를 쓴다                                                                                                                                                                                 | `typescript-eslint` 와 Next 가 TS 7 을 지원 범위에 넣는다                                                                                                                                                                                                                     | 위와 같음                                                                             |
| `jsdom`      | 27+ (30 시험) | `<style>` 에 글자 노드를 붙일 때마다 시트 전체를 다시 파싱하는 비용이 26 의 약 3 배다(같은 규칙 800 개 probe). 테스트에서 styled-components 는 글자 노드 방식이라 파일의 첫 렌더가 느려지고(현황 페이지 첫 테스트 0.5 → 2.4 초), 기계가 바쁘면(load 28 에서 재현) `status-page.list/outage/period` 첫 테스트가 5 초 제한에 걸린다. `verify` 가 필수 체크라 받지 않는다 | 테스트에서 insertRule 방식(`SC_DISABLE_SPEEDY=false`)으로 바꾸고, `<style>` textContent 를 읽는 테스트 3 개(`site-header.mobile-login.interaction`·`community-image-lightbox.interaction`·`community-sheet.interaction`)를 `cssRules` 로 옮긴다. 같이 고칠 테스트 2 개는 아래 | 위 정리를 할 때. 30 은 Node `^22.22.2` 를 요구하므로 Jenkins 빌더 부 버전도 같이 본다 |

- eslint 9 는 npm 에서 "더 이상 지원하지 않는 판"으로 표시된다(`pnpm install` 경고). 보안 수정이 끊기므로 eslint 10 확인을 미루지 않는다.
- TS 6.0.x 는 `typescript-eslint` peer(`<6.1.0`) 안에 있다. 7 을 기다리는 동안 6.0 으로 올리는 것은 이 `ignore` 가 함께 막으므로(5 → 6 도 메이저), 하려면 사람이 따로 올린다.

jsdom 30 으로 올릴 때 같이 고칠 테스트 2 개(2026-10-10 시험에서 실패, 원인 확인됨).

- `site-header.interaction.test.ts` 「comes back while keyboard focus is inside the header」 — 30 의 `:focus-visible` 은 브라우저 휴리스틱(직전 입력이 키보드인지 포인터인지, `@asamuzakjp/dom-selector` 의 이벤트 추적)을 따른다. 26 은 `:focus` 와 같게 매칭해 `focus()` 만으로 통과했다. 앞 테스트의 `fireEvent.click` 이 직전 입력으로 남아 포인터 포커스로 판정된다. `focus()` 앞에 `fireEvent.keyDown(document.body, { key: 'Tab' })` 를 넣는다. 이때 `fireEvent.mouseDown(el)` 뒤 `focus()` 하면 헤더가 숨은 채인지 보는 「탭」 테스트도 더할 수 있다 — 지금은 선택자 문자열로만 잠근 Android 탭 회귀를 동작으로 잡는다.
- `community-editor-form.interaction.test.ts` 「사진을 누르면 드롭존으로 포커스가 간다」 — 30.1.2 부터 `display:none` 요소에 `focus()` 가 걸리지 않는다. jsdom 은 `@media` 를 계산하지 않아 모바일 우선 드롭존(기본 `display:none`, `≥480` 에서 보임)이 늘 숨은 것으로 보인다. 제품 버그는 아니다(작성 체크는 `≥1080` 에서만 보인다). `activeElement` 대신 `vi.spyOn(dropzone, 'focus')` 호출을 본다.

## 2. 브라우저 실측 회귀 (Playwright)

`pnpm qa:verify` 는 **렌더 결과**를 보지 못한다. 색 대비·터치 타깃 크기·문서 높이·
첫 화면에 무엇이 들어오는지는 실제 브라우저에서만 확인된다. 그 실측을 Playwright 로
고정한다.

### 1. 역할 분담

| 도구           | 환경                                          | 무엇을 보는가                                                                                                        |
| -------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| vitest         | `environment: 'node'`, `renderToStaticMarkup` | 순수 로직, 마크업 문자열, 분기(에러 상태 격리 등). 브라우저가 없다                                                   |
| vitest + jsdom | 파일 첫 줄 `// @vitest-environment jsdom`     | 이펙트·이벤트가 필요한 소수 컴포넌트(포커스 이동, 포털, **지도 이펙트**). 지도는 가짜 카카오 SDK 하네스를 쓴다(아래) |
| Playwright     | chromium, 실제 뷰포트                         | 레이아웃 실측·WCAG 대비·터치 타깃·스크롤 예산·콘솔/네트워크                                                          |

로직과 문구는 **vitest 가 정본**이다. Playwright 로 옮기지 않는다 — 느리고, 서버가 필요하다.

**지도 이펙트 하네스.** 카카오 SDK 는 테스트에서도 브라우저 페인에서도 뜨지 않는다. 지도 이펙트는
`src/test/fake-kakao-maps.ts` 의 가짜 SDK 로 jsdom 에서 돌린다 — 로더(`@/lib/kakao-map`)를 `vi.mock`
으로 갈아 `createFakeKakaoMaps().maps` 를 돌려주고, SDK 가 붙는 렌더는 `await act(async () => render(...))`
로 받는다. 무엇을 덮고 무엇을 못 덮는지는 `docs/features/analysis/map-shell.md` D6 「지도 이펙트 검증 경로」.

### 2. 실행

```bash
# 로컬: dev 서버(포트 5173)가 떠 있어야 한다. 없으면 playwright 가 `pnpm dev -p 5173` 로 띄운다.
pnpm test:e2e

# 실패를 눈으로 따라가고 싶을 때
pnpm test:e2e:ui

# 다른 오리진(프로덕션 빌드·스테이징)을 볼 때
PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm test:e2e

# 5173 을 다른 작업이 쓰고 있을 때 — 서버가 없으면 webServer 가 baseURL 의 포트로 dev 서버를 띄운다
PLAYWRIGHT_BASE_URL=http://localhost:5197 pnpm test:e2e
```

`pnpm qa:verify` 에는 **넣지 않는다.** 서버와 브라우저가 필요하다.

**CI 는 GitHub Actions `frontend-ci / e2e` 가 백엔드 없이 도는 슈트를 돈다(#477, #632).** Jenkins 프론트
빌드는 x86_64 에이전트에서 도커 이미지 없이 돌아 Chromium 과 시스템 의존성이 없어서, Jenkins 대신 Actions
러너에 붙였다.

| 슈트                                | CI   | 이유                                                                                                                                                                                                |
| ----------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/community/*`                   | 돈다 | BFF·`/api/auth/me` 를 `e2e/fixtures/community.ts` 가 받는다(아래 3절)                                                                                                                               |
| `e2e/auth/*`                        | 돈다 | `/api/bff/*`·`/api/auth/login`·`/api/auth/me` 를 스펙 안 `routeAuthApi` 가 받는다. 가로채지 못한 BFF 호출은 501 + `unhandled` 로 실패한다. 카카오 SDK 를 띄우지 않는다(버튼 배치·색만 본다)         |
| `e2e/layout/*`                      | 돈다 | 없는 주소 404 화면과 기능 루트 redirect(응답만, `request.get` 으로 최종 주소를 본다 — 목록 화면을 그리지 않는다)를 본다. 세션 쿠키가 없으면 `/api/auth/me` 는 백엔드에 가지 않는다                  |
| `e2e/home/invariants.spec.ts`       | 돈다 | 가로 넘침·h1 하나·링크 허용 목록·콘솔 오류 0·**합니다체 0**·첫 페인트 BFF 호출 ≤3. 첫 페인트 세 호출은 `e2e/fixtures/home.ts` 가 받는다. 서버 종류·데이터 값과 무관한 단언만 둔다                   |
| `e2e/home/home-metrics.spec.ts`     | 로컬 | 래칫. 기준선이 dev 서버 + 실응답으로 잰 수치(문서 높이·sticky 비중·첫 CTA 위치·대비·글자 크기·터치 타깃)라 프로덕션 빌드·고정 응답에서는 어긋난다. 문체·BFF 호출 수는 위 불변식이 CI 에서 같이 본다 |
| `e2e/home/hero.spec.ts`             | 로컬 | 데스크톱 호버 툴팁은 `GET /districts/{code}` 실응답, 값 다섯 단계 칠은 `districts/rankings` 실응답에 기댄다. 피커·탭 동작은 백엔드 없이도 돌지만 파일 단위로 로컬에 둔다                            |
| `e2e/home/ranking-mini-map.spec.ts` | 로컬 | 지표 순위가 실응답이다(조회 순위만 고정). 백엔드가 없으면 섹션이 dual 로 그려지지 않는다                                                                                                            |

`e2e/home` 디렉터리를 통째로 넣지 않는 이유: 위 로컬 전용 셋은 CI 에서 결정적으로 돌지 않는다(백엔드가 없으면
500 → 콘솔 오류·폴백 화면). **슈트를 더할 때는 `frontend-ci.yml` 의 실행 줄에 경로를 더한다.** 백엔드 없이 도는지는
아래 「CI 와 같은 조건」 으로 먼저 확인한다.

- 언제: `frontend/` 코드를 바꾼 PR 과 develop push. 문서만 바뀐 PR 과 프론트와 무관한 PR 은 잡이 skipped 로
  끝난다(`verify` 와 같은 판정, `scripts/classify-frontend-changes.sh`).
- 어떻게: 자리표시자 env 로 `pnpm build` → `pnpm start -p 5173` → 응답을 기다린 뒤
  `PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm test:e2e e2e/community e2e/auth e2e/layout e2e/home/invariants.spec.ts --fail-on-flaky-tests`.
  백엔드는 없다. BFF 는 위 표의 고정 응답이 받는다.
- 실행 시간(로컬 M 시리즈, 프로덕션 빌드, 백엔드 없음, 2026-10-10 develop `a2ef930f` 기준 실측): 커뮤니티만
  46건(32 통과·14 스킵) 약 15~19초 → 지금 72건(57 통과·15 스킵) 약 25초. 잡 시간은 빌드·브라우저 설치가 대부분이라 `timeout-minutes: 25` 로 충분하다.
- **`verify` 와 함께 develop 의 필수 체크로 지정한다**(develop branch protection, 저장소 소유자가 적용).
  관찰 기간(`continue-on-error`)은 끝났다. 이 잡이 깨지면 머지가 막힌다. 예외로 두던 「빨간불이어도 머지」
  규칙도 없어졌다.
  - **적용 순서: 이 워크플로 변경(`pull_request` 의 `paths` 제거)이 develop 에 들어간 뒤에 protection 을 건다.**
    순서가 반대면 develop 의 옛 워크플로가 BE 전용 PR 에서 돌지 않아 두 체크가 Expected 로 남고 머지가 막힌다.
  - 필수 체크가 걸린 뒤에는 `gh pr merge --auto` 가 체크를 기다린다(동작 설명). 이 저장소는 체크 초록을
    확인하고 수동으로 rebase merge 한다.
  - FE 코드 변경이 없는 PR(문서만·BE 전용·다른 워크플로)에서는 skipped 로 끝나고, 필수 체크는 이것을 통과로 친다.
    그래서 워크플로는 `pull_request` 에 `paths` 를 두지 않는다 — 워크플로가 안 돌면 체크가 생기지 않아 PR 이
    영원히 대기한다.
  - flaky 도 실패로 센다(`--fail-on-flaky-tests`). CI 는 `retries: 1` 이라 재시도에서 통과한 테스트도
    통과로 끝나기 때문이다. 고정 응답으로 도는 슈트라 flaky 는 테스트 결함이다 — 재실행으로 넘기지 말고 고친다.
  - 실패하면 `frontend-e2e` 아티팩트(리포트·trace·서버 로그)가 7일 남는다.

로컬에서 재현할 때는 아래 둘 중 하나를 돌린다.

```bash
# dev 서버(5173)
pnpm test:e2e e2e/community e2e/auth e2e/layout e2e/home/invariants.spec.ts

# CI 와 같은 조건 — 프로덕션 빌드 + 자리표시자 env, .env.local 없이(백엔드에 닿지 않는지 함께 본다).
# dev 서버를 먼저 끈다(빌드가 .next 를 다시 쓴다). 5173 이 차 있으면 다른 포트를 쓴다.
export NEXT_TELEMETRY_DISABLED=1 BACKEND_API_URL=http://localhost:8080 \
  AUTH_SESSION_SECRET=ci-placeholder-secret-at-least-32-characters \
  NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=ci-placeholder
pnpm build
pnpm start -p 5173 &
# 서버가 응답하기 전에 테스트를 시작하면 webServer 가 dev 서버를 띄워 프로덕션 빌드가 아닌 것을 잰다
until curl -sf http://localhost:5173/ >/dev/null; do sleep 1; done
CI=1 PLAYWRIGHT_BASE_URL=http://localhost:5173 \
  pnpm test:e2e e2e/community e2e/auth e2e/layout e2e/home/invariants.spec.ts --fail-on-flaky-tests
```

`.env.local` 이 있으면 `next build` 가 그 값을 읽는다. CI 조건을 재려면 잠시 옮겨 두고 빌드한다.

### 3. 대상과 결정론

첫 슬라이스는 홈(`/`) 감사 지표다.

| 파일                                | 무엇                                                 |
| ----------------------------------- | ---------------------------------------------------- |
| `e2e/home/measure.ts`               | 브라우저 안에서 지표를 재는 `page.evaluate` 헬퍼     |
| `e2e/home/home-metrics.spec.ts`     | 래칫(로컬 전용)                                      |
| `e2e/home/invariants.spec.ts`       | 불변식(가로 넘침·h1·링크·콘솔·합니다체 0·BFF ≤3, CI) |
| `e2e/home/hero.spec.ts`             | 히어로 호버 툴팁, 모바일 첫 화면 스크린샷            |
| `e2e/fixtures/analysis-rankings.ts` | `/api/bff/analysis-rankings` 고정 응답               |
| `e2e/fixtures/home.ts`              | 불변식용 첫 페인트 BFF 세 호출 고정 응답             |
| `e2e/baselines/home.<project>.json` | 프로젝트(desktop·mobile)별 기준선                    |

- **랭킹만 고정한다.** 「지금 많이 본 지역」은 집계 결과에 따라 dual/솔로/섹션 제거로
  갈리고 그 분기가 문서 높이를 통째로 바꾼다. `page.route` 로 3건을 고정한다.
  응답 필드는 `src/types/status.ts` 의 `AnalysisRankingBody` 에 있는 것만 쓴다.
- 래칫·히어로는 `districts/top-ten` 을 **실응답 그대로 둔다**(실패 시 예시 데이터 폴백이 있다).
  불변식(`invariants.spec.ts`)만 `e2e/fixtures/home.ts` 로 `top-ten`·`rankings` 까지 고정한다 — 값은 지어낸
  숫자라 높이·위치 수치는 재지 않는다. **로컬에서 돌려도 불변식은 이 fixture 데이터로 돈다**(dev 백엔드
  실응답이 아니다).
- 합니다체 판정(`measure.ts` 의 `/니다\s*[.!?]/`)은 마침표·물음표로 끝나는 문장만 센다. 마침표 없는 제목·버튼
  문구(「…합니다」)와 의문형(「…습니까?」)은 놓친다. 이런 문구의 문체는 리뷰와 vitest 문구 단언이 본다.
  다만 이 API 가 죽으면 홈이 dual 에서 솔로로 바뀌어 `docHeightScreens` 가 크게 줄고
  래칫은 통과한다 — 즉 실패가 아니라 **측정이 무의미해진다.** 기준선을 갱신할 때는
  `stickyTracks` 에 세 트랙이 다 잡혔는지 첨부(`home-metrics`)에서 확인한다.
- 측정은 **스크롤 0 지점**에서 한 번만 한다. 스크롤하면 `IntersectionObserver` 게이트가
  풀려 BFF 호출 수가 달라지고 앵커 채움 상태가 바뀐다.

두 번째 슬라이스는 커뮤니티다. 기준선 없이 이진 단언만 둔다. 화면은 **실데이터 경로 그대로** 열고,
브라우저가 내보내는 BFF 호출만 `page.route` 로 고정 응답을 준다(#469). 그래서 dev 서버와 프로덕션
빌드에서 같은 슈트가 돈다. 예전의 `?mock=1` 목 모드는 `NODE_ENV !== 'production'` 에서만 켜져
프로덕션 빌드에서 돌지 않았다.

- 응답은 **목 데이터 소스(`createCommunityMockSource`)가 만든다.** fixture 를 두 벌 두지 않는다.
  목 소스가 이미 실제 응답 타입(`CommunityDataSource`)을 지킨다. 테스트마다 새 소스라 좋아요·댓글
  상태가 테스트끼리 새지 않는다. 지역 시트의 행정동·상권 목록도 목과 같은 값을 준다.
- 로그인: 미들웨어는 세션 쿠키가 **있는지만** 본다. 그래서 아무 값이나 담은 쿠키를 둔다(서버는
  복호화하지 못해 세션 없음으로 읽는다). 화면의 로그인 상태는 `GET /api/auth/me` 를 가로채 목 회원(9001)으로 준다.
- **가로채지 못한 `/api/bff/*` 호출은 501 로 막고, 테스트 뒤 자동 fixture 가 실패시킨다.** 고정 응답을
  만들다 난 예외(없는 글·권한 없음·fixture 버그)도 `errors` 에 남겨 같이 실패시킨다 — 실패를 일부러
  일으키는 테스트는 확인한 뒤 비운다. 라우트는 context 에 걸어 새 탭도 같은 응답을 받는다. CI 에는
  백엔드가 없다. 새 호출이 조용히 실패하면 화면이 빈 상태로 그려지고, 테스트는 엉뚱한 단언에서 깨진다.
- 커뮤니티 spec 은 `@playwright/test` 가 아니라 `./test` 에서 `test`·`expect` 를 가져온다.
  고정 응답이 그 `test` 의 자동 fixture 다.

| 파일                                  | 무엇(잠그는 TC, `docs/features/community/community.md` S5)                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/fixtures/community.ts`           | 커뮤니티·지역 BFF 와 `/api/auth/me` 고정 응답(목 데이터 소스 재사용), 가로채지 못한 호출 기록                                                                               |
| `e2e/community/test.ts`               | 위 고정 응답을 자동으로 까는 `test`, 끝나면 가로채지 못한 호출 0 을 단언                                                                                                    |
| `e2e/community/measure.ts`            | 목록·상세 진입·콘솔/BFF 기록·스크롤(rAF 두 프레임 대기) 헬퍼                                                                                                                |
| `e2e/community/invariants.spec.ts`    | 목록·상세·글쓰기 가로 넘침·그려진 h1 하나·콘솔 오류 0(CM-014), 모바일 첫 화면 글 행 ≥3(CM-015)                                                                              |
| `e2e/community/list.spec.ts`          | 폭별 골격 3단·2단·1단(CM-037·038), 숨는 헤더(CM-043), 뒤로 가기 스크롤 복원(CM-030)                                                                                         |
| `e2e/community/region-sheet.spec.ts`  | 지역 시트 Esc 는 URL 그대로·칩 포커스(CM-016), `강남구 전체` 확정(CM-017)                                                                                                   |
| `e2e/community/detail.spec.ts`        | 본문·레일 간격 ≤24(CM-020), 모바일 하단 바 두 갈래·입력칸 포커스(CM-027·028), 답글 접기(CM-026), 라이트박스 2장·3장 `→`·스와이프(CM-041), 모바일 사진 줄 점·지금 장(CM-042) |
| `e2e/community/register.spec.ts`      | 새로고침을 건넌 임시 저장 `이어 쓰기`(CM-034)                                                                                                                               |
| `e2e/community/touch-targets.spec.ts` | 모바일에서 44 미만 로컬 컨트롤(댓글 행 동작·반응 바·지역 경로·검색 지우기·`전체 글 보기`)의 히트 영역 ≥44, 이웃 히트 영역과 겹치지 않음(#633)                               |

- **e2e 는 matchMedia 판정·그리드 배치·IntersectionObserver·포커스 이동·실제 history 이동처럼 렌더
  결과가 있어야 아는 것만** 본다. 문구·URL 조립·저장 키·분기·CSS 문자열(브레이크포인트 479 등)은
  vitest(`src/components/community/*.test.ts`, `src/lib/community/*.test.ts`, jsdom 인터랙션)가 정본이다.
- 스크롤 복원(CM-030)은 `history.scrollRestoration = 'manual'` 로 **브라우저 기본 복원을 끄고** 잰다.
  목 데이터는 상세가 목록보다 길어 기본 복원이 우연히 맞는 자리에 떨어지고, 그러면 앱 복원이 깨져도 통과한다.
- 사진 3장 · 답글 5개 댓글은 목 글 9 하나에만 있다(CM-026·041·042). 대상 없는 글이라 지역 피드를
  흔들지 않는다. 가장 늦게 쓴 글이라 최신순 맨 앞에 온다.

### 4. 기준선 갱신 규칙

기준선은 「나빠지지 않았는가」만 본다. 그래서 **나아진 값으로만 내린다.**

- 값을 **올리는 갱신은 하지 않는다.** 지표가 나빠졌으면 기준선이 아니라 코드를 고친다.
- P0/P1 명세(D0~D8)를 구현한 PR 에서 함께 내린다. 갱신 커밋에 실측 전/후 값을 적는다.
- 갱신 방법:

  ```bash
  UPDATE_HOME_BASELINE=1 pnpm test:e2e e2e/home/home-metrics.spec.ts
  ```

  이 모드에서는 래칫 단언을 건너뛰고 현재 실측값을 기준선 파일에 다시 쓴다.
  출력은 prettier 형식에 맞춰 나오므로 `pnpm format:check` 가 그대로 통과한다.

- 목표값(`docs/features/home/home-ux-audit-2026-09-11.md` §5)에 닿으면 테스트가
  `[target reached] …` 를 로그로 알린다. 자동으로 내리지는 않는다.

## 3. 수동 smoke test

> 원출처: `../_archive/qa-runbook.md`

### 4. 수동 Smoke Test

#### 공개 페이지

- `/`
  - hero, CTA, 섹션 간 이동이 정상이다.
  - title/description/canonical이 설정된다.
- `/status`
  - 지역 선택, 카드 렌더, loading/error 상태가 보인다.
- `/recommend`
  - 추천 조건 입력, 결과 카드, 저장 흐름이 정상이다.
- `/community/list`
  - 카테고리 필터, 인기 게시글, 목록 이동이 정상이다.
- `/community/[communityId]`
  - 상세 본문, 댓글, metadata가 정상이다.

#### 인증 / 프로필

- `/login`
  - 일반 로그인과 소셜 로그인 버튼이 정상 렌더링된다.
- `/register`
  - 가입 시작 화면과 일반 회원가입 링크가 정상이다.
- `/register/general`
  - 검증 메시지, 제출 흐름, 실패 메시지가 정상이다.
- `/profile/settings/edit`
  - 로그인 상태에서 프로필 조회와 수정이 동작한다.
- `/profile/bookmarks`
  - 북마크 탭 이동과 항목 진입이 정상이다.

#### 분석 / 시뮬레이션

- `/analysis`
  - 입력 폼 검증과 제출 흐름이 정상이다.
- `/analysis/result`
  - 직접 진입 또는 새로고침 시 결과 복원이 정상이다.
- `/simulation`
  - 시뮬레이션 입력과 리포트 진입이 정상이다.
- `/simulation/report`
  - 리포트 렌더, 비교 이동, 공유 버튼이 정상이다.
- `/share/[token]`
  - 토큰 유효/무효 상태가 정상 분기된다.

#### 커뮤니티

- 게시글 등록, 수정, 삭제가 정상이다.
- 다중 이미지 업로드가 정상이다.
- 댓글 작성, 수정, 삭제가 정상이다.

#### 채팅 / 실시간

- `/chatting/list`
  - 인기 채팅방, 전체 목록, 내 채팅방 검색, 생성 모달이 정상이다.
- `/chatting/[roomId]`
  - history 조회, 실시간 수신, Enter 전송, 나가기 흐름이 정상이다.
- Firebase 권한 거부 또는 VAPID 누락 상황에서도 채팅은 동작하고 푸시만 비활성화된다.

### 5. 결과 기록 방식

수동 smoke는 아래 형식으로 기록한다.

```text
날짜:
환경:
검증자:
자동 검증: pass | fail
수동 smoke: pass | fail | partial
차단 이슈:
- ...
```

### 6. 이번 저장소 기준 남은 수동 확인

- 브라우저에서 Kakao SDK가 실제 키로 로드되는지 확인
- Firebase permission granted 환경에서 토큰 발급과 subscribe API 확인
- websocket `/ws`가 운영 또는 스테이징 백엔드와 실제 연결되는지 확인
- 모바일 viewport에서 community/chatting 스크롤 동작 확인

### 7. Phase 8 Browser Regression 기록

```text
날짜: 2026-04-24
환경: local Next dev server http://localhost:3000, Chrome headless CDP, desktop 1440x1000, mobile 390x844
검증자: Codex
자동 검증: pass
수동 smoke: partial
차단 이슈:
- 백엔드 API http://localhost:8080 연결이 거부되어 community 상세/댓글, community 목록 데이터, chatting 목록 데이터, 내 채팅방 검색, room detail, message history를 실제 데이터로 확인하지 못했다.
- websocket 기본 endpoint ws://localhost:8080/ws 연결이 거부되어 STOMP connect/send/receive/leave flow를 확인하지 못했다.
- .env.local의 Kakao JavaScript key가 비어 있어 Kakao SDK load/share granted flow를 확인하지 못했다.
- .env.local의 Firebase API key, messaging sender id, app id, VAPID key가 비어 있어 Firebase permission granted 토큰 발급과 subscribe API flow를 확인하지 못했다.
- 실제 테스트 계정/session이 없어 fake local auth로 gated 화면 렌더만 확인했다. 실제 생성/전송/나가기 mutation은 백엔드와 계정 준비 후 재검증해야 한다.
```

확인 결과:

- `/community/list`: desktop/mobile 진입, 카테고리 UI, 작성 링크, loading/empty/error surface 렌더 확인. 가로 overflow 없음. 백엔드 연결 실패 console error는 환경 차단으로 기록.
- `/community/1`: desktop/mobile 진입과 loading/error-prone surface 확인. 가로 overflow 없음. `DEP0169 url.parse()` dev-server deprecation warning이 1회 관측됐고, `src`/`app` application source에는 `url.parse` 사용이 없었다.
- `/community/register`: unauth 상태는 `/login` redirect 확인. fake local auth 상태에서 desktop/mobile form 렌더와 스크롤 가능한 작성 화면 확인. 가로 overflow 없음.
- `/chatting/list`: desktop/mobile 진입, category chips, popular/all room sections, auth-required create branch 확인. 백엔드 연결 실패 console error는 환경 차단으로 기록.
- `/chatting/list` 생성 modal: fake local auth 상태에서 desktop/mobile modal open 확인. submit flow는 backend/test account 부재로 blocked.
- `/chatting/1`: unauth 상태는 `/login` redirect 확인. fake local auth 상태에서 desktop/mobile room loading surface 확인. room detail/message history/websocket 실패는 backend/websocket 부재로 blocked.
- Firebase missing-key 상태는 route 렌더와 chatting UI 진입을 막지 않았다. 실제 granted-token flow는 env key 부재로 blocked.
- Kakao SDK는 대상 route에서 share UI가 노출되지 않았고 key도 비어 있어 blocked.
- mobile header brand link touch target은 `108x40`으로 확인했다.

## 4. 완료 체크리스트

> 원출처: `../_archive/done-checklist.md`

### 1. 기능 단위 완료 기준

각 기능 또는 라우트는 아래 조건을 모두 만족해야 `완료`로 본다.

- URL 진입이 정상 동작한다.
- 빈 화면, 로딩, 에러 상태가 존재한다.
- 주요 API 호출이 레거시와 동일하게 동작한다.
- 인증이 필요한 화면은 로그인 상태 분기가 맞다.
- 모바일과 데스크톱에서 레이아웃이 무너지지 않는다.
- `docs/design-guide.md` 기준을 어기지 않는다.
- 공개 페이지는 `docs/runbook/seo.md` 기준을 어기지 않는다.
- 브라우저 전용 코드가 SSR 오류를 일으키지 않는다.

### 2. 화면 체크리스트

- [ ] 헤더/푸터 노출 규칙이 맞다
- [ ] 제목, 본문, 버튼 계층이 가이드와 맞다
- [ ] spacing, radius, color가 토큰 기준으로 정리됐다
- [ ] 이미지와 아이콘 경로가 정상이다
- [ ] 뒤로가기/링크 이동 흐름이 맞다
- [ ] query parameter, dynamic route 파싱이 정상이다

### 3. 상태/데이터 체크리스트

- [ ] React Query key와 refetch 조건이 적절하다
- [ ] Zustand store 초기화가 서버 렌더를 깨지 않는다
- [ ] `localStorage`/`sessionStorage` 접근 시점이 안전하다
- [ ] cookie 읽기/쓰기 흐름이 기존과 호환된다
- [ ] 환경변수가 `NEXT_PUBLIC_*` 체계로 정리됐다

### 4. 외부 SDK 체크리스트

아래 항목은 해당 기능이 있을 때만 확인한다.

- [ ] Kakao SDK가 클라이언트에서만 로드된다
- [ ] Firebase Messaging이 브라우저 환경에서만 초기화된다
- [ ] 서비스 워커 등록이 effect 안에서 실행된다
- [ ] websocket/STOMP 연결 해제 처리까지 포함된다

### 5. Tooling 체크리스트

- [ ] 패키지 매니저가 `pnpm`으로 통일됐다
- [ ] `pnpm-lock.yaml` 기준으로 의존성이 관리된다
- [ ] `Prettier` 설정 파일이 존재한다
- [ ] `format` 또는 `format:check` 스크립트가 존재한다
- [ ] 변경 파일이 `Prettier` 기준으로 포맷됐다

### 6. QA 체크리스트

- [ ] 콘솔 에러가 없다
- [ ] hydration 경고가 없다
- [ ] `pnpm qa:verify`가 통과했다
- [ ] 핵심 버튼과 폼이 수동 테스트를 통과했다
- [ ] Phase 8 작업이면 `docs/runbook/qa.md`와 `docs/runbook/cutover.md`가 최신 상태다
- [ ] 새 공통 규칙이 생겼다면 관련 문서를 업데이트했다
- [ ] `docs/features/_index.md` 상태가 갱신됐다

### 7. SEO 체크리스트

공개 페이지 또는 외부 공유 대상 페이지일 때 확인한다.

- [ ] `title`과 `description`이 페이지 목적에 맞다
- [ ] canonical URL이 설정됐다
- [ ] Open Graph 정보가 설정됐다
- [ ] 비공개 페이지는 `noindex` 정책이 맞다
- [ ] `NEXT_PUBLIC_SITE_URL` 기준 절대 URL이 production 값으로 검증됐다
- [ ] 제목 구조와 시맨틱 마크업이 과도하게 깨지지 않는다
- [ ] 색인 대상 페이지에 빈 metadata가 남아 있지 않다

### 8. Phase Gate

다음 Phase로 넘어가기 전 아래 기준을 지킨다.

- Main/Auth/Profile 이전 후:
  - 로그인, 로그아웃, 회원가입, 프로필 조회까지 정상 동작
- Status/Recommend 이전 후:
  - 지도/차트가 포함된 조회 화면 패턴 정착
- Analysis/Simulation 이전 후:
  - 핵심 수익 모델/리포트 흐름 검증
- Chatting 이전 전:
  - 인증, 알림, 세션 관련 공통 유틸 완료
