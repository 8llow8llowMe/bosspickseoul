/**
 * 인증코드 재전송 쿨다운(초). **백엔드와 같은 값이어야 한다.**
 *
 * 회원가입은 `EmailVerificationProcessor.RESEND_COOLDOWN`, 비밀번호 재설정은
 * `PasswordResetProcessor.RESEND_COOLDOWN` — 둘 다 `Duration.ofSeconds(60)` 이다.
 *
 * 한 곳에 두는 이유는 A2 의 비밀번호 규칙과 같다. 전에 회원가입 쪽이 180 을 들고 있어
 * **백엔드는 60초면 받아 주는데 화면이 3배를 잠근** 적이 있고, 그 상태에서 코드가
 * 무효화되면 "다시 요청해 주세요" 를 읽은 채 버튼이 150초 더 잠긴 막다른 골목이 됐다.
 * 두 화면이 같은 실수를 따로 하지 않도록 값을 나누지 않는다.
 */
export const RESEND_COOLDOWN_SECONDS = 60

/**
 * 발급된 코드의 유효 시간(분). `PasswordResetProcessor.CODE_TTL` = 5분.
 * 화면이 "5분 안에 입력해 주세요" 라고 적을 때 쓴다.
 */
export const RESET_CODE_TTL_MINUTES = 5
