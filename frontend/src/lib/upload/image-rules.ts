/**
 * 이미지 업로드 규칙 **정본**. 프로필 이미지(A3)와 게시글 이미지(A4)가 같은 상한을
 * 쓰므로 한 곳에 둔다 — 두 벌로 나뉘면 한쪽이 거부하는 파일을 다른 쪽이 올려 보낸다.
 *
 * 근거는 `backend/docs/file-upload-guide.md`:
 * "허용 형식은 jpg / png / gif / webp, 기본 상한은 파일당 5MB(`MINIO_MAX_FILE_BYTES`)".
 *
 * ⚠️ **여기 검사는 예의일 뿐 판정이 아니다.** 백엔드는 확장자와 클라이언트가 보낸
 * `Content-Type` 을 믿지 않고 **매직 바이트로만** 형식을 판정한다(공개 버킷에
 * `text/html`·`svg` 를 올려 stored XSS 를 만드는 경로를 막기 위해서다). 그래서 여기를
 * 통과한 파일도 `STORAGE_003` 으로 거절될 수 있고, 그 경우 서버 문구를 그대로 보여 준다.
 * 이 검사의 목적은 **뻔한 실패에 5MB 를 왕복시키지 않는 것**뿐이다.
 */

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

/** `<input type="file">` 의 accept 속성값. 파일 선택창을 미리 좁힌다. */
export const IMAGE_ACCEPT_ATTRIBUTE = ALLOWED_IMAGE_MIME_TYPES.join(',')

/** 파일당 5MB (`MINIO_MAX_FILE_BYTES` 기본값). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const IMAGE_RULE_TEXT =
  'JPG · PNG · GIF · WEBP 형식, 5MB 이하만 올릴 수 있어요.'

/**
 * 올려 보기도 전에 확실히 실패할 파일인가. 문제가 없으면 `null`.
 *
 * 빈 파일을 따로 잡는 이유: 백엔드도 `STORAGE_001` 로 거절하지만, 0바이트는 사용자가
 * 잘못 고른 것이 거의 확실해서 왕복시킬 이유가 없다.
 */
export const describeImageFileIssue = (file: {
  size: number
  type: string
}): string | null => {
  if (file.size === 0) return '빈 파일이에요. 다른 파일을 골라 주세요.'

  if (file.size > MAX_IMAGE_BYTES) {
    return `5MB 이하만 올릴 수 있어요. (고른 파일 ${formatBytes(file.size)})`
  }

  /*
   * `type` 이 빈 문자열인 경우가 있다(확장자 없는 파일, 일부 OS·브라우저). 여기서
   * 막지 않고 서버 판정에 맡긴다 — 매직 바이트가 진짜 판정이고, 멀쩡한 이미지를
   * 브라우저가 못 알아봤다는 이유로 막으면 사용자는 이유를 알 수 없다.
   */
  if (
    file.type &&
    !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return IMAGE_RULE_TEXT
  }

  return null
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * 스토리지 오류코드(`backend/docs/file-upload-guide.md` "에러 코드")를 화면 문구로.
 *
 * 서버 문구가 있으면 그것을 쓰는 것이 원칙이지만, 이 셋은 **사용자가 다음에 무엇을
 * 해야 하는지**를 서버 문구가 말해 주지 않는다(예: "이미지가 아닙니다"). 그래서
 * 행동을 덧붙인다. 나머지 코드는 서버 문구를 그대로 흘린다.
 */
const STORAGE_MESSAGE: Record<string, string> = {
  STORAGE_001: '파일을 고르지 않았거나 빈 파일이에요.',
  STORAGE_002: '5MB 이하만 올릴 수 있어요. 더 작은 파일로 다시 시도해 주세요.',
  STORAGE_003:
    '이미지 파일이 아니에요. JPG · PNG · GIF · WEBP 파일인지 확인해 주세요.',
}

export const resolveUploadErrorMessage = (
  code: string | null | undefined,
  message: string,
): string => (code && STORAGE_MESSAGE[code]) || message
