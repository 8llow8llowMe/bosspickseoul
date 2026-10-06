package com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out;

import java.time.LocalDateTime;

/**
 * 소셜 첫 가입으로 만든 회원의 가입 동의 이력을 남기는 계약 (auth -> member).
 *
 * <p>이력 생성 규칙(필수 항목, AGE_OVER_14 에 넣을 판, 항목 간 같은 시각)은 member 컨텍스트의 {@code MemberConsentProcessor}
 * 한 곳에 있다. auth 는 그 규칙을 복제하지 않고, <b>동의한 순간</b>({@code /authorize})의 판·시각만 넘긴다. 호출자
 * 트랜잭션({@code OAuthLoginProcessor.login})에 합류해 회원 행과 함께 커밋된다.
 */
public interface SignupConsentRecordPort {

    void recordSignupConsents(long memberId, String termsVersion, String privacyVersion, LocalDateTime agreedAt);
}
