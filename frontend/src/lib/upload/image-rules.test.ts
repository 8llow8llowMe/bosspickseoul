import { describe, expect, it } from 'vitest'

import {
  ALLOWED_IMAGE_MIME_TYPES,
  describeImageFileIssue,
  formatBytes,
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_RULE_TEXT,
  MAX_IMAGE_BYTES,
  resolveUploadErrorMessage,
} from '@/lib/upload/image-rules'

describe('업로드 상한은 백엔드와 같아야 한다', () => {
  /* `file-upload-guide.md`: "허용 형식은 jpg / png / gif / webp, 기본 상한은 파일당 5MB". */
  it('5MB 와 네 가지 형식', () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024)
    expect(ALLOWED_IMAGE_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ])
  })

  it('accept 속성이 그 목록을 그대로 쓴다', () => {
    expect(IMAGE_ACCEPT_ATTRIBUTE).toBe(
      'image/jpeg,image/png,image/gif,image/webp',
    )
  })
})

describe('describeImageFileIssue', () => {
  it('멀쩡한 이미지는 통과시킨다', () => {
    expect(describeImageFileIssue({ size: 1024, type: 'image/png' })).toBeNull()
  })

  it('빈 파일은 왕복시키지 않는다', () => {
    expect(describeImageFileIssue({ size: 0, type: 'image/png' })).toContain(
      '빈 파일',
    )
  })

  it('상한을 넘으면 고른 파일 크기까지 알려 준다', () => {
    const issue = describeImageFileIssue({
      size: MAX_IMAGE_BYTES + 1,
      type: 'image/png',
    })

    expect(issue).toContain('5MB')
    expect(issue).toContain('5.0MB')
  })

  it('경계값(정확히 5MB)은 통과시킨다', () => {
    expect(
      describeImageFileIssue({ size: MAX_IMAGE_BYTES, type: 'image/png' }),
    ).toBeNull()
  })

  it('허용하지 않는 형식은 규칙을 알려 준다', () => {
    expect(describeImageFileIssue({ size: 1024, type: 'image/svg+xml' })).toBe(
      IMAGE_RULE_TEXT,
    )
    expect(
      describeImageFileIssue({ size: 1024, type: 'application/pdf' }),
    ).toBe(IMAGE_RULE_TEXT)
  })

  /*
   * 브라우저가 형식을 못 알아본 경우(확장자 없는 파일 등)까지 막지 않는다. 진짜 판정은
   * 서버의 매직 바이트 검사이고, 멀쩡한 이미지를 여기서 막으면 사용자는 이유를 모른다.
   */
  it('type 이 비어 있으면 서버 판정에 맡긴다', () => {
    expect(describeImageFileIssue({ size: 1024, type: '' })).toBeNull()
  })
})

describe('formatBytes', () => {
  it('사람이 읽을 단위로 적는다', () => {
    expect(formatBytes(512)).toBe('512B')
    expect(formatBytes(2048)).toBe('2KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0MB')
  })
})

describe('resolveUploadErrorMessage', () => {
  /*
   * 이 셋은 서버 문구가 **다음에 무엇을 해야 하는지**를 말해 주지 않는다.
   * 그래서 행동을 덧붙인다.
   */
  it('스토리지 오류코드는 행동을 덧붙여 안내한다', () => {
    expect(
      resolveUploadErrorMessage('STORAGE_002', '파일이 너무 큽니다.'),
    ).toContain('더 작은 파일')
    expect(
      resolveUploadErrorMessage('STORAGE_003', '이미지가 아닙니다.'),
    ).toContain('JPG')
  })

  /* 나머지는 서버 문구가 늘 우리 추측보다 정확하다. */
  it('그 밖에는 서버 문구를 그대로 쓴다', () => {
    expect(
      resolveUploadErrorMessage('STORAGE_004', '업로드에 실패했습니다.'),
    ).toBe('업로드에 실패했습니다.')
    expect(resolveUploadErrorMessage(null, '알 수 없는 오류')).toBe(
      '알 수 없는 오류',
    )
  })
})
