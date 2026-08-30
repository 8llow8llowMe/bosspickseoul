---
project: nowdoboss
cwd: /Users/seonghoho/Documents/projects/nowdoboss
branch: none (BossPickSeoul 메인 체크아웃은 origin/develop 에 detached, develop 은 .worktrees/bosspick-develop 이 점유)
timestamp: 2026-08-27T09:23:16+09:00
title: 시뮬레이션 슬라이스 B 는 다음 세션에서 진행
files: []
---

## 작업 주제: 시뮬레이션 슬라이스 B 는 다음 세션에서 진행

### 요약

BossPickSeoul FE. 2026-08 백엔드 동기화(시뮬레이션·블루오션·분석 보관함·오류 처리 규약 신설)에 대응하는 FE 작업 사이클을 **전부 마무리했다**. PR 7건이 develop 에 머지됐고 열린 PR 은 없다. 워크트리·브랜치 정리까지 끝난 상태다.

**다음 세션의 주 작업은 창업 시뮬레이션 슬라이스 B** — 상세 리포트, 저장/이력, A/B 비교 화면이다. 계약·타입·API 클라이언트·입력 화면은 이미 develop 에 들어가 있고, 명세도 완비돼 있어 바로 구현에 들어갈 수 있다.

### 내린 결정

**병렬 실행 구조**

