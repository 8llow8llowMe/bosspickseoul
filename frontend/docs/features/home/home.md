# home — 공통 개발 명세서

> **작성일**: 2026-07-16
> **대상**: 웹 (Next.js App Router)
> **작성자**: Claude Code
> **상태**: 초안

[[_TOC_]]

---

## S0. 배경 / 기획 의도

NowDoBoss → BossPickSeoul 리브랜딩과 함께 프론트엔드를 React/Vite(CRA) 구조에서 Next.js App Router로 이관하는 작업의 일환으로, 서비스 진입점인 홈(랜딩) 화면을 이관한다.

> **마이그레이션 컨텍스트**: 레거시 시스템을 웹(App Router)으로 이전하는 작업이므로 as-is/to-be를 구분해 기술한다.

| 항목 | 내용 |
|---|---|
| 요청자 / 요청팀 | 확인 필요 (별도 기획 요청 문서 확인되지 않음 — 리브랜딩·마이그레이션 프로젝트 공통 배경으로 추정) |
| 요청일 | 확인 필요 |
| 원본 기획 문서 | 확인 필요 (링크 없음. `docs/features/_index.md` 부록의 마이그레이션 인벤토리만 확인됨) |
| 요청 배경 | 리브랜딩(NowDoBoss → BossPickSeoul) + React/Vite(CRA) → Next.js App Router 마이그레이션 |
| 기존 동작 (as-is) | legacy `MainPage`(`src/pages/MainPage.tsx`)는 `MainContainer` 단일 컴포넌트를 렌더하는 진입점이며, `MainContainer`(`src/containers/main/MainContainer.tsx`)가 아래 5개 섹션을 세로 스크롤 랜딩 페이지로 순서대로 렌더한다. 각 섹션 진입 시 `IntersectionObserver`로 `visible` 클래스를 토글해 스크롤 인 애니메이션을 적용한다.<br>1) **Intro** (`MainIntroContainer`): 서비스 소개 카피 + CTA 버튼 2개 — "상권분석 바로가기"(`navigate('/analysis')`), "창업 시뮬레이션"(`navigate('/analysis/simulation')`)<br>2) **Status** (`MainStatusContainer` + `components/main/status/MainCard{1,2,3}`): "구별 상권 분석" 섹션. 점포당 매출규모(막대차트), 유동인구 Top10 리스트(React Query로 `fetchTopList` 호출), 서울시 구 지도(d3 geoJSON) 카드를 마우스오버 시 정지되는 캐러셀로 노출. CTA 없음(정보성 섹션)<br>3) **Analysis** (`MainAnalysisContainer` + `components/main/analysis/MainCard{1~4}`): "상권분석 리포트" 소개. 기능 소개 카드 4개(지도기반 서비스/요약 정보/차트 분석/종합 리포트)를 무한 스크롤형 카드 캐러셀로 노출. 하단 "Sub" 영역(차트 gif)은 주석 처리되어 미사용<br>4) **Recommend** (`MainRecommendContainer`): "상권 추천 보고서" 소개 + CTA "추천받으러 가기"(`navigate('/recommend')`) + 추천 상권 유동인구/매출/블루오션 통계 카드 3개(차트 포함, 정적 목업 수치)<br>5) **More** (`MainMoreContainer` + `components/main/service/MoreCard{1~3}`): "NowDoBoss만의 든든한 서비스" — 채팅/커뮤니티/공유 서비스 소개 카드 3개(CTA 없음, 소개 전용)<br>※ `MainContainer` 자체도 `Recommend` 섹션 진입 시 카드 스크롤 애니메이션을 트리거하는 `IntersectionObserver`를 별도로 사용 |
| 목표 동작 (to-be) | 위 5개 섹션의 정보 구조와 CTA 라우팅 동작을 보존하며 App Router 진입점(`app/(shell)/page.tsx` → `src/components/home/home-page.tsx`)으로 이관한다. 서버 컴포넌트로 렌더 가능한 정적 콘텐츠는 서버에서, 스크롤 애니메이션·차트·지도 등 브라우저 API/외부 SDK 의존 로직은 client component로 분리한다. CTA는 `next/link` 기반 라우팅으로 대체한다(`/analysis`, `/analysis/simulation` 또는 `/simulation`, `/recommend` 등 — 최종 대상 라우트는 `docs/features/_index.md`의 레거시 라우트 매핑 표 기준). |
| 구현 제외 범위 | 비주얼 리디자인(카피 문구, 톤앤매너, 레이아웃 변경)은 이번 명세 범위 밖이며 `DESIGN.md`에서 별도 관리한다. 단, 확인 필요: 현재 target 구현(`src/components/home/home-page.tsx`)은 위 as-is 5섹션 구조를 그대로 포팅한 것이 아니라 히어로/퀵액션/워크플로우 4단계/서비스 카드/메트릭 구성의 리디자인된 콘텐츠를 담고 있다 — 이 리디자인이 별도 승인/문서화된 것인지 확인 필요. 본 명세는 legacy as-is 기록과 동작 보존 원칙만 정의하며, 실제 리디자인 콘텐츠 확정은 별도 트래킹 대상으로 남긴다. |
| 연관 기능 / 의존성 | status(구별현황), analysis(상권분석), recommend(상권추천), simulation(시뮬레이션), community(커뮤니티), chatting(채팅) — 홈의 CTA/소개 카드가 각 기능으로 라우팅된다. |

---

## S1. 기능 개요

