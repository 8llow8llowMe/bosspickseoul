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
