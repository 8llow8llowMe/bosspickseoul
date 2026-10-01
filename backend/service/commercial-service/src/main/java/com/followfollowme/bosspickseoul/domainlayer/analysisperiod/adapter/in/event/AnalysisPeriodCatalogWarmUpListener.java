package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.event;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * 기동 직후 분석 기준 분기 카탈로그를 한 번 계산해 둔다.
 *
 * <p>첫 요청이 카탈로그를 계산하면 그 요청은 15개 팩트 테이블 질의를 기다리고, 같은 순간 들어온 요청은 잠금에서 줄을 선다.
 * 조회 트랜잭션 안에서 줄을 서면 커넥션을 쥔 채 기다리므로 미리 채워 두는 편이 안전하다. 실패해도 기동은 막지 않는다 —
 * 다음 요청이 다시 계산하고, 그때도 실패하면 분기를 생략한 요청만 503 이다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnalysisPeriodCatalogWarmUpListener {

    private final AnalysisPeriodCatalogProcessor analysisPeriodCatalogProcessor;

    @EventListener(ApplicationReadyEvent.class)
    public void warmUp() {
        try {
            analysisPeriodCatalogProcessor.catalog();
        } catch (RuntimeException exception) {
            log.warn("[analysis-period] warm-up failed, next request retries error={}", exception.getClass().getSimpleName());
        }
    }
}
