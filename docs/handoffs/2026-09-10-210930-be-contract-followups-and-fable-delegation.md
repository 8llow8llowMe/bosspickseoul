---
project: bosspickseoul
cwd: /Users/choiseongho/Develop/bosspickseoul
branch: develop (오늘 작업물은 전부 머지됨, 열린 PR 0건)
timestamp: 2026-09-10T21:09:30+09:00
title: BE 계약 후속 처리 · 인계 부채 소진 · Fable 세션의 하위 에이전트 위임 규칙 — 다음 세션 이어 진행
files:
  - none — 미커밋 변경 없음(이 인계 문서 제외)
---

## 작업 주제: BE 계약 후속 처리 · 인계 부채 소진 · Fable 세션의 하위 에이전트 위임 규칙

### 요약

`origin/develop` 에 쌓인 BE PR 스무여 건을 훑어 FE 계약에 영향 있는 것을 골라 처리하고,
이전 인계(`2026-09-08-222700-search-primitive-and-focus-sweep.md`, `2026-09-07-221500-…`)에 남아
있던 FE 부채를 전부 PR 로 밀어 머지했다. 오늘 머지한 PR **여덟 건**: #303 · #304 · #305 ·
#307 · #309 · #310 · #312 와 그 사이 이슈 #302 · #306 · #308 · #311(모두 닫힘). `origin/develop`
= `51c3cd7f`, **열린 PR 0건, FE 이슈 큐 비어 있음.**

