package com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberConsentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberConsentType;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import com.followfollowme.bosspickseoul.global.properties.LegalProperties;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 가입 동의 이력을 남기는 단일 지점.
 *
 * <p>가입 경로가 셋(일반 · 개발용 즉시 · 소셜 첫 가입)인데 <b>이력 규칙은 하나여야 한다</b> — 어느 항목을 남기는지,
 * 어느 판을 박제하는지, 항목 간 시각을 어떻게 맞추는지. 경로마다 복제하면 선택 동의 하나가 추가되는 날 일반 가입에는
 * 4행, 소셜에는 3행이 남는 상태가 조용히 생긴다. 그 어긋남은 가입 때는 증상이 없고 한참 뒤 이력을 읽을 때 드러나며,
 * 감사 이력이라 어긋난 시점을 나중에 복구할 수 없다.
 *
 * <p><b>트랜잭션을 스스로 열지 않고 호출자 트랜잭션에 합류한다.</b> 회원 행과 동의 행은 반드시 함께 커밋돼야
 * 하는데(하나만 남으면 "동의 없는 회원" 또는 "회원 없는 동의"가 된다) 그 경계는 호출자마다 다르다 —
 * {@code MemberWebFacade.generalSignup}, {@code MemberDevSignupFacade.devSignup}, {@code OAuthLoginProcessor.login}.
 * 같은 이유로 이 책임을 Facade 로 올리지 않는다. {@code AuthWebFacade.oauthLogin} 은 provider HTTP 왕복 때문에
 * 의도적으로 트랜잭션이 없어서, 거기서 부르면 회원은 커밋됐는데 동의 이력은 사라지는 경우가 생긴다.
 */
@Service
@RequiredArgsConstructor
public class MemberConsentProcessor {

    private final MemberConsentRepositoryPort memberConsentRepositoryPort;
    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final LegalProperties legalProperties;

    /**
     * 가입 때 받는 필수 동의·확인 전부를 <b>같은 시각</b>으로 한 번에 남긴다. 항목별로 시각이 갈리면 "한 화면에서
     * 함께 동의했다"는 사실이 이력에서 사라진다.
     *
     * <p>동의 여부는 여기서 묻지 않는다 — 이 메서드에 닿았다는 것은 호출자가 이미 필수 동의를 확인했다는 뜻이다.
     * 확인 책임을 가입 경로에 두는 이유는 경로마다 거부 코드가 다르기 때문이다(일반·개발용 가입은 {@code MEMBER_010}
     * /{@code MEMBER_011}, 소셜 첫 가입은 {@code AUTH_021}/{@code AUTH_022}).
     *
     * <p>만 14세 이상 확인도 이력으로 남긴다. 게이트만 걸고 기록하지 않으면 "물어봤고 확인받았다"를 나중에 입증할
     * 수 없다. 이 항목의 판이 이용약관 판인 이유는 {@link MemberConsentType#AGE_OVER_14} 에 적어 뒀다.
     *
     * @return 저장된 이력 3건 (TERMS, PRIVACY, AGE_OVER_14 순)
     */
    public List<MemberConsent> recordSignupConsents(long memberId) {
        LocalDateTime agreedAt = LocalDateTime.now();
        return memberConsentRepositoryPort.saveAll(List.of(
            consent(memberId, MemberConsentType.TERMS, legalProperties.termsVersion(), agreedAt),
            consent(memberId, MemberConsentType.PRIVACY, legalProperties.privacyVersion(), agreedAt),
            consent(memberId, MemberConsentType.AGE_OVER_14, legalProperties.termsVersion(), agreedAt)));
    }

    private MemberConsent consent(long memberId, MemberConsentType consentType, String documentVersion, LocalDateTime agreedAt) {
        return MemberConsent.builder()
            .id(snowflakeIdGenerator.generateId())
            .memberId(memberId)
            .consentType(consentType)
            .documentVersion(documentVersion)
            .agreedAt(agreedAt)
            .build();
    }
}
