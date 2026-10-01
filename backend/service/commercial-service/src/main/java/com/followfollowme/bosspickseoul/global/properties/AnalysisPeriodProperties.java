package com.followfollowme.bosspickseoul.global.properties;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 분석 기준 분기 카탈로그 설정(이슈 #464).
 *
 * <p>카탈로그는 인스턴스 메모리에 둔다. 분기 적재는 하루 한 번이라 TTL 동안 새 분기가 늦게 보이는 것은 문제가 아니고,
 * Redis 를 쓰면 카탈로그 조회가 Redis 장애에 묶인다. TTL 이 지나면 요청 하나가 다시 계산하고 나머지는 직전 값을 받는다.
 *
 * @param cacheTtl 카탈로그 재계산 주기. 비거나 0 이하이면 5분
 */
@ConfigurationProperties(prefix = "app.analysis-period")
public record AnalysisPeriodProperties(Duration cacheTtl) {

    private static final Duration DEFAULT_CACHE_TTL = Duration.ofMinutes(5);

    public AnalysisPeriodProperties {
        if (cacheTtl == null || cacheTtl.isZero() || cacheTtl.isNegative()) {
            cacheTtl = DEFAULT_CACHE_TTL;
        }
    }
}
