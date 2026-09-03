# Styling Rules

## 기준 문서

스타일 판단의 1차 기준은 `docs/design-guide.md`다. 이 문서는 구현 중 반복적으로 확인할 세부 규칙을 정리한다.

## 기본 원칙

- 기존 NowDoBoss의 블루/화이트 기반 제품 톤을 유지한다.
- 임의 색상, radius, shadow, spacing 값을 추가하지 않는다.
- 새 값이 필요하면 먼저 design token 또는 `docs/design-guide.md` 갱신 여부를 판단한다.
- 한 화면 안에서 styling strategy를 불필요하게 섞지 않는다.

## 토큰 사용

- 색상은 `docs/design-guide.md`의 대표 색상과 CSS variable 계열을 우선한다.
- spacing은 `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` 스케일 안에서 고른다.
- radius, shadow, font scale은 화면별 임시 값보다 공통 기준을 우선한다.
- legacy hardcode는 1차 이관에서 필요한 경우 보존하되, 새 작업부터 token 사용을 우선한다.
- CSS 커스텀 프로퍼티 이름을 추측해서 쓰지 않는다. 존재하지 않는 변수(예: `--color-success-500`, `--color-error-500`)는 빌드·린트 오류 없이 **조용히 무색으로 렌더**된다. 실제 토큰 이름(`--color-positive`, `--color-negative` 등)을 `DESIGN.md`에서 먼저 확인한다.

## 공통 컴포넌트

- button, card, input, tab, badge, modal, empty state, skeleton, layout은 공통 컴포넌트를 우선 검토한다.
- 공통 컴포넌트로 올릴 때는 현재 작업 범위에서 필요한 variant만 추가한다.
- 컴포넌트 확장은 기존 사용처를 깨지 않도록 기본값을 보수적으로 둔다.

## 반응형과 접근성

- 모바일에서 버튼과 탭의 터치 영역을 충분히 확보한다.
- 텍스트가 카드, 버튼, 필터 영역 밖으로 넘치지 않도록 한다.
- icon-only button에는 `aria-label`을 둔다.
- focus style을 제거하지 않는다.
- 링크·버튼에 `display: contents`를 쓰지 않는다. 박스를 만들지 않기 때문에 **키보드 포커스를 받지 못한다**(같은 요소에서 `display`만 `flex`로 바꾸면 포커스가 복구되고 `contents`로 되돌리면 다시 실패하는 것으로 확인됨).

## 완료 확인

- 화면이 `docs/design-guide.md`의 톤과 어긋나지 않는다.
- 새 arbitrary style 값이 불필요하게 늘어나지 않았다.
- 공통 컴포넌트 재사용 가능성을 검토했다.
- 디자인 예외가 필요하면 이유와 기준을 문서화했다.
