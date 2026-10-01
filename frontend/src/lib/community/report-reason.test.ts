import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_REPORT_REASON_MAX_LENGTH,
  COMMUNITY_REPORT_REASONS,
  composeCommunityReportReason,
  getCommunityReportDetailMaxLength,
  validateCommunityReportInput,
  validateCommunityReportReason,
} from './report-reason'

/* community.md §S4 「신고 다이얼로그」 · CM-012 · CM-036 */

describe('COMMUNITY_REPORT_REASONS', () => {
  it('명세의 사유 다섯 개를 이 순서로 둔다', () => {
    expect(COMMUNITY_REPORT_REASONS).toEqual([
      '스팸·홍보',
      '욕설·비방',
      '개인정보 노출',
      '거짓 정보',
      '기타',
    ])
  })
})

describe('composeCommunityReportReason', () => {
  it('상세가 없으면 사유 접두만 보낸다', () => {
    expect(composeCommunityReportReason('스팸·홍보', '')).toBe('[스팸·홍보]')
  })

  it('공백뿐인 상세는 없는 것으로 본다', () => {
    expect(composeCommunityReportReason('욕설·비방', ' \n  ')).toBe(
      '[욕설·비방]',
    )
  })

  it('상세는 앞뒤 공백을 걷고 한 칸 띄워 붙인다', () => {
    expect(
      composeCommunityReportReason('개인정보 노출', '  전화번호가 있어요\n'),
    ).toBe('[개인정보 노출] 전화번호가 있어요')
  })

  it('사유를 고르지 않았으면 상세만 남긴다(카운터용)', () => {
    expect(composeCommunityReportReason(null, '  내용  ')).toBe('내용')
    expect(composeCommunityReportReason(null, '')).toBe('')
  })
})

describe('getCommunityReportDetailMaxLength', () => {
  it('합친 값이 500자를 넘지 않게 접두와 띄어쓰기 몫을 뺀다', () => {
    expect(COMMUNITY_REPORT_REASON_MAX_LENGTH).toBe(500)
    // '[스팸·홍보] ' = 8자
    expect(getCommunityReportDetailMaxLength('스팸·홍보')).toBe(492)
    // '[기타] ' = 5자
    expect(getCommunityReportDetailMaxLength('기타')).toBe(495)
  })

  it('사유 전에는 500 그대로다', () => {
    expect(getCommunityReportDetailMaxLength(null)).toBe(500)
  })

  it('한도를 꽉 채운 상세를 붙여도 정확히 500자다', () => {
    const reason = '개인정보 노출'
    const detail = '가'.repeat(getCommunityReportDetailMaxLength(reason))
    expect(composeCommunityReportReason(reason, detail)).toHaveLength(500)
  })
})

describe('validateCommunityReportInput', () => {
  it('사유를 고르지 않으면 막는다', () => {
    expect(validateCommunityReportInput({ reason: null, detail: '' })).toEqual({
      field: 'reason',
      message: '신고 사유를 골라 주세요.',
    })
    expect(
      validateCommunityReportInput({ reason: null, detail: '상세만 썼어요' }),
    ).toEqual({ field: 'reason', message: '신고 사유를 골라 주세요.' })
  })

  it('CM-036: 기타는 상세가 비면(공백뿐 포함) 막는다', () => {
    expect(
      validateCommunityReportInput({ reason: '기타', detail: '' }),
    ).toEqual({ field: 'detail', message: '기타 사유를 적어 주세요.' })
    expect(
      validateCommunityReportInput({ reason: '기타', detail: '  \n ' }),
    ).toEqual({ field: 'detail', message: '기타 사유를 적어 주세요.' })
  })

  it('CM-036: 기타가 아니면 상세 없이 통과한다', () => {
    for (const reason of COMMUNITY_REPORT_REASONS.filter(
      value => value !== '기타',
    )) {
      expect(validateCommunityReportInput({ reason, detail: '' })).toBeNull()
    }
  })

  it('기타에 상세가 있으면 통과한다', () => {
    expect(
      validateCommunityReportInput({ reason: '기타', detail: '도배예요' }),
    ).toBeNull()
  })

  it('CM-012: 합친 길이가 500자를 넘으면 막는다', () => {
    const reason = '스팸·홍보'
    const limit = getCommunityReportDetailMaxLength(reason)

    expect(
      validateCommunityReportInput({ reason, detail: '가'.repeat(limit) }),
    ).toBeNull()
    expect(
      validateCommunityReportInput({ reason, detail: '가'.repeat(limit + 1) }),
    ).toEqual({
      field: 'detail',
      message: '신고 사유는 500자 이하로 입력해 주세요.',
    })
  })

  it('합친 길이는 걷어 낸 뒤의 길이다', () => {
    const reason = '스팸·홍보'
    const detail = `   ${'가'.repeat(getCommunityReportDetailMaxLength(reason))}   `
    expect(validateCommunityReportInput({ reason, detail })).toBeNull()
  })

  it('긴 상세를 쓴 뒤 접두가 긴 사유로 바꿔도 500자 검증이 잡는다', () => {
    const detail = '가'.repeat(getCommunityReportDetailMaxLength('기타'))
    expect(validateCommunityReportInput({ reason: '기타', detail })).toBeNull()
    expect(
      validateCommunityReportInput({ reason: '개인정보 노출', detail }),
    ).toEqual({
      field: 'detail',
      message: '신고 사유는 500자 이하로 입력해 주세요.',
    })
  })
})

describe('validateCommunityReportReason (합친 문자열 검증)', () => {
  it('공백만이면 막는다', () => {
    expect(validateCommunityReportReason(' \n ')).toBe(
      '신고 사유를 입력해 주세요.',
    )
  })

  it('500자를 넘으면 막고 500자는 통과한다', () => {
    expect(validateCommunityReportReason('가'.repeat(501))).toBe(
      '신고 사유는 500자 이하로 입력해 주세요.',
    )
    expect(validateCommunityReportReason('가'.repeat(500))).toBeNull()
  })
})
