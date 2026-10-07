import { describe, expect, it } from 'vitest'
import {
  EMPTY_SIGNUP_CONSENT,
  SIGNUP_CONSENT_KEYS,
  isSignupConsentComplete,
  missingSignupConsent,
  parseSocialSignupReason,
  setAllSignupConsent,
  signupConsentErrorCandidates,
  signupConsentErrorKeys,
  signupConsentQuery,
  socialSignupPath,
} from './signup-consent'

const ALL = { termsAgreed: true, privacyAgreed: true, ageOver14Confirmed: true }

describe('signup-consent (TC-CON-001)', () => {
  it('선언 순서는 백엔드 오류 순서(약관 → 처리방침 → 만 14세)다', () => {
    expect(SIGNUP_CONSENT_KEYS).toEqual([
      'termsAgreed',
      'privacyAgreed',
      'ageOver14Confirmed',
    ])
    expect(EMPTY_SIGNUP_CONSENT).toEqual({
      termsAgreed: false,
      privacyAgreed: false,
      ageOver14Confirmed: false,
    })
  })

  it('세 항목이 모두 켜져야 완료다', () => {
    expect(isSignupConsentComplete(ALL)).toBe(true)
    expect(isSignupConsentComplete(EMPTY_SIGNUP_CONSENT)).toBe(false)
    for (const key of SIGNUP_CONSENT_KEYS) {
      expect(isSignupConsentComplete({ ...ALL, [key]: false })).toBe(false)
    }
  })

  it('전체 동의는 세 항목을 한꺼번에 켜고 끈다', () => {
    expect(setAllSignupConsent(true)).toEqual(ALL)
    expect(setAllSignupConsent(false)).toEqual(EMPTY_SIGNUP_CONSENT)
  })

  it('누락 목록은 선언 순서를 따른다', () => {
    expect(missingSignupConsent(EMPTY_SIGNUP_CONSENT)).toEqual([
      'termsAgreed',
      'privacyAgreed',
      'ageOver14Confirmed',
    ])
    expect(
      missingSignupConsent({
        termsAgreed: true,
        privacyAgreed: false,
        ageOver14Confirmed: false,
      }),
    ).toEqual(['privacyAgreed', 'ageOver14Confirmed'])
    expect(missingSignupConsent(ALL)).toEqual([])
  })

  it('쿼리 문자열은 켜진 항목만 싣는다(판은 싣지 않는다)', () => {
    expect(signupConsentQuery(ALL)).toBe(
      '?termsAgreed=true&privacyAgreed=true&ageOver14Confirmed=true',
    )
    expect(signupConsentQuery({ ...ALL, privacyAgreed: false })).toBe(
      '?termsAgreed=true&ageOver14Confirmed=true',
    )
    expect(signupConsentQuery(EMPTY_SIGNUP_CONSENT)).toBe('')
    expect(signupConsentQuery(ALL)).not.toContain('version')
  })

  it.each([
    ['MEMBER_114', ['termsAgreed']],
    ['MEMBER_115', ['privacyAgreed']],
    ['MEMBER_116', ['ageOver14Confirmed']],
    // CONSENT_REQUIRED — 약관·처리방침 공용 코드라 둘 다 후보다.
    ['MEMBER_010', ['termsAgreed', 'privacyAgreed']],
    ['MEMBER_011', ['ageOver14Confirmed']],
  ])('%s 의 후보 체크박스는 %j', (code, keys) => {
    expect(signupConsentErrorCandidates(code)).toEqual(keys)
  })

  it('동의와 무관한 코드·코드 없음은 후보가 없다', () => {
    expect(signupConsentErrorCandidates('MEMBER_001')).toEqual([])
    expect(signupConsentErrorCandidates('AUTH_021')).toEqual([])
    expect(signupConsentErrorCandidates(null)).toEqual([])
    expect(signupConsentErrorCandidates(undefined)).toEqual([])
  })
})

describe('signupConsentErrorKeys — errors[] 를 필드별로 모은다', () => {
  it('여러 항목이 함께 빠지면 errors[] 의 필드를 모두 강조한다(선언 순서, 중복 없음)', () => {
    expect(
      signupConsentErrorKeys('MEMBER_114', ALL, [
        { code: 'MEMBER_116', field: 'ageOver14Confirmed', message: 'c' },
        { code: 'MEMBER_114', field: 'termsAgreed', message: 'a' },
        { code: 'MEMBER_114', field: 'termsAgreed', message: 'a2' },
        { code: 'MEMBER_115', field: 'privacyAgreed', message: 'b' },
      ]),
    ).toEqual(['termsAgreed', 'privacyAgreed', 'ageOver14Confirmed'])
  })

  it('errors[] 가 없으면 resultCode 만으로 고른다', () => {
    expect(signupConsentErrorKeys('MEMBER_011', ALL, [])).toEqual([
      'ageOver14Confirmed',
    ])
  })

  it('MEMBER_010 은 약관·처리방침 중 지금 꺼진 것만 강조한다', () => {
    expect(
      signupConsentErrorKeys(
        'MEMBER_010',
        { ...ALL, privacyAgreed: false },
        [],
      ),
    ).toEqual(['privacyAgreed'])
    expect(
      signupConsentErrorKeys(
        'MEMBER_010',
        { ...ALL, termsAgreed: false, privacyAgreed: false },
        [],
      ),
    ).toEqual(['termsAgreed', 'privacyAgreed'])
  })

  it('MEMBER_010 인데 둘 다 켜져 있으면 둘 다 강조한다', () => {
    expect(signupConsentErrorKeys('MEMBER_010', ALL, [])).toEqual([
      'termsAgreed',
      'privacyAgreed',
    ])
  })

  it('동의와 무관한 실패는 빈 목록이다', () => {
    expect(
      signupConsentErrorKeys('MEMBER_001', ALL, [
        { code: 'MEMBER_101', field: 'nickname', message: 'x' },
      ]),
    ).toEqual([])
  })
})

describe('카카오 첫 가입 동의 화면 경로', () => {
  it('reason 은 age 가 아니면 terms 로 본다', () => {
    expect(parseSocialSignupReason('age')).toBe('age')
    expect(parseSocialSignupReason('terms')).toBe('terms')
    expect(parseSocialSignupReason('evil')).toBe('terms')
    expect(parseSocialSignupReason(null)).toBe('terms')
    expect(parseSocialSignupReason(undefined)).toBe('terms')
  })

  it('복귀 경로가 루트면 redirect 를 붙이지 않는다', () => {
    expect(
      socialSignupPath({ provider: 'kakao', reason: 'terms', returnPath: '/' }),
    ).toBe('/register/social?provider=kakao&reason=terms')
  })

  it('복귀 경로는 인코딩해 redirect 로 넘긴다', () => {
    expect(
      socialSignupPath({
        provider: 'kakao',
        reason: 'age',
        returnPath: '/analysis/result?districtCode=11740&x=1',
      }),
    ).toBe(
      '/register/social?provider=kakao&reason=age&redirect=%2Fanalysis%2Fresult%3FdistrictCode%3D11740%26x%3D1',
    )
  })
})
