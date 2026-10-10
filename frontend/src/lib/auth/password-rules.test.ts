import { describe, expect, it } from 'vitest'

import { PASSWORD_PATTERN as REGISTER_PASSWORD_PATTERN } from '@/components/auth/register-machine'
import {
  PASSWORD_PATTERN,
  PASSWORD_RULES,
  isValidPassword,
} from '@/lib/auth/password-rules'

describe('비밀번호 규칙 정본', () => {
  /**
   * 회원가입과 프로필이 **같은 상수**를 봐야 한다. 규칙을 두 벌 만들면 한쪽이
   * 거부하는 값을 다른 쪽이 통과시키고, 그 어긋남은 백엔드 400 으로만 드러난다.
   * 값이 같은지가 아니라 **같은 객체인지**를 단언한다 — 복사해 붙여 넣어도 값은 같다.
   */
  it('회원가입 폼과 프로필 화면이 같은 객체를 쓴다', () => {
    expect(REGISTER_PASSWORD_PATTERN).toBe(PASSWORD_PATTERN)
  })

  /* 백엔드 제약과 동일: 영문자·숫자·특수문자 포함 8~20자, 공백 불가. */
  it('영문자·숫자·특수문자를 모두 포함한 8~20자만 통과시킨다', () => {
    expect(isValidPassword('password123!')).toBe(true)
    expect(isValidPassword('aB3!efgh')).toBe(true)
    expect(isValidPassword('aB3!efghaB3!efghaB3!')).toBe(true)
  })

  it('길이·구성이 어긋나면 막는다', () => {
    expect(isValidPassword('aB3!efg')).toBe(false) // 7자
    expect(isValidPassword('aB3!efghaB3!efghaB3!e')).toBe(false) // 21자
    expect(isValidPassword('password!!!!')).toBe(false) // 숫자 없음
    expect(isValidPassword('12345678!')).toBe(false) // 영문자 없음
    expect(isValidPassword('password1234')).toBe(false) // 특수문자 없음
    expect(isValidPassword('pass word1!')).toBe(false) // 공백
    expect(isValidPassword('')).toBe(false)
  })
})

describe('비밀번호 규칙 체크리스트(#578)', () => {
  const allMet = (value: string) =>
    PASSWORD_RULES.every(rule => rule.test(value))

  it.each([
    'Passw0rd!',
    'abcdefg1@',
    'A1!aaaaa',
    'A1!' + 'a'.repeat(17),
    'A1!' + 'a'.repeat(18),
    'password1',
    'PASSWORD!!',
    '12345678!',
    'Pass 0rd!',
    'Pa0!',
    "a1'bbbbb",
    'a1\\bbbbb',
    'a1~bbbbb',
    '',
  ])('항목을 모두 지킨 것과 PASSWORD_PATTERN 통과가 같다: %j', value => {
    expect(allMet(value)).toBe(PASSWORD_PATTERN.test(value))
  })

  it('항목 순서와 라벨이 고정돼 있다', () => {
    expect(PASSWORD_RULES.map(rule => rule.label)).toEqual([
      '영문자',
      '숫자',
      '특수문자',
      '공백 없이 8~20자',
    ])
  })
})
