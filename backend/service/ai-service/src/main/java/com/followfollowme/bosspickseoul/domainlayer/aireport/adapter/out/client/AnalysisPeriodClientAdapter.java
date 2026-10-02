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
 * <p>호출은 다른 원천 조회와 같은 {@link InternalResponseSupport} 경로(Feign 예외 → AI 예외)를 타되, 서킷은 원천 조회와 분리한
 * {@link InternalResponseSupport#COMMERCIAL_SERVICE_PERIODS} 다. commercial-service 는 기동 직후 카탈로그를 계산하기 전에 {@code /periods} 에
 * 503 을 주는데, 이를 원천 조회 서킷에 섞으면 분기를 명시한 리포트 생성까지 막힌다. 기본 분기 없음(200 + null)은 서킷 밖에서 판정한다.
 *
 * <p>갱신이 실패하면 마지막 성공값을 계속 쓰고 다음 시도를 TTL 뒤로 미룬다 — commercial-service 장애 중에 제출마다 원격 호출을
 * 쌓지 않기 위해서다. 한 번도 받지 못했으면 {@code DEFAULT_PERIOD_UNAVAILABLE}(503) 이다.
 *
 * <p>만료 직후 동시 제출 몇 건이 함께 원격 호출을 할 수 있다(잠금을 두지 않아 제출이 서로 기다리지 않는다). 대신 메모는 읽어 둔 값일 때만
 * {@code compareAndSet} 으로 바꾼다. 경합에 지면 먼저 쓴 쪽을 따르되, 실패로 만든 메모(stale 연장)는 동시 성공 결과가 덮어쓴다 —
 * 늦게 끝난 실패가 방금 받은 새 기본 분기를 지우지 않게 하기 위해서다.
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
            return publish(current, new Memo(periodCode, now.plus(cacheTtl), false)).periodCode();
        } catch (AiReportException exception) {
            if (current == null) {
                Memo concurrent = memo.get();
                if (concurrent != null) {
                    return concurrent.periodCode();
                }
                log.warn("[analysis-period] default period unavailable, no value to serve error={}", exception.getErrorCode().getCode());
                throw new AiReportException(AiReportErrorCode.DEFAULT_PERIOD_UNAVAILABLE, exception);
            }
            Memo failed = new Memo(current.periodCode(), now.plus(cacheTtl), true);
            Memo published = publish(current, failed);
            if (published == failed) {
                log.warn("[analysis-period] default period refresh failed, serving stale periodCode={} error={}",
                    current.periodCode(), exception.getErrorCode().getCode());
            }
            return published.periodCode();
        }
    }

    /**
     * 읽어 둔 메모({@code expected})일 때만 바꾼다. 경합에 지면 먼저 쓴 쪽을 돌려주되, 성공 결과는 실패로 만든 메모(stale 연장)를 덮어쓴다.
     * 실패 결과는 어떤 메모도 덮어쓰지 않는다.
     */
    private Memo publish(Memo expected, Memo next) {
        Memo witnessed = expected;
        while (!memo.compareAndSet(witnessed, next)) {
            witnessed = memo.get();
            if (next.fromFailure() || !witnessed.fromFailure()) {
                return witnessed;
            }
        }
        return next;
    }

    private String fetchDefaultPeriodCode() {
        AnalysisPeriodsClientResponse response = responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE_PERIODS, commercialAnalysisClient::getAnalysisPeriods);
        String periodCode = response.defaultPeriodCode();
        if (periodCode == null || periodCode.isBlank()) {
            // commercial-service 가 핵심 데이터셋 공통 분기를 찾지 못한 상태다. 장애와 같게 다룬다.
            throw new AiReportException(AiReportErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        }
        return periodCode;
    }

    /** 받아 온 기본 분기, 다음 갱신 시각, 실패로 만든 메모(stale 연장)인지. */
    private record Memo(String periodCode, Instant refreshAfter, boolean fromFailure) {
    }
}
