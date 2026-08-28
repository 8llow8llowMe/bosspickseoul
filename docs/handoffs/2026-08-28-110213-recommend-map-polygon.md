---
project: nowdoboss
cwd: /Users/seonghoho/Documents/projects/nowdoboss/BossPickSeoul
branch: develop (b36cad96)
timestamp: 2026-08-28T11:02:13+09:00
title: 상권 추천 페이지에 상권분석 폴리곤 형태 반영
files:
  - frontend/src/components/recommend/recommend-map.tsx
  - frontend/src/components/analysis/analysis-map.tsx
  - frontend/src/lib/map/draw-area-polygon-layer.ts
  - frontend/src/lib/map/area-polygon-style.ts
  - frontend/src/lib/recommend/recommend-map-model.ts
---

## 작업 주제: 상권 추천 페이지에 상권분석 폴리곤 형태 반영

### 요약

`/analysis` 지도의 폴리곤 표현을 `/recommend` 에도 반영하고 싶다는 요청. **아직 착수 전이고,
사전 조사만 마친 상태다.** 조사 결과 "추천에 폴리곤이 없다"는 전제는 사실이 아니었다 —
추천 지도도 이미 폴리곤을 그린다. 진짜 차이는 **어느 스타일 경로를 타느냐**다.
정확히 무엇을 맞추길 원하는지는 착수 전에 사용자에게 확인해야 한다(아래 「열린 질문」).

### 이번 세션에서 끝난 것 (전부 develop 머지 완료, 열린 PR 없음)

`develop` = **`b36cad96`**

| PR | 내용 |
| --- | --- |
| #159 | UX 슬롭 스윕 PR4(접근성+상태규격) — 스윕은 이제 PR-Home 만 남음 |
| #160 | 로그인·회원가입 `noValidate` — 크롬 기본 검증 말풍선이 인라인 에러를 가로채던 버그 |
| #161 | 폼 필드 채움형 규격 — `--radius-field`(12px) 신설, 채움형 평상시 테두리 제거 |

이슈 #157 자동 종료. 워크트리·브랜치 정리 완료.

### 조사 결과 — 추천 지도는 이미 폴리곤을 그린다

`recommend-map.tsx` 는 `drawAreaPolygonLayer` 를 **이미 쓴다.** 단계별로 갈린다.

| 단계 | 그리는 방식 |
| --- | --- |
| `district` / `administration` / `commercial` | **공용** `drawAreaPolygonLayer` (분석과 같은 함수) |
| `results` | **자체** `drawPolygon` — 공용 레이어를 타지 않음 |

`analysis-map.tsx` 도 같은 `drawAreaPolygonLayer` 를 쓴다(`fitToSelected: false`).

**그래서 실제 차이는 두 군데다.**

**1. 결과 단계가 공용 스타일 체계 밖에 있다.** `recommend-map.tsx:773` 부근에서
`strokeWeight: 1`, `fillOpacity: getScoreFillOpacity(score, rank)` 로 직접 그린다.
공용 `resolveAreaPolygonStyle` 의 default/hovered/selected 3상태를 타지 않고,
선택 하이라이트는 `entry.polygon?.setOptions(...)`(`:234` 부근)로 따로 처리한다.

| | 공용 레이어 | 추천 결과 단계 |
| --- | --- | --- |
| default stroke | 1.5 | 1 |
| default fillOpacity | 0.08 | 점수 기반(`getScoreFillOpacity`) |
| hover | 2 / 0.18 | 없음(별도 경로) |
| selected | 2.5 / 0.28 | 별도 `setOptions` |

**2. 같은 공용 레이어인데 색 토큰이 다르다.**

