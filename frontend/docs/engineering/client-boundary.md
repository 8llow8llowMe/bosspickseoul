# Client Boundary Rules

## 기본 원칙

1차 마이그레이션에서는 안정적인 클라이언트 동작을 우선한다. Server Component 최적화는 동작 동일성 확인 이후에 진행한다.

## Client Component로 시작할 조건

아래 중 하나라도 사용하면 기본적으로 client component로 시작한다.

- `window`, `document`
- `localStorage`, `sessionStorage`
- `navigator`, `Notification`, `serviceWorker`
- Zustand store
- React Query hook
- 직접 DOM event 제어
- chart
- Kakao Map
- Firebase Messaging
- WebSocket 또는 STOMP
- realtime chat

## styled 컴포넌트를 정의하는 파일은 'use client' 로 시작한다

브라우저 API 를 쓰지 않아도 **`styled.x`·`styled(X)`·`createGlobalStyle` 로 스타일을 정의하는 파일은 첫 줄에
`'use client'` 를 둔다.** `src/styles/global-styles.test.ts` 「styled 컴포넌트를 정의하는 파일은 클라이언트 경계다」가
`src`·`app` 전체를 훑어 막는다.

- **왜** — styled-components 6(현재 6.5.3)은 서버 컴포넌트에서 렌더되면 레지스트리(`src/lib/styled-components-registry.tsx`
  의 `ServerStyleSheet`)를 거치지 않고 요소 바로 앞에 인라인 `<style data-styled>` 를 낸다. 같은 클래스를 두 번 내지
  않으려고 요청 단위 `React.cache` 집합을 쓰는데, **화면에 붙지 않는 서버 트리가 같은 컴포넌트를 먼저 렌더하면** 실제
  화면 쪽은 이미 냈다며 건너뛴다. 클래스는 붙고 CSS 는 없는 요소가 남는다.
- **실제로 난 일(2026-10-10)** — #555(PR #609, 브랜치 `fix/fe/not-found-error-pages`)에서 추가한 루트 `app/not-found.tsx` 가 `SiteShell`/`SiteFooter` 를 직접 두르자, Next 가 루트
  레이아웃의 not-found 경계용으로 그 트리를 모든 페이지 요청에서 미리 렌더했다. 그쪽이 푸터 스타일을 먼저 「냈다」고
  표시해 `/terms` 등 실제 페이지의 푸터가 패딩 0px · 락업 `inline` · 링크 `block` 으로 무너졌다(404 화면도 같다).
  푸터·셸을 `'use client'` 로 바꾸자 스타일이 레지스트리를 거쳐 `<head>` 로 들어가 모든 경로에서 복구됐다.
- **Next 문서 근거** — `node_modules/next/dist/docs/01-app/02-guides/css-in-js.md` 는 styled-components 를
  「Client Components 에서 지원」하는 라이브러리로 두고, 레지스트리 + `useServerInsertedHTML` 로 모으는 구성을 안내한다.
  서버 컴포넌트 렌더는 그 경로 밖이다.
- **대상이 아닌 것** — `css`·`keyframes` 조각만 내보내는 헬퍼(`src/styles/layout.ts`, `src/lib/community/field-styles.ts`
  등)에는 달지 않는다. 렌더하지 않으니 위 문제가 없고, 달면 서버 파일이 가져갈 때 값 대신 클라이언트 참조가 와서 깨진다.
- **서버 전용 기능은 page/layout 에 둔다** — `metadata`, `async` 조회, `server-only` 모듈은 `app/**/page.tsx`·`layout.tsx`
  (서버)에 남기고, 스타일을 가진 화면 컴포넌트는 직렬화 가능한 props 만 받는다(`LegalDocumentView doc={…}` 처럼).

## 브라우저 API 처리

- module scope에서 브라우저 API를 읽지 않는다.
- 컴포넌트 body 최상단에서 storage를 직접 읽지 않는다.
- storage와 cookie 접근은 helper 함수, guard, effect 안으로 옮긴다.
- resize, scroll, visibility event는 effect에서 등록하고 cleanup을 둔다.

## SDK와 realtime 처리

- Kakao Map, chart, Firebase Messaging, websocket-heavy 화면은 필요하면 client-only wrapper를 둔다.
- SSR에서 깨지는 SDK는 `dynamic(..., { ssr: false })`를 사용한다.
- Firebase Messaging과 service worker 등록은 client effect에서만 실행한다.
- websocket/STOMP client는 auth/session 준비 이후 연결한다.

## 완료 확인

- SSR 시점에 browser API reference error가 없어야 한다.
- hydrate 전후 UI가 의도 없이 달라지지 않아야 한다.
- cleanup 누락으로 event listener나 websocket subscription이 중복되지 않아야 한다.
