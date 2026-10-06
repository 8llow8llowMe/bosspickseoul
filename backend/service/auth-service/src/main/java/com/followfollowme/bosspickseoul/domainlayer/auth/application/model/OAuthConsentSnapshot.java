package com.followfollowme.bosspickseoul.domainlayer.auth.application.model;

import java.time.LocalDateTime;
import org.springframework.util.StringUtils;

/**
 * {@code /authorize} 시점에 고정한 소셜 첫 가입 동의 — 무엇을(동의 플래그), 어느 판에(문서 판), 언제(동의 시각) 동의했는가.
 *
 * <p>동의를 받는 순간({@code /authorize})과 이력을 남기는 순간(콜백)은 최대 state TTL(10분)만큼 떨어져 있고, 그 사이에
 * 배포로 판 설정이 바뀔 수 있다. 콜백 시점의 판·시각으로 남기면 사용자가 보지 않은 판이 이력에 박히므로, 판과 시각을
 * 인가 요청 때 state 에 함께 싣고 콜백에서는 그 값을 그대로 쓴다.
 *
 * <p><b>판이나 시각이 하나라도 비면 동의 플래그를 버리고 "동의 없음" 으로 만든다.</b> 판을 모르는 동의는 이력으로 남길 수
 * 없기 때문이다. 판을 싣기 전 형식의 state 가 이 경우이고, 신규 회원이면 동의부터 다시 받는다(AUTH_021).
 */
public record OAuthConsentSnapshot(OAuthSignupConsent consent, String termsVersion, String privacyVersion, LocalDateTime agreedAt) {

    private static final OAuthConsentSnapshot NONE = new OAuthConsentSnapshot(OAuthSignupConsent.none(), null, null, null);

    public OAuthConsentSnapshot {
        if (consent == null || !StringUtils.hasText(termsVersion) || !StringUtils.hasText(privacyVersion) || agreedAt == null) {
            consent = OAuthSignupConsent.none();
        }
    }

    /** 동의를 받지 않은 상태. 기존 회원 로그인에서만 통과한다. */
    public static OAuthConsentSnapshot none() {
        return NONE;
    }

    /** 문서 동의(이용약관·개인정보 처리방침)를 둘 다, 판이 확인된 채로 받았는지. */
    public boolean documentsAgreed() {
        return consent.documentsAgreed();
    }

    public boolean ageOver14Confirmed() {
        return consent.ageOver14Confirmed();
    }
}
