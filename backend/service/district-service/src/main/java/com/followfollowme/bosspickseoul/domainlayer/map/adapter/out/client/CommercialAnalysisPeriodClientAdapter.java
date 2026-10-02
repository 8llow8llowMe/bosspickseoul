package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign.CommercialAnalysisPeriodClient;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign.dto.AnalysisPeriodsClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.AnalysisPeriodQueryPort;
import com.followfollowme.bosspickseoul.global.properties.MapAnalysisPeriodProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * commercial-service 의 적재 기준 기본 분기를 받아 인스턴스 메모리에 둔다(이슈 #464). ai-service {@code AnalysisPeriodClientAdapter} 와
 * 같은 방식이다.
 *
 * <p>호출은 분석 호출과 <b>다른 서킷</b>({@link InternalResponseSupport#COMMERCIAL_SERVICE_PERIODS})을 탄다. commercial-service 는 기동 직후
 * 카탈로그를 계산하기 전에 {@code /periods} 에 503 을 주는데, 이를 분석 호출 서킷에 섞으면 분기를 명시한 지도 요청까지 막힌다.
 * commercial 이 기본 분기를 정하지 못한 상태(200 + {@code defaultPeriodCode: null})는 장애가 아니라 서킷에 집계되지 않고, 상권 분석
 * 호출도 하지 않은 채 지도 자체의 503({@code MAP_011})으로 끝난다.
 *
 * <p>갱신이 실패하면 마지막 성공값을 계속 쓰고 다음 시도를 TTL 뒤로 미룬다. 한 번도 받지 못했으면 {@value #FAILURE_BACKOFF_SECONDS}초 동안은
 * 다시 묻지 않고 바로 503 이다 — 공개 지도 API 는 비로그인 트래픽이라, commercial 기동 창에 요청마다 {@code /periods} 를 두드리지 않게 한다.
 * 만료 직후 동시 요청 몇 건이 함께 갱신할 수 있지만 결과가 같아 잠금을 두지 않는다.
 */
@Slf4j
@Component
public class CommercialAnalysisPeriodClientAdapter implements AnalysisPeriodQueryPort {

    static final int FAILURE_BACKOFF_SECONDS = 10;

    private final CommercialAnalysisPeriodClient commercialAnalysisPeriodClient;
    private final InternalResponseSupport responseSupport;
    private final Duration cacheTtl;
    private final Clock clock;
    private final AtomicReference<Memo> memo = new AtomicReference<>();

    public CommercialAnalysisPeriodClientAdapter(
        CommercialAnalysisPeriodClient commercialAnalysisPeriodClient, InternalResponseSupport responseSupport,
        MapAnalysisPeriodProperties mapAnalysisPeriodProperties, Clock clock
    ) {
        this.commercialAnalysisPeriodClient = commercialAnalysisPeriodClient;
        this.responseSupport = responseSupport;
        this.cacheTtl = mapAnalysisPeriodProperties.cacheTtl();
        this.clock = clock;
    }

    @Override
    public String defaultPeriodCode() {
        Memo current = memo.get();
        Instant now = clock.instant();
        if (current != null && now.isBefore(current.retryAfter())) {
            if (current.periodCode() == null) {
                throw new MapException(MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
            }
            return current.periodCode();
        }
        String stale = current == null ? null : current.periodCode();
        try {
            String periodCode = fetchDefaultPeriodCode();
            memo.set(new Memo(periodCode, now.plus(cacheTtl)));
            return periodCode;
        } catch (MapException exception) {
            if (stale == null) {
                memo.set(new Memo(null, now.plusSeconds(FAILURE_BACKOFF_SECONDS)));
                log.warn("[analysis-period] default period unavailable, no value to serve error={}", exception.getErrorCode().getCode());
                throw new MapException(MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE, exception);
            }
            memo.set(new Memo(stale, now.plus(cacheTtl)));
            log.warn("[analysis-period] default period refresh failed, serving stale periodCode={} error={}",
                stale, exception.getErrorCode().getCode());
            return stale;
        }
    }

    private String fetchDefaultPeriodCode() {
        AnalysisPeriodsClientResponse response = responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE_PERIODS, commercialAnalysisPeriodClient::getAnalysisPeriods);
        String periodCode = response == null ? null : response.defaultPeriodCode();
        if (periodCode == null || periodCode.isBlank()) {
            // commercial-service 가 핵심 데이터셋 공통 분기를 찾지 못한 상태다. 장애가 아니라 서킷 밖에서 판정한다.
            throw new MapException(MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        }
        return periodCode;
    }

    /** 받아 온 기본 분기(실패 백오프 중이면 null)와 다음 시도 시각. */
    private record Memo(String periodCode, Instant retryAfter) {
    }
}