- 작업을 **기능이 아니라 디렉터리 소유권 기준**으로 쪼갰다. 기능 기준으로 나눴다면 오류 규약과 블루오션이 `recommend-result-list.tsx`·`recommend-page.tsx` 에서 충돌했을 것이다. 실제 충돌은 `analysis-result-view.tsx` import 블록 한 곳뿐이었다. 근거 문서: `frontend/docs/superpowers/plans/2026-08-26-be-sync-fe-worklist-plan.md` (develop 에 머지됨)
- 스택 PR 을 쓸 때 base 가 중간 브랜치면 머지가 develop 이 아니라 그 브랜치로 들어간다. 실제로 #131·#132 가 그렇게 됐고 #134 로 다시 올려야 했다. 다음엔 base 를 develop 으로 통일하거나 상위 PR 을 Draft 로 두는 편이 낫다
- 스택 하단을 머지할 때 **squash 가 아니라 merge commit** 을 써야 상위 PR 의 diff 가 자기 변경만 남는다 (#134 에서 그렇게 했고 #133 diff 가 21파일로 깨끗했다)

**오류 처리**

- 에러코드 목록이 아니라 **HTTP 상태로만 분기**한다. 404=데이터 부재(재시도 버튼 금지, 서버 `resultMessage` 그대로), 5xx·무응답=일시 장애(재시도 버튼). 재시도 노출은 `isRetryable(kind)` 하나로만 결정하고 화면이 상태 코드를 직접 비교하지 않는다
- 이 설계가 작업 중 검증됐다 — BE 가 `SIMULATION_100/101` 을 삭제·재편했는데 FE 는 고칠 게 없었다

**시뮬레이션**

- `DESIGN.md` S-SIM-1·2 가 V2 계약에 없는 지표(순익·손익분기점·회수기간·민감도)를 요구했다. **없는 데이터를 FE 가 지어내지 않고** 문서를 계약에 맞춰 고쳤다. 이 기능은 "창업 비용 계산기"이지 "수익성 시뮬레이터"가 아니다
- 4단계 마법사를 만들었다가 **실물을 보고 걷어냈다**. 1920px 에서 컨테이너가 760px 이라 양쪽이 비었는데도 한 단계가 화면을 넘겨 마법사의 유일한 이점이 성립하지 않았다. 조건 간 의존성은 업종→브랜드 하나뿐이라 단계로 쪼갤 값이 없었다. 단일 화면 2단(조건 4섹션 + 오른쪽 sticky 결과 패널)으로 재설계
- 비교 화면은 V2 에 API 가 없어 `createSimulationReportPair` 로 `POST /reports` 2회 병렬 호출. 한쪽 실패 시 전체 실패(반쪽 비교는 오도)
- 시뮬레이션 공유는 백엔드 `ShareTargetType` 에 상수가 없어 범위 제외
- 이력 삭제 API 가 없어 삭제 기능 미구현

**지도 셸**

- 지도를 셸로 올리고 URL 에 카메라(`c=위도,경도,레벨`)를 담아 새로고침 복원. intercepting route(`@modal`)를 폐기해 소프트/하드 두 벌 유지를 없앴다
- `analysis/layout.tsx` 에는 지도를 못 올린다(`/analysis/simulation` 까지 걸림) → `(map-shell)` 라우트 그룹 신설
- **공유 payload 에 카메라를 넣지 않는다** — 백엔드가 정규화 payload 해시로 중복을 판정하므로 지도를 1m 움직인 것만으로 다른 상태가 되어 공유 코드가 증식하고 "보관됨" 배지가 팬마다 풀린다. `periodCode` 는 반대로 조건이라 payload 에 이미 있었다

**정리 방침**

- `backup/*` 브랜치 2개는 PR 기록이 없어 의도적 백업으로 보고 남겼다
- 미머지 워크트리 2개(`bosspick-home`, `bosspick-uxslop`)도 남겼다

### 남은 작업

1. **시뮬레이션 슬라이스 B 구현** (주 작업)
   - 정본 명세: `frontend/docs/features/simulation/simulation-report.md` (D0~D8), 공통: `simulation.md`
   - 범위: 상세 리포트(총비용·비용 구성·권리금·유사 프랜차이즈 Top5·성별연령·성수기), 저장/이력, A/B 비교
   - 준비된 것: `src/lib/simulation/conditions.ts`(순수 함수)·`use-simulation-conditions.ts`(훅)·`createSimulationReportPair`·`report-sections.ts`(null 섹션 판정)
   - 인계 방식: 훅을 리포트/비교 화면 상위로 올려 컨트롤러 2개(left/right)를 만들고 각 `reportRequest` 를 `createSimulationReportPair` 에 넘긴다. 상태 로직은 안 건드려도 된다
   - `/simulation/report`·`/simulation/compare`·`/analysis/simulation/{report,compare}` 4개 라우트의 `SimulationUnavailablePage` placeholder 제거
   - 죽은 레거시 컴포넌트 3개 + `*-v1-legacy` 모듈 2개 제거 (share Feature 가 `/share/[token]` 정리를 마치면)
2. **FE 북마크 우회 걷어내기** — 백엔드 `51458f5`(응답 식별자 문자열화)가 dev/prod 에 배포된 뒤. `src/lib/api/user.ts` 의 주석으로 구분된 블록 + `memberBookmarkRequestConfig` 인자 3개 + `user.test.ts` 의 transform 전용 describe 4개만 지우면 된다. 타입·검증·훅·호출부는 이미 문자열 기준
3. **지도 셸 미검증분 확인** — 핀치줌·관성 스크롤(트랙패드/터치 필요), 울트라와이드 첫 프레임(폴리곤이 한 프레임 빌 수 있음, `CAMERA_BOUNDS_MARGIN` 한 줄로 조정)
4. **BE 후속 요청 2건** — 요청 본문 enum 불일치 시 `dataHeader` 봉투 없는 400(`HttpMessageNotReadableException` 핸들러 부재), `ShareTargetType` 에 시뮬레이션 상수 부재
5. **잡무** — `frontend/docs/api/openapi/` 스냅샷 갱신(2026-08-07 기준, 신규 API 미반영), 미사용 `isResponseError`·`RecommendCommercial`·`RecommendMobileSheet.selectedResult` 제거

### 주의사항

**환경 제약 (이 세션에서 겪음)**

- **dev 서버를 `preview_start` 로 띄울 수 없다.** `getcwd: Operation not permitted` / `EPERM uv_cwd` 로 셸이 시작 단계에서 죽는다. 사용자가 터미널에서 직접 띄워야 한다
- **카카오 JS 키가 `localhost:5173` 에만 등록돼 있다.** 다른 포트는 SDK 로드가 401. 지도 검증은 반드시 5173
- **백엔드 CORS 허용 오리진이 5173·3000 뿐이다.** BFF(`app/api/bff/[...path]/route.ts`)가 브라우저 `Origin` 을 상류로 그대로 넘겨서, 다른 포트에서는 모든 POST 가 403(GET 은 정상). 근본 해결은 BFF 의 `HOP` 집합에 `origin` 을 넣거나 BE 허용목록 확대 — 별도 판단 필요
- `.next` 산출물이 낡으면 `qa:verify` 가 `.next/dev/types/routes.d.ts` 에서 타입 오류를 낸다. `rm -rf .next` 로 해소 (소스 문제 아님)

**함정**

- **`formatLargeWon`(만원 입력) vs `status-formatters`(원 입력)** — 바꿔 쓰면 정확히 10,000배 틀린다. 슬라이스 B 에서 차트를 그릴 때 밟기 쉽다
- **`topAgeGroups[].salesAmount` 는 자치구×업종 전체 분기 매출**이지 사용자 점포 예상이 아니다(원천 `sales_district`). 라벨에 집계 범위를 반드시 드러내고 억 단위로 축약해야 한다. 안 하면 273억을 자기 매출로 읽는다
- **`lastId: 0` 은 "처음부터"가 아니라 "0번 다음부터"** — 첫 조회에 키를 싣지 마라
- **층 구분은 enum 피커 전용** — 잘못된 enum 이 본문에 가면 봉투 없는 400 이 나와 화면이 원인을 안내할 수 없다
- Snowflake 아이디는 문자열로 다뤄야 한다. `Number.isSafeInteger` 를 넘는다

**작업 방식에서 얻은 것**

- 서브에이전트 보고를 그대로 믿지 않고 **매번 직접 재현**한 것이 값을 했다. 반대로 **에이전트가 내 지시를 반박한 것도 옳았다** — `#1` 의 `describeNotFound` 에서 "억제 조건을 좁혀라"는 내 지시로는 버그가 안 고쳐졌고, 술어를 긍정 게이트로 뒤집는 게 맞았다
- 명세에 "검증하지 못한 것"을 정직하게 남긴 덕에 구현자가 `createCameraBounds` 상수를 SDK 소스로 다시 유도할 수 있었다

**서브에이전트**

`~/.claude/agents/` 에 FE 전용 6종을 만들어 뒀다 — `fe-spec-writer` / `fe-api-contract`(읽기 전용) / `fe-implementer` / `fe-reviewer`(읽기 전용) / `fe-test-author` / `fe-design-reviewer`. 저장소 고유 규약(테스트 컨벤션·BFF·404 규약·V1 잔재·금지사항)이 내장돼 있다. 이번 세션엔 로드 전이라 프롬프트에 규약을 실어 보냈지만, **다음 세션부터는 이름으로 바로 호출된다**.

**저장소 상태**

- develop `81c6889`, 열린 PR 없음
- 워크트리 3개: `bosspick-develop`(develop), `bosspick-home`(미머지 `docs/fe/ai-report-page`), `bosspick-uxslop`(미머지 `feature/fe/ux-slop-sweep`)
- 슬라이스 B 는 새 워크트리를 따서 시작하면 된다 (`git worktree add ../.worktrees/bosspick-simreport -b feature/fe/simulation-report origin/develop`)
