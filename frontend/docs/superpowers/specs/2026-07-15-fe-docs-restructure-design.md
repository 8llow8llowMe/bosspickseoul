# BossPickSeoul FE 문서·설계 체계 재편 — 설계서

> **작성일**: 2026-07-15
> **범위**: BossPickSeoul `frontend/` (FE 전용)
> **상태**: 승인됨 (brainstorming 완료)
> **다음 단계**: writing-plans → 실행 계획

---

## 0. 배경 / 문제 정의

NowDoBoss(사장님 상권분석 서비스)를 **BossPickSeoul**로 리브랜딩하며 React/Vite → Next.js App Router로 마이그레이션 중이다. 구현은 일부 진행됐으나 **문서·설계 체계가 잘못 세팅**되어 전체 재조율이 필요하다.

**현재 docs의 문제 (as-is)**

- docs가 **마이그레이션 실행 중심**이다: `migration-playbook`, `migration-inventory`, `phase-checklist`, `cutover-runbook`, `agents/*`(멀티에이전트 codex 세팅). "어떻게 옮기는가"에 치우침.
- `_DocumentTemplates`(공통명세 → 세부명세 → 플랫폼명세 → 테스트케이스)라는 **Feature 기준 설계 계층**이 존재하지만 실제 docs에는 적용되지 않음.
- **설계 문서와 실행 문서가 섞여 있고, "무엇을·왜·어떻게 설계하는가"를 Feature 단위로 정의하는 정본이 없다.**
- design-\* 문서가 여러 개로 흩어져 디자인 정본이 불명확.
- Codex용 `AGENTS.md`/멀티에이전트 가이드가 있으나, 실제 작업은 Claude Code + superpowers로 FE를 단독 진행.

**목표 (to-be)**

Feature 기준 명세를 정본으로 세우고(\_DocumentTemplates 형식), superpowers를 표준 작업 프로세스로 삼아, 설계·실행·디자인 문서를 역할별로 분리·통폐합한다.

**구현 제외 범위**

- 이번 작업은 **문서·설계 체계 재편**이다. 실제 기능 재구현/리디자인이 아니다.
- 디자인 시스템 _내용_ 재검토는 별도 후속(이번엔 문서 통폐합만).
- 백엔드/`backend/`는 범위 밖.

---

## 1. 확정된 설계 결정 (brainstorming)

| #   | 결정                                                                  | 근거                                       |
| --- | --------------------------------------------------------------------- | ------------------------------------------ |
| 1   | 명세 계층은 **2계층(공통→세부)**, 플랫폼명세(P) 제거                  | 웹 단일 플랫폼. OS별 구현 차이 개념이 없음 |
| 2   | docs를 **명세 중심으로 재편**, 실행 문서는 보조(런북)로 격하·통폐합   | 설계/실행 분리                             |
| 3   | **\_DocumentTemplates가 산출물 정본 형식**, superpowers는 만드는 과정 | 정본 1곳 유지                              |
| 4   | **frontend/CLAUDE.md 신규**(얕은 지도), AGENTS.md 대체                | Claude Code 단독 FE 작업                   |
| 5   | **디자인 시스템 1개(DESIGN.md 정본)**로 통합                          | design-\* 분산 해소                        |
| 6   | 멀티에이전트 가이드 → **superpowers로 통폐합**                        | 혼자 superpowers로 작업                    |

---

## 2. 정본 지도 (무엇이 어디에)

| 구분                   | 정본 위치                 | 형식/도구                                                       |
| ---------------------- | ------------------------- | --------------------------------------------------------------- |
| 무엇을 만드는가 (설계) | `docs/features/`          | `_DocumentTemplates` (공통→세부 2계층)                          |
| 어떻게 만드는가 (과정) | —                         | superpowers (brainstorming→writing-plans→executing→code-review) |
| 디자인                 | `DESIGN.md` (1개)         | design-\* 통폐합                                                |
| 횡단 기술 규칙         | `docs/engineering/`       | 명세가 참조                                                     |
| 실행·운영 (보조)       | `docs/runbook/`           | playbook·qa·cutover 통합                                        |
| FE 작업 지도           | `frontend/CLAUDE.md`      | 얕게, 상세는 docs 위임                                          |
| 이관 상태 추적         | `docs/features/_index.md` | 구 migration-inventory 흡수                                     |

---

## 3. 대상 디렉터리 구조

```
frontend/
  CLAUDE.md                    # ★ 신규: 얕은 지도 (정본 위치 + 프로세스 + 기술선 + 금지)
  DESIGN.md                    # 디자인 시스템 정본 (design-* 흡수)
  _DocumentTemplates/          # 명세 템플릿 (플랫폼명세 제거 반영)
  docs/
    README.md                  # docs 인덱스 (재작성)
    features/                  # ★ 정본: Feature 기준 명세
      _index.md                #   Feature 목록 + 이관 상태 (구 migration-inventory)
      home/       home.md(공통) + 세부…
      auth/       auth.md(공통) + login.md register.md social-login.md …(세부)
      status/
      recommend/
      analysis/   analysis.md(공통) + result.md simulation.md …(세부)
      simulation/
      community/
      chatting/
      profile/
      share/
    engineering/               # 유지: routing / client-boundary / data-fetching / styling / code-style
    runbook/                   # ★ 보조: migration.md · qa.md · cutover.md · seo.md
    superpowers/               # superpowers 산출물 (specs/, plans/)
    _archive/                  # 폐기 원문 보관 (안전망)
```

