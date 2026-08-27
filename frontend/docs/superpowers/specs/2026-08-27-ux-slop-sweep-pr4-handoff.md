# UX 슬롭 정리 스윕 PR4 — 핸드오프

- 작성일: 2026-08-27
- 기준 커밋: `origin/develop` `6053ff5` (PR3 `#156` 머지 직후)
- 원 설계 명세(정본): [2026-08-14-ux-slop-sweep-design.md](./2026-08-14-ux-slop-sweep-design.md)
- 남은 범위: **PR4(접근성+상태규격)** · PR-Home(별도 brainstorm)

> **다른 컴퓨터에서 이어받기 위한 자족 문서다.** 지금까지 무엇이 끝났고, PR4 를 어떻게
> 시작해야 하며, 왜 그 순서여야 하는지를 전부 담았다. 이 문서만 읽고 착수할 수 있어야 한다.

---

## 0. 먼저 읽을 것

| 목적                               | 파일                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| 작업 지도(정본 위치·프로세스·금지) | `frontend/CLAUDE.md`                                                            |
| 스윕 설계 명세 + PR1~3 실행 결과   | `frontend/docs/superpowers/specs/2026-08-14-ux-slop-sweep-design.md` (§7·§8·§9) |
| 디자인 시스템 정본                 | `frontend/DESIGN.md`                                                            |
| 횡단 규칙                          | `frontend/docs/engineering/`                                                    |

**절대 규칙:** DESIGN.md 토큰만 사용(임의 색·radius·spacing 토큰 추가 금지, 틴트는 `color-mix` 파생).
백엔드 API 계약 변경 금지. 광범위한 무관 리팩터 금지. 커밋 컨벤션 `[FE] ...`.
develop 직접 커밋 금지 — feature 브랜치 + PR.

---

## 1. 스윕 현황

| PR      | 제목                  | 상태                             | 머지                                            |
| ------- | --------------------- | -------------------------------- | ----------------------------------------------- |
| PR1     | 횡단 슬롭 일괄        | ✅ 완료                          | `#152` → `343695e`                              |
| PR2     | 시뮬레이션 돈 화면    | ✅ 완료(**재검증 후 대폭 축소**) | `#154` → `476e778`                              |
| PR3     | 상권분석/결과/AI      | ✅ 완료                          | `#156` → `6053ff5` (`#155` 는 스택 붕괴로 닫힘) |
| **PR4** | **접근성+상태규격**   | **⬜ 미착수 — 이 문서의 대상**   |                                                 |
| PR-Home | 홈 히어로 모바일 정렬 | ⬜ 미착수(별도 brainstorm 필요)  |                                                 |

---

## 2. PR4 착수 규칙 — **반드시 전수 재검증부터 한다**

원 진단(§3)은 `2c6209c` 기준이고 develop 은 그 뒤로 한참 움직였다. PR1~3 에서 매번 같은 일이 벌어졌다.

- **PR2**: 진단 대상 7건 중 **5건이 이미 사라졌다.** 슬라이스 B 가 시뮬레이션 V1 을 통째로 교체했다.
- **PR2**: 남은 「억/만원 → 정확한 원」은 **오진이었다.** 진단이 DESIGN.md §6.4 만 보고 S-SIM-2
  (「원 단위 포매터를 쓰면 1만 배 틀린다」)를 놓쳤다. 판정을 뒤집고 문서의 자기모순을 정합화했다.
- **PR1**: `status-detail` 좌측 바도 판정을 뒤집었다 — 장식이 아니라 tone 전달자였다.
- **PR1·PR3**: 진단에 없던 같은 위반이 새 코드에 전파돼 있었다(슬라이스 B 의 `font-weight: 750`,
  세 번째 하드코딩 scrim 등).

**그래서 순서는 이렇다.**

1. §3 의 대상을 `origin/develop` 기준으로 **하나씩 파일·행을 열어 확인**한다. 사라진 것, 이미 고쳐진 것, 남은 것을 가른다.
2. 각 항목이 **정말 정본 위반인지** DESIGN.md 원문을 찾아 확인한다. 진단 문장을 믿지 않는다.
   정본끼리 충돌하면 고치지 말고 **판단을 사용자에게 올린다**(PR2 의 `formatLargeWon`, PR3 의 잠금 카드가 그랬다).
