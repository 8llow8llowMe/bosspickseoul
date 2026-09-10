---
project: bosspickseoul
cwd: /Users/choiseongho/Develop/bosspickseoul
branch: develop (열린 PR 0건, 이 인계 문서 PR 제외)
timestamp: 2026-09-10T22:10:45+09:00
title: recharts 눈금 중복 수정 머지(#315) · 남은 작업을 이슈 #316~#319 로 정리 — 다른 기기에서 이어 진행
files:
  - none — 미커밋 변경 없음(이 인계 문서 제외). 미추적: 루트·frontend/ .DS_Store, frontend/.env.local.example (→ #318)
---

## 작업 주제: recharts 눈금 중복 수정 머지(#315) · 남은 작업을 이슈 #316~#319 로 정리 — 다른 기기에서 이어 진행

### 요약

직전 인계(`2026-09-10-210930-be-contract-followups-and-fable-delegation.md`)의 남은 작업 2
「recharts 축 tick key 중복 콘솔 오류」를 이슈 #314 → PR #315 로 고쳐 `develop` 에 머지했다
(`e9d178c1`). 그 인계에 남아 있던 나머지 항목과 이번에 새로 발견한 후속은 **전부 GitHub 이슈**로
옮겼으니, 다른 기기에서는 이 문서보다 **이슈 목록이 정본**이다. `origin/develop` 열린 PR 0건.

| 이슈 | 무엇 | 출처 | 상태 |
| ---- | ---- | ---- | ---- |
| #314 | 분석 차트 Y축 눈금 중복 → recharts key 충돌 | 인계 09-10 남은 작업 2 | **닫힘** (PR #315 머지) |
| #316 | dev 반영 뒤 확인 묶음 — 커뮤니티 닉네임(#303), 정책 상세 URL(#290), #315 실화면 콘솔, #307·#309·#312 사람 눈 확인 | 인계 09-10 남은 작업 1·6 | 열림, **BE 데이터 반영 대기** |
| #317 | 추천 화면 지도 카메라 `c` URL 보존 + 자동 맞춤 우선순위 규칙, `url-state.md` §6 제목 정정 포함 | 인계 09-10 남은 작업 3·4 | 열림, 명세부터 |
| #318 | `.DS_Store` gitignore(`[INFRA]`) + `frontend/.env.local.example` 커밋(`[FE]`) | 인계 09-10 남은 작업 5 | 열림, 이 기기 워킹트리에만 파일 존재(아래 주의) |
| #319 | `chart-theme.tsx` 라벨 포맷터가 소수 눈금에서 같은 라벨 반복 가능 | #315 reviewer 발견 | 열림, 낮은 우선순위(현재 데이터로 미도달) |

### 내린 결정

- **눈금은 데이터의 정밀도보다 촘촘해지지 않는다(#315).** `computeNiceYScale` 은 유효 값이
  전부 정수면 눈금 간격을 1 이상으로 유지한다. 소수 값(가로막대 %p)은 클램프하지 않아
  `horizontal-bar-chart` 의 domain 동작이 안 바뀐다. 원인은 정수 데이터가 좁게 몰릴 때
  (선정릉역 4번 상권 점포 수 `12, 12, 11, 11`) 간격 0.2 를 `Math.round` 해 `11, 11, 11, 12, 12, 12`
  가 나오던 것. 눈금은 누적 덧셈 대신 `niceMin + i * step` 을 간격의 소수 자릿수로 반올림해
  만들고(부동소수 잡음 제거, `toFixed` 자릿수는 20 상한), `0.3 / 0.1 = 2.9999…` 류 나눗셈 오차는
  1e-9 스냅으로 눈금 경계에 되돌린다. 중복은 `Set` 으로 방어적으로 제거한다.
- **정수 데이터가 1 차이로 몰리면 눈금이 2개(`11`, `12`)만 남는다.** 도메인은 수정 전과 같고
  중복만 사라진 것이라 로직 문제는 아니다. 240px 축이 헐거워 보이는지는 #316 에서 실화면으로 본다.
- **실화면 검증이 막히면 dev BFF 를 curl 로 직접 친다.** Browser 패널이 숨겨지면 지도 없는
  `/analysis/report` 도 하이드레이션되지 않았다(아래 주의사항). 이번엔
  `curl localhost:5173/api/bff/commercials/3110971/trend?serviceCode=CS100001&metricType=STORE&periodCode=20233&periodCount=4`
  (인증 불필요)로 실데이터를 받아 수정 전·후 함수를 vitest 임시 테스트로 비교했다. 임시 테스트
  파일은 실행 후 지웠다.
- **남은 작업은 인계 문서가 아니라 이슈로 관리한다.** 기기를 넘을 때 인계 문서는 「맥락」, 이슈는
  「할 일」이다. 이 문서는 이슈에 못 담는 결정·주의사항만 싣는다.
- **Fable 세션 위임 규칙은 이번에도 그대로 적용했다.** 탐색 `explorer`(Sonnet) → 구현
  `implementer`(Opus) → 검토 `reviewer`(Opus) → 리뷰 반영 `crud-implementer`(Sonnet). 원인
  확정·수정 설계·PR 본문은 메인이 직접 했다. 브리프에 「빌드·typegen·dev 서버 실행 금지」를 적었고
  이번엔 하위 에이전트가 `next-env.d.ts` 를 건드리지 않았다.

### 남은 작업

1. **#316 dev 반영 뒤 확인** — BE 시드 재적재·정책 수집이 dev 에 반영되면 착수. 코드 변경 없음.
   문제가 나오면 항목별로 새 이슈로 분리한다.
2. **#317 추천 카메라 URL 보존** — `url-state.md` 에 규칙 절을 먼저 쓰고(자동 맞춤 vs URL 우선순위),
   그 다음 리듀서·URL 거울 구현. 같은 문서를 손보는 김에 §6 제목을 「이번 범위 밖 (작성 시점 기준)」
   으로 바꾼다. 브랜치 `feature/fe/recommend-camera-url`.
3. **#318 미추적 파일 정리** — `.DS_Store` 규칙(`[INFRA] chore`)과 `.env.local.example` 커밋
   (`[FE] chore`)을 커밋 둘로 나눠 한 PR 로. **이 기기(맥)에서 해야 한다** — 예시 파일이 여기
   워킹트리에만 있다(아래 주의사항).
4. **#319 라벨 포맷터 소수 처리** — BE 가 소수 지표를 주기 전까지는 급하지 않다. `chart-scale`
   근처를 다시 손볼 때 같이.

**BE 대기**: #316 의 커뮤니티 글 생성·정책 시드 재적재·수집 Job 반영. FE 가 막힌 것은 없다.

### 주의사항

- **`frontend/.env.local.example` 은 이 맥의 워킹트리에만 있는 미추적 파일이다.** 다른 기기에서는
  없다. 내용은 키 이름·주석·빈 값만(reviewer 두 번 확인)이라 #318 로 커밋하면 되는데, 그 전에
  다른 기기에서 로컬 환경을 세우려면 `frontend/.env.example`(추적됨)과 인계 09-07·메모리의
  env 설명을 쓴다. 실키 출처는 레거시 프로젝트 `frontend-env` 폴더(기기 로컬).
- **Browser 패널이 숨겨지면 지도 없는 라우트도 하이드레이션되지 않는다(2026-09-10 실측).**
  직전 인계·메모리는 `/analysis/report` 로 우회하라고 했지만, 이번엔 `document.hidden === true`
  에서 `main` 에 `__reactFiber$` 가 없고 `/api/auth/me` 만 나간 채 데이터 쿼리가 안 돌았다.
  `tabs_select` 로 앞에 내고 navigate 를 다시 해도 같았다. 25초 폴링을 세 번 넘게 반복하지 말고
  (1) 사용자에게 패널을 열어 달라고 하거나 (2) dev BFF 를 curl 로 쳐 로직 단위로 검증한다.
- **`qa:verify` 는 dev 서버를 내린 뒤 돌린다.** `preview_stop` → `git checkout -- frontend/next-env.d.ts`
  → 실행. 이번 세션에서 dev 서버가 `next-env.d.ts` 를 `.next/dev/types/…` 로 바꿨고 typegen 이
  되돌렸다. 커밋 전 `git status` 로 이 파일이 없는지 본다.
- **esbuild·tsx 가 PATH 에 없다.** TS 스크립트를 즉석 실행하려면 `src/` 아래에 임시
  `__scratch-*.test.ts` 를 두고 `pnpm vitest run <파일>` 로 돌린 뒤 지운다. vitest 는 `console.log`
  출력을 요약해 버리므로 결과는 `writeFileSync` 로 scratchpad 파일에 써서 읽는다.
- **reviewer 의 30만 건 퍼즈 결과(PR #315 본문)**: 음수·거대값(1e21)·미세 소수(0.001)·`MAX_SAFE_INTEGER`
  에서 중복·역순·NaN·도메인 밖 눈금 0건. `[0.2, 0.8]` 같은 소수 3자리 계열에서만 domain[0] 이
  데이터 최소값에 붙는 변화(37/50000)가 있는데 그 계열을 bar/line 에 넣는 호출부는 없다.
- **인계 문서는 append-only.** 이 문서를 고치지 말고 새 상황은 새 문서로. 작업이 끝난 옛 인계는
  다음 세션에 지워도 된다(git 이력에 남음). 현재 `docs/handoffs/` 에 09-06~09-10 열 건이 쌓여 있다.