---

## 4. 명세 계층 규격 (웹 FE 맞춤 2계층)

- **공통명세 (S0~S5)** = Feature 전체 1개. 예: `features/analysis/analysis.md`
  - `S0` 배경/기획 의도 — **마이그레이션이므로 legacy 동작을 as-is로, 목표를 to-be로 기록** → 동작 동일성 보존이 명세로 강제됨
  - `S3` 필수 기능 목록 → 세부 명세로 링크
- **세부명세 (D0~D8)** = 하위 기능/화면. 예: `analysis/result.md`
  - `D1-1 UI 진입점` = **라우트 경로 + Figma 링크**로 유지 (UI↔기능 연결만 정의)
  - `D3 아키텍처`에 **웹 구현 설계 흡수**: SSR/CSR 경계, `dynamic(..., {ssr:false})`, Next App Router 라우팅, Zustand/React Query 경계, `docs/engineering/*` 참조
- **플랫폼명세(P1~P4) 제거.** 웹 반응형 차이가 큰 화면은 세부명세 `D6 주의사항`에 기술.
- **테스트케이스**: 공통 `TC-NNN`(S5) + 세부 `TC-{접두사}-NNN`(D7). 플랫폼 TC(`TC-{OS}-NNN`) 제거.
- `_DocumentTemplates`의 플랫폼명세 템플릿·플랫폼 관련 문구는 이 규격에 맞게 정리한다(플랫폼명세 파일은 남기되 "웹 단일 플랫폼—미사용" 명시, 또는 제거 — 실행 계획에서 확정).

---

## 5. Feature 경계 (도메인 = Feature, 10개)

`home · auth · status · recommend · analysis · simulation · community · chatting · profile · share`

legacy(`NowDoBoss/FrontEnd/src`)와 신규(`frontend/src`)가 동일 도메인 구조라 그대로 Feature 경계가 된다. 각 Feature = 폴더 1개 = 공통명세 1 + 세부명세 N.

**라우트 → Feature 매핑 근거** (신규 `app/`):

| Feature    | 대표 라우트                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| home       | `(shell)/`                                                                                                |
| auth       | `(auth)/login`, `/register`, `/register/general`, `/account-deleted`, `(shell)/member/loading/[provider]` |
| status     | `(shell)/status`                                                                                          |
| recommend  | `(shell)/recommend`                                                                                       |
| analysis   | `(shell)/analysis`, `/analysis/result`, `/analysis/simulation`, `/analysis/simulation/{compare,report}`   |
| simulation | `(shell)/simulation`, `/simulation/{compare,report}`                                                      |
| community  | `(shell)/community/{list,register,[communityId]}`                                                         |
| chatting   | `(shell)/chatting/{list,[roomId]}`                                                                        |
| profile    | `(shell)/profile/{settings,bookmarks,…}`                                                                  |
| share      | `(shell)/share/[token]`                                                                                   |

---

## 6. superpowers ↔ \_DocumentTemplates 공존 규칙

| 단계 | superpowers 스킬                              | 산출물 위치·형식                                                                        |
| ---- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| 설계 | brainstorming                                 | `docs/features/<feat>/*.md` — **한국어 명세 템플릿** (brainstorming 기본 경로 override) |
| 계획 | writing-plans                                 | `docs/superpowers/plans/` — 명세의 D 항목을 태스크로 분해                               |
| 구현 | executing-plans / subagent-driven-development | 코드 + `features/_index.md` 이관 상태 갱신                                              |
| 검증 | code-review / systematic-debugging            | —                                                                                       |

→ **정본은 항상 한국어 Feature 명세 1곳.** superpowers는 이를 만들고 실행하는 과정일 뿐이다. 이 규칙을 `CLAUDE.md`에 명시한다.

---

## 7. frontend/CLAUDE.md 구성 (얕게)

상세 규칙은 전부 docs 링크로 위임하고, CLAUDE.md는 다음만 담는다:

1. 서비스 한 줄 소개 + 범위(**FE 전용**)
2. **정본 위치 맵** — `docs/features/`(명세) · `DESIGN.md`(디자인) · `docs/engineering/`(규칙) · `docs/runbook/`(운영)
3. **superpowers 프로세스** — 새 기능/화면은 _명세 먼저(brainstorming) → plan(writing-plans) → 구현 → 리뷰_
4. **기술 기준선** — Next.js App Router + TS, pnpm, styled-components, Zustand, React Query, Pretendard(`next/font/local`), `NEXT_PUBLIC_*`
5. **금지사항** — 임의 API 스펙 작성 금지(문서 없으면 문의), 백엔드 API 계약 변경 금지, 임의 색상/토큰/radius/shadow 금지(DESIGN.md 준수), 무관 리팩터 금지, mock 세션을 최종본처럼 남기지 않기
6. **검증 명령** — `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build` (미실행을 통과로 보고 금지)