3. 같은 클래스의 위반을 grep 으로 전수 훑어 진단에 없던 것도 함께 처리한다.
4. 결과를 원 명세에 **§10 「PR4 실행 결과」** 로 기록한다 — 사라진 대상, 뒤집은 판정과 근거, 범위 밖으로 남긴 것.

---

## 3. PR4 대상 — 위치 확인 결과 (2026-08-27, `6053ff5`)

> ⚠️ **아래는 "그 자리에 그 코드가 아직 있다"는 위치 확인일 뿐이다. 위반 여부 판정은 하지 않았다.**
> §2 의 절차대로 각 항목을 직접 판정하고 시작한다.

### ① recommend 주 CTA 대비

- `src/components/recommend/recommend-condition-form.tsx:92-98` — `SubmitButton` 이
  `background: var(--color-primary-700)`(= `blue500` `#0ea5e9`) 위에 `color: var(--color-text-900)`(`#191f28`).
- 정본: DESIGN.md `104`~`107` 행 「Primary (Fill) — Background `#0ea5e9` / **Text `#ffffff`**」,
  `285` 행 예시 「#0ea5e9 bg, white text」. 접근성 규칙은 `569` 행 「텍스트 대비는 WCAG AA 이상」.
- 확인할 것: 실제 대비비를 재고, 흰 텍스트로 바꿨을 때 다른 primary 버튼과 규격이 같아지는지.

### ② 터치 타깃 < 36px

정본: DESIGN.md `248` 행 「버튼: xlarge(56) / large(48) / medium(40) / **small(36)**」,
`749`~`753` 행 「리스트 row 최소 52px, 모바일 헤더 액션 최소 40px, 주요 액션 48px+」.

| 위치                                               | 현재 값                                |
| -------------------------------------------------- | -------------------------------------- |
| `src/components/status/status-metric-tabs.tsx:32`  | `min-height: 34px`                     |
| `src/components/status/status-map.tsx:166`         | `min-height: 34px`                     |
| `src/components/status/status-map.tsx:210-211`     | `min-width: 32px` / `min-height: 28px` |
| `src/components/status/status-top-ten.tsx:105-106` | `24px × 24px`                          |
| `src/components/status/status-top-ten.tsx:166`     | `min-width: 24px`                      |
| `src/components/status/status-detail.tsx:154`      | `BackButton` (진단이 28px 로 지목)     |

24px 짜리들은 배지·순위 표식일 수 있으니 **클릭 가능한 것만** 고른다. `getComputedStyle` 로
실제 히트 영역(padding 포함)을 재는 편이 정확하다.

### ③ 인라인 에러가 상단 배너로만

- `src/components/auth/login-form.tsx`, `register-form.tsx` — 두 파일 모두 `aria-invalid`·
  `errorText` 를 **쓰지 않는다**(grep 무결과). 오류는 상단 틴트 배너로만 뜬다.
- 정본: DESIGN.md `355` 행 — 「`#f04452` 2px border on the input, error text below in red500 13px.
  One actionable sentence」.
- **인프라는 이미 있다**: `src/components/ui/text-field.tsx` 가 `errorText` prop(`19`행)을 받아
  `hasError`(`140`행) → `aria-invalid`(`151`행) + 하단 문구(`154`~`156`행)를 그린다.
  즉 이 항목은 TextField 를 새로 만드는 게 아니라 **폼이 이미 있는 API 를 쓰게 하는 일**이다.
  2px 빨강 테두리가 `text-field.tsx` 에 실제로 들어 있는지는 확인이 필요하다.

### ④ 시뮬레이션 폼 라벨 누락

- 진단이 지목한 `simulation-form-page.tsx` 는 **없다**(슬라이스 B 가 삭제). 후속 화면은
  `simulation-store-condition-fields.tsx:218`, `simulation-brand-search.tsx:181` 이고 **`aria-label` 이 붙어 있다.**
- 남은 확인: `<label htmlFor>` 가 아니라 `aria-label` 로만 이름을 주는 게 이 폼들에 맞는지,
  `simulation-condition-section.tsx` · `compare/simulation-condition-compact-editor.tsx` 의
  `<select>` 들도 이름이 있는지.

