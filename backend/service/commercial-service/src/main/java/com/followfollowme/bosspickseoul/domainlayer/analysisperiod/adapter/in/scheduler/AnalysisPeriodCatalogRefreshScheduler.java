package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import java.time.OffsetDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 분석 기준 분기 카탈로그 갱신 트리거(이슈 #464). 스케줄러는 in-adapter 다 — 시간이 트리거일 뿐 Processor 를 부르는 역할은
 * Controller 와 같다({@code ShareLinkCleanupScheduler} 와 같은 방식).
 *
 * <p>재계산을 요청 경로에서 뺀 이유는 {@link AnalysisPeriodCatalogProcessor} Javadoc 참고. {@code initialDelay = 0} 이라 기동 직후 한 번
 * 바로 돌고, 이후 직전 실행이 끝난 뒤 {@code app.analysis-period.cache-ttl} 마다 돈다({@code fixedDelay} — 느린 갱신이 겹쳐 쌓이지 않는다).
 * 그래서 기동 직후 첫 갱신이 끝나기 전 짧은 창에는 분기를 생략한 요청이 503 이다. 기동 시 따로 채우던 warm-up 리스너는 이 첫 실행과
 * 겹쳐 없앴다.
 *
 * <p>스케줄러 풀은 공유 링크 정리 cron 과 함께 쓴다. 정리가 길어져도 갱신이 밀리지 않게 {@code spring.task.scheduling.pool.size} 를 2 로
 * 둔다(application.yml). 밀리더라도 마지막 성공값을 계속 내므로 지연만 늘어난다.
 *
 * <p>실패해도 예외를 밖으로 던지지 않는다. Processor 는 실패 시 캐시를 바꾸지 않으므로 마지막 성공값이 유지되고, 다음 주기에 다시 시도한다.
 * 예외 메시지에는 접속 정보가 섞일 수 있어 유형만 남긴다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnalysisPeriodCatalogRefreshScheduler {

    private final AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    @Scheduled(fixedDelayString = "${app.analysis-period.cache-ttl:5m}", initialDelay = 0)
    public void refreshCatalog() {
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
