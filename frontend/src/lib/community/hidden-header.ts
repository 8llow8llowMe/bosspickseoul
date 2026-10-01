/*
  목록 숨는 헤더(community.md §S4 「숨는 헤더」, CM-043).

  목록이 아래로 스크롤되면(FAB 접힘과 같은 판정) <html> 에 data 속성 하나를 켠다. 사이트 헤더와
  목록 툴바는 **같은 선택자**를 CSS 로 읽는다 — 헤더는 위로 숨고 툴바는 top:0 에 붙는다. 둘이
  같은 선택자를 써야 「헤더는 남았는데 툴바만 올라가 헤더 밑에 깔리는」 어긋남이 없다.

  전역 상태를 새로 만들지 않는다. 헤더는 이 속성을 쓰지 않고 읽기만 하므로 목록 밖 화면의 헤더는
  늘 그대로다.

  헤더가 돌아와야 하는 때는 선택자의 `:not(:has(...))` 가 맡는다.
  - 모바일 메뉴 패널이 열려 있음(`data-menu-open`) — 패널이 헤더와 함께 화면 밖으로 사라진다
  - 헤더 안에 **키보드 포커스**(`:focus-visible`)가 있음 — 키보드로 들어간 사용자가 화면 밖 버튼을
    누르게 된다. `:focus-within` 으로 넓히지 않는다 — Android 는 탭한 버튼(메뉴 닫기 등)에 포커스가
    남아 있어 그 뒤로 헤더가 숨지 않는다(숨는 헤더가 사실상 꺼진다). 탭은 :focus-visible 이 아니다.
  `:has()` 를 모르는 브라우저는 규칙 전체를 버린다 — 헤더가 숨지 않을 뿐 툴바도 64 에 남아 어긋나지 않는다.
*/

export const COMMUNITY_HEADER_HIDDEN_ATTRIBUTE = 'data-community-header-hidden'

/** 사이트 헤더가 모바일 메뉴 패널이 열린 동안 `<header>` 에 다는 속성. */
export const SITE_HEADER_MENU_OPEN_ATTRIBUTE = 'data-menu-open'

export const COMMUNITY_HEADER_HIDDEN_SELECTOR = `html[${COMMUNITY_HEADER_HIDDEN_ATTRIBUTE}='true']:not(:has([data-site-header][${SITE_HEADER_MENU_OPEN_ATTRIBUTE}='true'], [data-site-header] :focus-visible))`
