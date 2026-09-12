package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 원천 데이터 병렬 조회 전용 풀 설정.
 *
 * <p>리포트 워커 풀({@code aiReportTaskExecutor})과 반드시 분리해야 한다. 워커 스레드가 fan-out 한 조회를
 * 같은 풀에 넣으면 워커가 자기 자신이 점유한 풀의 빈자리를 기다리는 교착이 된다.
 */
@ConfigurationProperties(prefix = "ai.report.source-fetch")
public record AiSourceFetchProperties(
    int corePoolSize,
    int maxPoolSize,
    int queueCapacity,
    int awaitTerminationSeconds
) {

}
