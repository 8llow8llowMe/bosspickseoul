---
project: bosspickseoul
cwd: frontend/
branch: docs/fe/uiux-review-execution-plan (문서만 — 코드 변경 없음, PR 로 develop 반영)
timestamp: 2026-10-09T23:34:35+09:00
title: UI/UX 진단 63건 → 이슈 53건(#554~#606) 발행 완료, 배치 21개 실행 계획 작성 — 다음은 B1부터 구현
files:
  - docs/reports/2026-10-09-uiux-usability-review.html
  - frontend/docs/superpowers/plans/2026-10-09-uiux-review-execution.md
  - frontend/AGENTS.md
  - frontend/CLAUDE.md
---

## 작업 주제: UI/UX 진단 후속 — 이슈 발행 완료, 구현은 다음 세션

### 요약

전 화면 UI/UX·사용성 진단을 했다. dev 사이트를 375·800·1440px 로 직접 돌았고(1440 은 헤드리스 Playwright), FE 코드를 4개 영역으로 나눠 리뷰했다. 이미 열린 이슈는 뺐다.

- 진단서: `docs/reports/2026-10-09-uiux-usability-review.html` (63건, P1 20 · P2 27 · P3 16, 개선 전후 화면 12쌍, 정량 효과·KPI 가설·계측 계획). 공유본 https://claude.ai/artifact/6nMTaRMdi5YGhDL6t1pQL7 (비공개 — 팀 공유는 페이지 Share 메뉴에서)
- 발행한 이슈 53건(라벨 없음):
  - 1차 #554~#561 (신뢰 숫자·404·대비·터치·iOS 확대·문구·구별현황 기준)
  - 2차 #562~#584 (흐름·연결·인증·프로필·커뮤니티·공용 UI)
  - 데스크톱 #585~#591
  - BE 계약 요청 #592~#595 (FE 짝: #596·#597·#580·#576 — 코멘트로 연결)
  - FE 3차·P3 #596~#606
- 실행 계획: `frontend/docs/superpowers/plans/2026-10-09-uiux-review-execution.md` — FE 이슈 49건을 배치 21개(B1~B21)로 묶고 배치마다 역할·모델·파일 범위·테스트·순서를 정했다. `frontend/AGENTS.md`·`frontend/CLAUDE.md` 에 진입 안내 한 줄씩 추가.

### 내린 결정

- **배치 = 쓰기 하위 에이전트 1회 + PR 1개**, 커밋은 이슈마다. 파일이 겹치는 배치는 순서를 지킨다(계획 §3).
- **모델 배정은 `docs/claude-agents.md` 그대로 적용**: 토큰·크기·문구·단순 추가는 `crud-implementer`(Sonnet), 흐름·상태 변경은 `implementer`(Opus), 공용 UI 정리는 `refactorer`(Opus), 모든 배치 검토는 `reviewer`(Opus), 착수 확인은 `explorer`(Sonnet). 호출 때 model 덮어쓰기 금지.
- **BE #592~#595 는 FE 세션에서 구현하지 않는다**(프론트 전용 원칙). FE 배치는 임시안까지만.
- 진단서·계획의 수치는 실측/코드 계산/추정을 구분했다. 추정(KPI 범위)은 계측 전 목표 가설일 뿐이다.

### 남은 작업 (다음 세션 시작점)

1. 문서 PR(브랜치 `docs/fe/uiux-review-execution-plan`)이 develop 에 머지됐는지 확인한다(아래 주의사항 1).
2. 계획 §4 의 결정 7개(D-1 증감 색 규칙 ~ D-7 홈 지도 기본 지표) 중 착수할 배치에 걸린 것을 사용자에게 묻는다.
3. **B1(대비 토큰 #556·#585)** 부터 시작. 병렬로 B4(#555)·B11(#571)을 다른 worktree 에서 돌릴 수 있다.
4. 배치를 끝낼 때마다 계획 §6 진행 현황 표를 갱신한다.

### 주의사항

1. 진단서·계획·인계 문서는 `docs/fe/uiux-review-execution-plan` 브랜치 PR 로 올렸다. 머지 전이면 develop 에서 딴 worktree 에 계획 파일이 없다 — 머지를 먼저 확인하거나 그 브랜치에서 읽는다.
2. 이슈 본문의 `파일:줄` 은 2026-10-09 기준. 착수 전 `explorer` 로 재확인.
3. 지도 화면(`/analysis`, `/recommend`)은 Browser pane 이 숨겨지면 하이드레이션이 안 된다. 헤드리스 확인은 메인 체크아웃 `frontend/node_modules/@playwright/test` 를 `require` 하는 스크립트를 scratchpad 에 두고 돌렸다(이 worktree 에는 node_modules 가 없다).
4. #549(정책에 서울 밖 공고·&nbsp;)는 BE 이슈로 이미 열려 있고 2026-10-09 결과 화면에서도 재현됐다 — FE 배치 범위가 아니다.
