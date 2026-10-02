package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.AnalysisPeriodQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 지도 요청의 분기를 해석한다(이슈 #464). 지도는 상류(commercial-service)에 항상 <b>명시한 분기</b>를 보낸다.
 *
 * <p>분기를 비워 보내면 commercial 이 기본 분기를 정하지 못할 때 503 을 주고, 그 503 이 지도→commercial 분석 호출 서킷에 실패로 집계돼
 * 분기를 명시한 공개 지도 요청까지 {@code MAP_008} 로 막힌다. 그래서 기본 분기를 먼저 받아(별도 서킷, {@link AnalysisPeriodQueryPort})
 * 명시값으로 바꾼다. 빈 문자열({@code ?periodCode=})도 생략으로 본다.
 */
@Component
@RequiredArgsConstructor
public class MapAnalysisPeriodProcessor {

    private final AnalysisPeriodQueryPort analysisPeriodQueryPort;

    /**
     * 요청 분기가 있으면 그대로, 생략·빈 값이면 적재 기준 기본 분기. 형식 검증은 상류가 한다.
     *
     * @throws com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException
     *     {@code DEFAULT_PERIOD_UNAVAILABLE}(503) — 기본 분기를 받지 못했을 때. 이때 상권 분석 호출은 하지 않는다
     */
    public String resolve(String requestedPeriodCode) {
        if (requestedPeriodCode != null && !requestedPeriodCode.isBlank()) {
            return requestedPeriodCode;
        }
        return analysisPeriodQueryPort.defaultPeriodCode();
    }
}
