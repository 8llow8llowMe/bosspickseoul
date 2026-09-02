/**
 * 비밀번호 규칙 **정본**. 회원가입과 프로필(변경·최초 설정)이 여기서만 가져간다.
 *
 * 원래 `components/auth/register-machine.ts` 에 있었는데, 프로필 화면이 회원가입
 * 컴포넌트를 import 하는 모양이 이상해서 옮겼다. `register-machine` 은 이제 여기서
 * 다시 내보내기만 한다 — **규칙을 두 벌 만들면 한쪽이 거부하는 값을 다른 쪽이
 * 통과시키고, 그 어긋남은 백엔드 400 으로만 드러난다.**
 *
 * 백엔드 제약과 정확히 동일하다(`register.md` D4-3, OpenAPI
 * `MemberPasswordChangeRequest.newPassword`). 백엔드는 pattern 에 `\S+` 를 쓰고
 * 길이를 `minLength`/`maxLength` 로 따로 거는데, 여기서는 한 정규식에 `\S{8,20}` 으로
 * 합쳐 놓았다 — 결과는 같다.
 */
export const PASSWORD_PATTERN = new RegExp(
  String.raw`^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|])\S{8,20}$`,
)

/** 규칙을 사용자에게 설명하는 문구. 화면마다 다르게 적으면 안 되므로 여기 둔다. */
export const PASSWORD_RULE_TEXT =
  '영문자·숫자·특수문자를 모두 포함해 8~20자로 입력해 주세요.'

export const isValidPassword = (value: string): boolean =>
  PASSWORD_PATTERN.test(value)
