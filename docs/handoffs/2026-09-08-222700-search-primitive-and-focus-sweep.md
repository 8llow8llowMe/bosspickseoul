---
project: bosspickseoul
cwd: /Users/choiseongho/Develop/bosspickseoul
branch: develop
timestamp: 2026-09-08T22:27:00+09:00
title: 검색 입력 primitive 통일과 포커스 표시 정리 — FE 이슈 4건 처리, PR 6건 머지 완료
files:
  - frontend/src/components/simulation/simulation-choice-search.tsx
  - frontend/src/components/simulation/simulation-choice-search.test.ts
  - frontend/src/components/simulation/simulation-builder-page.tsx
  - frontend/src/components/simulation/simulation-builder-page.test.ts
  - frontend/src/lib/simulation/conditions.test.ts
  - frontend/src/components/ui/text-field.tsx
  - frontend/src/components/ui/text-field.test.ts
  - frontend/src/components/ui/option-picker.tsx
  - frontend/src/components/ui/option-picker.test.ts
  - frontend/src/components/home/product-story.test.ts
  - frontend/src/components/status/status-detail.tsx
  - frontend/src/components/analysis/ai-report-body.tsx
  - frontend/src/components/analysis/analysis-mobile-sheet.tsx
  - frontend/src/components/analysis/analysis-period-select.tsx
  - frontend/src/components/analysis/analysis-result-view.tsx
  - frontend/src/components/simulation/simulation-brand-search.tsx
  - frontend/src/components/simulation/simulation-choice-grid.tsx
  - frontend/src/components/simulation/simulation-condition-section.tsx
  - frontend/src/styles/global-styles.ts
  - frontend/src/styles/global-styles.test.ts
  - frontend/DESIGN.md
  - frontend/docs/features/simulation/step-flow-verification.md
  - frontend/docs/superpowers/specs/2026-09-08-story-panel-width-design.md
---

## 작업 주제: 검색 입력 primitive 통일과 포커스 표시 정리 — FE 이슈 4건 처리, PR 6건 머지 완료

### 요약

