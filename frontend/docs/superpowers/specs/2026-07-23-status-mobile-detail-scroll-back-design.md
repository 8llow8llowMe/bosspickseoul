# 모바일 상세 스크롤과 뒤로가기 버튼 개선 설계

## 배경

모바일 `/status`의 상세 화면에서 `StatusMobileSheet` 본문은
`overflow-y: auto`를 사용하지만, 내부 `StatusDetail` 카드가 grid의 남은
높이에 맞춰 축소된다. 카드의 `overflow: hidden` 때문에 실제 상세 콘텐츠가
잘리고 바텀시트 본문의 `scrollHeight`도 늘어나지 않아 세로 스크롤이
생기지 않는다.

현재 별도 행으로 표시하는 `상위 10개로 돌아가기` 텍스트 버튼은 상세 카드
위의 공간을 추가로 사용한다.

## 목표

- 상세 콘텐츠가 바텀시트 내부에서 끝까지 세로 스크롤된다.
- 바텀시트의 52px 접힘 상태와 이단 스냅 동작은 유지한다.
- 텍스트 복귀 행을 제거하고 상세 카드 헤더 왼쪽에 `←` 아이콘 버튼을 둔다.
- 데스크톱 상세의 기존 `닫기` 버튼과 레이아웃은 유지한다.
- 선택 자치구, URL, 상세 데이터 흐름은 변경하지 않는다.

## 설계

### 스크롤 책임

`StatusMobileSheet`의 `SheetBody`가 유일한 세로 스크롤 컨테이너가 된다.
implicit grid row를 `max-content`로 계산하여 `StatusDetail`과 `StatusTopTen`
자체 높이를 축소하지 않는다.

상세 콘텐츠가 본문보다 길면 `SheetBody.scrollHeight`가 증가하고
`overflow-y: auto`가 동작한다. 접힌 상태에서는 기존과 동일하게
`visibility: hidden`, `pointer-events: none`, `overflow: hidden`, `inert`로
본문을 비활성화한다.

### 뒤로가기 버튼

`StatusDetail`에 선택적인 `onBack` prop을 추가한다.

- `onBack`이 있으면 상세 헤더의 가장 왼쪽에 44×44px 아이콘 버튼을 표시한다.
- 보이는 아이콘은 `ArrowLeft`이며 장식 아이콘은 `aria-hidden`으로 처리한다.
- 버튼의 접근 가능한 이름은 `상위 10개로 돌아가기`다.
- 모바일 시트는 `onBackToTopTen`을 `StatusDetail.onBack`으로 전달한다.
- 기존 별도 `BackButton` 행은 제거한다.
- 데스크톱은 기존처럼 `onClose`만 전달하므로 현재 `닫기` 버튼을 유지한다.

## 상태 및 데이터 흐름

뒤로가기 버튼을 누르면 기존 `onBackToTopTen` 흐름을 그대로 호출한다.
선택 자치구를 해제하고 `district` 쿼리를 제거하며 바텀시트는 펼친 Top10
상태를 유지한다. API 호출이나 백엔드 계약은 변경하지 않는다.

## 테스트

- 펼친 모바일 시트 스타일에 `grid-auto-rows: max-content`가 포함되는지
  검증한다.
- 선택 자치구가 있을 때 `상위 10개로 돌아가기`라는 접근 가능한 이름의
  아이콘 버튼이 상세 헤더에 렌더링되는지 검증한다.
- 이전 텍스트 복귀 행이 제거되었는지 검증한다.
- 접힘/펼침, inert, 높이 상수 관련 기존 테스트를 유지한다.
- 브라우저에서 모바일 상세의 `scrollHeight > clientHeight`와 실제 스크롤,
  뒤로가기 후 Top10 복귀 및 URL 변경을 확인한다.

## 변경 범위

- `src/components/status/status-mobile-sheet.tsx`
- `src/components/status/status-mobile-sheet.test.ts`
- `src/components/status/status-detail.tsx`

백엔드, 패키지, lockfile, 빌드·테스트 설정은 변경하지 않는다.
