package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 분기 적재 자동 최신화(이슈 #445). 상시 batch-service 가 매일 원천을 탐지해 "마지막 게시 분기 다음" 분기를 적재한다.
 *
 * @param publish           false 면 탐지·수집·dry-run 까지만 한다. 롤아웃은 false 로 시작하고 Vault 에서 true 로 올린다
 * @param maxApiCallsPerRun 서울 Open API 는 키당 하루 1,000회다. 수동 CLI 와 같은 키를 쓰므로 여유를 남긴다
 * @param maxQuartersPerRun 데이터셋 1종이 한 run 에서 다룰 최대 분기 수. 재이관과 새 분기 적재를 합쳐 센다. 상시 컨테이너 메모리(512m)를
 *                          지키려고 기본 1
 * @param tolerance         직전 분기 게시 행 수 대비 허용 변동 비율. 넘으면 원천 이상으로 보고 게시하지 않는다
 * @param failureCooldownDays 실패한 데이터셋을 다시 시도하기까지 기다리는 날 수. 재이관도 이 쿨다운을 따른다
 * @param automationFrom    자동 최신화가 손대는 첫 분기(재이관과 새 분기 게시 모두). 20211~20233 은 {@code legacy-20233} 레거시 행이
 *                          이관 없이 이미 있어 자동으로 게시·이관하면 그 행을 덮는다. 그 앞은 수동 백필이다. 기본 {@code 20234}
 */
@ConfigurationProperties(prefix = "batch.dataset-refresh")
public record DatasetRefreshProperties(
    boolean enabled,
    String cron,
    boolean publish,
    String spatialVersion,
    String schemaVersion,
    int maxApiCallsPerRun,
    int maxQuartersPerRun,
    double tolerance,
    int failureCooldownDays,
    String automationFrom
) {

    public static final String DEFAULT_CRON = "0 0 5 * * ?";
    public static final String DEFAULT_AUTOMATION_FROM = "20234";

    // 생성자가 둘이면 Spring 이 바인딩 대상을 고르지 못한다(PolicyIngestionProperties 와 같은 이유). 정규 생성자 하나만 둔다.
    public DatasetRefreshProperties {
        if (cron == null || cron.isBlank()) {
            cron = DEFAULT_CRON;
        }
        if (spatialVersion == null || spatialVersion.isBlank()) {
            spatialVersion = "legacy-20233";
        }
        if (schemaVersion == null || schemaVersion.isBlank()) {
            schemaVersion = "seoul-v1";
        }
        if (maxApiCallsPerRun == 0) {
            maxApiCallsPerRun = 600;
        }
        if (maxQuartersPerRun == 0) {
            maxQuartersPerRun = 1;
        }
        if (tolerance == 0) {
            tolerance = 0.2;
        }
        if (automationFrom == null || automationFrom.isBlank()) {
            automationFrom = DEFAULT_AUTOMATION_FROM;
        }
        if (!automationFrom.matches("20[0-9]{2}[1-4]")) {
            throw new IllegalArgumentException("batch.dataset-refresh.automation-from must be a quarter code such as 20234");
        }
        if (maxApiCallsPerRun < 1 || maxApiCallsPerRun > 1000) {
            throw new IllegalArgumentException("batch.dataset-refresh.max-api-calls-per-run must be 1..1000");
        }
        if (maxQuartersPerRun < 1 || maxQuartersPerRun > 8) {
            throw new IllegalArgumentException("batch.dataset-refresh.max-quarters-per-run must be 1..8");
        }
        if (tolerance < 0 || tolerance > 1) {
            throw new IllegalArgumentException("batch.dataset-refresh.tolerance must be in (0, 1]");
        }
        if (failureCooldownDays < 0) {
            throw new IllegalArgumentException("batch.dataset-refresh.failure-cooldown-days must be >= 0");
        }
    }
}
