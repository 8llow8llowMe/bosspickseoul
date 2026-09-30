package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 분기 적재 스테이징 정리(주간, 기본 off). {@code dataset_staging} / {@code dataset_rejected_row} 만 지운다.
 * {@code dataset_release} · {@code dataset_fact} · {@code dataset_active_release} 는 건드리지 않는다.
 *
 * @param publishedRetentionDays   교체된(활성 포인터가 가리키지 않는) PUBLISHED run 의 스테이징을 게시 후 이만큼 지나 지운다
 * @param unpublishedRetentionDays DRY_RUN / FAILED run 의 스테이징·거부 행을 이만큼 지나 지운다. 거부 행은 실패 원인을 읽는 곳이라
 *                                 바로 지우지 않는다
 * @param chunkSize                DELETE 한 문장이 지우는 최대 행 수. 락을 짧게 유지한다
 */
@ConfigurationProperties(prefix = "batch.staging-purge")
public record DatasetStagingPurgeProperties(
    boolean enabled,
    String cron,
    int publishedRetentionDays,
    int unpublishedRetentionDays,
    int chunkSize
) {

    public static final String DEFAULT_CRON = "0 0 4 ? * SUN";

    public DatasetStagingPurgeProperties {
        if (cron == null || cron.isBlank()) {
            cron = DEFAULT_CRON;
        }
        if (publishedRetentionDays == 0) {
            publishedRetentionDays = 30;
        }
        if (unpublishedRetentionDays == 0) {
            unpublishedRetentionDays = 7;
        }
        if (chunkSize == 0) {
            chunkSize = 5000;
        }
        if (publishedRetentionDays < 1 || unpublishedRetentionDays < 1) {
            throw new IllegalArgumentException("batch.staging-purge retention days must be >= 1");
        }
        if (chunkSize < 100 || chunkSize > 50000) {
            throw new IllegalArgumentException("batch.staging-purge.chunk-size must be 100..50000");
        }
    }
}
