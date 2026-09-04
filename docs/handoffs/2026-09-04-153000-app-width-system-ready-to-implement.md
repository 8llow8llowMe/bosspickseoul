---
project: nowdoboss
cwd: /Users/seonghoho/Documents/projects/nowdoboss/.worktrees/bosspick-home
branch: feature/fe/app-width-system (원격 푸시 완료)
timestamp: 2026-09-04T15:30:00+09:00
title: 앱 전체 폭 체계 — 설계·계획 완료, 구현 미착수 (다른 기기에서 이어받기)
files:
  - frontend/docs/superpowers/specs/2026-09-04-app-width-system-design.md
  - frontend/docs/superpowers/plans/2026-09-04-app-width-system.md
---

## 작업 주제: 앱 전체 폭 체계 — 구현만 남았다

### 다른 기기에서 시작하는 법

```bash
git fetch origin
git switch feature/fe/app-width-system
cd frontend && rm -rf .next && PORT=5173 pnpm dev
```

읽을 것은 둘뿐이다. **계획서가 태스크 11개로 다 쪼개져 있으니 그대로 따라가면 된다.**

- 설계: `frontend/docs/superpowers/specs/2026-09-04-app-width-system-design.md`
- 계획: `frontend/docs/superpowers/plans/2026-09-04-app-width-system.md`
- 이슈: https://github.com/8llow8llowMe/bosspickseoul/issues/210

### 진행 상황

브랜치에 커밋 3개가 있고 **전부 문서다. 코드는 한 줄도 안 고쳤다.**

| 커밋 | 내용 |
| --- | --- |
| `31ab4089` | 설계 확정 |
| `2b509cce` | 구현 계획 |
| `ea015025` | 문서를 frontend/docs 로 이동 |

기준은 develop `eefd3fac`. 열린 FE PR 은 이 브랜치 것 외에 없다(아직 PR 도 안 만들었다).

### 내린 결정

- **접근안 A 채택** — 셸은 전 라우트 공통 `calc(100% - 40px)`(상한 없음, 헤더와 동일),
  컬럼 토큰은 `--w-read`(720) · `--w-form`(880) · `--w-wide`(1400) 셋뿐.
  **상한은 셸이 아니라 요소가 진다.** 기준 화면 크기를 특정할 수 없어서다
  (1440~2560 모두 상정) — 셸에 상한을 두면 어느 값이든 한쪽 끝에서 틀린다.
- **A 가 하지 못하는 것을 스펙에 명시했다.** 읽기 폭 720 짜리 화면을 헤더에 맞출
  방법은 없으므로 「중앙」 그룹에는 어긋남이 남는다. A 가 없애는 것은 근거 없는
  어긋남이고 남기는 것은 읽기를 위해 지불한 어긋남이다.
- **홈 스토리는 중앙 1400 으로 뺐다.** 셸 전폭으로 열려면 지난 세션에 못박은
  「패널은 늘어나지 않게 둔다」(`flex: 0 1 600px`)를 뒤집어야 하는데, 그것은
  04단계 패널 여백 문제와 한 덩어리라 범위 밖이다.
- **커뮤니티 목록도 중앙 880.** 셸 전폭으로 열려면 우측을 채울 사이드바가 필요한데
  그것은 폭 체계가 아니라 커뮤니티 기능 기획이다.
- **`--w-standard`(1120) 를 만들었다가 지웠다.** 16개 라우트 어디에도 안 쓰였다.
  리터럴 표류가 이 작업을 부른 원인인데 미사용 토큰을 미리 만드는 건 같은 씨앗이다.

### 남은 작업

계획서의 Task 1~11. **Task 1 부터 순서대로 간다.**

1. 폭 토큰과 `shellWidth` 헬퍼 — **동작 변화 0 이어야 하고 그것이 첫 검증 지점이다**
2. 헤더·푸터 전환
3. `/status` 개방 + `auto-fit` 열 폭주 차단
4. 홈 4개 섹션
5. 커뮤니티 3개 화면
6. 분석 2개 화면
7. 시뮬레이션 3개 화면
8. 추천 비교·프로필
9. 전 라우트 정렬 실측 (1440·1920·2560)
10. DESIGN.md 규칙 갱신
11. (선택) 중앙 라우트 배경 밴드 — 시각 변경이라 사람 눈 승인 필요, 버려도 회귀 없음

끝나면 PR 을 만든다. **base `develop`, 라벨 `frontend-web` 필수**(없으면 Jenkins 가
조용히 배포를 건너뛴다), 머지는 merge commit.

### 주의사항

#### 이 작업 고유

