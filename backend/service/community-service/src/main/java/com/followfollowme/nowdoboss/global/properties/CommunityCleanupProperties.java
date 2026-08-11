package com.followfollowme.nowdoboss.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 커뮤니티 정리 배치 설정.
 *
 * <p>enabled=false(기본)면 스케줄러 빈이 등록되지 않는다. 현재 환경별 단일 인스턴스 운영이라
 * 중복 실행이 없지만, 인스턴스를 늘리면 한 대만 true 로 두거나 분산 락을 도입해야 한다.
 *
 * @param retentionDays      소프트 삭제 후 이 기간이 지난 행을 하드 삭제한다 (복구 유예 기간)
 * @param batchSize          한 주기에 처리할 최대 행 수
 * @param orphanMinAgeHours  이 시간보다 오래된 미참조 객체만 고아로 판정한다.
 *                           업로드 직후 아직 게시글에 연결되지 않은 객체를 지우지 않기 위한 안전 여유다.
 */
@ConfigurationProperties(prefix = "app.cleanup.community")
public record CommunityCleanupProperties(
    boolean enabled,
    int retentionDays,
    int batchSize,
    int orphanMinAgeHours
) {

}