홈은 BossPickSeoul의 서비스 진입점으로, 첫 방문자에게 핵심 기능(구별현황, 상권분석, 상권추천, 시뮬레이션, 커뮤니티/채팅 등)을 랜딩 섹션 형태로 소개하고 각 기능 화면으로 안내하는 역할을 한다. 별도의 사용자 입력이나 조건 분기 없이, 접근 시 정적/준정적 콘텐츠를 렌더하고 CTA 클릭으로 하위 기능 라우트로 이동시키는 것이 핵심이다.

```
홈 진입 → 랜딩 섹션(Intro/Status/Analysis/Recommend/More) 순차 렌더 → CTA 클릭 → 대상 기능 라우트로 이동
```

---

## S2. 공통 요구사항

| # | 요구사항 | 상세 참조 |
|---|---|---|
| 1 | 홈(`/`) 진입 시 랜딩 섹션(히어로/소개, 구별현황, 상권분석 소개, 상권추천 소개, 부가서비스)을 순서대로 렌더한다. | S0 as-is, S3 |
| 2 | 주요 CTA는 클릭 시 해당 기능 라우트로 이동한다 (예: 상권분석 → `/analysis`, 시뮬레이션 → `/analysis/simulation`(레거시 매핑 기준, 신규 라우트는 `docs/features/_index.md` 확인), 추천 → `/recommend`). | S0 as-is, S5 TC-001 |
| 3 | 데스크톱/모바일 뷰포트에서 레이아웃이 깨지지 않고 반응형으로 표시된다. | DESIGN.md 반응형 기준 |
| 4 | 브라우저 전용 API(스크롤 관찰, 지도 렌더 등)에 의존하는 섹션은 client component로 분리하고, SSR 시 크래시 없이 렌더된다. | `docs/engineering/client-boundary.md` |
| 5 | 통계/차트 성격의 카드(구별현황 Top10 등)가 API 데이터를 사용하는 경우 로딩·빈 데이터 상태에서도 레이아웃이 깨지지 않는다. | API 문서 위치 확인 필요 |

---

## S3. 필수 기능

기능 목록과 한 줄 설명만 기술한다. 구현 상세는 세부 명세로 위임하되, 현재 별도 세부 명세 파일은 작성되지 않았다.

| # | 기능명 | 한 줄 설명 | 세부 명세 |
|---|---|---|---|
| 1 | 인트로 / 히어로 | 서비스 소개 카피와 상권분석·시뮬레이션 진입 CTA를 노출한다. | 세부 명세 미작성 |
| 2 | 구별 상권 현황 소개 | 자치구별 매출·유동인구·지도 통계 카드를 캐러셀로 노출한다. | 세부 명세 미작성 |
| 3 | 상권분석 리포트 소개 | 상권분석 기능의 핵심 가치(지도 기반, 요약 정보, 차트, 종합 리포트)를 카드로 소개한다. | 세부 명세 미작성 |
| 4 | 상권추천 보고서 소개 | 추천 기능의 가치와 추천 상권 통계를 소개하고 추천 화면으로 안내한다. | 세부 명세 미작성 |
| 5 | 부가 서비스 소개 | 채팅/커뮤니티/공유 등 부가 기능을 소개 카드로 안내한다. | 세부 명세 미작성 |

## S4. 세부 명세

현재 home feature의 세부 명세는 작성되지 않았다. 섹션별 구현 상세(차트 데이터 소스, 반응형 브레이크포인트, 애니메이션 트리거 조건 등)가 구체화되면 아래 형식으로 세부 명세를 추가한다.

**세부 명세**

- 미작성

## S5. 테스트케이스

기능 전체에 걸친 공통 동작 검증 TC는 [테스트케이스 템플릿](../../../_DocumentTemplates/_template-테스트-케이스.md)을 사용해 **공통 범위(S)** 표(T1)로 작성한다.

### TC-001. 홈 진입 시 주요 섹션·CTA 렌더

| 항목 | 내용 |
|---|---|
| 검증 대상 | 공통 명세 S2 #1, #2 (랜딩 섹션 렌더 및 CTA 라우팅) |
| 사전 조건 | 비로그인/로그인 여부 무관하게 홈(`/`) 접근 가능한 상태 |
| 실행 | 1) `/` 접속 2) 히어로/구별현황/상권분석/상권추천/부가서비스 섹션이 모두 렌더되는지 확인 3) 상권분석 CTA 클릭 4) 추천/시뮬레이션 CTA 클릭 |
| 기대 결과 | 모든 섹션이 크래시 없이 렌더되고, 각 CTA 클릭 시 대응 라우트(`/analysis`, `/recommend`, 시뮬레이션 라우트 등)로 정상 이동한다 |
| 우선순위 | P1 |
| 비고 | 세부 섹션별(D) TC는 세부 명세 작성 시 추가 |

### 요약표

| TC ID | 범위 | 구분 | 검증 대상 | 우선순위 | 결과(P/F) | 비고 |
|---|---|---|---|---|---|---|
| TC-001 | S | 정상 | 랜딩 섹션 렌더 + CTA 라우팅 | P1 | | |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|---|---|---|---|
| 1.0 | 2026-07-16 | 최초 작성 — legacy `MainPage`/`MainContainer` 동작 조사 및 as-is 기록, 파일럿 공통명세 작성 | Claude Code |

> 세부 변경 이력은 Azure DevOps Wiki 페이지의 **Revisions** 탭에서 확인합니다.
