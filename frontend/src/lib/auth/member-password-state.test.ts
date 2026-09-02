import { describe, expect, it } from 'vitest'

import {
  isStaleMemberStateCode,
  resolveMemberPasswordMode,
  resolvePasswordErrorMessage,
  STALE_MEMBER_STATE_MESSAGE,
} from '@/lib/auth/member-password-state'

describe('resolveMemberPasswordMode', () => {
  /* OpenAPI `MemberMyInfoResponse` 가 적어 둔 조합 그대로다. */
  it('비밀번호만 있으면 일반 계정 — 변경 폼만 준다', () => {
    expect(
      resolveMemberPasswordMode({ provider: null, hasPassword: true }),
    ).toBe('change')
  })

  it('소셜 연결 + 비밀번호 있음이면 전환 패널을 함께 준다', () => {
    expect(
      resolveMemberPasswordMode({ provider: 'KAKAO', hasPassword: true }),
    ).toBe('change-with-unlink')
  })

  it('소셜 전용이면 최초 설정 폼을 준다', () => {
    expect(
      resolveMemberPasswordMode({ provider: 'KAKAO', hasPassword: false }),
    ).toBe('setup')
  })

  /*
   * 비밀번호도 소셜도 없는 계정은 로그인할 수단이 없어 이론상 존재하지 않는다.
   * 그래도 오면 폼을 주지 않는다 — 어느 쪽을 줘도 백엔드가 400 을 돌려준다.
   */
  it('둘 다 없으면 폼을 주지 않는다', () => {
    expect(
      resolveMemberPasswordMode({ provider: null, hasPassword: false }),
    ).toBe('unknown')
  })

  it('회원 정보가 아직 없으면 폼을 주지 않는다', () => {
    expect(resolveMemberPasswordMode(null)).toBe('unknown')
    expect(resolveMemberPasswordMode(undefined)).toBe('unknown')
  })

  /* 빈 문자열 provider 를 「소셜 연결됨」으로 읽으면 없는 전환 버튼이 생긴다. */
  it('빈 문자열 provider 는 소셜로 치지 않는다', () => {
    expect(resolveMemberPasswordMode({ provider: '', hasPassword: true })).toBe(
      'change',
    )
  })
})

describe('isStaleMemberStateCode', () => {
  /*
   * 셋 다 **화면이 이미 걸러 냈어야 하는** 경우다. 그런데도 왔다면 들고 있는
   * 회원 정보가 낡았다는 뜻이다 — 다른 탭에서 바꿨거나 소셜을 연결/해제했거나.
   */
  it.each(['MEMBER_007', 'MEMBER_008', 'MEMBER_009'])(
    '%s 는 상태가 낡았다는 신호다',
    code => {
      expect(isStaleMemberStateCode(code)).toBe(true)
    },
  )

  it('다른 코드는 그냥 실패다', () => {
    expect(isStaleMemberStateCode('MEMBER_004')).toBe(false)
    expect(isStaleMemberStateCode(null)).toBe(false)
    expect(isStaleMemberStateCode(undefined)).toBe(false)
  })
})

describe('resolvePasswordErrorMessage', () => {
  it('상태가 낡았으면 다시 불러오라고 안내한다', () => {
    expect(
      resolvePasswordErrorMessage(
        'MEMBER_008',
        '이미 비밀번호가 설정된 계정입니다.',
      ),
    ).toBe(STALE_MEMBER_STATE_MESSAGE)
  })

  /* 그 밖에는 서버 문구가 늘 우리 추측보다 정확하다. */
  it('그 밖에는 서버가 준 문구를 그대로 쓴다', () => {
    expect(
      resolvePasswordErrorMessage(
        'MEMBER_004',
        '현재 비밀번호가 일치하지 않습니다.',
      ),
    ).toBe('현재 비밀번호가 일치하지 않습니다.')
  })
})
