package com.followfollowme.bosspickseoul.global.properties;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 분석 기준 분기 카탈로그 갱신 설정(이슈 #464).
 *
 * <p>카탈로그는 인스턴스 메모리에 두고 요청은 캐시만 읽는다. 갱신 스케줄러는 {@code refreshTick} 마다 깨어나, 카탈로그가 없거나
 * {@code cacheTtl} 보다 오래됐을 때만 DB 를 다시 읽는다. 그래서 정상 상태의 실제 질의 주기는 {@code cacheTtl} 이고, 첫 갱신이
 * 실패했거나 DB 장애 중이면 {@code refreshTick} 마다 다시 시도해 회복이 TTL 만큼 늦지 않는다.
 *
 * @param cacheTtl    카탈로그를 다시 계산하는 주기(정상 상태). 비거나 0 이하이면 5분
 * @param refreshTick 스케줄러가 깨어나는 간격(실패 시 재시도 간격). 비거나 0 이하이면 30초
 */
@ConfigurationProperties(prefix = "app.analysis-period")
public record AnalysisPeriodProperties(Duration cacheTtl, Duration refreshTick) {

    private static final Duration DEFAULT_CACHE_TTL = Duration.ofMinutes(5);
    private static final Duration DEFAULT_REFRESH_TICK = Duration.ofSeconds(30);

    public AnalysisPeriodProperties {
        if (cacheTtl == null || cacheTtl.isZero() || cacheTtl.isNegative()) {
            cacheTtl = DEFAULT_CACHE_TTL;
        }
        if (refreshTick == null || refreshTick.isZero() || refreshTick.isNegative()) {
            refreshTick = DEFAULT_REFRESH_TICK;
        }
    }
}
