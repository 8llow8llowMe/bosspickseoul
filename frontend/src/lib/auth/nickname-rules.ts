/**
 * 닉네임 규칙 **정본**. 회원가입과 프로필(회원 정보 수정)이 여기서만 가져간다.
 *
 * 원래 `components/auth/register-machine.ts` 에 `NICKNAME_MAX_LENGTH` 만 있었는데,
 * 프로필 화면이 회원가입 컴포넌트를 import 하는 모양이 이상해서 `password-rules` 와
 * 같은 자리로 옮겼다. `register-machine` 은 이제 여기서 다시 내보내기만 한다 —
 * **규칙을 두 벌 만들면 한쪽이 거부하는 값을 다른 쪽이 통과시킨다.**
 *
 * 백엔드 제약과 동일하다. 가입(`MemberGeneralSignupRequest`)과 수정
 * (`MemberMyInfoUpdateRequest`)이 둘 다 `@NotBlank`(MEMBER_108) + `@Size(max = 10)`
 * (MEMBER_109)을 건다. **여기서 미리 막는 이유는 확실히 거절될 요청을 왕복시키지
 * 않기 위해서지, 이 값이 규칙의 정본이어서가 아니다** — 규칙이 바뀌면 서버를 고치고
 * 이 값을 따라 맞춘다. 어긋나 있어도 최종 판정은 서버가 하므로 잘못 통과하지는 않는다.
 *
 * ⚠️ **중복 규칙은 없다.** 백엔드는 가입에서도 수정에서도 닉네임 중복을 막지 않는다
 * (unique 제약은 이메일뿐이다). 없는 규칙을 FE 가 만들어 내면 서버가 받아 줄 값을
 * 화면만 거절하게 된다.
 */
export const NICKNAME_MAX_LENGTH = 10

/** 규칙을 사용자에게 설명하는 문구. 화면마다 다르게 적으면 안 되므로 여기 둔다. */
export const NICKNAME_RULE_TEXT = '닉네임은 10자 이하로 지어 주세요.'

/** 공백만 남는 값도 `@NotBlank` 에 걸리므로 다듬은 뒤 본다. */
export const isValidNickname = (value: string): boolean => {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= NICKNAME_MAX_LENGTH
}
