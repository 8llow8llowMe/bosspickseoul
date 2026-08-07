package com.followfollowme.nowdoboss.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 인기 순위 파이프라인 설정.
 *
 * <p>enabled=false(기본)면 Kafka producer/consumer 빈이 아예 등록되지 않아
 * 브로커 없이도 서비스가 정상 기동한다. 인기 순위 조회 API 는 Redis 만 사용하므로 항상 활성이다.
 */
@ConfigurationProperties(prefix = "app.ranking")
public record RankingProperties(
    boolean enabled,
    String eventsTopic,
    int windowHours,
    int maxSize
) {

}
