package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out.PolicyCommandPort;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums.PolicySource;
import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PolicyPurgeProcessor {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final PolicyCommandPort policyCommandPort;
    private final PolicyIngestionProperties properties;
    private final Clock clock;

    public int purgeExpired() {
        LocalDateTime cutoff = LocalDateTime.ofInstant(clock.instant(), SEOUL)
            .minusDays(properties.purgeGraceDays());
        int deleted = policyCommandPort.deleteUnseenBefore(PolicySource.BIZINFO, cutoff);
        log.info("기업마당 정책 만료 삭제 deleted={} cutoff={} graceDays={}", deleted, cutoff, properties.purgeGraceDays());
        return deleted;
    }
}
