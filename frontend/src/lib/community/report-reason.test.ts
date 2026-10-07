import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_REPORT_DETAIL_MAX_LENGTH,
  COMMUNITY_REPORT_REASONS,
  createCommunityReportReasonPayload,
  getCommunityReportErrorField,
  isCommunityReportReasonCode,
  readCommunityReportError,
  validateCommunityReportInput,
} from './report-reason'

/* community.md §S4 「신고 다이얼로그」 · CM-012 · CM-036 · CM-058 (#532) */

describe('COMMUNITY_REPORT_REASONS', () => {
  it('계약의 사유 다섯 개를 이 순서로, 라벨은 BE 표시명과 글자까지 같게 둔다', () => {
    expect(COMMUNITY_REPORT_REASONS).toEqual([
      { code: 'SPAM', label: '스팸·홍보' },
      { code: 'ABUSE', label: '욕설·비방' },
      { code: 'PRIVACY', label: '개인정보 노출' },
      { code: 'FALSE_INFO', label: '거짓 정보' },
      { code: 'ETC', label: '기타' },
    ])
    // 가운뎃점은 U+00B7 이다 — BE 표시명·레거시 접두 해석과 같은 글자여야 한다.
    expect(COMMUNITY_REPORT_REASONS[0]?.label.charCodeAt(2)).toBe(0x00b7)
    expect(COMMUNITY_REPORT_REASONS[1]?.label.charCodeAt(2)).toBe(0x00b7)
  })

  it('알려진 code 만 사유로 받는다(라벨·소문자는 아니다)', () => {
    expect(isCommunityReportReasonCode('FALSE_INFO')).toBe(true)
    expect(isCommunityReportReasonCode('스팸·홍보')).toBe(false)
    expect(isCommunityReportReasonCode('spam')).toBe(false)
  })
})

describe('createCommunityReportReasonPayload', () => {
  it('상세가 없으면 detail 키를 뺀다', () => {
    expect(createCommunityReportReasonPayload('SPAM', '')).toEqual({
      reasonCode: 'SPAM',
    })
    expect(
      Object.keys(createCommunityReportReasonPayload('ABUSE', ' \n  ')),
    ).toEqual(['reasonCode'])
  })

  it('상세는 앞뒤 공백을 걷어 따로 싣고, 사유 접두를 붙이지 않는다', () => {
    expect(
      createCommunityReportReasonPayload('PRIVACY', '  전화번호가 있어요\n'),
    ).toEqual({ reasonCode: 'PRIVACY', detail: '전화번호가 있어요' })
  })

  it('reason 필드는 만들지 않는다', () => {
    expect(
      createCommunityReportReasonPayload('ETC', '도배예요'),
    ).not.toHaveProperty('reason')
  })
})

describe('validateCommunityReportInput', () => {
  it('사유를 고르지 않으면 막는다', () => {
    expect(
      validateCommunityReportInput({ reasonCode: null, detail: '' }),
    ).toEqual({ field: 'reason', message: '신고 사유를 골라 주세요.' })
    expect(
      validateCommunityReportInput({
        reasonCode: null,
        detail: '상세만 썼어요',
      }),
    ).toEqual({ field: 'reason', message: '신고 사유를 골라 주세요.' })
  })

  it('CM-036: 기타(ETC)는 상세가 비면(공백뿐 포함) 막는다', () => {
    expect(
      validateCommunityReportInput({ reasonCode: 'ETC', detail: '' }),
    ).toEqual({ field: 'detail', message: '기타 사유를 적어 주세요.' })
    expect(
      validateCommunityReportInput({ reasonCode: 'ETC', detail: '  \n ' }),
    ).toEqual({ field: 'detail', message: '기타 사유를 적어 주세요.' })
  })

  it('CM-036: 기타가 아니면 상세 없이 통과한다', () => {
    for (const { code } of COMMUNITY_REPORT_REASONS.filter(
      reason => reason.code !== 'ETC',
    )) {
      expect(
        validateCommunityReportInput({ reasonCode: code, detail: '' }),
      ).toBeNull()
    }
  })

  it('기타에 상세가 있으면 통과한다', () => {
    expect(
      validateCommunityReportInput({ reasonCode: 'ETC', detail: '도배예요' }),
    ).toBeNull()
  })

  it('CM-012: 상세 자체가 500자를 넘으면 막는다 — 사유 접두 몫을 빼지 않는다', () => {
    expect(COMMUNITY_REPORT_DETAIL_MAX_LENGTH).toBe(500)
    expect(
      validateCommunityReportInput({
        reasonCode: 'PRIVACY',
        detail: '가'.repeat(500),
      }),
    ).toBeNull()
    expect(
      validateCommunityReportInput({
        reasonCode: 'PRIVACY',
        detail: '가'.repeat(501),
      }),
    ).toEqual({
      field: 'detail',
      message: '자세한 내용은 500자 이하로 입력해 주세요.',
    })
  })

  it('길이는 걷어 낸 뒤의 길이다(보내는 값과 같다)', () => {
    expect(
      validateCommunityReportInput({
        reasonCode: 'SPAM',
        detail: `   ${'가'.repeat(500)}   `,
      }),
    ).toBeNull()
  })
})

