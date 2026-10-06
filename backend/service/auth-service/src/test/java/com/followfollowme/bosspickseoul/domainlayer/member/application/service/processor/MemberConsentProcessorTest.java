package com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberConsentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberConsentType;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import com.followfollowme.bosspickseoul.global.properties.LegalProperties;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 가입 동의 이력의 모양(항목·판·시각)을 고정한다. 세 가입 경로가 모두 이 프로세서를 거치므로, 이력의 내용은
 * 여기서만 검증하고 경로별 테스트는 "이 프로세서를 불렀는가"만 본다.
 */
class MemberConsentProcessorTest {

    private static final String TERMS_VERSION = "1.0";
    private static final String PRIVACY_VERSION = "1.1";

    private RecordingConsentRepositoryPort consentRepositoryPort;
    private MemberConsentProcessor processor;

    @BeforeEach
    void setUp() {
        consentRepositoryPort = new RecordingConsentRepositoryPort();
        processor = new MemberConsentProcessor(
            consentRepositoryPort, new SnowflakeIdGenerator(0, 0), new LegalProperties(TERMS_VERSION, PRIVACY_VERSION, null));
    }

    @Test
    @DisplayName("가입 1건은 이용약관·처리방침·만 14세 확인 3건을 설정된 판으로 남긴다")
    void recordsThreeConsentsWithConfiguredVersions() {
        List<MemberConsent> recorded = processor.recordSignupConsents(42L);

        assertThat(consentRepositoryPort.saved).hasSize(3);
        assertThat(recorded)
            .extracting(MemberConsent::memberId, MemberConsent::consentType, MemberConsent::documentVersion)
            .containsExactly(
                tuple(42L, MemberConsentType.TERMS, TERMS_VERSION),
                tuple(42L, MemberConsentType.PRIVACY, PRIVACY_VERSION),
                // 만 14세 기준을 규정한 문서는 이용약관이라, 확인 항목에는 처리방침이 아니라 약관 판을 박는다.
                tuple(42L, MemberConsentType.AGE_OVER_14, TERMS_VERSION));
    }

    @Test
    @DisplayName("한 가입의 항목들은 같은 동의 시각을 갖는다")
    void recordsAllConsentsAtTheSameInstant() {
        List<MemberConsent> recorded = processor.recordSignupConsents(42L);

        // 항목별로 now() 를 따로 찍으면 "한 화면에서 함께 동의했다"는 사실이 이력에서 사라진다.
        assertThat(recorded).extracting(MemberConsent::agreedAt).doesNotContainNull().containsOnly(recorded.getFirst().agreedAt());
    }

    @Test
    @DisplayName("이력 행마다 아이디가 따로 붙는다")
    void assignsDistinctIdsPerRow() {
        List<MemberConsent> recorded = processor.recordSignupConsents(42L);

        assertThat(recorded).extracting(MemberConsent::id).doesNotHaveDuplicates().allMatch(id -> id > 0);
    }

    @Test
    @DisplayName("저장은 행마다 부르지 않고 한 번에 넘긴다")
    void savesInOneBulkCall() {
        processor.recordSignupConsents(42L);

        assertThat(consentRepositoryPort.saveAllCalls).isEqualTo(1);
    }

    @Test
    @DisplayName("동의한 순간의 판·시각을 받으면 지금 설정이 아니라 그 값으로 남기고, 생성 규칙은 같다")
    void recordsGivenVersionsAndTimeWithTheSameRule() {
        LocalDateTime agreedAt = LocalDateTime.of(2026, 10, 6, 9, 30);

        // 지금 설정은 1.0 / 1.1 이지만, 동의한 순간(/authorize)의 판은 0.9 / 1.0 이었다.
        List<MemberConsent> recorded = processor.recordSignupConsents(42L, "0.9", "1.0", agreedAt);

        assertThat(recorded)
            .extracting(MemberConsent::consentType, MemberConsent::documentVersion, MemberConsent::agreedAt)
            .containsExactly(
                tuple(MemberConsentType.TERMS, "0.9", agreedAt),
                tuple(MemberConsentType.PRIVACY, "1.0", agreedAt),
                tuple(MemberConsentType.AGE_OVER_14, "0.9", agreedAt));
    }

    private static class RecordingConsentRepositoryPort implements MemberConsentRepositoryPort {

        private final List<MemberConsent> saved = new ArrayList<>();
        private int saveAllCalls;

        @Override
        public List<MemberConsent> saveAll(List<MemberConsent> consents) {
            saveAllCalls++;
            saved.addAll(consents);
            return consents;
        }
    }
}
