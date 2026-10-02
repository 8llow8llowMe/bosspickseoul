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
import com.followfollowme.bosspickseoul.support.StubAnalysisPeriodQueryPort;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 지도가 상류(commercial-service)에 항상 <b>명시한 분기</b>를 보내고, 그 해석을 요청 검증·뷰포트 조회 <b>뒤</b>에 하는지 확인한다(이슈 #464).
 *
 * <p>분기를 비워 보내면 commercial 이 기본 분기를 정하지 못할 때 503 을 주고, 그 503 이 지도→commercial 분석 호출 서킷에 실패로
 * 집계돼 분기를 명시한 공개 지도 요청까지 {@code MAP_008} 로 막힌다. 해석을 검증보다 앞에 두면 잘못된 요청(400)·뷰포트 상한
 * 초과(MAP_010)가 기본 분기 조회 실패(MAP_011 503)로 가려진다.
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

        CommercialHeatmapResponse response = facade(StubAnalysisPeriodQueryPort.fixed(DEFAULT_PERIOD)).getCommercialHeatmap(
            126.9, 37.45, 127.1, 37.7, "CS100001", "", CommercialHeatmapMetricType.OPPORTUNITY_SCORE, null, null, false);

        assertThat(response.periodCode()).isEqualTo(DEFAULT_PERIOD);
    }

    @Test
    @DisplayName("기본 분기를 받지 못해도 잘못된 히트맵 요청은 400(MAP_002) 이다 — 검증이 해석보다 먼저다")
    void heatmapValidationRunsBeforeResolution() {
        assertMapError(() -> facade(StubAnalysisPeriodQueryPort.unavailable()).getCommercialHeatmap(
            126.9, 37.45, 127.1, 37.7, "CS100001", null, null, null, null, true), MapErrorCode.HEATMAP_PRESET_REQUIRED);

        verifyNoInteractions(mapQueryProcessor, commercialHeatmapQueryPort);
    }

    @Test
    @DisplayName("기본 분기를 받지 못해도 뷰포트 상한 초과는 MAP_010(400) 이다 — 뷰포트 조회가 해석보다 먼저다")
    void viewportLimitRunsBeforeResolution() {
        when(mapQueryProcessor.getAreaCoords(eq(AreaType.COMMERCIAL), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenThrow(new MapException(MapErrorCode.VIEWPORT_TOO_MANY_AREAS));

        assertMapError(() -> facade(StubAnalysisPeriodQueryPort.unavailable()).getCandidateCommercials(
            126.9, 37.45, 127.1, 37.7, "CS100001", null, CandidatePresetType.BALANCED, null, null), MapErrorCode.VIEWPORT_TOO_MANY_AREAS);
    }

    @Test
    @DisplayName("빈 뷰포트 후보는 상류를 부르지 않고 아는 기본 분기를 싣는다")
    void emptyViewportCandidatesCarryTheKnownDefault() {
        when(mapQueryProcessor.getAreaCoords(eq(AreaType.COMMERCIAL), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of());
        StubAnalysisPeriodQueryPort periodPort = StubAnalysisPeriodQueryPort.fixed(DEFAULT_PERIOD);

        CandidateCommercialsResponse response = facade(periodPort).getCandidateCommercials(
            126.9, 37.45, 127.1, 37.7, "CS100001", null, CandidatePresetType.BALANCED, null, null);

        assertThat(response.periodCode()).isEqualTo(DEFAULT_PERIOD);
        assertThat(response.items()).isEmpty();
        assertThat(periodPort.defaultPeriodCalls()).as("빈 응답을 위해 원격 기본 분기를 묻지 않는다").isZero();
        verifyNoInteractions(commercialCandidateQueryPort);
    }

    @Test
    @DisplayName("빈 뷰포트 후보는 아는 기본 분기가 없어도 503 이 아니라 periodCode null 이다")
    void emptyViewportCandidatesWithoutAKnownDefaultAreNot503() {
        when(mapQueryProcessor.getAreaCoords(eq(AreaType.COMMERCIAL), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of());

        CandidateCommercialsResponse response = facade(StubAnalysisPeriodQueryPort.unavailable()).getCandidateCommercials(
            126.9, 37.45, 127.1, 37.7, "CS100001", "", CandidatePresetType.BALANCED, null, null);

        assertThat(response.periodCode()).isNull();
        assertThat(response.items()).isEmpty();
    }

    @Test
    @DisplayName("프로필·비교 프리뷰도 생략된 분기를 기본 분기로 명시해 상류를 부른다")
    void profileAndComparePreviewSendTheResolvedPeriod() {
        MapWebFacade facade = facade(StubAnalysisPeriodQueryPort.fixed(DEFAULT_PERIOD));

        facade.getCommercialProfile("3110008", "CS100001", null);
        facade.getCommercialComparePreview("3110008", "3110012", "CS100001", " ");

        verify(commercialProfileQueryPort).getCommercialProfile("3110008", "CS100001", DEFAULT_PERIOD);
        verify(commercialProfileQueryPort).getCommercialComparePreview("3110008", "3110012", "CS100001", DEFAULT_PERIOD);
    }

    @Test
    @DisplayName("명시한 분기는 기본 분기를 묻지 않고 그대로 보낸다")
    void explicitPeriodIsSentAsIs() {
        facade(StubAnalysisPeriodQueryPort.explicitOnly()).getCommercialProfile("3110008", "CS100001", "20233");

        verify(commercialProfileQueryPort).getCommercialProfile("3110008", "CS100001", "20233");
    }

    @Test
    @DisplayName("기본 분기를 받지 못하면 MAP_011(503)이고 상권 분석 호출은 하지 않는다")
    void unavailableDefaultSkipsTheUpstreamAnalysisCall() {
        assertMapError(() -> facade(StubAnalysisPeriodQueryPort.unavailable()).getCommercialProfile("3110008", "CS100001", null),
            MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE);

        assertThat(MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE.getHttpStatus().value()).isEqualTo(503);
        verifyNoInteractions(commercialProfileQueryPort);
    }

    private MapWebFacade facade(StubAnalysisPeriodQueryPort periodPort) {
        MapAnalysisPeriodProcessor periodProcessor = new MapAnalysisPeriodProcessor(periodPort);
        return new MapWebFacade(
            mapQueryProcessor,
            new MapHeatmapQueryProcessor(mapQueryProcessor, commercialHeatmapQueryPort, periodProcessor),
            new MapCandidateQueryProcessor(mapQueryProcessor, commercialCandidateQueryPort, periodProcessor),
            new MapProfileQueryProcessor(commercialProfileQueryPort, periodProcessor),
            new MapPresenter()
        );
    }

    private static void assertMapError(Runnable call, MapErrorCode expected) {
        assertThatThrownBy(call::run)
            .isInstanceOf(MapException.class)
            .extracting(exception -> ((MapException) exception).getErrorCode())
            .isEqualTo(expected);
    }

    private static AreaBoundaryInfo boundary(String code) {
        return AreaBoundaryInfo.builder().areaCode(code).areaName("상권").centerLng(127.0).centerLat(37.5).boundaryCoords(List.of()).build();
    }
}