### ⑤ 대시 보더 빈 상태

| 위치                                           | 비고                                                     |
| ---------------------------------------------- | -------------------------------------------------------- |
| `src/components/ui/empty-state.tsx:14`         | **공용 컴포넌트.** 여기를 고치면 여러 화면이 함께 바뀐다 |
| `src/components/status/status-top-ten.tsx:205` | 로컬                                                     |
| `src/components/profile/profile-ui.tsx:113`    | 로컬                                                     |

정본: DESIGN.md `351`~`352`, `761`~`762` 행이 빈 상태의 **내용**(왜 비었는지 한 단락 + 액션 1개,
필터 결과 없음은 캡션 한 줄)을 정하지만 **대시 보더 자체를 금지하지는 않는다.**
`603` 행은 「EmptyState — 라인 일러스트 + 한 줄 + CTA 1개」인데 `351` 행은 「Never an illustration」이라
**정본끼리 어긋난다.** 고치기 전에 판단이 필요한 자리다(§2-2 참고).

### ⑥ profile 내부사정 카피

- `src/components/profile/profile-edit-page.tsx:91` — 「V2 API 계약 대기 중입니다. 프로필 이미지
  업로드와 닉네임 수정 API 제공 …」
- `src/components/profile/profile-unavailable-state.tsx:27` — 「V2 API 계약 대기 중입니다. {dependency} …」
  (`profile-change-password-page.tsx:8`, `profile-withdraw-page.tsx:8` 이 `dependency` 를 넘긴다)
- 사용자에게 "우리 백엔드 계약이 아직"이라고 말하는 문장이다. 정본: DESIGN.md `313` 행
  「Explain the _why_ in one line, offer one action」 — 사용자 입장의 이유로 바꾼다.

### ⑦ grey500 캡션 대비

- `--color-text-caption` = `--color-grey-500` = `#8b95a1`. 흰 배경 위 대비 약 **2.9:1** 로
  본문 기준 AA(4.5:1) 미달이다. **의미 있는 라벨**에 쓰인 자리만 골라야 한다(타임스탬프·부가
  정보는 정본이 캡션으로 허용한다 — DESIGN.md `90` 행).
- 사용처가 20개 파일 이상이다. 전수로 훑되 판정은 "이 문장이 없으면 사용자가 뭘 못 하나"로 가른다.
- 주의: PR3 이 `report-metric-cards.tsx` 의 **로딩 중 `--`** 를 일부러 캡션 그레이로 뒀다.
  이건 "아직 값이 아님"을 낮춰 보이게 하는 의도이므로 대비 대상이 아니다.

### ⑧ 로딩 스켈레톤 / `--` 잔여

PR3 이 `report-metric-cards`(지표 → `--`)와 `report-chart-section`(공용 Skeleton)을 처리했다.
**남은 스켈레톤이 금액·지표 자리인지** 다시 훑는다. 정본: DESIGN.md `360`·`604`·`763` 행
「금액·지표는 `--`, skeleton 금지」.

- `src/components/recommend/recommend-result-list.tsx:494-502` — `SkeletonRow` 안 `28px`/`40px`/`24px`.
  이 행이 **점수·금액을 담는 자리라면** 위반이다.
- `src/components/simulation/report/simulation-report-page.tsx:169-171` — `220`/`280`/`180px`.
  섹션 블록이라 허용 쪽으로 보이지만 확인은 필요하다.
- `src/components/analysis/analysis-result-section.tsx:103-104`, `analysis-selection-panel.tsx:439`,
  `simulation-*` 의 프리셋·브랜드 목록 스켈레톤 — 전부 블록이라 무해해 보인다.

---

## 4. 환경 — 실행과 함정

- dev 서버: `frontend/` 에서 `pnpm dev -p 5173` (저장소 루트 `.claude/launch.json` 의 `frontend-dev`).
- `.env.local` 은 gitignore 다. 다른 컴퓨터에서는 **직접 채워야 데이터가 뜬다** —
  `frontend/.env.local.example` 참고. Kakao 지도는 로컬 도메인 제한으로 타일이 안 뜰 수 있다(dev 키 필요).
