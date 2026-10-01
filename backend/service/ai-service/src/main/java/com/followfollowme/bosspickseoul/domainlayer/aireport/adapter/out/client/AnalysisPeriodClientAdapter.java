package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.CommercialAnalysisClient;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.AnalysisPeriodsClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AnalysisPeriodQueryPort;
import com.followfollowme.bosspickseoul.global.properties.AiAnalysisPeriodProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * commercial-service 의 적재 기준 기본 분기를 받아 인스턴스 메모리에 둔다(이슈 #464).
 *
 * <p>호출은 다른 원천 조회와 같은 {@link InternalResponseSupport} 경로(서킷 {@code commercial-service}, Feign 예외 → AI 예외)를 탄다.
 * 갱신이 실패하면 마지막 성공값을 계속 쓰고 다음 시도를 TTL 뒤로 미룬다 — commercial-service 장애 중에 제출마다 원격 호출을
 * 쌓지 않기 위해서다. 한 번도 받지 못했으면 {@code DEFAULT_PERIOD_UNAVAILABLE}(503) 이다. 만료 직후 동시 제출이 몇 건 겹쳐 함께
 * 갱신할 수 있지만 결과가 같고 제출은 일별 상한으로 묶여 있어 잠금을 두지 않는다.
 */
@Slf4j
@Component
public class AnalysisPeriodClientAdapter implements AnalysisPeriodQueryPort {

    private final CommercialAnalysisClient commercialAnalysisClient;
    private final InternalResponseSupport responseSupport;
    private final Duration cacheTtl;
    private final Clock clock;
    private final AtomicReference<Memo> memo = new AtomicReference<>();

    public AnalysisPeriodClientAdapter(
        CommercialAnalysisClient commercialAnalysisClient, InternalResponseSupport responseSupport,
        AiAnalysisPeriodProperties aiAnalysisPeriodProperties, Clock clock
    ) {
        this.commercialAnalysisClient = commercialAnalysisClient;
        this.responseSupport = responseSupport;
        this.cacheTtl = aiAnalysisPeriodProperties.cacheTtl();
        this.clock = clock;
    }

    @Override
    public String defaultPeriodCode() {
        Memo current = memo.get();
        Instant now = clock.instant();
        if (current != null && now.isBefore(current.refreshAfter())) {
            return current.periodCode();
        }
        try {
            String periodCode = fetchDefaultPeriodCode();
            memo.set(new Memo(periodCode, now.plus(cacheTtl)));
            return periodCode;
        } catch (AiReportException exception) {
            if (current == null) {
                log.warn("[analysis-period] default period unavailable, no value to serve error={}", exception.getErrorCode().getCode());
                throw new AiReportException(AiReportErrorCode.DEFAULT_PERIOD_UNAVAILABLE, exception);
            }
            memo.set(new Memo(current.periodCode(), now.plus(cacheTtl)));
            log.warn("[analysis-period] default period refresh failed, serving stale periodCode={} error={}",
                current.periodCode(), exception.getErrorCode().getCode());
            return current.periodCode();
        }
    }

    private String fetchDefaultPeriodCode() {
        AnalysisPeriodsClientResponse response = responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE, commercialAnalysisClient::getAnalysisPeriods);
        String periodCode = response.defaultPeriodCode();
        if (periodCode == null || periodCode.isBlank()) {
            // commercial-service 가 핵심 데이터셋 공통 분기를 찾지 못한 상태다. 장애와 같게 다룬다.
            throw new AiReportException(AiReportErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        }
        return periodCode;
    }

    /** 받아 온 기본 분기와 다음 갱신 시각. */
    private record Memo(String periodCode, Instant refreshAfter) {
    }
}