세션 후반에 사용자가 **작업 방식 규칙**을 추가했다 — 세션이 Fable 이면 계획·설계는 메인이,
리뷰·구현·탐색은 Opus/Sonnet 하위 에이전트가 한다(#310 으로 문서화, #312 가 첫 적용).

| PR   | 무엇                                                                                         | 근거·이슈             |
| ---- | -------------------------------------------------------------------------------------------- | --------------------- |
| #303 | 커뮤니티 글·댓글 작성자 닉네임·프로필 표시(`CommunityWriter`) + OpenAPI 스냅샷 갱신          | BE #271 → FE #302     |
| #304 | 정책 수집(Quartz) 뒤 추천 화면 계약 확인 — 코드 변경 없음, 주석만                            | BE #292 → FE #290     |
| #305 | `recommend` 공통명세(S0~S5) 사후 작성 — 유일하게 공통명세 없던 Feature                        | `_index` 부채         |
| #307 | 점포 탭 「늘고 주는 업종」(peerStores 개업률−폐업률) + 공용 가로막대 음수 라벨 겹침 수정      | 인계 09-07 남은 작업 5 |
| #309 | 커뮤니티 폼 6곳 포커스 테두리 `primary-600` → `700` + 가드를 테두리형 포커스까지 확장         | 인계 09-08 남은 작업 1 |
| #310 | `[INFRA]` 세션 모델별 역할 분담 규칙 문서화(CLAUDE.md · docs/claude-agents.md · 스킬)         | 사용자 요청           |
| #312 | 분석 보고서 하단 → 같은 조건으로 `/recommend` 링크(D8-2 보조 동선) + 딥링크 문서 4곳 정정      | FE #311               |

### 내린 결정

- **BE 변경의 FE 영향 판정 방법.** `gh pr list --state merged` 로 `[BE]` PR 본문의 「FE:」 안내를
  먼저 읽고, `node frontend/scripts/sync-openapi.mjs` 로 스냅샷 diff 를 봐 계약 드리프트를 잡는다.
  이번에 FE 코드 변경이 필요했던 건 #271(작성자 필드) 하나였다. #274(AUTH_020 429)·회원 revocation
  마커(401)는 BFF 가 서버 메시지·상태를 그대로 넘기고 기존 401 재발급→로그아웃 흐름이 받으므로
  **변경 불필요**로 확정했다.
- **작성자 null 은 「사장님」, `"탈퇴회원"` 은 값이라 그대로.** 회원 서비스 장애·미존재 회원은
  사용자가 고칠 수 없는 상태라 오류처럼 보이게 하지 않는다. 판정은 `formatCommunityWriter` 한 곳.
  프로필 이미지는 `background-image`(MinIO·소셜 URL 은 `next/image` 원격 호스트 등록 대상이 아님),
  없으면 이니셜 아바타.
- **peerStores 순변화는 `subLabel` 로 점포 수를 싣는다.** 처음엔 라벨에 「· 7개」를 넣었는데
  「변화 없는 업종」 문장이 라벨을 `·` 로 잇는 바람에 어디서 업종이 갈리는지 읽을 수 없었다(실화면).
  순변화 0 은 길이 0 막대가 값 라벨을 못 찍어 「데이터 없음」으로 읽히므로 차트 밖 문장으로.
- **공용 `HorizontalBarChart` 의 음수 값 라벨은 항상 막대 오른쪽 끝(0 선)에 붙인다.** recharts
  `position="right"` 는 음수에서 라벨을 막대 왼쪽에 놓아 카테고리 축 이름 위에 겹쳐 찍혔다(실측).
  오른쪽 여백도 가장 긴 값 라벨에 맞춰 계산한다(고정 52px 에서 「+15%p · 27개」가 두 줄로 꺾였다).
  `/status` 두 차트도 같은 컴포넌트라 DOM 으로 회귀 확인했다.
- **초록·빨강 diverging 쌍은 색약 구분이 안 된다(dataviz 검증 deutan ΔE 4.1).** 토큰은 `DESIGN.md`
  정본이라 바꾸지 않았고, 이 차트에서 색은 보조 신호 — 방향(0 선 좌/우)과 부호 라벨(`+`/`-`)이
  1차 인코딩이다. PR #307 본문에 적어 뒀다.
- **분석 → 추천 링크는 보고서 하단에만, 상권 코드 없이.** D8-2 가 정한 방향(상단은 읽기도 전에
  나가라는 신호). 추천은 상권을 *찾아 주는* 쪽이라 상권 코드를 넘기면 추천할 것이 남지 않는다.
  광고 배너처럼 보이면 안 눌리므로(`DESIGN.md` 페르소나) 구분선 + 텍스트 링크만.
- **Fable 세션의 위임 규칙(#310).** 세션이 Fable 이면 분류·계획·설계·통합은 메인이 직접 하고
  `architect` 를 부르지 않는다. 탐색(Sonnet)·구현(Opus/Sonnet)·검토(Opus)는 역할표대로 하위
  에이전트. 하위에 Fable 을 쓰지 않고, 세션 모델을 이유로 하위 모델을 낮추지도 않는다. 정본은
  `docs/claude-agents.md` 「세션 모델과 하위 에이전트」.

### 남은 작업

1. **dev 실데이터 확인 두 건** (배포·데이터 반영 뒤).
   - 커뮤니티 닉네임(#303): dev 에 게시글이 **0건**이라 실응답을 못 봤다. 글이 생기면
     `/community/list` 에서 `writerNickname`·프로필 이미지가 실리는지 본다.
   - 정책 상세 URL(#290 코멘트): dev `GET /api/v1/policies` 5건이 전부 **기관 메인 URL** 이다.
     BE #286 시드 재적재·#292 수집 Job 이 dev 에 반영되면 다시 찍어 공고 상세인지 확인한다.
2. **recharts 축 tick key 중복 콘솔 오류** — 분석 결과 화면(`/analysis/result?…3110971…`)에서
   `tick-label-11-206-206`, `tick-12-8-8` 등 React key 중복 에러가 난다. 이번 변경과 무관해
   **작업 칩(spawn_task)** 으로만 남겼다. 어느 차트가 같은 좌표의 tick 을 두 번 만드는지(트렌드
   라인의 반복 x 라벨 또는 degenerate 도메인) 찾아 dedupe 하고 단위 테스트를 붙인다.
3. **추천 카메라 URL 보존(`c`)** — `url-state.md` §6 「이번 범위 밖」에 남은 마지막 항목.
   `/analysis` 는 카메라를 URL 에 싣지만 추천은 결과에 자동 맞춤이라, 둘이 서로를 덮어쓰는 규칙을
   먼저 정해야 한다(url-state §6 참고). 새 이슈부터 만든다.
4. **`url-state.md` §6 제목** — 「이번 범위 밖」 아래에 「구현 완료」 항목이 남아 어색하다.
   reviewer 의견: 작성 시점 기록이라 항목은 지우지 말고 제목을 「이번 범위 밖 (작성 시점 기준)」
   으로 바꾸면 충분. 다음 문서 손볼 때 함께.
5. **미추적 파일 정리(선택)** — 루트·`frontend/` 의 `.DS_Store` 는 어느 `.gitignore` 에도 없다
   (`[INFRA] chore` 로 규칙 추가). `frontend/.env.local.example` 은 비밀값 없는 유용한 예시라
   `[FE] chore` 로 따로 커밋할 가치가 있다. 둘 다 오늘 커밋에 섞지 않았다.
6. **사람 눈 확인** — #307 「늘고 주는 업종」 음수 막대는 DOM 으로 확인했고 스크린샷은 양수·음수
   둘 다 찍었다. #309 포커스 색과 #312 링크의 포커스 링 모양·모바일 바텀시트 위치는 실화면으로
   보지 않았다.

**BE 대기**: dev 에 시드 재적재·정책 수집 반영(#290 코멘트 참고). FE 가 막힌 것은 없다.

### 주의사항

- **Browser 패널이 숨겨져 있으면 `/analysis`·`/status` 결과 레이어가 하이드레이션되지 않는다.**
  `document.visibilityState === 'hidden'` 이면 `report-*` 섹션이 0개, `window.kakao` 미정의로
  남는다. `tabs_select` 로 앞에 내고 **navigate 를 다시** 한 뒤 `javascript_tool` 로 최대 25초
  폴링(`for … querySelector … setTimeout 2500`)해야 잡힌다. 오늘 세 번 걸렸다. `scroll_to` 뒤
  스크린샷은 흰 화면으로 나오므로 DOM 측정으로 대신한다.
- **`/analysis/result` 의 `commercialCode` 가 그 행정동에 없으면 `/analysis` 탐색 화면으로
  조용히 돌아간다.** 역삼1동(11680640)의 유효 상권은 `3110971`(선정릉역 4번) 등. `3110008` 은
  종로구 청운효자동(11110515) 상권이다. SSR 테스트의 `BASE_PARAMS` 는 실제 조합이 아니어도 된다.
- **dev 서버를 띄우면 `frontend/next-env.d.ts` 가 `.next/dev/types/…` 로 바뀐다.** `pnpm typecheck`
  (= `next typegen`)가 다시 `.next/types/…` 로 되돌린다. 커밋에 넣지 말고 `git checkout --` 로
  되돌린다. 오늘 두 번 걸렸고 reviewer 도 같은 지적을 했다.
- **`qa:verify`(빌드)는 dev 서버를 내린 뒤 돌린다.** `preview_stop` → `next-env.d.ts` 복원 → 실행.
- **hydration 구조 원칙(`analysis-result-view-ssr.test.ts`).** 이 뷰에 무엇을 추가하면 wrapper
  의 존재가 로딩·데이터 상태에 따라 갈리면 안 된다. `null` 조건은 URL 파라미터(렌더 간 불변)에만
  걸어야 하고, 데이터로 달라지는 건 문구만. #312 가 이 원칙대로 만들어졌다.
- **`serviceName` 은 업종 목록 미도착 시 `serviceCode` 로 폴백한다.** 문장에 넣을 땐
  `createRecommendHandoffLabel` 처럼 코드 폴백을 걸러야 「CS100001 창업하기 좋은」이 안 나온다.
- **vitest 의 `global-styles.test.ts` 가드 두 개**가 소스 전체를 스캔한다 — 포커스 링·**테두리**에
  `--color-primary-600` 금지(#309 에서 테두리형까지 확장), hover 와 묶인 포커스 블록의
  `outline: none` 금지. 새 styled 컴포넌트를 쓰면 `&:focus-visible` 색은 700 이다.
- **위임 시 하위 에이전트에 줄 것.** 확정된 사실(어디가 이미 구현돼 있는지, 파일:줄, 계약)을
  브리프에 넣어야 재조사를 안 한다. #312 에서 implementer 는 44 tool call/5분, reviewer 는 50/8분
  걸렸다. reviewer 가 `npx next typegen` 을 실행해 `next-env.d.ts` 를 건드린 일이 있었다 —
  읽기 전용 역할에도 「빌드·typegen 실행 금지」를 브리프에 적는 편이 안전하다.
- **`.env.local.example` 은 untracked 로 세션 넷째 이어져 왔다.** 내용은 비밀값 없음(reviewer 확인).
  커밋 여부는 사용자 판단.