---

## 8. 기존 docs → 새 체계 매핑

| 기존                                                 | 처리                                                   |
| ---------------------------------------------------- | ------------------------------------------------------ |
| migration-playbook + phase-checklist                 | → `runbook/migration.md` 통합                          |
| migration-inventory                                  | → `features/_index.md`로 흡수 (Feature별 이관 상태 표) |
| qa-runbook + done-checklist                          | → `runbook/qa.md` 통합                                 |
| cutover-runbook + seo-performance-audit              | → `runbook/cutover.md` 통합                            |
| seo-guide                                            | → `runbook/seo.md`                                     |
| design-guide + design-prompt + design-redesign-tasks | → `DESIGN.md`로 통폐합                                 |
| agents/orchestrator·fe·design·review                 | → superpowers로 통폐합, 원문 `_archive/`               |
| AGENTS.md                                            | → `CLAUDE.md`로 대체, 원문 `_archive/`                 |
| engineering/\*                                       | 유지 (명세에서 참조)                                   |
| docs/README.md                                       | 새 구조로 재작성 (docs 인덱스)                         |

> 통폐합 시 원문은 즉시 삭제하지 않고 `docs/_archive/`로 이동해 안전망을 둔다.

---

## 9. 이관 작업 순서 (동작 보존 우선)

공통 인프라 → **home / auth** → **status / recommend** → **analysis / simulation** → **community** → **profile** → **chatting**(마지막: 인증·세션·FCM·WebSocket 의존).

각 Feature 처리 흐름:

```
legacy 조사 → 명세화(S0에 as-is 기록) → writing-plans → 이관 구현 → 검증 → features/_index.md 갱신
```

**파일럿 Feature**: `home`(가장 단순 → 명세 템플릿 형식·경로 규칙을 저비용으로 검증) → 이어서 `analysis`(대표적·의존성 있는 Feature로 실전 검증). 파일럿 결과로 세부명세 분할 기준을 확정한 뒤 나머지 Feature에 확산한다.

---

## 10. 성공 기준

- [ ] `frontend/CLAUDE.md`가 정본 위치·프로세스·기술선·금지를 얕게 담고, AGENTS.md를 대체
- [ ] `docs/features/`에 10개 Feature 폴더 + `_index.md` 존재, 파일럿(home) 공통명세 1개 이상 작성
- [ ] `_DocumentTemplates`가 2계층(플랫폼명세 제거) 규격으로 정리됨
- [ ] 기존 실행/디자인 문서가 `runbook/`·`DESIGN.md`로 통폐합되고, 원문은 `_archive/`에 보존
- [ ] `docs/README.md`가 새 구조 인덱스로 재작성됨
- [ ] superpowers ↔ 명세 공존 규칙이 CLAUDE.md에 명시됨

---

## 11. 미결 사항 → 파일럿 결정 (2026-07-16 갱신)

| #   | 항목                                       | 결정 / 상태                                                                                                                                                                                                                 |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `_DocumentTemplates`의 플랫폼명세 파일     | **결정: 제거.** `_template-플랫폼명세.md`를 `docs/_archive/`로 이동, 템플릿 3종을 2계층으로 정리(Task 5). 플랫폼명세 파일은 남기지 않는다.                                                                                  |
| 2   | 세부명세 분할 단위(라우트별 vs 하위기능별) | **결정: "구분되는 화면/라우트" 단위.** home은 단일 화면이라 공통명세만 두고 세부명세 없음(S3에서 "세부 명세 미작성"으로 표기). analysis처럼 `result`·`simulation` 등 별개 화면·라우트가 있는 Feature만 세부명세로 분할한다. |
| 3   | superpowers plans 경로                     | **결정: `docs/superpowers/plans/` 확정.** CLAUDE.md 프로세스 절에 명시됨. specs는 `docs/superpowers/specs/`.                                                                                                                |

### 파일럿(home)에서 발견한 후속 이슈

| #   | 항목                                                                                                                                                                                        | 조치 필요                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A   | 신규 `src/components/home/home-page.tsx`가 **이미 리디자인된 레이아웃**(hero/quick-actions/workflow/metrics)이며 legacy 5개 섹션의 1:1 이관이 아니다. 마이그레이션 원칙은 "동작 보존"이었음 | 리디자인이 의도된/승인된 것인지 확인 필요. home.md S0에 "확인 필요"로 표기됨. **작성자 판단 대기.** |
| B   | 리브랜딩(NowDoBoss → BossPickSeoul) 명칭이 아카이브·일부 문서에 잔존(`NowDoBoss-V2` 등). 정본 문서는 정리됨                                                                                 | 별도 정리 작업 범위. 이번 재편 범위 밖.                                                             |
| C   | `src`에 금지 카피(`문제가 발생했습니다`) 2곳 잔존(`src/lib/api/response.ts`, `src/lib/realtime/chat-stomp.ts`)                                                                              | DESIGN.md 후속 과제 Task 08에 미완으로 정정 기록됨. FE 구현 시 처리.                                |
