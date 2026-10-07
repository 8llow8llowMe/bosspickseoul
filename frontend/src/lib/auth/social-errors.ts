/**
 * 소셜 로그인 콜백이 `/login?error=<kind>` 로 돌려보낼 때 쓰는 kind.
 * 신규 가입 동의 부족(`AUTH_021`/`AUTH_022`)은 로그인 화면이 아니라 `/register/social` 로 간다(#495).
 *
 * 콜백(서버)이 kind 를 정하고 로그인 화면(클라이언트)이 문구를 고른다. 둘이 같은
 * 이름을 쓰도록 타입을 여기 하나에 둔다 — 이 파일은 클라이언트 번들에도 실리므로
 * 서버 전용 모듈을 import 하지 않는다.
 */
export type SocialLoginErrorKind = 'social' | 'social_state' | 'social_signup'

/** 로그인 화면으로 돌려보내는 경로. 콜백(서버)과 화면이 같은 규칙을 쓴다. */
export const socialLoginErrorPath = (kind: SocialLoginErrorKind): string =>
  `/login?error=${kind}`

const MESSAGES: Record<SocialLoginErrorKind, string> = {
  social: '소셜 로그인에 실패했습니다. 다시 시도해 주세요.',
  // 탭 두 개로 카카오를 열면 나중 탭이 쿠키를 덮어 먼저 연 탭이 여기로 온다.
  social_state:
    '로그인 요청이 만료됐거나 다른 브라우저에서 시작됐어요. 이 화면에서 다시 시도해 주세요.',
  // #495 뒤에는 콜백이 보내지 않지만, 오래된 탭·북마크를 위해 남긴다.
  social_signup:
    '카카오 계정으로 처음 오셨어요. 회원가입에서 약관에 동의한 뒤 카카오로 가입해 주세요.',
}

/** `?error=` 값에 맞는 로그인 화면 문구. 모르는 값이면 아무것도 보이지 않는다. */
export const socialLoginErrorMessage = (kind: string | null): string | null =>
  kind !== null && Object.hasOwn(MESSAGES, kind)
    ? MESSAGES[kind as SocialLoginErrorKind]
    : null
