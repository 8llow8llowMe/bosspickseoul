package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.out.member;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.SignupConsentRecordPort;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor.MemberConsentProcessor;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * auth -> member 동의 이력 교차 의존을 이 어댑터 한 지점으로 한정한다 (member -> auth 의 {@code MemberSessionRevokeAdapter}
 * 와 같은 모양). 소셜 첫 가입도 일반 가입과 같은 {@link MemberConsentProcessor} 를 타야, 동의 항목이 늘어날 때 한쪽 경로만
 * 옛 규칙으로 남지 않는다.
 *
 * <p><b>트랜잭션을 열지 않는다.</b> 호출자({@code OAuthLoginProcessor.login})의 트랜잭션에 합류해야 회원 행과 동의 행이 함께
 * 커밋되거나 함께 사라진다. {@code SignupConsentTransactionBoundaryTest} 가 이 배치를 고정한다.
 */
@Component
@RequiredArgsConstructor
public class SignupConsentRecordAdapter implements SignupConsentRecordPort {

    private final MemberConsentProcessor memberConsentProcessor;

    @Override
    public void recordSignupConsents(long memberId, String termsVersion, String privacyVersion, LocalDateTime agreedAt) {
        memberConsentProcessor.recordSignupConsents(memberId, termsVersion, privacyVersion, agreedAt);
    }
}