열린 FE 이슈(#251 · #250 · #258)를 처리하고, 그 과정에서 나온 후속 이슈(#262 · #265)까지
같은 세션에서 끝냈다. **작업 트리는 깨끗하고 develop 이 origin 과 같은 커밋(`5f3dff28`)이며
dev 배포(frontend-web #112)까지 초록이다.** 이어서 할 FE 이슈는 없다 — 남은 3건(#259 · #106 ·
#92)은 백엔드다.

시작은 「검색창 두 개가 다르게 보인다」였고, 끝은 **저장소의 검색 입력이 `TextField` 하나로
모이고 포커스 표시가 앱 전체에서 일관해진** 상태다. 중간에 색 문제로 보였던 것이 실제로는
**키보드 포커스가 11곳에서 보이지 않던 접근성 결함**이었다.

머지한 PR 6건:

| PR   | 이슈 | 내용                                                                       |
| ---- | ---- | -------------------------------------------------------------------------- |
| #261 | #251 | 시뮬레이션 선택지 검색을 `TextField` 위에 다시 얹음                        |
| #263 | #250 | `simulation-builder-page` 배선 테스트 11건 + 순수 함수 4건 + 375 실측 문서 |
| #264 | #258 | 스토리 밴드 톤 현행 유지 확정 + 밴드-hover 충돌 가드 수정                  |
| #266 | #265 | 포커스 링 세 줄 정렬 + `DESIGN.md` 에 별칭 역할·명암 역전 경고             |
| #267 | #265 | hover 에 묻혀 보이지 않던 키보드 포커스 11곳                               |
| #268 | #262 | `option-picker` 의 세 번째 검색 UI 통일 + `TextField` 포커스 신호 하나로   |

### 내린 결정

- **검색 입력의 정본은 `TextField` 다.** 저장소에 검색 한 줄 구현이 셋이었고(선택지 검색 ·
  브랜드 검색 · `option-picker` 자체 styled) 이제 하나다. 앞으로 검색칸을 새로 만들지 않는다.
- **포커스 신호는 하나다 — 칸 자체의 2px 테두리.** `TextField` 가 전역 `:focus-visible`
  아웃라인을 특이도로 누른다(`&, &:focus, &:focus-visible { outline: none }`). 클래스 선택자
  하나로는 전역 규칙과 특이도가 같아 순서에 밀린다. `DESIGN.md` §Inputs & Forms 의 「focus 2px
  #0ea5e9」가 칸 테두리를 말하고, 전역 링은 자기 표현이 없는 요소용 기본값이라는 판단이다.
- **지우기는 `TextField` 의 `onClear` prop 이다.** `rightSlot` 은 아이콘 자리라 `aria-hidden`
  이어서 버튼을 넣으면 **포커스는 받는데 스크린리더에는 없는** 컨트롤이 된다. `type="search"` 의
  네이티브 ✕ 는 `onClear` 를 쓸 때만 숨긴다 — 안 쓰는 칸에서는 그것이 유일한 지우기 수단이다.
- **두 검색창의 개수 표기는 의도적으로 다르다.** `option-picker` 는 칸 **밖** `aria-live`
  (`20개 중 11개`) — 좁혀지는 과정을 알려야 한다. 선택지 검색은 칸 **안** `rightSlot` +
  `aria-describedby`(`4/25`) — 정적인 보조 정보다. 통일하려 들면 live 알림을 잃는다.
- **`--color-primary-*` 별칭은 명암이 뒤집혀 있다.** `primary-700`(#0ea5e9)이
  `primary-600`(#2272eb)보다 **밝다**. V1 에서는 반대였고 Toss 개편 매핑에서 역전됐다.
  역할: **600 = hover/pressed 전용**, **700 = 기본 인터랙티브 + 포커스**. `DESIGN.md` §Primary 에
  대응표와 경고로 박았다.
- **홈 스토리 배경 밴드는 `--color-background-muted`(grey-50) 유지.** 올리면 `StepButton` hover 와
  대비가 정확히 1.000(같은 색)이 되어 hover 를 한 단계 더 내려야 한다. 밴드의 목적(1400 컬럼이
  결함이 아니라 선택으로 읽히게)에는 은근한 톤으로 충분하다고 보아 연쇄를 사지 않았다. 근거는
  `docs/superpowers/specs/2026-09-08-story-panel-width-design.md` §3.1.
- **테스트 환경은 이미 정해져 있었다.** `jsdom` 과 `@testing-library/react` 가 devDependencies 에
  있고, 파일별 `// @vitest-environment jsdom` 으로 실제 DOM 에 마운트하는 테스트가 여러 개 있다.
  vitest 의 **기본** 환경만 node 다. 포커스·상호작용 테스트는 그 관용구를 따른다.

### 남은 작업

1. **커뮤니티 폼 6곳의 포커스 테두리 색** — `community-comment-thread` ·
   `community-editor-form`(2) · `community-list-view` · `community-location-picker` ·
   `community-report-dialog` 가 포커스 테두리에 `primary-600` 을 쓴다. `--shadow-focus-primary`
   글로우를 함께 써서 **hover 와 구별은 되므로 기능 문제는 아니다** — 색만 위 역할 분담과
   어긋난다. 고칠지는 판단이 남았다(이슈 없음, #265 종료 코멘트에 적어 뒀다).
2. **한 번 붉어졌다가 재현되지 않는 가드** — #268 머지 직후 develop 첫 실행에서
   `global-styles.test.ts` 의 「hover 와 묶인 포커스 블록이 outline 을 지우지 않는다」가 한 번
   실패했다. 이후 로컬 4회 + CI 1회 전부 통과라 일회성으로 판단했지만 **원인은 특정하지
   못했다**(위반 목록도 캡처하지 못했다). 다시 붉어지면 그때 위반 파일:줄 을 먼저 남길 것.
3. **`step-flow-verification.md` 에 남긴 미검증 3건** — 업종 변경 시 브랜드 초기화의 **라이브**
   재현 · 1024 에서 계산 결과 화면 · CSS 레이아웃 회귀(jsdom 이 CSS 를 계산하지 않으므로 유닛으로
   못 잡는다).
4. FE 이슈 큐는 비었다. 새 작업은 이슈부터 만든다(`/issue`).

### 주의사항

**환경 — 다른 기기에서 먼저 할 일**

- **`.claude/launch.json` 은 gitignore 대상이다.** 이 세션에서 `frontend-start`(프로덕션 빌드를
  5173 에 띄우는 설정)를 추가했지만 **따라가지 않는다.** 다른 PC 에서는 다시 만들어야 한다:
  `runtimeExecutable: pnpm`, `runtimeArgs: ["--dir","frontend","start","-p","5173"]`, `port: 5173`.
  `runtimeArgs` 에 `--` 를 섞으면 즉시 죽는다.
- **`frontend/.env.local` 도 gitignore 대상이다.** 값은 여기 적지 않는다 — 레거시 `frontend-env`
  참조. `frontend/.env.local.example` 은 아직 **untracked** 상태다(이 세션에서 만든 것이 아니라
  손대지 않았다). 커밋할지는 판단이 남았다.
- **Node 20.19.4 이상이 필요하다.** `.nvmrc` 는 20.10.0 인데 그 버전에서는 vitest 가
  `node:util` 의 `styleText` 를 찾지 못해 **테스트가 아예 시작되지 않는다**. `nvm` 의 20.19.4 를
  PATH 앞에 두고 돌렸다.

**검증 함정 (전부 이 세션에서 실제로 시간을 버린 것)**

- **프로덕션 서버 포트는 5173(또는 3000)이어야 한다.** BFF 가 브라우저 `Origin` 을 상류로 그대로
  넘기고 백엔드 CORS 허용이 그 둘뿐이라, 5174 에서는 `POST /simulations/reports` 가 **403** 이다.
  더 나쁜 건 화면이 그 403 을 **「로그인이 필요해요」로 옮겨 보여준다**는 것 — 인증 문제로
  오해하고 엉뚱한 곳을 팠다.
- **Browser 패널이 닫혀 있으면**: `computer` 클릭·스크롤이 30초 타임아웃으로 실패하고,
  `window.scrollTo` 로 스크롤한 뒤 찍은 스크린샷이 **흰 화면**으로 나오며(DOM·계산된 스타일은
  정상), `/analysis`·`/recommend` 는 지도 셸이라 **하이드레이션이 미뤄져 피커가 아예 렌더되지
  않는다**(SSR 마크업에도 없다 — curl 로 확인). 이 화면들을 볼 때는 사용자에게 패널을 열어
  달라고 해야 한다.
- 상태 전이만 필요하면 `element.click()` 으로 실제 DOM 이벤트를 발화시켜 몰 수 있다. 단
  **포커스를 주지 않으므로** 포커스 이동을 볼 때는 `focus()` 를 먼저 부른다 — 그러지 않으면 앞
  단계에서 남은 포커스를 보고 「복구됐다」고 잘못 읽는다(실제로 그렇게 **거짓 가드**를 만들었다).

**코드 작성 함정 (각각 두 번 밟았다)**

- **styled 템플릿 리터럴 안 CSS 주석에 백틱을 쓰면 템플릿이 끊긴다.** `[PARSE_ERROR] Expected a
semicolon` 이 주석 한복판을 가리켜 원인이 안 읽힌다. 주석 안 코드 표기는 따옴표로 쓴다.
- **소스를 스캔하는 가드 테스트는 주석을 먼저 지운다.** 「hover 와 달라야 한다」처럼 규칙을
  설명하는 **주석의 낱말**이 선택자로 읽혀 방금 고친 코드를 위반으로 잡는다. 주석 내용만 공백으로
  치환하면(줄바꿈 유지) 오프셋이 그대로라 줄 번호도 정확하다.

**이 세션에서 새로 생긴 가드 6개 — 깨지면 우연이 아니다**

| 가드                    | 파일                                           | 잠그는 것                                                                                                |
| ----------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 개수 → 입력칸 설명 배선 | `simulation-choice-search.test.ts`             | `rightSlot` 이 `aria-hidden` 이라 개수를 `aria-describedby` 로 되살린 것                                 |
| 배선 회귀 11건          | `simulation-builder-page.test.ts`              | 첫 마운트 포커스 강탈 금지 · 자동 진행 · 전부 접힘 복구 · 「변경」이 죽은 컨트롤이 되지 않음 · 해시 진입 |
| 밴드-hover 충돌         | `product-story.test.ts`                        | 금지 토큰을 **밴드 규칙에서 읽어 온다** — 톤을 올리면 hover 를 함께 내리지 않는 한 붉어진다              |
| 아웃라인 색             | `global-styles.test.ts`                        | 포커스 링에 `primary-600` 금지(소스 전체 스캔)                                                           |
| 포커스가 hover 에 묻힘  | `global-styles.test.ts`                        | hover 와 묶인 포커스 블록의 `outline: none` 금지                                                         |
| 검색 한 줄              | `option-picker.test.ts` · `text-field.test.ts` | 임계값 · 접근 이름 · 개수의 `aria-live` · `onClear` 렌더 규칙 · 네이티브 ✕ 조건부 숨김 · 포커스 신호     |

모든 가드는 변이(고의로 결함을 심어 붉어지는지)로 확인했다. 하나가 초록인데 화면이 이상하면
**가드가 거짓인지부터** 의심할 것 — 이 세션에서 실제로 두 개(밴드-hover, 전부 접힘 포커스)가
거짓 가드였다.

**작업 규약**

- develop 직접 커밋 금지. feature 브랜치 + PR. PR 에는 `--assignee seonghoho --label frontend-web`
  이 **필수**다 — 라벨은 분류가 아니라 Jenkins 의 배포 대상 지정이고, 없으면 머지해도 dev 에
  배포되지 않는다(fail-closed).
- 완료 보고 전 `pnpm qa:verify`(format:check → lint → typecheck → build) + `pnpm test`.
  현재 기준값: **216 파일 1996건 통과**.
- FE 전용이다. 원인이 백엔드면 코드를 고치지 않고 이슈만 남긴다.