describe('getCommunityReportErrorField', () => {
  it('사유 코드 누락(110)·모르는 사유 코드(018)는 사유 선택 자리다', () => {
    expect(getCommunityReportErrorField('COMMUNITY_110')).toBe('reason')
    expect(getCommunityReportErrorField('COMMUNITY_018')).toBe('reason')
  })

  it('기타 상세 필수(123)·상세 500자 초과(124)는 상세 입력칸 자리다', () => {
    expect(getCommunityReportErrorField('COMMUNITY_123')).toBe('detail')
    expect(getCommunityReportErrorField('COMMUNITY_124')).toBe('detail')
  })

  it('그 밖의 코드·코드 없음은 일반 오류 자리(null)다', () => {
    expect(getCommunityReportErrorField('COMMUNITY_009')).toBeNull()
    expect(getCommunityReportErrorField('COMMUNITY_111')).toBeNull()
    expect(getCommunityReportErrorField(null)).toBeNull()
    expect(getCommunityReportErrorField(undefined)).toBeNull()
  })
})

describe('readCommunityReportError', () => {
  const fallback = '신고를 접수하지 못했어요.'
  /* axios 가 4xx 를 reject 할 때의 모양. BFF 는 백엔드 상태·본문을 그대로 넘긴다. */
  const axiosRejection = (
    status: number,
    resultCode: string,
    message: unknown,
  ) =>
    Object.assign(new Error(`Request failed with status code ${status}`), {
      isAxiosError: true,
      response: {
        status,
        data: {
          dataHeader: { success: false, resultCode, resultMessage: message },
          dataBody: null,
        },
      },
    })

  it('4xx 응답은 본문의 resultCode 로 자리를 정하고 서버 문구를 그대로 쓴다', () => {
    expect(
      readCommunityReportError(
        axiosRejection(400, 'COMMUNITY_123', {
          message: '기타 사유를 입력해 주세요.',
          errors: [
            {
              code: 'COMMUNITY_123',
              field: 'etcDetailPresent',
              message: '기타 사유를 입력해 주세요.',
            },
          ],
        }),
        fallback,
      ),
    ).toEqual({ field: 'detail', message: '기타 사유를 입력해 주세요.' })
    expect(
      readCommunityReportError(
        axiosRejection(
          400,
          'COMMUNITY_018',
          '유효하지 않은 신고 사유 코드입니다.',
        ),
        fallback,
      ),
    ).toEqual({
      field: 'reason',
      message: '유효하지 않은 신고 사유 코드입니다.',
    })
  })

  it('입력과 무관한 4xx(중복 신고 등)는 일반 자리다', () => {
    expect(
      readCommunityReportError(
        axiosRejection(409, 'COMMUNITY_009', '이미 신고한 대상입니다.'),
        fallback,
      ),
    ).toEqual({ field: null, message: '이미 신고한 대상입니다.' })
  })

  it('앱이 던진 오류(200 + success:false)는 실어 둔 resultCode 와 문구를 쓴다', () => {
    const thrown = Object.assign(
      new Error('상세는 500자 이하로 입력해 주세요.'),
      {
        resultCode: 'COMMUNITY_124',
      },
    )
    expect(readCommunityReportError(thrown, fallback)).toEqual({
      field: 'detail',
      message: '상세는 500자 이하로 입력해 주세요.',
    })
  })

  it('코드 없는 앱 오류(mock 등)는 문구만, 문구도 없으면 기본 문구다', () => {
    expect(
      readCommunityReportError(
        new Error('게시글 1을 찾을 수 없습니다.'),
        fallback,
      ),
    ).toEqual({ field: null, message: '게시글 1을 찾을 수 없습니다.' })
    expect(readCommunityReportError(new Error(''), fallback)).toEqual({
      field: null,
      message: fallback,
    })
  })

  it('응답이 없으면(통신 실패) 일반 자리에 통신 안내를 둔다', () => {
    const networkError = Object.assign(new Error('Network Error'), {
      isAxiosError: true,
      code: 'ERR_NETWORK',
    })
    expect(readCommunityReportError(networkError, fallback)).toEqual({
      field: null,
      message: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
    })
  })
})
