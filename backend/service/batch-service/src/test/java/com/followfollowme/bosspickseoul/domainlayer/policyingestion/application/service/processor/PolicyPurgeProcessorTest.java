package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out.PolicyCommandPort;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums.PolicySource;
import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PolicyPurgeProcessorTest {

    @Mock
    private PolicyCommandPort commandPort;

    @Test
    void deletesBizinfoRowsUnseenPastTheGracePeriod() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-09T15:00:00Z"), ZoneId.of("Asia/Seoul"));
        PolicyPurgeProcessor processor = new PolicyPurgeProcessor(commandPort, properties(30), clock);
        when(commandPort.deleteUnseenBefore(
            PolicySource.BIZINFO,
            LocalDateTime.of(2026, 8, 11, 0, 0)
        )).thenReturn(4);

        assertThat(processor.purgeExpired()).isEqualTo(4);
        verify(commandPort).deleteUnseenBefore(PolicySource.BIZINFO, LocalDateTime.of(2026, 8, 11, 0, 0));
    }

    private static PolicyIngestionProperties properties(int graceDays) {
        return new PolicyIngestionProperties(
            false, "0 0 6 * * ?", "0 30 6 * * ?", 0.5, graceDays,
            new PolicyIngestionProperties.Bizinfo(
                "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do",
                "key",
                "소상공인",
                100,
                20,
                30,
                3
            )
        );
    }
}
