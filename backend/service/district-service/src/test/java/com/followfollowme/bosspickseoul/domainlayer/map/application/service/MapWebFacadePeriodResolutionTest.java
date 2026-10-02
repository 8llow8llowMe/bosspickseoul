package com.followfollowme.bosspickseoul.domainlayer.map.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.presenter.MapPresenter;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.AnalysisPeriodQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialCandidateQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialHeatmapQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialProfileQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapAnalysisPeriodProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapCandidateQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapHeatmapQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapProfileQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 지도가 상류(commercial-service)에 항상 <b>명시한 분기</b>를 보내는지 확인한다(이슈 #464).
 *
 * <p>분기를 비워 보내면 commercial 이 기본 분기를 정하지 못할 때 503 을 주고, 그 503 이 지도→commercial 분석 호출 서킷에 실패로
 * 집계돼 분기를 명시한 공개 지도 요청까지 {@code MAP_008} 로 막힌다. 그래서 생략·빈 값은 Facade 가 기본 분기로 바꾸고, 기본 분기를
 * 받지 못하면 상권 분석 호출 자체를 하지 않는다.
 */
@ExtendWith(MockitoExtension.class)
class MapWebFacadePeriodResolutionTest {

    private static final String DEFAULT_PERIOD = "20261";

    @Mock
    private MapQueryProcessor mapQueryProcessor;

    @Mock
    private CommercialHeatmapQueryPort commercialHeatmapQueryPort;

    @Mock
    private CommercialCandidateQueryPort commercialCandidateQueryPort;

    @Mock
    private CommercialProfileQueryPort commercialProfileQueryPort;

    @Test
    @DisplayName("히트맵은 생략·빈 분기를 기본 분기로 바꿔 상류에 명시한다")
    void heatmapSendsTheResolvedPeriod() {
        when(mapQueryProcessor.getAreaCoords(eq(AreaType.COMMERCIAL), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of(boundary("3110008")));
        when(commercialHeatmapQueryPort.getHeatmapScores(List.of("3110008"), "CS100001", "OPPORTUNITY_SCORE", DEFAULT_PERIOD))
            .thenReturn(CommercialHeatmapScoresQueryResult.builder().serviceCode("CS100001").periodCode(DEFAULT_PERIOD).scores(List.of()).build());

        CommercialHeatmapResponse response = facade(() -> DEFAULT_PERIOD).getCommercialHeatmap(
            126.9, 37.45, 127.1, 37.7, "CS100001", "", CommercialHeatmapMetricType.OPPORTUNITY_SCORE, null, null, false);

        assertThat(response.periodCode()).isEqualTo(DEFAULT_PERIOD);
    }

    @Test
    @DisplayName("빈 뷰포트 후보도 상류를 부르지 않지만 해석된 기본 분기를 돌려준다")
    void emptyViewportCandidatesCarryTheResolvedPeriod() {
        when(mapQueryProcessor.getAreaCoords(eq(AreaType.COMMERCIAL), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of());

        CandidateCommercialsResponse response = facade(() -> DEFAULT_PERIOD).getCandidateCommercials(
            126.9, 37.45, 127.1, 37.7, "CS100001", null, CandidatePresetType.BALANCED, null, null);

        assertThat(response.periodCode()).isEqualTo(DEFAULT_PERIOD);
        assertThat(response.items()).isEmpty();
        verifyNoInteractions(commercialCandidateQueryPort);
    }

    @Test
    @DisplayName("프로필·비교 프리뷰도 생략된 분기를 기본 분기로 명시해 상류를 부른다")
    void profileAndComparePreviewSendTheResolvedPeriod() {
        MapWebFacade facade = facade(() -> DEFAULT_PERIOD);

        facade.getCommercialProfile("3110008", "CS100001", null);
        facade.getCommercialComparePreview("3110008", "3110012", "CS100001", " ");

        verify(commercialProfileQueryPort).getCommercialProfile("3110008", "CS100001", DEFAULT_PERIOD);
        verify(commercialProfileQueryPort).getCommercialComparePreview("3110008", "3110012", "CS100001", DEFAULT_PERIOD);
    }

    @Test
    @DisplayName("명시한 분기는 기본 분기를 묻지 않고 그대로 보낸다")
    void explicitPeriodIsSentAsIs() {
        facade(() -> {
            throw new AssertionError("explicit periodCode must not be resolved");
        }).getCommercialProfile("3110008", "CS100001", "20233");

        verify(commercialProfileQueryPort).getCommercialProfile("3110008", "CS100001", "20233");
    }

    @Test
    @DisplayName("기본 분기를 받지 못하면 MAP_011(503)이고 상권 분석 호출은 하지 않는다")
    void unavailableDefaultSkipsTheUpstreamAnalysisCall() {
        MapWebFacade facade = facade(() -> {
            throw new MapException(MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        });

        assertThatThrownBy(() -> facade.getCommercialProfile("3110008", "CS100001", null))
            .isInstanceOf(MapException.class)
            .extracting(exception -> ((MapException) exception).getErrorCode())
            .isEqualTo(MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        assertThat(MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE.getHttpStatus().value()).isEqualTo(503);
        verifyNoInteractions(commercialProfileQueryPort, mapQueryProcessor);
    }

    private MapWebFacade facade(AnalysisPeriodQueryPort periodPort) {
        return new MapWebFacade(
            mapQueryProcessor,
            new MapHeatmapQueryProcessor(mapQueryProcessor, commercialHeatmapQueryPort),
            new MapCandidateQueryProcessor(mapQueryProcessor, commercialCandidateQueryPort),
            new MapProfileQueryProcessor(commercialProfileQueryPort),
            new MapPresenter(),
            new MapAnalysisPeriodProcessor(periodPort)
        );
    }

    private static AreaBoundaryInfo boundary(String code) {
        return AreaBoundaryInfo.builder().areaCode(code).areaName("상권").centerLng(127.0).centerLat(37.5).boundaryCoords(List.of()).build();
    }
}
