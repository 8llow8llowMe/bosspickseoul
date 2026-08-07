package com.followfollowme.nowdoboss.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 인기 순위 파이프라인 설정.
 *
 * <p>enabled=false(기본)면 Kafka producer/consumer 빈이 아예 등록되지 않아
 * 브로커 없이도 서비스가 정상 기동한다. 인기 순위 조회 API 는 Redis 만 사용하므로 항상 활성이다.
 *
 * @param topicPartitions 토픽 자동 선언 시 파티션 수
 * @param topicReplicas   토픽 자동 선언 시 복제 계수. 브로커 수보다 크면 생성이 실패하므로
 *                        단일 브로커 환경에서는 1 로 낮춘다.
 */
@ConfigurationProperties(prefix = "app.ranking")
public record RankingProperties(
    boolean enabled,
    String eventsTopic,
    int windowHours,
    int maxSize,
    int topicPartitions,
    int topicReplicas
) {

}
