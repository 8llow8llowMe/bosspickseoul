package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.global.properties.AnalysisPeriodProperties;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 분석 기준 분기 카탈로그 갱신 트리거(이슈 #464). 스케줄러는 in-adapter 다 — 시간이 트리거일 뿐 Processor 를 부르는 역할은
 * Controller 와 같다({@code ShareLinkCleanupScheduler} 와 같은 방식).
 *
 * <p>재계산을 요청 경로에서 뺀 이유는 {@link AnalysisPeriodCatalogProcessor} Javadoc 참고. {@code initialDelay = 0} 이라 기동 직후 바로 돌고,
 * 이후 직전 실행이 끝난 뒤 {@code app.analysis-period.refresh-tick}(기본 30초)마다 깨어난다({@code fixedDelay} — 느린 갱신이 겹쳐 쌓이지
 * 않는다). 깨어나도 카탈로그가 없거나 {@code cache-ttl}(기본 5분)보다 오래됐을 때만 DB 를 읽으므로 정상 상태의 질의 주기는 TTL 이다.
 * 첫 갱신이 실패하면 다음 tick 에 다시 시도해, 기동 직후 503 창이 TTL 만큼 길어지지 않는다. DB 장애 중에도 tick 마다 다시 시도한다
 * (한 번에 하나, 질의 상한 10초).
 *
 * <p>스케줄러 풀은 공유 링크 정리 cron 과 함께 쓴다. 정리가 길어져도 갱신이 밀리지 않게 {@code spring.task.scheduling.pool.size} 를 2 로
 * 둔다(application.yml). 밀리더라도 마지막 성공값을 계속 내므로 지연만 늘어난다.
 *
 * <p>실패해도 예외를 밖으로 던지지 않는다. Processor 는 실패 시 캐시를 바꾸지 않으므로 마지막 성공값이 유지된다.
 * 예외 메시지에는 접속 정보가 섞일 수 있어 유형만 남긴다.
 */
@Slf4j
@Component
public class AnalysisPeriodCatalogRefreshScheduler {

    private final AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;
    private final Duration cacheTtl;

    public AnalysisPeriodCatalogRefreshScheduler(
        AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor, AnalysisPeriodProperties analysisPeriodProperties
    ) {
        this.analysisPeriodCatalogProcessor = analysisPeriodCatalogProcessor;
        this.cacheTtl = analysisPeriodProperties.cacheTtl();
    }

    @Scheduled(fixedDelayString = "${app.analysis-period.refresh-tick:30s}", initialDelay = 0)
    public void refreshCatalog() {
        if (!analysisPeriodCatalogProcessor.refreshDue(cacheTtl)) {
            return;
        }
        try {
            analysisPeriodCatalogProcessor.refresh();
        } catch (RuntimeException exception) {
            String error = NestedExceptionUtils.getMostSpecificCause(exception).getClass().getSimpleName();
            Optional<OffsetDateTime> servingSince = analysisPeriodCatalogProcessor.lastResolvedAt();
            if (servingSince.isPresent()) {
                log.warn("[analysis-period] catalog refresh failed, serving stale resolvedAt={} error={}", servingSince.get(), error);
            } else {
                log.warn("[analysis-period] catalog refresh failed, no catalog to serve error={}", error);
            }
        }
    }
}
