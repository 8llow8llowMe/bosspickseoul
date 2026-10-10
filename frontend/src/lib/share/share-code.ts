/**
 * 공유 코드 형식. 백엔드가 base62 8자로 만들고(`ShareLinkCommandProcessor.CODE_LENGTH`) 컬럼은
 * 16자다(`ShareLinkEntity.shareCode`). 형식이 아니면 백엔드를 부르지 않는다 — `..`·`%2F` 같은
 * 경로 조각이 fetch URL 에 섞이거나, 긴 문자열이 캐시 키를 불리는 것을 막는다.
 *
 * 서버(`share-preview.server.ts`)와 클라이언트(`ShareEntryPage`)가 함께 쓰므로 의존 없는 파일에 둔다.
 */
const SHARE_CODE_RE = /^[0-9A-Za-z]{1,16}$/

export const isShareCodeFormat = (shareCode: string | null | undefined) =>
  typeof shareCode === 'string' && SHARE_CODE_RE.test(shareCode)
