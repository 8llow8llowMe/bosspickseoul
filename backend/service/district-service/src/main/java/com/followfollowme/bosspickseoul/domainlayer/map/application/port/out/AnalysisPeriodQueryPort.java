package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out;

/**
 * 적재된 데이터 기준 분석 기본 분기를 읽는다(이슈 #464). 정본은 commercial-service 의 {@code GET /api/v1/commercials/periods} 다.
 */
public interface AnalysisPeriodQueryPort {

    /**
     * 기본 분기({@code YYYYQ}).
     *
     * @throws com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException
     *     {@code DEFAULT_PERIOD_UNAVAILABLE}(503) — 받아 오지 못했고 마지막 성공값도 없을 때
     */
    String defaultPeriodCode();
}
