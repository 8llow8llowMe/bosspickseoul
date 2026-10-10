/**
 * Next 의 HTML-limited 봇 목록(`next/dist/shared/lib/router/utils/html-bots.js`)에 **없는** 링크 미리보기 봇.
 *
 * 두 곳이 같은 값을 써야 한다.
 * - `next.config.ts` `htmlLimitedBots`: 이 봇들에게 메타를 스트리밍하지 않고 `<head>` 에 막아 넣는다.
 *   빠지면 카카오톡 미리보기가 `</head>` 뒤로 밀린 `og:title` 을 읽지 못한다(2026-10-10 실측).
 * - `share-preview.ts` `isLinkPreviewBot`: 이 봇들에게는 `/s/{shareCode}` 에서 307 을 보내지 않는다.
 *
 * 의존 없는 파일이어야 한다 — `next.config.ts` 가 import 한다.
 */
export const EXTRA_LINK_PREVIEW_BOTS_SOURCE =
  'kakaotalk-scrap|kakaostory-og-reader|daum(oa)?[ /-]|TelegramBot'