| | baseStroke | activeStroke | fill |
| --- | --- | --- | --- |
| **분석** (`analysis-map.tsx:310`) | `--color-primary-600` (#2272eb) | primary-600 | primary-600 |
| **추천** (`recommend-map.tsx:632`) | `--color-primary-700` (#0ea5e9) | primary-600 | primary-700 |

추천 결과 단계는 여기에 더해 `--color-primary-500`(#3182f6)까지 쓴다 →
**한 화면에 파랑이 셋(#0ea5e9 / #2272eb / #3182f6)** 이다. 사용자가 "형태가 다르다"고
느낀 원인이 이것일 가능성이 높다.

### 내린 결정

- 이번 세션에서는 **조사만** 하고 코드는 건드리지 않았다. 전제("추천에 폴리곤이 없다")가
  사실과 달라, 무엇을 맞출지 확정하지 않고 손대면 헛수고가 된다.
- 이전 슬라이스들에서 반복 확인된 원칙: **진단 문장을 믿지 말고 develop 기준으로
  직접 재현부터 한다.** 이번에도 그 덕에 전제가 틀린 걸 착수 전에 잡았다.

### 남은 작업

1. **사용자에게 무엇을 맞출지 확인한다**(아래 「열린 질문」). 이게 먼저다.
2. 확인되면 `/analysis` 와 `/recommend` 를 **나란히 띄워 스크린샷으로 차이를 확정**한다.
   코드만 보고 판단하지 않는다.
3. 색 토큰 통일이면: 추천의 `areaPolygonTokens` 를 분석과 맞추고, 결과 단계의
   `--color-primary-500` 사용을 정리한다. **DESIGN.md 에 지도 폴리곤 색 규정이 있는지
   먼저 확인**할 것 — 없으면 정본에 추가해야 한다(PR4·#161 선례).
4. 결과 단계를 공용 레이어로 흡수하는 것이면: `getScoreFillOpacity`(점수 기반 농도)를
   버릴지 유지할지가 핵심 판단이다. 버리면 **점수 정보가 지도에서 사라진다** — 순위
   마커만 남는다. 유지하려면 `resolveAreaPolygonStyle` 에 fillOpacity 오버라이드를
   받는 길을 내야 한다.
5. 테스트: `recommend-map.test.ts` · `analysis-map.test.ts` 가 이미 있다. 스타일을
   바꾸면 여기가 깨질 수 있다.
6. `pnpm exec vitest run` + `pnpm qa:verify` 통과 후 PR(base `develop`,
   `--assignee seonghoho --label frontend-web`).

### 열린 질문 (착수 전 반드시 확인)

「상권분석의 폴리곤 형태」가 셋 중 무엇인가:

- **(a) 색·굵기** — 추천의 파랑 3종을 분석의 primary-600 하나로 통일
- **(b) 상호작용** — 결과 폴리곤에도 공용 hover/selected 3상태 적용
- **(c) 결과 단계 전체를 공용 레이어로 교체** — 점수 기반 농도 포기 여부 결정 필요

### 주의사항

**dev 서버는 `~/Documents` 아래에서 못 뜬다 (macOS TCC).**
`preview_start` 가 `getcwd: Operation not permitted` → pnpm `EPERM: uv_cwd` 로 죽는다.
`/tmp` 와 `~/Desktop` 은 되고 `~/Documents` 만 막힌다 — 프로브로 확정했다.
우회 워크트리를 만들어 두었다:

```bash
git -C <repo> worktree add --detach /tmp/bosspick-dev origin/develop
cp <기존워크트리>/frontend/.env.local /tmp/bosspick-dev/frontend/.env.local
```

`.claude/launch.json` 의 `develop-5173` 이 `/tmp/bosspick-dev/frontend` 를 가리키게 해뒀다.
`/tmp` 라 재부팅하면 사라진다. 근본 해결은 Claude Code 앱에 전체 디스크 접근 권한을
주는 것 — 시스템 설정이라 사람이 해야 한다. `.env.local` 은 gitignore 라 워크트리마다 복사.

**`createGlobalStyle` 은 HMR 로 재주입되지 않는다.** `--radius-field` 를 추가했을 때
컴포넌트 변경은 즉시 반영되는데 토큰만 미정의라 radius 가 0 으로 렌더됐다. dev 서버를
재시작해야 붙는다. **컴포넌트 스타일이 반영된 것만 보고 "적용됐다"고 판단하면 안 된다.**
(`global-styles.ts` 상단에 주석으로 남겨 뒀다.)

**브라우저 pane 이 숨겨지면 계측이 거짓말을 한다.** `document.hasFocus()` 가 false 라
`:focus` 가 매칭되지 않아 "포커스 표시가 사라졌다"로 오독하기 쉽다. 스크린샷도 백지로
나오고 `computer` 클릭은 30초 타임아웃난다. 계측 전에 `document.hasFocus()` 를 확인할 것.
지도 화면은 `document.hidden` 이면 하이드레이션이 미뤄져 SSR 마크업만 남는다.

**미처리 접근성 격차 2건** (원인이 같다 — `#0ea5e9` 가 전경으로 쓰기엔 밝다):
- primary fill `#0ea5e9` + 흰 텍스트 = **2.77:1** (AA 미달). DESIGN.md §Primary (Fill) 에
  「알려진 격차」로 명시해 뒀다. 해결은 fill 색을 어둡게 하는 디자인 시스템 결정.
- `/analysis/result` 좌측 nav 활성 글자 = **2.47:1** (blue500 on blue50).

**#161 은 시각 확인을 로그인 화면에서만 했다.** 20개 폼 필드가 전부 바뀐 변경인데
pane 문제로 시뮬레이션·커뮤니티·채팅은 계측값으로만 확인했다. 지도 작업 하다가
그 화면들을 지나가면 겸사겸사 눈으로 봐 두면 좋다.

**UX 슬롭 스윕에 PR-Home 이 남아 있다** — 데스크탑 히어로 리디자인, 별도 brainstorm 필요.
