# 없는 주소 · 렌더 오류 화면

이슈 #555. `app/` 에 not-found · error · global-error 가 없어 Next 기본 영문 화면과 흰 화면이 떴다.

## 규칙

| 상황                                                    | 파일                        | 화면                                                                                                                                        |
| ------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 없는 주소, `notFound()` 호출                            | `app/not-found.tsx`         | 사이트 셸(헤더·푸터) 안 EmptyState. 제목 「찾는 페이지가 없어요」, 이유 한 줄, 주 「상권 분석하러 가기」(`/analysis`), 보조 「홈으로」(`/`) |
| `(shell)` 안에서 `notFound()` 호출(`/community/abc` 등) | `app/(shell)/not-found.tsx` | 셸 없이 같은 화면만(이미 (shell) 레이아웃 안이라 셸이 두 번 나오지 않는다)                                                                  |
| `(shell)` 아래 렌더 오류                                | `app/(shell)/error.tsx`     | 셸이 살아 있는 채로 EmptyState. 주 「다시 시도」(`retry()`), 보조 「홈으로」                                                                |
| 루트 레이아웃 실패                                      | `app/global-error.tsx`      | 자체 `html lang="ko"`/`body`, 인라인 스타일만 사용(레지스트리·전역 스타일 미적용). 「다시 시도」 · 「홈으로」(`<a>`)                        |

- 제목은 h1 이다(`EmptyState` 의 `titleAs`). 두 화면 컴포넌트는 `'use client'` 다 — styled-components 파일이 서버 트리에서 렌더되면 CSS 가 주입되지 않는다.
- `(shell)` 레이아웃(헤더·푸터) 자체의 오류는 `error.tsx` 가 감싸지 못해 `global-error` 로 간다.
- HTTP 상태는 404 를 유지한다. 메타 제목은 「페이지를 찾을 수 없어요 | BossPickSeoul」이고 Next 가 `noindex` 를 붙인다.
- 루트 `not-found` 는 루트 레이아웃 안이지만 `(shell)` 레이아웃 밖이라 `SiteShell` + 헤더 + 푸터를 직접 두른다. `(shell)` 안의 `notFound()` 는 `(shell)/not-found.tsx` 가 셸 없이 받는다.
- 동적 라우트의 잘못된 id 는 `generateMetadata` 도 `index: false` 로 내서 robots 가 noindex 하나만 남는다.
- 오류 상세(`message` · `digest`)는 화면에 내지 않고 `console.error` 로만 남긴다.
- Next 16.3 의 `error.js` 는 `retry`(재조회·재렌더)를 권장하고 `reset` 은 재조회 없는 초기화용이다. 이 화면은 `retry` 를 쓴다.
- `global-error` 는 클라이언트 컴포넌트라 `metadata` 를 내보낼 수 없어 `<title>` 을 직접 둔다.
- `(auth)` 그룹에는 오류 화면을 따로 두지 않는다(범위 밖, 루트 not-found·global-error 로 떨어진다).

## 검증

- `src/components/layout/status-screens.test.ts` — 문구·링크·h1·오류 상세 비노출·재시도 호출.
- `e2e/layout/not-found.spec.ts` — `/nope-xyz`·`/community/abc` 404, 셸 1개, h1.
- `e2e/layout/root-redirect.spec.ts` — `/community`·`/chatting`·`/profile` 은 404 가 아니라 `next.config.ts` redirects 로 `/community/list`·`/chatting/list`·`/profile/bookmarks/analysis`(헤더 「북마크」와 같은 곳) 307(임시, 쿼리 유지, 끝 슬래시는 Next 가 308 로 먼저 떼고 이어 받음, #636). `/profile` 은 북마크로 보낸다(사용자 결정, 2026-10-10).
- 실측: `curl -w '%{http_code}' /nope-xyz` → 404, 응답에 한국어 제목.