- **`/status` 상세카드는 인계 문서가 적은 것과 반대다.** 「넓은 칸에서 대부분 빈
  공간이 된다」고 적혀 있었으나 실제로는 `repeat(auto-fit, minmax(140px, 1fr))` 라
  **열이 폭주한다**(2560px 칸에서 18열). 손볼 방향이 반대다 — 열을 추가하는 게
  아니라 상한을 거는 일이다.
- **`var(--w-shell)` 은 `calc(100% - …)` 이라 부모 폭 기준이다.** 이미 좁혀진
  컨테이너 안에서 쓰면 두 번 좁혀진다. 페이지 최외곽에서만 건다.
- **홈 세 섹션의 부모가 `padding: 0 20px` 를 들고 있다**(`hero-section.tsx:87`).
  셸이 거터를 지므로 부모의 좌우 padding 을 0 으로 바꿔야 한다 — 안 그러면 거터가
  두 번 걸려 80px 이 된다.
- **`analysis-result-view.tsx` 는 같은 리터럴이 세 곳(205·291·305)에 있다.**
  하나라도 빠뜨리면 섹션 간 폭이 어긋난다.

#### 검증 제약

- **`/analysis/result` 는 선택 상태 없이 열리지 않는다** — 개방 대상인데 실측이
  막힌다. 분석 흐름을 실제로 태워 도달을 시도하고, 못 하면 **미검증으로 명시한다.**
  지난번 B2 · B4 · B5 를 미검증으로 머지하고 추적을 잃은 전례가 있다.
- **`/profile/*` 은 미들웨어 보호**(`middleware.ts:17`) — 실측에 로그인이 필요하다.
- **1440 이상에서 스크린샷이 백지로 나온다.** `getBoundingClientRect` 수치가 유일하게
  믿을 수 있는 근거다.
- **숨겨진 브라우저 pane 에서는 하이드레이션·rAF·scroll 이 죽는다.** pane 을 띄운
  채로 검증한다.

#### 환경

- **dev 포트는 5173.** `PORT=5173 pnpm dev` — `pnpm dev -- -p 5173` 은 실패한다
  (`--` 가 그대로 넘어가 `-p` 를 디렉터리로 읽는다).
- **`qa:verify` 가 `.next` 를 프로덕션 산출물로 채운다** → dev 전에 `rm -rf .next`.
- **HMR 이 끊겨 옛 CSS 가 보이면 dev 서버를 재시작한다.**
- **dev 백엔드가 죽을 수 있다.** 우회:
  `BACKEND_API_URL=http://127.0.0.1:5199 PORT=5173 pnpm dev`
  (셸 환경변수가 `.env.local` 을 이긴다).

#### 코드·CI

- **styled 템플릿의 CSS 주석 안에 백틱을 쓰면 템플릿이 거기서 끊긴다.**
- **`$prop` 기반 styled CSS 는 마크업 문자열에 안 나온다** —
  `ServerStyleSheet().getStyleTags()` 에서 읽는다.
- **SSR 에서 쿼리가 pending 이면 스켈레톤만 그려져 스타일이 시트에 안 나온다** —
  테스트하려면 컴포넌트를 export 해서 단독 렌더한다(계획 Task 3 이 그 사례다).
- **`jenkins/branch` 컨텍스트를 여러 서비스 잡이 공유한다** — 판정할 때 `target_url`
  에 `bosspickseoul-frontend-web` 이 들어갔는지 확인한다.

### 워크트리 상태

- `bosspick-develop` — `develop` @ `eefd3fac` (정본)
- `bosspick-home` — `feature/fe/app-width-system` @ `ea015025` (이 작업)
- ⚠️ `git switch -c <새브랜치> origin/develop` 는 upstream 을 develop 으로 잡는다.
  `git branch --unset-upstream` 을 함께 해야 `git push` 가 develop 으로 가지 않는다.

### 다음 과제 (이 작업 이후)

- **리포트 정보구조 재설계** — 「이 숫자가 좋은지 나쁜지 판단 기준이 없다」가 문제의
  핵심이다. 대상은 `analysis-result-view.tsx`(1944줄). `/analysis/result` 를 브라우저로
  못 여는 제약이 여기에도 걸린다.
- **미검증으로 남은 B2 · B4 · B5** — 홈 스크롤 구동 전환. 게다가 `analysis-rankings` 가
  200 + `rankings: []`(BE 집계 비어 있음, 이슈 #92)라 dev 에서는 R1 트랙이 아예 안
  나온다. 사람이 봐도 B4 를 검증할 수 없다.
- 홈 스토리 패널 확장 재설계 + 04단계 패널 여백(명세 D8-11 · D9-5)
