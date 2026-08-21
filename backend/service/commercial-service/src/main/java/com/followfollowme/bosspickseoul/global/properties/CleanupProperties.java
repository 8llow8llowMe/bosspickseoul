package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 정리 배치 설정.
 *
 * <p>enabled=false 면 스케줄러 빈이 등록되지 않는다. 현재 서비스는 환경별 단일 인스턴스로 운영하므로
 * 스케줄러 중복 실행이 없지만, 인스턴스를 늘리면 한 대만 true 로 두거나 분산 락을 도입해야 한다.
 *
 * @param retentionDays 만료 후 이 기간이 지난 행을 삭제한다. 즉시 지우지 않는 이유는
 *                      만료 직후의 접근 시도를 "만료됨"으로 안내(410)할 수 있어야 하기 때문이다.
 * @param batchSize     한 주기에 삭제할 최대 행 수. 대량 삭제로 락이 길어지는 것을 막는다.
 */
@ConfigurationProperties(prefix = "app.cleanup.share-link")
public record CleanupProperties(
    boolean enabled,
    int retentionDays,
    int batchSize
) {

}
