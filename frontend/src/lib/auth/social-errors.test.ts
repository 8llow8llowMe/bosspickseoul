import { describe, expect, it } from 'vitest'
import { socialLoginErrorMessage } from './social-errors'

describe('socialLoginErrorMessage', () => {
  it('social — 일반 실패 문구', () => {
    expect(socialLoginErrorMessage('social')).toBe(
      '소셜 로그인에 실패했습니다. 다시 시도해 주세요.',
    )
  })

  it('social_state — 만료·다른 브라우저 시작을 알린다', () => {
    expect(socialLoginErrorMessage('social_state')).toBe(
      '로그인 요청이 만료됐거나 다른 브라우저에서 시작됐어요. 이 화면에서 다시 시도해 주세요.',
    )
  })

  it('social_signup — 회원가입에서 동의하도록 안내한다', () => {
    expect(socialLoginErrorMessage('social_signup')).toBe(
      '카카오 계정으로 처음 오셨어요. 회원가입에서 약관에 동의한 뒤 카카오로 가입해 주세요.',
    )
  })

  it('그 밖·없음은 표시하지 않는다', () => {
    expect(socialLoginErrorMessage(null)).toBeNull()
    expect(socialLoginErrorMessage('')).toBeNull()
    expect(socialLoginErrorMessage('evil')).toBeNull()
    // 프로토타입 키로 문구 맵을 우회하지 못한다.
    expect(socialLoginErrorMessage('toString')).toBeNull()
  })
})
