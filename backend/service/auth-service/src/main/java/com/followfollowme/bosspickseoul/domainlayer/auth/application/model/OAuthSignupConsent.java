package com.followfollowme.bosspickseoul.domainlayer.auth.application.model;

/**
 * 소셜 첫 가입(= 신규 회원 생성)에 쓰는 동의·확인 플래그.
 *
 * <p>이 값은 {@code /authorize} 에서 받아 그 순간의 문서 판·시각과 함께({@link OAuthConsentSnapshot}) CSRF state 에 보관했다가
 * 콜백에서 꺼내 쓴다. 콜백에서 다시 받지 않는 이유는
 * <b>OAuth 인가코드가 1회용</b>이기 때문이다 — 콜백에서 동의 누락으로 거부하면 같은 코드로 재시도할 수 없고, 사용자는
 * provider 인가부터 다시 밟아야 한다. 인가 전에 받아 두면 대부분은 우리 화면에서 끝난다.
 *
 * <p>{@code info} 가 아니라 {@code model} 에 두는 이유 — 이 저장소에서 {@code info} 는 "Presenter 가 응답으로 바꿀 값" 이고
 * 포트 밖으로 내보내지 않는다. 이 타입은 응답으로 나가지 않고 Controller 입력부터 out-port 계약까지 통과하는
 * 애플리케이션 내부 값이다 (architecture-guide §4).
 *
 * <p>이미 가입한 회원의 로그인에는 쓰이지 않으므로 전부 {@code false}({@link #none()})여도 된다.
 */
public record OAuthSignupConsent(boolean termsAgreed, boolean privacyAgreed, boolean ageOver14Confirmed) {

    private static final OAuthSignupConsent NONE = new OAuthSignupConsent(false, false, false);

    /** 동의를 받지 않은 상태. 기존 회원 로그인에서만 통과한다. */
    public static OAuthSignupConsent none() {
        return NONE;
    }

    /** 문서 동의(이용약관·개인정보 처리방침)를 둘 다 받았는지. */
    public boolean documentsAgreed() {
        return termsAgreed && privacyAgreed;
    }
}
