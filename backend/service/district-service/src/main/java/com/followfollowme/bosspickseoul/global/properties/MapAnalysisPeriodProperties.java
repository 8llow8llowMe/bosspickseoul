package com.followfollowme.bosspickseoul.global.properties;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 분기를 생략한 지도 요청이 쓸 기본 분기 메모 설정(이슈 #464).
 *
 * <p>기본 분기는 commercial-service 가 적재된 데이터로 정한다. 지도 요청마다 물으면 공개 지도 API 가 그 호출에 묶이므로
 * 인스턴스 메모리에 TTL 동안 둔다. 분기 적재는 하루 한 번이라 TTL 만큼 늦게 보여도 된다.
 *
 * @param cacheTtl 메모 유지 시간. 비거나 0 이하이면 5분
 */
@ConfigurationProperties(prefix = "app.map.analysis-period")
public record MapAnalysisPeriodProperties(Duration cacheTtl) {

    private static final Duration DEFAULT_CACHE_TTL = Duration.ofMinutes(5);

    public MapAnalysisPeriodProperties {
        if (cacheTtl == null || cacheTtl.isZero() || cacheTtl.isNegative()) {
            cacheTtl = DEFAULT_CACHE_TTL;
        }
    }
}