- **`pnpm qa:verify` 의 build 가 `.next` 를 다시 쓴다.** dev 서버가 떠 있는 동안 `rm -rf .next` 를 하면
  dev 가 `ENOENT: build-manifest.json` 으로 망가진다. 서버를 먼저 멈추고 지운다.
- **브라우저 pane 이 화면에 표시돼 있지 않으면 지도 셸 화면은 아예 안 뜬다.** 탭이
  `document.hidden === true` 라 하이드레이션이 미뤄져 `/analysis`·`/analysis/result` 가 SSR
  마크업만 남는다(`document.body.innerText.length` 40자대, `[role="dialog"]` 0개).
  **PR3 의 결과 레이어 시각 검증이 이것 때문에 미완이다** — 다른 컴퓨터에서 pane 을 띄운 채
  `/analysis/result` 를 한 번 눈으로 봐 주면 좋겠다(§5 참고).
- `build` 가 `next-env.d.ts` 의 import 경로를 dev↔prod 로 뒤집는다. 커밋 전에 `git checkout next-env.d.ts`.

---

## 5. PR3 에서 넘어온 미완 검증

PR3(`#156`)은 머지됐지만 **결과 레이어(`/analysis/result`)의 시각 확인을 하지 못했다.** §4 의
pane 함정 때문이고, PR3 이전 커밋에서도 동일하게 재현되므로 그 변경과 무관한 환경 제약이다.
소스와 빌드로만 확인한 항목은 다음 넷이다 — PR4 착수 전에 한 번 눈으로 확인해 주면 좋겠다.

1. 결과 레이어 모달 scrim 이 `--color-overlay`(`rgba(2,9,19,0.5)`)로 보이는지, blur 가 없는지.
2. 결과 sticky 헤더가 불투명한 흰색이고 스크롤 시 아래 내용이 비쳐 보이지 않는지.
3. 결과 좌측 nav 의 활성 항목이 좌측 바 없이도 충분히 구분되는지(배경·글자색·weight 3중).
4. 결과 히어로 제목이 `선택 업종` 아이브로우 + 업종명으로 바뀐 뒤 어색하지 않은지.

문제가 있으면 PR4 에 함께 고치고 명세 §9 에 정정을 남긴다.

---

## 6. 완료 조건

- 브랜치 `feature/fe/ux-slop-sweep-pr4`, base `develop`. PR 본문은 `/pr` 스킬 템플릿.
- `pnpm exec vitest run` + `pnpm qa:verify` 통과. **미실행을 통과로 보고하지 않는다.**
- dev 5173 에서 바꾼 화면을 `getComputedStyle` 로 확인. 검증 못 한 것은 **못 했다고 PR 에 적는다**(PR3 선례).
- 회귀 grep — PR1~3 이 0 으로 만든 것들이 그대로인지:

```bash
rg -n 'font-weight: (100|200|300|500|650|750|780|800|900)' src/          # 0
rg -n 'font-size:.*[0-9]vw' src/                                        # 0
rg -n 'letter-spacing: -' src/                                          # 0
rg -n 'Sparkles' src/                                                   # 0
rg -n 'text-transform: uppercase' src/                                  # 0
rg -n 'backdrop-filter' src/    # hero-window.tsx · hero-section.tsx 만(승인 예외)
rg -n 'border-radius: (1[7-9]|[2-9][0-9])px' src/  # hero-window.tsx 2곳만(PR-Home)
```

- 원 명세에 **§10 「PR4 실행 결과」** 를 §7~§9 와 같은 형식으로 남긴다.

---

## 7. 그다음 — PR-Home

데스크탑 히어로 리디자인. **디자인 판단이 더 필요해 별도 brainstorm 슬라이스**다(§2 승인 방향 참고).
가짜 맥 윈도우(신호등 점 CTA)·글래스모피즘·60px 그림자·드래그→dock 상태머신·220dvh 페이드 문구를
걷고, 모바일 히어로("자치구를 눌러 바로 분석" + 인터랙티브 지도)를 데스크탑에도 정렬하는 방향까지
승인돼 있다. `hero-window.tsx` 의 24px·20px 라운딩과 승인 예외 글래스가 여기서 함께 정리된다.
