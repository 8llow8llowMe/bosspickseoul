---
project: bosspickseoul
cwd: frontend/
branch: docs/fe/uiux-handoff-2026-10-10-c (문서만 — PR 로 develop 반영)
timestamp: 2026-10-10T21:11:34+09:00
title: UI/UX 진단 후속 2차 — 후속 이슈 13건·필수 체크·모바일 시트 2종·OG 카드·deps 머지, 남은 것은 BE 대기·결정 대기
files:
  - docs/handoffs/2026-10-10-211134-uiux-followups-required-checks-sheets-merged.md
  - frontend/docs/runbook/qa.md
  - .github/workflows/frontend-ci.yml
---

## 작업 주제: UI/UX 진단 후속 2차 — FE 로 할 수 있는 것은 모두 처리

### 요약

2026-10-10 11:43 인계(`2026-10-10-114326-uiux-batches-all-merged-remaining-be-blocked.md`)를 이어받았다. 그 인계의 「후속 후보」를 이슈로 만들어 처리했고, 사용자 제보 2건(모바일 시트)과 결정 대기 항목을 「메인 추천대로」 위임받아 진행했다. 모든 PR 은 CI 초록 확인 후 rebase 머지했다.

| PR   | 내용                                                                                                    | 이슈 |
| ---- | ------------------------------------------------------------------------------------------------------- | ---- |
| #638 | 글자색 primary-700 → `--color-text-primary-on-light`(AA), 대비 가드 KNOWN_DEBT 26파일 → 1               | #634 |
| #640 | 커뮤니티 44px 미만 로컬 컨트롤에 `touchHitArea()`, 터치 영역 e2e                                        | #633 |
| #641 | 연달아 지운 항목의 되돌리기 토스트를 화면당 하나로 묶음(`lib/ui/undo-batch`), info 아이콘 대비 → 부채 0 | #631 |
| #642 | 분석 경유 시뮬레이션 컨텍스트를 `ctx*` 키 + 표식 `ctx=1` 로 분리, 리포트·비교 왕복 보존                 | #635 |
| #643 | 글자색 primary-600 도 on-light 로, 대비 가드 700·600                                                    | #639 |
| #644 | `/community`·`/chatting` → 목록 307                                                                     | #636 |
| #645 | CI e2e 에 auth·layout·홈 불변식 편입(홈 fixture·`invariants.spec.ts`)                                   | #632 |
| #646 | `/profile` → `/profile/bookmarks/analysis` 307(사용자 결정)                                             | —    |
| #649 | frontend-ci 를 모든 PR 에서 돌리고 `changes` 판정으로 skip, e2e 관찰 기간 종료                          | —    |
| #650 | 공유 링크 OG 카드(상권분석·AI 리포트), Pretendard 서브셋 WOFF1, 폴백·캐시 헤더                          | #598 |
| #651 | @types/node 26·vitest 5. eslint 10·typescript 7·jsdom 30 은 보류 + dependabot ignore(#524 대체)         | —    |
| #652 | 상권분석 모바일 시트: 검색 자리 통일·인기 칩 인라인·탭 압축, CI 에 `e2e/analysis`                       | #648 |
| #654 | 상권추천 모바일 시트: 이중 스크롤 칸 제거·좌우 16px·비교 바 61px, CI 에 `e2e/recommend`                 | #647 |

develop 보호: **필수 체크 `verify`·`e2e`(app 15368, strict false)** 를 소유자가 적용했다(2026-10-10). 리뷰 요구·linear history 없음.

### 내린 결정 (사용자 위임으로 메인이 정함)

- **필수 체크**: verify·e2e 를 필수로. FE 변경 없는 PR 은 job `if` 로 skipped → 통과. 판정 실패 시 둘 다 실행.
- **상권분석 시트(지도 앱 PM 관점)**: 고정 영역은 내비게이션(검색 자리·단계 탭·CTA)만, 「지금 많이 본 상권」은 목록 스크롤 맨 위 한 줄 칩이고 자치구 미선택일 때만. 검색 자리는 시트 머리 아래 한 곳(자치구=이름 검색, 행정동·상권·업종=목록 필터, 상위 선택이 바뀌면 비움). 375×667 은 지도 최소 180px 를 지키고 카드 2줄 목표는 390 이상.
- **상권추천 시트**: 비교 바는 원설계대로 모바일에서도 시트 바닥 sticky.
- **OG 카드**: 행정동명 `?` 깨짐이면 행정동만 빼고, 상권명 깨짐이면 기본 이미지. 카드 1시간·폴백 5분 캐시, 조회 예산 4초. 비교 공유는 기준 분기를 정하지 못해 기본 이미지.
- **deps**: jsdom 30 은 styled-components 텍스트 노드 방식에서 첫 렌더가 약 3배 느려 부하 시 5s 타임아웃이 나서 보류(풀 조건 qa.md §1-4).
- **#637**(조회 수 숨김 기준 10): 운영 데이터 없이 정할 수 없어 유지. **#599**(채팅): 공개 일정 없어 보류.

