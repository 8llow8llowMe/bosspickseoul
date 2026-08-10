# 홈 히어로 인터랙티브 wow — 브레인스토밍 결정 & 다음 스레드 핸드오프

> **작성일**: 2026-08-10
> **브랜치**: `feature/fe/home-hero-map` (origin/develop 기준)
> **상태**: 방향 확정 · 세부 디자인 미확정 → **다음 스레드에서 이어서 진행**
> **대상 파일**: `src/components/home/home-page.tsx`, `src/components/home/seoul-districts-map.tsx`

## 목적

랜딩(`/`) 첫 진입 시 "wow" 인상을 주는 인터랙티브 히어로. 단순 장식이 아니라
"이건 당신의 상권 분석 도구"라는 은유로 인터랙션을 정당화한다.

## 이미 반영된 현재 상태 (base, commit `3a2bc19`)

- 2단 그리드 → **지도 100% 폭 배경 + 가운데 글래스 카드 오버레이**(스택: `HeroStage` > `MapLayer` + `CardLayer`).
- 카드 레이어 `pointer-events: none` → **hover-through**(카드 위에서도 뒤 폴리곤이 파랗게 hover), 버튼(`Actions`)만 `pointer-events: auto`.
- 카드 배경: 반투명 `--color-surface` + `backdrop-filter: blur(16px) saturate(135%)`.
- 폴리곤 `:focus/:active { outline: none }`로 클릭 시 파란 아웃라인 제거(키보드 `:focus-visible` fill 유지).

## 확정 방향: C = A(떠 있는 분석 창) + B(살아있는 지도)

### A. 떠 있는 분석 창 (window 은유)
- 카드 우상단에 **신호등 3버튼**(macOS 스타일), 색만이 아니라 아이콘 + `aria-label`로 기능 명시:
  - 🔴 close → 카드를 숨겨 **지도 전체 공개**(다시 부르는 작은 트리거 필요).
  - 🟡 minimize → **타이틀바만 남기고 접기**.
  - 🟢 maximize → `/analysis`로 이동("최대화 = 실제 분석 시작").
- 카드 **타이틀바를 잡고 드래그**로 위치 이동(데스크톱 전용). 화면 밖 이탈 방지 경계.

### B. 살아있는 지도
- 로드 시 자치구 **순차 페이드인**, 상위 상권 몇 곳 은은한 **pulse/glow**.
- hover 시 자치구 이름 대신 **미니 데이터 툴팁**(매출·유동인구 스파크라인).
- 커서 따라가는 **spotlight**(옵션).

### backdrop-filter 개선
- `blur(14px) saturate(180%) brightness(1.04)` — 뒤 파란 hover가 더 선명히 비침.
- 상단 1px 라이트 하이라이트 보더 + 옅은 top→bottom 그라디언트로 유리 질감.
- **동적 틴트**: 현재 hover 중인 자치구 색을 카드 배경에 5~8% 혼합 → 카드가 지도에 "반응".

### 모바일 (확정)
- **카드와 지도를 겹치지 않고 세로 정렬**(오버레이 해제). 신호등·드래그는 숨김/비활성.

## 열린 질문 (다음 스레드에서 확정)

1. 미니 데이터 툴팁의 **데이터 출처** — 실데이터 API(비로그인 호출·성능 고려) vs 대표 예시 하드코딩.
2. 드래그 위치 **지속성**(sessionStorage) 여부 + 경계 처리.
3. 신호등 close 후 **카드 재호출** 트리거 UX.
4. 접근성 — 신호등/드래그의 **키보드 대안**, 색 외 구분(아이콘/aria).
5. **prefers-reduced-motion** 대응(pulse·spotlight·페이드인 축소).
6. **DESIGN.md 예외**(글래스/backdrop-filter 금지)를 정본에 명시하거나 QA 체크리스트 조정.

## 제약

- styled-components, `DESIGN.md` 토큰 우선(글래스는 예외 합의됨), 접근성, reduced-motion, 모바일 세로정렬.
- 상태 규모가 커지면(드래그·창 상태·툴팁 데이터) `home-page.tsx`에서 히어로를 별도 컴포넌트/훅으로 분리 검토.

## 다음 단계

이 문서 기반으로 세부 디자인 확정(신호등 동작·툴팁 데이터·드래그 지속성·a11y) → `writing-plans` → 구현.
현재 스레드에서는 **구현하지 않음**(방향만 확정, 이월).
