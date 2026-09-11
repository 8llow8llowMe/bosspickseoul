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

- `pnpm install`이 완료되어 있다.
- `.env.local`이 [`.env.local`](../../.env.local) 기준으로 채워져 있다.
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

## 2. 브라우저 실측 회귀 (Playwright)

`pnpm qa:verify` 는 **렌더 결과**를 보지 못한다. 색 대비·터치 타깃 크기·문서 높이·
첫 화면에 무엇이 들어오는지는 실제 브라우저에서만 확인된다. 그 실측을 Playwright 로
고정한다.

### 1. 역할 분담

| 도구       | 환경                                          | 무엇을 보는가                                                      |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------ |
| vitest     | `environment: 'node'`, `renderToStaticMarkup` | 순수 로직, 마크업 문자열, 분기(에러 상태 격리 등). 브라우저가 없다 |
| Playwright | chromium, 실제 뷰포트                         | 레이아웃 실측·WCAG 대비·터치 타깃·스크롤 예산·콘솔/네트워크        |

로직과 문구는 **vitest 가 정본**이다. Playwright 로 옮기지 않는다 — 느리고, 서버가 필요하다.

### 2. 실행

```bash
# 로컬: dev 서버(포트 5173)가 떠 있어야 한다. 없으면 playwright 가 `pnpm dev -p 5173` 로 띄운다.
pnpm test:e2e

# 실패를 눈으로 따라가고 싶을 때
pnpm test:e2e:ui

# 다른 오리진(프로덕션 빌드·스테이징)을 볼 때
PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm test:e2e
```

`pnpm qa:verify` 에는 **넣지 않는다.** 서버가 필요하고 CI 이미지에 브라우저가 없다.
CI 에서 돌리려면 `pnpm exec playwright install --with-deps chromium` 과 프로덕션 서버
기동(`pnpm build && pnpm start -p 5173`)을 파이프라인에 따로 넣는다.

### 3. 대상과 결정론

첫 슬라이스는 홈(`/`) 감사 지표다.

| 파일                                | 무엇                                                 |
| ----------------------------------- | ---------------------------------------------------- |
| `e2e/home/measure.ts`               | 브라우저 안에서 지표를 재는 `page.evaluate` 헬퍼     |
| `e2e/home/home-metrics.spec.ts`     | 래칫 + 불변식(가로 넘침·h1·링크 허용 목록·콘솔 오류) |
| `e2e/home/hero.spec.ts`             | 히어로 호버 툴팁, 모바일 첫 화면 스크린샷            |
| `e2e/fixtures/analysis-rankings.ts` | `/api/bff/analysis-rankings` 고정 응답               |
| `e2e/baselines/home.<project>.json` | 프로젝트(desktop·mobile)별 기준선                    |

- **랭킹만 고정한다.** 「지금 많이 본 지역」은 집계 결과에 따라 dual/솔로/섹션 제거로
  갈리고 그 분기가 문서 높이를 통째로 바꾼다. `page.route` 로 3건을 고정한다.
  응답 필드는 `src/types/status.ts` 의 `AnalysisRankingBody` 에 있는 것만 쓴다.
- `districts/top-ten` 은 **실응답을 그대로 둔다**(실패 시 예시 데이터 폴백이 있다).
  다만 이 API 가 죽으면 홈이 dual 에서 솔로로 바뀌어 `docHeightScreens` 가 크게 줄고
  래칫은 통과한다 — 즉 실패가 아니라 **측정이 무의미해진다.** 기준선을 갱신할 때는
  `stickyTracks` 에 세 트랙이 다 잡혔는지 첨부(`home-metrics`)에서 확인한다.
- 측정은 **스크롤 0 지점**에서 한 번만 한다. 스크롤하면 `IntersectionObserver` 게이트가
  풀려 BFF 호출 수가 달라지고 앵커 채움 상태가 바뀐다.

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