### 진행 방식 (이번에도 유효)

1. 구현 하위 에이전트(`implementer` Opus / 단순은 `crud-implementer` Sonnet, `isolation: worktree`) — 커밋 금지, 검증 결과 보고.
2. 메인 재검증 → `reviewer`(Opus) → 같은 구현 에이전트에 SendMessage 로 반영. 범위가 늘면 재리뷰(#648 재리뷰에서 HIGH 를 잡았다).
3. 메인이 이슈별 커밋. 워크플로 변경은 `[INFRA]` 커밋으로 분리.
4. develop rebase → 재검증 → PR → CI 초록 확인 후 `gh pr merge --rebase`.

### 남은 작업

1. 이 인계 문서 PR 머지.
2. **BE 대기**: #597(BE #593 뒤, D-4 그때 결정), 알림 #535·#536 + Draft #552(BE #533·#534 뒤 rebase — site-header 세션 분기 충돌 예상).
3. **결정 대기**: #637(운영 조회 수 분포), #599(채팅 공개 일정).
4. **#316**: dev 실화면 확인. 로그인 필요한 화면(프로필·글쓰기·저장·묶음 되돌리기 토스트)은 사용자가 직접 본다.
5. 후속 후보(이슈 없음):
   - jsdom 30: 테스트를 insertRule 방식(`SC_DISABLE_SPEEDY=false`)으로 바꾸고 `<style>` textContent 를 읽는 테스트 3개를 `cssRules` 로 옮긴 뒤 재시도(qa.md §1-4).
   - `backend-ci` 도 `paths` 필터라 지금은 필수로 걸 수 없다 — 필요하면 frontend-ci 와 같은 `changes` 방식으로.
   - 홈 `hero.spec.ts` 의 피커·탭 테스트는 백엔드 없이 통과 — 파일을 나눠 CI 에 더할 수 있다.
   - 비교 공유 OG 카드(기준 분기 결정 필요).
   - iOS Safari 실기기에서 두 시트의 스크롤 끝 바운스 확인.

### 주의사항

1. **로컬 테스트는 Node 22.12 이상**(vitest 5). 이 맥의 기본 Node 는 20 이라 `nvm use 22`(또는 `~/.nvm/versions/node/v22.23.3/bin` 을 PATH 앞에) 후 돌린다.
2. **필수 체크가 걸려 있다.** 그래도 체크 초록을 확인하고 수동 rebase merge 한다. CI e2e 슈트는 community·auth·layout·home 불변식·analysis·recommend(약 90건, CI 약 45초) — 새 슈트는 `frontend-ci.yml` 실행 줄과 qa.md §2 를 함께 고친다.
3. 같은 워크플로 줄·qa.md 를 고치는 PR 이 둘이면 하나를 먼저 머지하고 다른 쪽을 rebase 해 충돌을 푼다(#652 → #654 에서 겪음).
4. 하위 에이전트 worktree 에는 `.env.local` 을 복사해야 BFF 가 동작한다. CI 조건 재현은 `.env.local` 을 치우고 placeholder env 로 prod 빌드 + `pnpm start` 를 쓴다(qa.md §2). 다른 세션이 기계 부하를 크게 올리면 vitest 가 5s 타임아웃으로 흔들린다 — 부하를 확인하고 다시 돌린다.
5. 이 세션은 메인 세션에서 다른 worktree 파일을 Edit 할 수 없다(훅). 그 worktree 의 하위 에이전트에게 SendMessage 로 맡긴다.
6. 남긴 worktree: `agent-a81e3921b34292c1b`(Draft #552). 이번 세션 agent worktree 12개와 로컬 브랜치는 지웠다.
